# ESTADO ATUAL DO SISTEMA — Promo Supply V2

**Auditoria de estado · 16 de agosto de 2026**
Documento executivo. Leitura: ~10 minutos. As provas estão em [`DOCS/ESTADO/`](DOCS/ESTADO/00_INDICE.md) — 14 documentos, toda linha com `arquivo:linha`.

---

## Veredito em uma tela

**Você tem um sistema grande, bem arquitetado e com fundações de segurança sólidas, que nunca entrou em operação real.**

Foram medidas **532 funcionalidades** em ~150.000 linhas de código. Metade tem o fio de código completo. Mas o banco de produção mostra que **99 das 162 tabelas (61%) estão totalmente vazias**, e que **73% do volume de dados é telemetria do próprio sistema**, não negócio. O dado de negócio real cabe numa frase: 11 solicitações, 61 cotações, 34 pedidos, 3 pagamentos.

A causa não é falta de código — é que **os três fios que ligariam o processo estão cortados**, e cada corte é pequeno:

1. A **seleção de fornecedor na cotação não grava nada** — a função que gravaria não tem chamador.
2. **Aprovar um workflow não muda o status da solicitação** — nem por código, nem por trigger.
3. O **Kanban de acompanhamento confirma uma escrita que não acontece** — o handler é só um `toast`.

O banco, ironicamente, está **mais pronto que a aplicação**: os triggers que promoveriam a solicitação existem e estão corretos. A interface simplesmente nunca os aciona.

Há também **uma falha crítica de segurança** (bypass de autenticação por passkey) que hoje **não é explorável** por acaso — porque ninguém registrou passkey ainda. Ela se arma sozinha no dia em que o primeiro usuário registrar uma.

---

## Contagem honesta

### Por classificação — o que o código mostra

| Classificação | Qtd | % | Significado |
|---|---:|---:|---|
| ✅ **IMPLEMENTADO_TOTAL** | **258** | **48,5%** | Fio de código completo: UI → lógica → persistência |
| 🟨 **IMPLEMENTADO_PARCIAL** | **166** | **31,2%** | Falta camada, stub, dado fictício ou fio quebrado |
| 🟦 **SUGERIDO_OU_INICIADO** | **56** | **10,5%** | Esqueleto, sem lógica funcional |
| ⬛ **MORTO_OU_ABANDONADO** | **52** | **9,8%** | Nenhum caminho de execução alcança |
| | **532** | 100% | |

### A correção que o runtime impõe

**Os 48,5% são otimistas.** Aplicando a regra *pronto = em produção com uso real*, boa parte dos ✅ pertence a módulos cujas tabelas estão **100% vazias** — o código fecha, mas nunca rodou com usuário:

| Módulo | Tabelas vazias | Situação real |
|---|---|---|
| Aprovações | 6 de 6 | Nunca aprovou nada |
| Workflow engine | 7 de 7 | Motor nunca executou |
| Integração XBZ | 7 de 7 | **Sem credencial cadastrada** — nunca conectou |
| Integração SPOT | 7 de 7 | Nunca sincronizou |
| ERP | 3 de 3 | Nenhuma conexão configurada |
| Notificações / Push | 3 de 3 | Nunca notificou ninguém |
| Segurança avançada (2FA, WebAuthn, SSO, SCIM) | 7 de 7 | Nenhum usuário usa |
| Fila / Outbox / Webhooks | 2 de 2 | Nenhuma mensagem enfileirada |
| IA (análises, previsões, sugestões) | 4 de 4 | Nenhuma análise persistida |
| Contratos | 5 de 6 | Cabeçalho sem corpo |
| Recebimento com checklist | 1 de 1 | Nunca usado |

**Estimativa honesta do que está de fato em uso com dado real: entre 15% e 20%** — cadastros básicos, dashboard de compras, catálogo, autenticação por senha e a telemetria interna.

> Esta faixa é **inferência**, não medição. Medi as tabelas vazias (fato) e o fio de código (fato); a conversão em percentual de "uso real" envolve julgamento sobre o que conta como funcionalidade em uso.

---

## Riscos estruturais, por gravidade

### 1. 🔴 Bypass de autenticação por passkey — CRÍTICO, latente

`supabase/functions/webauthn-authenticate/index.ts:134-224` emite sessão válida sem **nunca verificar a assinatura criptográfica**. A palavra `signature` não aparece no arquivo; não há `crypto.subtle.verify`, nem validação de `origin`. Valida apenas dois campos de um JSON que o próprio cliente envia.

Quem souber um `credential_id` registrado obtém sessão da vítima sem dispositivo nem biometria.

**Agravante:** `webauthn-register/index.ts:192` grava o `attestationObject` no lugar da chave pública COSE — **não há chave utilizável armazenada**, então corrigir exige reregistrar todas as passkeys.

**Por que não é emergência hoje:** `webauthn_credentials` tem **0 linhas** (medido). Sem credencial registrada, a exploração não completa. **Mas a UI de registro está acessível** — a falha se arma no primeiro cadastro.

*Confirmado por três fontes independentes e reproduzido linha a linha por mim.*

### 2. 🔴 O ambiente não é reconstruível a partir do repositório

- `supabase_migrations.schema_migrations` **não existe** — 279 migrations versionadas, **zero rastreio** do que foi aplicado.
- **6 tabelas de negócio existem em produção e nenhuma migration as cria** (`supplier_documents`, `supplier_qualification_scores`, `qualification_history`, `qualification_requirements`, `geo_access_logs`, `blocked_countries`) — porém até 8 migrations aplicam *policies* sobre elas.
- **5 tabelas são criadas por migrations e não existem no banco.**

Um `supabase db reset` a partir do repo falha em cascata. **Não há hoje caminho seguro para recriar produção.**

### 3. 🔴 O CI está vermelho e três gates são falsos

**O CI não pode estar verde hoje** — medido: `npx eslint .` retorna **exit 1** (2 erros), e lint é o **primeiro** passo executável dos dois workflows. O job morre antes dos testes.

E três gates não protegem nada:

| Gate | Por que é falso |
|---|---|
| **Type Check** | `tsc --noEmit` com `"files": []` e project references verifica **0 arquivos**. Esconde **8 erros reais** de tipo |
| **Security RLS Audit** | roda `scripts/rls-audit.ts` **sem bloco `env:`**; o script faz `process.exit(0)` sem credenciais — no-op verde |
| **Teste de carga** | sem bloco `ensure`, não pode reprovar build; target hardcoded para o **projeto errado** |

Não há passo de **build** nem de **deploy** em nenhum workflow.

### 4. 🔴 O fluxo central de compras está cortado em três pontos

| Ponto | Evidência | Consequência |
|---|---|---|
| Seleção de fornecedor na cotação | `selectCotacao` (`useCotacoes.ts:144`) tem **zero chamadores** | Escolher fornecedor não persiste; triggers corretos do banco nunca disparam |
| Aprovação | `useApprovalWorkflow.ts` grava em `approval_*` e **nunca atualiza `solicitacoes`**; `approval_steps` tem **0 triggers** | Solicitação aprovada fica `pendente` para sempre |
| Kanban de acompanhamento | `Acompanhamento.tsx:144-146` — o corpo inteiro é `toast.success(...)` | Usuário arrasta, lê "sucesso", recarrega, card volta |

### 5. 🟠 Automação agendada não roda

Os **11 cron jobs ativos são todos de limpeza** (`DELETE`/`ANALYZE`). **Nenhum invoca edge function.** Logo `check-sla-alerts`, `check-expiry-alerts`, `check-approval-escalations`, `weekly-report`, `process-outbox` e `alert-dispatcher` **não têm agendador em produção**.

Pior: **30 jobs de observabilidade foram construídos e depois desagendados** — incluindo `lgpd_retention_daily` (retenção de dados pessoais), `cleanup_expired_password_resets_daily` e `check_secret_rotation_due_daily`. As funções SQL continuam no banco; só o agendamento sumiu.

### 6. 🟠 Quatro edge functions quebradas de forma determinística

| Função | Defeito | Efeito |
|---|---|---|
| `workflow-engine:41` · `fiscal-orchestrator:98` | passam `Request` onde `getTenantId` espera `string` → `Set.has(<Request>)` sempre falso | **403 em 100% das requisições** |
| `punchout-receive:58,63` | usa `safeTruncate` **sem importar** | `ReferenceError` em todo cXML válido |
| `process-solicitacao-neural` | invocada em `NovaSolicitacaoModal.tsx:108` — **não existe no repositório** | Falha no caminho de entrada primário |

Nenhuma rede pegou isso: edge functions **não são cobertas pelo `tsc`** do app, e o gate de tipos é no-op.

### 7. 🟠 Dado fictício apresentado como real

**59 usos de `Math.random()` em código de produção** e 4 arquivos de mock auto-declarados alimentando telas de produção. Os piores:

- **`process-invoice-idp`** baixa o PDF real e devolve nota fiscal **inventada** (`valor_total: 1250.50`, chave com 44 zeros); o front grava em `fiscal_documents` com `status: "validada"`.
- **`guided-buying-ai`** monta prompt com dados reais do tenant, **descarta**, e devolve `if/else` com strings literais.
- **Dashboard Executivo** é 193 linhas de constantes; ao filtrar, o código multiplica o mock por `0.4 * 0.3` *"para mostrar mudança visual"* — comentário do próprio código.
- `FiscalDashboard.tsx:60-90` exibe "128 NFe autorizadas" e "SEFAZ: Online" como literais, sem health-check.

**Zero `TODO`/`FIXME` em todo o código de produção** — nada disso está marcado como pendência. Está apresentado como concluído. É por isso que o sistema *parece* pronto.

### 8. 🟡 Quatro project IDs de Supabase divergentes

| Local | Project ID | Efeito |
|---|---|---|
| `.env` | `lmypcdfsrgfftzhxawao` | ✅ o correto — confirmado como o banco que a app usa |
| `supabase/config.toml:1` | `trwgmplubeqxrxpncdgf` | **`supabase db push` mira o projeto errado** |
| `vite.config.ts:90,106,121` · `index.html:13-14` | `apuzcrkeqodktmpwobnz` | **cache PWA do Supabase nunca casa** — offline inerte |
| `SSOConfig.tsx:264,268` | `trwgmplubeqxrxpncdgf` | endpoints SAML errados entregues ao admin |

### 9. 🟡 Storage vazio com 111 documentos órfãos

`storage.buckets` = **0**. E `supplier_documents` tem **111 linhas** apontando para `certs/Grafica/Alvara.pdf` e similares. Não existe bucket onde esses caminhos resolvam: upload/download de documento de fornecedor está quebrado por ausência de infraestrutura, e os 111 registros são dado semeado.

---

## O que está genuinamente bom

Não distorço o quadro para parecer rigoroso. Estes pontos são sólidos:

- **RLS é exemplar.** 324 policies, **todas as 162 tabelas com RLS habilitado**, e as únicas 6 sem policy são tabelas-lixo (onde negar tudo é o comportamento seguro). Nenhuma tabela de negócio exposta. *(A corretude lógica das policies não foi testada.)*
- **`types.ts` está 100% sincronizado com o banco vivo** — 156 tabelas e 3 views batendo objeto a objeto. A diferença de 6 é exatamente o lixo acidental.
- **Arquitetura por features está correta e em uso.** Eu suspeitei de refactor abandonado; a medição me refutou — **107 importações** de fora para dentro de `src/features/`, e todas as 48 rotas protegidas passam por ela.
- **Roteamento íntegro:** 53 imports lazy, 53 arquivos existentes, **zero rotas quebradas e zero páginas órfãs**.
- **Manutenção de banco funciona:** 434 execuções de cron, **0 falhas**.
- **2.242 testes passam** e **96 dos 101 arquivos de teste importam o alvo real** — a suíte é majoritariamente honesta.
- **Fundações de qualidade existem de verdade:** logger com batch, rate-limit e redação de segredos; idempotência; outbox; particionamento.
- **A documentação não fabrica caminhos:** dos 483 caminhos citados nos docs existentes, **475 existem**, e 7 das 8 exceções são declaradas como pendentes pelos próprios documentos.

**A leitura correta deste sistema não é "mal feito". É "construído com competência e nunca ligado".**

---

## O que esta auditoria NÃO cobriu

Declarado, não escondido:

| Não coberto | Motivo |
|---|---|
| **Execução da aplicação em navegador** | Nenhum achado foi confirmado por observação visual em runtime |
| **Corretude lógica das 324 policies RLS** | Só a existência foi medida. Exige sessão multiusuário autenticada |
| **Corretude das 356 funções de banco** e das 208 `SECURITY DEFINER` | Exigiria execução; auditoria foi somente leitura |
| **Leitura linha a linha das 279 migrations** (21.209 linhas) | Acima do teto de contexto — feito em altitude, por decisão declarada |
| **`src/components/ui/`** (57 arquivos, shadcn) | Amostragem de 4 arquivos; o resto por grep. Decisão declarada |
| **Logs de invocação das edge functions** | Sem acesso à Management API — não sei quais **de fato** já rodaram |
| **Disponibilidade real das APIs XBZ / SPOT / ERP** | Tabelas vazias provam ausência de sincronização, não indisponibilidade da API |
| **Backups e PITR** | Não expostos por SQL |
| **Conclusão real dos checks do GitHub Actions** | Analisei o YAML e reproduzi os comandos localmente; não li o histórico de execuções |

**Cobertura de código:** recontagem confirmou **569 arquivos citados como evidência** contra **673 na árvore**. Dos 104 não citados, todos são `components/ui` (altitude declarada), arquivos de teste ou scripts. **Lacuna real de cobertura: zero.**

---

## Próximos passos

### Barato e seguro — posso fazer sozinho, sem tocar em produção

| # | Ação | Esforço | Valor |
|---|---|---|---|
| 1 | **Desabilitar o botão de passkey no login** (1 linha, reversível) | minutos | Fecha a janela crítica antes que alguém registre |
| 2 | Corrigir `"typecheck": "tsc --build"` no `package.json` | minutos | Gate de tipos passa a proteger de verdade |
| 3 | Corrigir os **8 erros de tipo** revelados | horas | Conserta o join que faz todo comprador virar "Usuário" |
| 4 | Corrigir os **2 erros de lint** | minutos | Destrava o CI no primeiro passo |
| 5 | Corrigir o mock do `logger.fuzz.test.ts` (falta `auth`) | minutos | Restaura cobertura de **redação de segredos**, hoje cega |
| 6 | Importar `safeTruncate` em `punchout-receive` | minutos | Conserta crash determinístico |
| 7 | Trocar `req` por `undefined` nas 2 chamadas de `getTenantId` | minutos | Destrava 2 edge functions 403-permanente |
| 8 | Unificar os **4 project IDs** para `lmypcdfsrgfftzhxawao` | minutos | Elimina risco de deploy no projeto errado |
| 9 | Ligar os 3 fios cortados (cotação, aprovação, kanban) | 1–2 dias | **Faz o processo de compras funcionar ponta a ponta** |

**Recomendo começar por 1, 4, 2, 3** — nessa ordem. O item 1 fecha o risco de segurança; 4 e 2 fazem o CI voltar a proteger; 3 conserta um bug visível ao usuário.

### Toca produção ou muda escopo — decisão sua

| Ação | Por que precisa da sua decisão |
|---|---|
| **Criar as 6 migrations faltantes** e adotar rastreio de migrations | Torna o ambiente reconstruível. Mexe no versionamento de schema |
| **Reagendar (ou aposentar formalmente)** os 30 jobs desligados | Inclui **retenção LGPD**. Não sei se o desligamento foi deliberado — **só você sabe** |
| **Reescrever WebAuthn** com verificação de assinatura e chave COSE | Exige reregistrar todas as passkeys. Ou remover a feature |
| **Criar o bucket de Storage** e decidir sobre os 111 documentos órfãos | Dado semeado em produção: apagar ou preencher? |
| **Remover as 6 tabelas-lixo `v_*`** | DDL em produção |
| **Investigar os 5 triggers duplicados** | `auto_approve_low_value_solicitacao` roda **2× por INSERT** |
| **Decidir sobre o dado fictício** | `process-invoice-idp` grava nota fiscal inventada como `validada`. É risco fiscal |
| **Configurar credenciais XBZ / SPOT / ERP** | Sem elas, 3 integrações completas seguem dormentes |

---

## Nota de método

Esta auditoria mediu em vez de confiar — e isso incluiu **desconfiar de mim mesmo**. Dois erros meus foram detectados durante a execução, corrigidos em voz alta e registrados em [`DOCS/ESTADO/L14_VERIFICACAO_INDEPENDENTE.md`](DOCS/ESTADO/L14_VERIFICACAO_INDEPENDENTE.md):

1. Afirmei na Fase A que **"o typecheck passa limpo"**. Passava — porque não verificava nada. Repassei a premissa errada a um lote, que a registrou como ✅. **A contradição levantada por outro lote foi o que revelou o erro** — e o achado corrigido virou um dos mais graves do relatório.
2. Afirmei **4 testes falhando** a partir de uma amostra de 1 execução. São 3 determinísticos + 1 flaky.

Três achados graves de lotes também foram refinados ou refutados na verificação independente, e três falsos-positivos foram descartados antes de virarem recomendação — incluindo um do meu próprio regex, que teria acusado três lotes de inventar evidência.

**Nada foi alterado em produção.** Zero DDL, zero DML, zero migration, zero deploy.

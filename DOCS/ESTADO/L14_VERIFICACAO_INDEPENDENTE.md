# L14 — Verificação Independente (Fase D)

> Relato de lote **não é evidência**. Este documento registra as verificações que eu, agente
> coordenador, executei **por conta própria**, reproduzindo os achados mais graves e corrigindo
> o que estava errado — inclusive erros meus.
>
> Nada foi apagado. Quem lê precisa saber que houve revisão e o que mudou.

---

## 🔴🔴 ACHADO CRÍTICO DE SEGURANÇA — CONFIRMADO: bypass de autenticação por passkey

**O mais severo de toda a auditoria.** Reproduzido integralmente por mim, linha a linha.

### O defeito

`supabase/functions/webauthn-authenticate/index.ts`, ação `finish` (linhas 134-224), emite uma **sessão válida** após validar apenas:

1. Que existe um challenge não expirado para o e-mail (`:136-145`)
2. Que o `credential_id` enviado existe em `webauthn_credentials` (`:154-158`)
3. Que `clientData.challenge === challengeData.challenge` (`:167`)
4. Que `clientData.type === 'webauthn.get'` (`:170`)

E então chama `supabase.auth.admin.generateLink({ type: 'magiclink', email })` (`:195`), devolvendo um token de sessão real.

### O que NUNCA acontece

| Verificação obrigatória em WebAuthn | Presente? | Prova |
|---|---|---|
| Verificação da **assinatura** com a chave pública | **NÃO** | `grep -n "signature" …/webauthn-authenticate/index.ts` → **zero ocorrências** |
| Uso de primitiva criptográfica de verificação | **NÃO** | única menção a `crypto` é `crypto.getRandomValues` (`:94`), para *gerar* challenge. Sem `crypto.subtle.verify`, sem `importKey`, sem COSE |
| Validação de `clientData.origin` | **NÃO** | `origin` aparece só em `:68`, e ali é usado para **derivar o `rpId` a partir do header da própria requisição** — controlado por quem chama |
| Validação de `authenticatorData` | **NÃO** | é enviado pelo cliente (`src/hooks/useWebAuthn.ts:224-226`) e descartado |

**Os campos 3 e 4, os únicos verificados, vêm de `clientDataJSON` — um blob base64url produzido inteiramente pelo cliente.** Não há nada que prove posse do autenticador.

### Cadeia de exploração

1. Chamar a ação `start` com o e-mail da vítima → o servidor **gera e devolve** um challenge
2. Forjar `clientDataJSON` = `{"challenge":"<o challenge>","type":"webauthn.get"}`
3. Enviar `finish` com esse blob e um `credential_id` registrado qualquer
4. Receber o magiclink → **sessão autenticada como a vítima**

Nenhuma chave privada, nenhum dispositivo, nenhum biométrico.

### Agravante estrutural

`supabase/functions/webauthn-register/index.ts:192` grava `public_key: credResponse.attestationObject`. O `attestationObject` **não é a chave pública COSE** — é o envelope CBOR de atestação. Ou seja, **não existe chave pública utilizável armazenada**: mesmo corrigindo a função de autenticação, a verificação de assinatura seria impossível sem **reregistrar todas as passkeys**.

### 🟢 Fator mitigante decisivo, medido em produção

| Tabela | Linhas |
|---|---|
| `webauthn_credentials` | **0** |
| `webauthn_challenges` | **0** |
| `mfa_settings` | **0** |
| `auth.mfa_factors` | **0** |
| `auth.users` | 11 |

**Nenhuma passkey está registrada.** O passo 3 exige um `credential_id` existente, e o `.single()` da consulta falha com "Credential not registered". **A falha NÃO é explorável hoje.**

**Mas é uma armadilha armada.** No instante em que o primeiro usuário registrar uma passkey — a UI para isso existe e está acessível — a conta dele fica tomável por qualquer pessoa que saiba o `credential_id`. E os 11 usuários hoje dependem só de senha, sem nenhum segundo fator ativo.

### Recomendação

Desabilitar o botão de passkey na tela de login **antes** de qualquer outra correção. É mudança de uma linha no front, reversível, sem tocar em produção nem em dados. A correção correta (verificação de assinatura + armazenamento de chave COSE + validação de origin/rpId) é reescrita das duas edge functions e **exige decisão do dono**.

---

## 🔴 CORREÇÃO DE UM ERRO MEU — o gate de tipos do CI é um no-op

**O que eu afirmei na Fase A:** *"`npx tsc --noEmit` **passa limpo**"* — e usei isso como sinal de saúde do projeto, inclusive repassando o fato aos lotes como premissa.

**Isso estava errado, e foi um erro grave de método.** Eu medi o comando e li o exit code 0 como "sem erros de tipo". O exit code 0 estava correto; minha interpretação, não.

### O que realmente acontece

`tsconfig.json` na raiz declara `"files": []` e usa *project references*:

```json
{ "files": [], "references": [ { "path": "./tsconfig.app.json" }, { "path": "./tsconfig.node.json" } ] }
```

Sem a flag `--build`, o `tsc` **não segue project references**. Ele typecheca exatamente o que está em `files`/`include` — que é o conjunto vazio.

### Prova medida

| Comando | Arquivos de `src/` verificados | Resultado |
|---|---|---|
| `npx tsc --noEmit` (o que o projeto roda) | **0** | exit 0 — vazio |
| `npx tsc --noEmit -p tsconfig.app.json` | **592** | **8 erros** |
| `npx tsc --build` | 592 | os mesmos 8 erros |

Contagem obtida com `--listFiles | grep -c "^…/src/"`.

### A consequência: o CI mente sobre tipos, nos dois workflows

`package.json` → `"typecheck": "tsc --noEmit"`

- `.github/workflows/ci.yml:29-30` → step **"Type Check"** → `bun run typecheck`
- `.github/workflows/main.yml:23-24` → step **"Type Check"** → `bun run typecheck`

Ambos executam o comando que não verifica nada. **O gate de tipos passa verde em toda execução, independentemente de quantos erros de tipo existam no código.** Está assim para os dois pipelines simultaneamente.

### Os 8 erros reais que o gate esconde

| Arquivo:linha | Erro |
|---|---|
| `src/pages/admin/HealthDashboard.tsx:131` | TS2322 — `Record<string,string\|number>[]` não atribuível a `TimeseriesRow[]`; falta `day` |
| `src/pages/admin/HealthDashboard.tsx:223` | TS2322 — `alert_type: string \| null` não atribuível a `string` |
| `src/pages/admin/HealthDashboard.tsx:229` | TS2322 — `created_at: string \| null` não atribuível a `string` |
| `src/pages/relatorio-negociacoes/useRelatorioNegociacoes.ts:134` | TS2339 — `id` não existe em `SelectQueryError<"column 'display_name' does not exist on 'profiles'.">` |
| `src/pages/relatorio-negociacoes/useRelatorioNegociacoes.ts:181` | TS2339 — `score_total` não existe no tipo de `cotacoes` |
| `src/pages/relatorio-negociacoes/useRelatorioNegociacoes.ts:187` | TS2339 — `full_name` (mesma origem) |
| `src/pages/relatorio-negociacoes/useRelatorioNegociacoes.ts:187` | TS2339 — `display_name` (mesma origem) |
| `src/pages/relatorio-negociacoes/useRelatorioNegociacoes.ts:187` | TS2339 — `email` (mesma origem) |

**Cinco dos oito são o mesmo defeito de raiz:** a query pede `profiles.display_name`, coluna que **não existe** na tabela. O próprio compilador de tipos do Supabase escreveu a mensagem `"column 'display_name' does not exist on 'profiles'"` dentro do tipo de erro. Consequência funcional: o join falha e **todo comprador aparece como "Usuário"** no Relatório de Negociações.

**Correção de uma linha, alto valor:** trocar `"typecheck": "tsc --noEmit"` por `"typecheck": "tsc --build"` faz os dois workflows passarem a bloquear de verdade. Mas isso deixa o CI vermelho até os 8 erros serem corrigidos — é decisão do dono sobre a ordem.

**Crédito:** o lote de páginas de catálogo/IA/relatórios reportou "5 dos 8 erros de `tsc`", contradizendo minha medição. A contradição é que me fez investigar. O lote estava certo e eu, errado.

---

## Verificações de achados graves — resultado uma a uma

### ✅ CONFIRMADO — `selectCotacao` não tem chamador

**Alegação:** a seleção de fornecedor na cotação não persiste; a função que gravaria nunca é chamada.

**Minha verificação:** `grep -rn "selectCotacao" src/`

```
src/features/cotacoes/hooks/useCotacoes.ts:144:  const selectCotacao = useCallback(async (id, justificativa?) => {
src/features/cotacoes/hooks/useCotacoes.ts:208:    refetch, createCotacao, updateCotacao, selectCotacao, deleteCotacao,
```

**Duas ocorrências: a definição e o export.** Nenhum consumidor em todo o `src/`. **Confirmado.**

**Agravante que só o banco revela** (ver `L12`, Achado 7): a tabela `cotacoes` **tem** os triggers corretos — `trg_cotacao_approved_status` e `trg_auto_transition_on_cotacao_approval` — que promoveriam a solicitação automaticamente. A automação de banco está pronta e correta; a interface simplesmente nunca a aciona.

---

### ✅ CONFIRMADO, com refinação — aprovar workflow não altera a solicitação

**Alegação:** *"não existe um único `.from('solicitacoes').update(` em `useApprovalWorkflow.ts`"*.

**Minha verificação:** o arquivo **toca** `solicitacoes` em `useApprovalWorkflow.ts:95` — mas é um `.select('*, cost_center:cost_centers(manager_id)')`, para achar o gestor do centro de custo. Não há `.update()`. Todas as demais escritas vão para `approval_workflows`, `approval_steps`, `approval_history`.

**A pergunta decisiva, que só o runtime responde:** existe trigger de banco fazendo a propagação? Se existisse, o achado se inverteria e "corrigi-lo" quebraria produção.

Medi em produção:
- `approval_workflows` → **1 trigger**: `update_approval_workflows_updated_at` (só carimba `updated_at`)
- `approval_steps` → **ZERO triggers**

**Confirmado nos dois lados.** A solicitação permanece `pendente` para sempre após a aprovação. Registro a refinação (`select`, não ausência total) para quem for corrigir.

---

### ✅ CONFIRMADO — Kanban de Acompanhamento confirma escrita que não ocorre

`src/pages/acompanhamento/Acompanhamento.tsx:144-146`, lido por mim na íntegra:

```ts
const handleStatusChange = async (pedidoId: string, novoStatus: string) => {
  toast.success(`Pedido #${pedidoId} atualizado para ${getStatusLabel(novoStatus)}`);
};
```

O corpo inteiro é o toast. `async` sem `await`, sem chamada a Supabase. **Confirmado:** o usuário arrasta o card, lê "atualizado com sucesso", recarrega e o card volta.

---

### ✅ CONFIRMADO — `ReceivingModal` é órfão

`grep -rn "ReceivingModal" src/` retorna **3 linhas, todas dentro do próprio arquivo**: a interface de props (`:28`), o `export function` (`:37`) e o tipo (`:44`). Nenhum importador, nem em teste. **Confirmado.** São 306 linhas de lógica funcional de recebimento (atualiza `quantidade_recebida`, muda status, gera pedido complementar) que nenhum caminho de execução alcança.

---

### ✅ CONFIRMADO — `workflow-engine` e `fiscal-orchestrator` retornam 403 em 100% das requisições

**Alegação:** ambas passam o objeto `Request` no 3º parâmetro de `getTenantId`, que espera uma string.

**Minha verificação**, lendo a assinatura em `supabase/functions/_shared/security.ts:154-181`:

```ts
export const getTenantId = async (supabase: any, user: any, preferredTenantId?: string): Promise<string> => {
  ...
  const allowed = new Set<string>((memberships ?? []).map((m: any) => m.tenant_id));
  if (preferredTenantId) {
    if (!allowed.has(preferredTenantId)) {
      throw new Error("Security error: preferredTenantId does not match user's memberships");
    }
    ...
```

E as chamadas:
- `supabase/functions/workflow-engine/index.ts:41` → `await getTenantId(supabase, user, req)`
- `supabase/functions/fiscal-orchestrator/index.ts:98` → `await getTenantId(supabaseAdmin, user, req)`

**Cadeia lógica confirmada:** um objeto `Request` é *truthy* → entra no `if (preferredTenantId)` → `allowed` é um `Set<string>` e **nunca conterá um objeto `Request`** → `allowed.has(req)` é sempre `false` → lança erro de segurança **antes de qualquer lógica de negócio**.

**Confirmado: as duas funções são inoperantes em toda requisição autenticada.**

**Por que passou despercebido:** `getTenantId` declara `supabase: any, user: any`, mas `preferredTenantId?: string` **é tipado**. TypeScript pegaria isso — só que Deno edge functions **não são cobertas pelo `tsc` do app** (`tsconfig.app.json` inclui apenas `src/`). Somado ao gate de tipos no-op do CI, não havia nenhuma rede capaz de capturar este defeito.

---

### ✅ CONFIRMADO — `punchout-receive` quebra em toda requisição válida

`safeTruncate` é usado em `supabase/functions/punchout-receive/index.ts:58` e `:63`. Li os imports do arquivo (linhas 1-7): `corsHeaders`, `buildResponseHeaders`, `serve`, `createClient`, `XMLParser`, `checkRateLimit`/`rateLimitedResponse`, `deriveIdempotencyKey`/`getIdempotentResponse`/`recordIdempotentResponse`. **`safeTruncate` não está entre eles**, e não é declarado no arquivo.

**Confirmado: `ReferenceError` em runtime** assim que o parser de XML alcança a linha 58 — isto é, em todo cXML de punchout bem formado.

---

### ✅ CONFIRMADO — o front invoca uma edge function que não existe

`grep -rn "process-solicitacao-neural" src/` retorna **dois chamadores**:
- `src/components/compras/NovaSolicitacaoModal.tsx:108`
- `src/pages/admin/DeveloperDocs.tsx:44`

`ls supabase/functions/ | grep -i neural` → **nada**. A função não existe no repositório.

Confirmado. O modal de criação de solicitação — caminho de entrada primário do sistema — invoca uma função inexistente.

---

### ⚠️ ACHADO NOVO MEU — 5 triggers duplicados em produção

Nenhum lote poderia ter visto isto: só é visível no banco vivo. Detalhado em `L12`, Achado 6.

O mais relevante: `auto_approve_low_value_solicitacao` está registrada **duas vezes** como `BEFORE INSERT` em `solicitacoes` (triggers `auto_approve_low_value` e `trg_auto_approve_low_value`). Lógica de aprovação automática executando em duplicidade a cada solicitação criada.

---

## 🔧 CORREÇÃO DE OUTRO ERRO MEU — eram 3 falhas determinísticas + 1 flaky, não 4

**O que eu afirmei na Fase A e repassei a dois lotes como premissa:** *"4 testes falharam, um deles com «Aborting after running 10000 timers, assuming an infinite loop»"*.

Um lote **divergiu do meu número**, relatando 3 falhas em 7 execuções distintas. Reconciliei executando eu mesmo:

| Execução | Resultado |
|---|---|
| Minha 1ª (suíte completa, Fase A) | **4 failed** \| 2241 passed \| 12 skipped |
| Arquivo isolado, 3× seguidas | **3 failed** \| 8 passed — idêntico nas três |
| Suíte completa, reexecutada | **3 failed** \| 2242 passed \| 12 skipped |

**Conclusão correta: há 3 falhas determinísticas + 1 teste flaky.** A falha de "10000 timers" apareceu na minha primeira execução da suíte completa e não se reproduziu em nenhuma outra — é **instabilidade dependente de tempo/ordem**, não defeito fixo. Eu generalizei a partir de uma amostra de 1 e transformei uma flakiness em fato.

Isso **não reduz** a gravidade: um teste que falha de forma intermitente é pior que um que falha sempre, porque leva a suíte a ser ignorada. Mas a descrição precisa importa para quem for corrigir.

**Diagnóstico da causa das 3 falhas determinísticas**, verificado: `src/lib/logger.ts:114` chama `supabase.auth.getSession()`, e o mock em `src/lib/__tests__/logger.fuzz.test.ts:18-20` fornece apenas `functions.invoke`, sem `auth`. O `TypeError` é engolido pelo `catch` de `logger.ts:130-132` e `invokeMock` nunca é chamado. **É defeito do teste, não do código de produção.**

O agravante é o efeito colateral: outros 3 testes do mesmo arquivo (`:164`, `:190`, `:217`) toleram zero chamadas e por isso **passam vacuamente** — a cobertura de rate-limit, batching e redaction de dados sensíveis está verde testando nada.

---

## ✅ VERIFICAÇÃO POSITIVA — `types.ts` está em sincronia com o banco vivo

Registro isto porque o quadro não deve ser distorcido para parecer rigoroso: aqui o sistema está bom.

Um lote reportou suspeita de `types.ts` defasado, com base em `useAccountFilters.ts:87`, que contém o comentário *"user_filter_preferences is not in the generated type map"* e faz `supabase as unknown as` para contornar. Cruzei com o banco:

| Objeto | `types.ts` | Banco vivo | Confere? |
|---|---|---|---|
| Tabelas | 156 | **162** | diferença de 6 |
| Views | 3 (`mv_dashboard_kpis`, `supplier_compliance_summary`, `v_system_health_overview`) | 3 (1 matview + 2 views) — **os mesmos três nomes** | ✅ exato |

**As 6 tabelas de diferença são exatamente as 6 tabelas-lixo `v_*`** do Achado 4 do `L12`. Verifiquei uma a uma: `v_kpis`, `v_trends`, `v_pipeline`, `v_cotacao_status`, `v_top_categories`, `v_urgent_items` têm **0 ocorrências** em `types.ts`.

**Veredito: descontado o lixo acidental, `types.ts` está 100% sincronizado.** É um ponto forte do projeto.

**Dois falsos-positivos corrigidos por esta verificação:**

1. **`user_filter_preferences` ESTÁ em `types.ts`**, na linha 7882. O comentário no código e o cast `as unknown as` estão **desatualizados** — foram escritos quando o tipo faltava e nunca removidos. Não é drift; é um cast obsoleto que hoje só serve para desligar a checagem de tipos sem necessidade.

2. **`workflow_approvals` vs `approval_workflows` não é drift.** Um lote suspeitou que "um dos dois provavelmente não existe". **Ambos existem** no banco, ambos com 0 linhas. São tabelas distintas.

   Mas a verificação revelou um **bug real e diferente do suspeitado**: `src/hooks/useSidebarBadges.ts:26` conta aprovações pendentes em `workflow_approvals`, enquanto `src/hooks/useApprovalWorkflow.ts:60` **grava** em `approval_workflows`. São tabelas diferentes. **O badge de "Aprovações" na sidebar nunca contará uma aprovação criada pelo sistema** — fica permanentemente em zero. Achado novo, nascido de refutar a suspeita original.

---

## Recontagem de cobertura

Objetivo: descobrir arquivos que caíram **entre** dois escopos — falha de costura do meu próprio fatiamento, que ninguém declara.

**Árvore real:** 673 arquivos `.ts/.tsx/.js/.jsx` em `src/`, `supabase/functions/`, `scripts/`, `tests-e2e/`, `tests-rls/`.

**Método:** extraí por regex todo caminho de arquivo citado como evidência nos relatórios dos lotes e comparei, por diff de conjuntos, com a árvore real.

| Medida | Valor |
|---|---|
| Arquivos citados como evidência nos relatórios | **569** |
| Arquivos reais na árvore | **673** |
| Citados que **não existem** na árvore | **3** (todos falso-positivo meu — ver abaixo) |
| Existem e **nunca foram citados** | **107** |

### Os 107 não citados, decompostos

| Categoria | Qtd | Situação |
|---|---|---|
| `src/components/ui/**` | 57 | **Declarado**: fatiei este diretório em altitude (shadcn/ui boilerplate), com amostragem de 4 arquivos. Decisão consciente, registrada antes da execução |
| Arquivos de teste (`__tests__/`, `tests-e2e/`, `tests-rls/`, `src/tests/`) | 51 | Pertencem ao lote de CI e Testes |
| `scripts/` | 3 | Idem |
| **Lacuna real de cobertura** | **0** | — |

**Nenhum arquivo de produção caiu entre dois escopos.** A costura do fatiamento se sustentou. Todo arquivo `.ts/.tsx` de produção fora de `components/ui` foi citado como evidência por pelo menos um lote.

### Falso-positivo da própria recontagem (registro obrigatório)

O diff acusou 3 arquivos "citados mas inexistentes":
`src/locales/en/translation.js`, `src/locales/es/translation.js`, `src/locales/pt/translation.js`

**Não é evidência fabricada.** Os arquivos existem como **`translation.json`**. Meu regex de extração só casava as extensões `.ts|.tsx|.js|.jsx` e **truncou `translation.json` em `translation.js`**.

Registro porque é precisamente a armadilha que a auditoria deveria caçar: *um critério de detecção frouxo classifica coisa viva como ausente*. Se eu tivesse endossado esta lista sem testar o critério, teria acusado três lotes de inventar evidência.

Confirmado por `ls`: `src/locales/{en,es,pt}/translation.json` e `public/locales/{en,es,pt}/translation.json` existem — os locales estão **duplicados em dois diretórios**, o que por si só merece nota.

### Costura verificada entre os lotes de `src/components/compras/`

O diretório foi fatiado por ordem alfabética entre dois lotes, com risco real de buraco ou sobreposição no ponto de corte.

- Lote 1 declarou: último arquivo `ReceivingModal.tsx`, acumulado 13.426 linhas
- Lote 2 declarou: primeiro arquivo `RiskHeatMap.tsx`, acumulado 13.694 linhas

`ReceivingModal` → `RiskHeatMap` são **consecutivos em ordem lexicográfica**. Sem buraco, sem sobreposição. Somatório: 13.426 + 13.708 = **27.134 linhas**, idêntico ao total medido do diretório na Fase A. **Costura íntegra, confirmada por aritmética.**

---

## Falsos-positivos que descartei (registro obrigatório)

Endossar lista de "código morto" sem testar o critério de detecção faz alguém apagar código vivo. Registro o que **não** é achado:

1. **Meu próprio diff de drift de schema** acusou `for`, `public` e `to` como "tabelas ausentes do banco". São **artefatos do meu regex** de extração de `CREATE TABLE`, não tabelas. Já corrigido em `L12`.

2. **`AnimatedCounter`** foi sinalizado como possível órfão e descartado: existem **4 implementações homônimas independentes** no repositório. Um grep por nome, sem olhar caminho, produziria conclusão errada nos dois sentidos.

3. **`package-lock.json` modificado.** Três lotes relataram o arquivo como alterado e supuseram interferência de outro agente. A causa fui **eu**: rodei `npm install` na Fase A para viabilizar `tsc` e `vitest`. Não é achado nem conflito de agentes.

---

## Limites desta verificação

- Amostrei os achados **mais severos**, não todos. Achados de gravidade média nos lotes **não foram reproduzidos por mim** e permanecem com a evidência do lote — que sempre cita `arquivo:linha` conferível.
- Não executei a aplicação em navegador. Nenhuma afirmação sobre comportamento visual em runtime foi verificada por observação direta.
- Não testei a corretude das 324 policies RLS nem das 356 funções de banco.

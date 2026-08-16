# L15 — Meta-auditoria: falhas e lacunas da própria auditoria

> Auditoria adversarial do meu próprio trabalho, executada após a entrega. O objetivo aqui não é
> confirmar os achados — é **encontrar onde eu errei**.
>
> Resultado: **2 erros de classificação concretos**, **1 defeito metodológico grave no número
> principal**, **1 lacuna declarada agora fechada** e **4 falsos-positivos do meu próprio critério
> de detecção**. As afirmações positivas do documento executivo foram todas verificadas e se sustentam.

---

## 🔴 DEFEITO 1 — O número "532 funcionalidades" soma unidades incomparáveis

**Este é o defeito mais sério da auditoria, e é meu, não dos lotes.**

Cada lote classificou na unidade que fazia sentido para o seu escopo. Eu somei tudo como se fosse a mesma coisa:

| Lote | O que ele conta | Qtd |
|---|---|---:|
| L01, L02, L03 | telas / funcionalidades de negócio | 57 + 43 + 56 |
| L04, L05, L06 | **componentes React** | 48 + 57 + 68 |
| L07 | **hooks** | 61 |
| L08, L09 | módulos / stores / utilitários | 54 + 33 |
| L10 | **edge functions** | 37 |
| L11 | **capacidades de CI/qualidade** | 18 |
| | | **532** |

Um componente React não é uma funcionalidade. Um hook não é uma funcionalidade. "Type-check no CI" não é uma funcionalidade no mesmo sentido que "Aprovar uma solicitação".

**Consequência:** os **48,5% de ✅** descrevem *unidades de código com o fio fechado*, **não** *percentual de funcionalidades de negócio prontas*. O denominador está inflado por artefatos de implementação, e a leitura natural do leitor — "metade do sistema está pronto" — **não é o que o número mede**.

### O número que eu deveria ter destacado

O dado mais defensável não é construído por soma — é **medido diretamente no runtime**:

- **99 das 162 tabelas (61,1%) estão vazias** — contagem exata, não estimativa
- **13 áreas de módulo com 100% das tabelas vazias** (aprovações, workflow, XBZ, SPOT, ERP, notificações, segurança avançada, outbox, IA, contratos, recebimento, financeiro, RBAC granular)
- **73% do volume do banco é telemetria do próprio sistema**

Esses três números não dependem de como eu escolhi contar. **A conclusão qualitativa do documento executivo continua correta** — sistema construído e nunca ligado. O que estava mal calibrado era a precisão implícita do "48,5%".

### Efeito sobre a estimativa de "15–20% de uso efetivo"

Eu já a havia rotulado como inferência. Com o defeito de unidade exposto, ela fica **ainda mais frágil** e deve ser lida como **ordem de grandeza**, não como medida. O que sustenta a faixa é a evidência de runtime (61% de tabelas vazias, 13 módulos zerados), não a aritmética dos lotes.

---

## 🔴 DEFEITO 2 — Duas classificações ✅ estão erradas, e a causa é estrutural

O ✅ de um lote **só vale até a fronteira do escopo dele**. Lotes de tela verificaram o *fio* (botão → hook → edge function → tabela) sem poder abrir o que estava fora do seu recorte. Isso produziu ✅ em coisas quebradas.

### Erro 2a — Login por Passkey classificado ✅ (deveria ser 🟨, com achado crítico)

| Lote | Classificação da MESMA feature |
|---|---|
| `L01` (telas) | **✅ IMPLEMENTADO_TOTAL** — "Botão `Auth.tsx:352-376` → `authenticateWithPasskey`" |
| `L06` (componentes) | **🟨 PARCIAL (grave)** — "a palavra `signature` não existe no arquivo" |
| `L10` (edge functions) | **🟨 + achado S-1 CRÍTICO** — bypass total de autenticação |

**O ✅ está errado.** É a funcionalidade com a falha de segurança mais grave de todo o sistema, marcada como totalmente implementada porque o lote de telas não tinha a edge function no escopo.

Nenhum dano ao relatório final — o achado crítico chegou ao topo do documento executivo pelos outros dois lotes. Mas a **tabela de evidências do L01 está incorreta** e alguém que consulte só ela será enganado.

### Erro 2b — "Dashboard de Compras — KPIs" classificado ✅ (deveria ser 🟨)

`L01` marcou ✅ porque o fio chega à RPC real `get_compras_dashboard_metrics`. **Verifiquei o interior do hook** (`src/hooks/useDashboardKPIs.ts`, lido por mim):

```ts
atrasados: 0,            // :106
taxaEntrega: 100,        // :107
totalFornecedores: 0,    // :109
pendingApprovals: 0,     // :111
avgSla: 1.8,             // :116
taxaSlaReal: 85,         // :117
sla: { current: 85, previous: 82, trend: 3, sparkline: [80,82,81,84,83,85,85] }  // :138-142
const generateSparkline = (...) => [];   // :98 — sempre vazio
```

**O card de SLA do dashboard principal exibe "85%" permanentemente**, com uma linha de tendência literal. O `L07` classificou corretamente esse hook como 🟨. O ✅ do `L01` está errado.

### Extensão medida do problema

Cruzei os hooks classificados 🟨/⬛ no `L07` contra as linhas ✅ dos lotes de página:

**6 hooks defeituosos alimentam 10 linhas marcadas ✅** — `useAccountFilters`, `useBuyerPerformanceData`, `useDashboardKPIs`, `useExecutiveDashboardData`, `usePurchaseHistory`, `useWebAuthn`.

**Correção de calibragem: o total de ✅ está inflado em pelo menos 10 unidades** (258 → ~248), e provavelmente mais, já que só cruzei a dimensão hooks × telas — não componentes × telas nem edge functions × telas.

---

## 🟠 DEFEITO 3 — Dupla contagem semântica

Duplicação por nome exato entre lotes é baixa (5 sujeitos). Mas a duplicação **semântica** é real: a mesma coisa contada duas vezes sob nomes diferentes.

**Caso comprovado — `SLADistributionChart`:**
- `L01` conta como ⬛ (import morto em `ComprasDashboard.tsx:47`)
- `L05` conta como ⬛ (componente órfão, `SLADistributionChart.tsx:122`)

Mesmo artefato, duas entradas nos 532. Aqui a classificação **coincidiu** (⬛ nos dois), então não distorce a proporção — mas infla o denominador.

Cruzamentos de menção entre lotes confirmam que isso não é caso isolado: `ComprasDashboard` aparece em 5 lotes, `PriceComparator` em 4, `Acompanhamento` em 4.

**Não consegui quantificar a duplicação total** — exigiria normalizar semanticamente 532 sujeitos escritos em prosa livre. Fica declarado como limite conhecido, não resolvido.

---

## ✅ LACUNA FECHADA — `src/components/ui` (57 arquivos que eu havia deixado em altitude)

Era a maior lacuna declarada. Fechei agora:

| Verificação | Resultado |
|---|---|
| Arquivos que importam `supabase` | **0** |
| Arquivos com acesso real a dados (`.rpc(`, `functions.invoke`) | **0** |
| `Math.random()` | 4 arquivos — **todos decorativos**: partículas de animação, geração de ID de toast, e largura de skeleton (`sidebar.tsx:536`, comentado `// Random width between 50 to 90%`) |
| Importam hooks/stores de negócio | 5 arquivos (composição de UI, sem lógica de domínio) |

**Veredito: a decisão de auditar em altitude era segura.** Não há lógica de negócio escondida ali.

**Mas a justificativa que publiquei estava errada.** Eu escrevi "shadcn/ui boilerplate". Medido: **apenas 24 dos 65 arquivos usam `@radix-ui`**. Os outros 41 são componentes próprios do projeto. A conclusão se sustentou por outro motivo que não o que eu aleguei — e alegar o motivo errado é o tipo de coisa que faz a próxima pessoa confiar demais numa amostragem.

---

## ⚠️ PADRÃO PREOCUPANTE — 4 falsos-positivos do meu próprio critério de detecção

Contando os desta meta-auditoria, foram **quatro** vezes em que um critério frouxo meu quase virou achado:

| # | Critério | Falso-positivo | Se eu não tivesse testado |
|---|---|---|---|
| 1 | regex de `CREATE TABLE` nas migrations | acusou `for`, `public`, `to` como "tabelas ausentes do banco" | 3 tabelas fantasma no relatório de drift |
| 2 | regex de extração de caminhos (`.ts\|.tsx\|.js\|.jsx`) | truncou `translation.json` → `translation.js`, "arquivo inexistente" | **teria acusado 3 lotes de fabricar evidência** |
| 3 | `^import .*from` (linha única) | acusou 29 arquivos de teste de não importar nada; o correto é **6** | teria refutado, erradamente, o achado mais valioso do L11 |
| 4 | `\.from(` para detectar acesso a banco | casou `Array.from({length: n})` em `components/ui` | 2 componentes de UI acusados de tocar o banco |

**Todos os quatro foram pegos porque testei o critério antes de publicar.** É a disciplina que a própria auditoria prescreve ("antes de endossar lista de código morto, teste o critério de detecção dela") — e eu precisei dela quatro vezes no meu próprio trabalho.

**Implicação honesta:** os lotes usaram grep extensivamente. Eu validei os critérios **deles** por amostragem, não exaustivamente. Dado que **meu** índice de erro em critérios de detecção foi de 4 em ~10 tentativas, é razoável supor que exista **falso-positivo residual nas listas de órfãos dos lotes**. Vários lotes declararam ter reconfirmado com grep restrito (`import X`, `<X `) — mas isso não foi verificado por mim caso a caso.

**Recomendação prática: antes de apagar qualquer coisa da lista de ⬛, reconfirme aquele símbolo específico.** Não trate a lista como autorização para remoção em lote.

---

## Afirmações positivas — todas verificadas por mim, todas se sustentam

Verifiquei o que publiquei de bom, porque elogio não medido é tão ruim quanto crítica não medida.

| Afirmação publicada | Minha verificação | Veredito |
|---|---|---|
| "107 importações de fora para dentro de `src/features/`" | `grep -rn "from '@/features/" src/ \| grep -v "^src/features/"` → **107** | ✅ **exato** |
| "Todas as 162 tabelas com RLS habilitado" | `pg_class.relrowsecurity` → **162 com RLS, 0 sem** | ✅ **exato** |
| "53 imports lazy → 53 arquivos existentes" | 53 `lazy(() => import(`; alvos inexistentes: **0** | ✅ **exato** |
| "96 dos 101 arquivos de teste importam o alvo real" | **95** importam módulo local; 6 não (5 espelhos + 1 suíte pulada) | 🟨 **1 de folga** — e meu teste ("importa algum módulo local") é **mais fraco** que a afirmação ("importa o alvo que diz testar"), que não consegui verificar barato |
| "`types.ts` 100% sincronizado com o banco" | 156 tabelas + 3 views batendo; diferença de 6 = as 6 tabelas-lixo `v_*`, com 0 ocorrências em `types.ts` | ✅ confirmado |

As contagens declaradas nos resumos dos 11 lotes também conferem com a soma que usei — a aritmética está correta. **O problema nunca foi a soma; foi somar coisas diferentes.**

---

## Lacunas que permanecem abertas

| Lacuna | Por quê |
|---|---|
| **Duplicação semântica não quantificada** | Exigiria normalizar 532 sujeitos escritos em prosa livre |
| **Achados de gravidade média não reproduzidos** | Verifiquei os severos. Os médios seguem com a evidência do lote — sempre com `arquivo:linha` conferível |
| **Falso-positivo residual nas listas de ⬛** | Validei critérios dos lotes por amostragem, não exaustivamente. Ver recomendação acima |
| **Corretude das 324 policies RLS** | Só a existência foi medida. Continua `NAO_VERIFICADO` |
| **Nenhuma execução da aplicação em navegador** | Nada foi confirmado por observação visual |
| **Cruzamento componentes×telas e edge functions×telas** | Fiz apenas hooks×telas. Provavelmente há mais ✅ inflados |

---

## Veredito da meta-auditoria

**As conclusões do documento executivo se sustentam. A precisão de um dos números, não.**

O que muda:
- O "48,5% implementado" deve ser lido como **unidades de código com fio fechado**, não como funcionalidades de negócio prontas — e está **inflado em pelo menos 10 unidades**
- Duas linhas de tabela do `L01` estão erradas (Passkey e KPIs do Dashboard)
- A justificativa da amostragem de `components/ui` estava incorreta, embora a decisão fosse segura

O que **não** muda:
- Os 5 riscos estruturais do documento executivo, todos verificados independentemente
- O bypass de autenticação (confirmado por 3 fontes + reprodução minha)
- A não-reconstrutibilidade do ambiente (verificada duas vezes, por métodos diferentes)
- Os 61% de tabelas vazias e os 13 módulos zerados — medição direta, imune ao defeito de unidade
- O diagnóstico central: **sistema construído com competência e nunca ligado**

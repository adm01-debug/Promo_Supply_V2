# `scripts/lib/` — biblioteca compartilhada dos scripts

Um arquivo, duas funções, nenhum efeito colateral: importar não executa nada.

## `seguranca-processo.mjs`

| Export | Para que serve |
|---|---|
| `RAIZ_REPO` | raiz do repositório, derivada da posição do próprio arquivo (duas pastas acima) |
| `RAIZES_PERMITIDAS` | raízes onde os scripts legitimamente leem/escrevem: o repo e os diretórios temporários |
| `resolverExecutavel(cmd)` | caminho **absoluto** do binário antes de criar processo filho; lança se não existir no `PATH` |
| `resolverCaminhoPermitido(valor, rotulo)` | recusa caminho vindo de `argv`/env que escape das raízes permitidas (path traversal); **fail-closed**: lança |
| `estaDentro(raiz, candidato)` | verdadeiro quando `candidato` está dentro de `raiz` |

**Quem importa:** `scripts/ci/check-test-inventory.mjs` e `scripts/ci/audit-prod.mjs`
(`resolverExecutavel`, antes de chamar `git` e `bun`).

**Por que existe:** passar `env: { PATH: '<fixo>' }` para `spawnSync` não resolve o problema — e piora,
porque troca o binário resolvido e pode pular um shim de guarda do ambiente. Resolver o caminho absoluto
pelo `PATH` de quem chamou preserva exatamente o binário que o shell resolveria.

**Teste:** `seguranca-processo.test.mjs`, executado por `guards.yml` → `node --test scripts/lib/*.test.mjs`.
Uma das asserções confere `package.json#name` para provar que `RAIZ_REPO` resolveu a raiz certa; o valor
esperado é o **medido** (`vite_react_shadcn_ts`, nome do template Lovable que o repo ainda carrega), não o
desejado — se o pacote for renomeado, atualize a asserção junto.

Veio do `Zapp_Web_V2`; a única diferença é esse nome de pacote.

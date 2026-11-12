# Workflows de CI — o que cada um faz

> **Gerado por `scripts/ci/render-workflow-docs.mjs`.** Não edite à mão: o CI roda
> `--check` e falha se este arquivo divergir do bloco `# docs:` de cada workflow.
> Para mudar o que está aqui, mude o bloco no YAML.

**9 workflows.**

| Workflow | Arquivo | Gatilho | O que prova | Quando falha | Quem é avisado | Custo/sem (min) | Falha (7 d) |
|---|---|---|---|---|---|---|---|
| Automação local | [`automation-local.yml`](../../.github/workflows/automation-local.yml) | PR para main, push em main e execução manual. | Contratos estáticos e suites locais de automação em fixtures isoladas. | O job falha; nenhum patch, commit, publicação ou deploy é executado. | O check fica vermelho no GitHub para o autor da PR e mantenedores. | — | — |
| Branch Hygiene Audit | [`branch-hygiene-audit.yml`](../../.github/workflows/branch-hygiene-audit.yml) | agendado (segunda 09:34 UTC) e dispatch | branches podaveis, PRs paradas ha mais de 7 dias, versoes da toolchain e SLA dos alertas de code scanning | SLA vencido deixa o job vermelho e publica o diagnostico se o relatorio foi gerado | issue `[branch-hygiene]` (relatorio) e issue `[kpi-actions]` (custo do Actions) | — | — |
| Contexto para agentes de IA (10 min) | [`contexto.yml`](../../.github/workflows/contexto.yml) | push em main que toque código, banco, scripts das automações ou docs/contexto/regras/manual/; a cada 10 min (minuto 3); dispatch | branch contexto com docs/contexto/{codigo,supabase,regras}/ regerados das três fontes de verdade (código em main, banco oficial, código+migrations+manual/) e docs/contexto/00-INDEX.md montado a partir dos manifests | falha fatal de produtor reprova o workflow; fontes com artefato publicam e as demais mantêm a última versão; erro de download impede a publicação | ninguém (a branch contexto é a prova; errors.md em supabase/ e erros_do_gerador em codigo/ listam seções com falha) | — | — |
| Dependency Review | [`dependency-review.yml`](../../.github/workflows/dependency-review.yml) | PR para main. | Nenhuma dependência nova do PR tem vulnerabilidade conhecida de severidade alta ou crítica. | O job falha listando a dependência e o CVE; PRs do Dependabot e de forks são pulados. | O check fica vermelho no GitHub para o autor da PR. | — | — |
| Guards offline do repositorio | [`guards.yml`](../../.github/workflows/guards.yml) | pull_request e push em main (jobs de node puro); o job do bundle so em push em main e dispatch | docs/ci/README.md e docs/mapa/MATRIZ_EDGE_TABELA.md batem com o repo, toda suite de scripts/ roda, mensagens de commit no padrao, nenhum advisory HIGH/CRITICAL em dependencia de producao e nenhum JWT service_role no bundle publicado | o check fica vermelho; nao ha branch protection neste repo, entao quem mergeia e responsavel por ler o resultado | ninguem (o resultado do check e a prova); falha em push na main abre issue pelo notifica-falha-main.yml | — | — |
| Inventário do estado real (semanal) | [`inventario-estado-semanal.yml`](../../.github/workflows/inventario-estado-semanal.yml) | agendado (seg 10:41 UTC) e dispatch | inventario/estado (banco, rotas, edges) regerado do banco do projeto e do codigo | rotas/edges quebrados deixam o job vermelho; no agendado, banco sem secret so avisa | PR automation/inventario-estado com o inventario novo | — | — |
| Freight Quest CI/CD | [`main.yml`](../../.github/workflows/main.yml) | push em main/develop e pull_request para main | lint, typecheck, guard de integridade do AGENTS.md (em PR), Vitest do front, testes Deno das edges e E2E Playwright | o check fica vermelho; nao ha branch protection neste repo, entao quem mergeia e responsavel por ler o resultado | ninguem no PR; falha na main abre issue pelo notifica-falha-main.yml | — | — |
| Notifica falha na main | [`notifica-falha-main.yml`](../../.github/workflows/notifica-falha-main.yml) | workflow_run (conclusao dos workflows deste repo na main) | issue `[falha-main]` aberta (ou comentada) quando um workflow termina em failure, startup_failure ou timed_out na main | a falha do workflow original fica sem issue de acompanhamento | o dono, pela issue `[falha-main] <workflow> falhou na main` com label `falha-main` | — | — |
| types-sync | [`types-sync.yml`](../../.github/workflows/types-sync.yml) | push na main que toque supabase/migrations ou scripts/types-sync; a cada 10 min (minuto 7); dispatch | src/integrations/supabase/types.ts gerado do banco oficial bate com o commitado (Gates 1 e 2) | PR em `automation/types-sync` ou issue `[types-sync]`; nunca passa com tipo divergente | PR de types e issue de gate | — | — |

## Detalhe

### Automação local (`automation-local.yml`)

- **Gatilho:** PR para main, push em main e execução manual.
- **O que prova:** Contratos estáticos e suites locais de automação em fixtures isoladas.
- **Quando falha:** O job falha; nenhum patch, commit, publicação ou deploy é executado.
- **Quem é avisado:** O check fica vermelho no GitHub para o autor da PR e mantenedores.

### Branch Hygiene Audit (`branch-hygiene-audit.yml`)

- **Gatilho:** agendado (segunda 09:34 UTC) e dispatch
- **O que prova:** branches podaveis, PRs paradas ha mais de 7 dias, versoes da toolchain e SLA dos alertas de code scanning
- **Quando falha:** SLA vencido deixa o job vermelho e publica o diagnostico se o relatorio foi gerado
- **Quem é avisado:** issue `[branch-hygiene]` (relatorio) e issue `[kpi-actions]` (custo do Actions)

### Contexto para agentes de IA (10 min) (`contexto.yml`)

- **Gatilho:** push em main que toque código, banco, scripts das automações ou docs/contexto/regras/manual/; a cada 10 min (minuto 3); dispatch
- **O que prova:** branch contexto com docs/contexto/{codigo,supabase,regras}/ regerados das três fontes de verdade (código em main, banco oficial, código+migrations+manual/) e docs/contexto/00-INDEX.md montado a partir dos manifests
- **Quando falha:** falha fatal de produtor reprova o workflow; fontes com artefato publicam e as demais mantêm a última versão; erro de download impede a publicação
- **Quem é avisado:** ninguém (a branch contexto é a prova; errors.md em supabase/ e erros_do_gerador em codigo/ listam seções com falha)

### Dependency Review (`dependency-review.yml`)

- **Gatilho:** PR para main.
- **O que prova:** Nenhuma dependência nova do PR tem vulnerabilidade conhecida de severidade alta ou crítica.
- **Quando falha:** O job falha listando a dependência e o CVE; PRs do Dependabot e de forks são pulados.
- **Quem é avisado:** O check fica vermelho no GitHub para o autor da PR.

### Guards offline do repositorio (`guards.yml`)

- **Gatilho:** pull_request e push em main (jobs de node puro); o job do bundle so em push em main e dispatch
- **O que prova:** docs/ci/README.md e docs/mapa/MATRIZ_EDGE_TABELA.md batem com o repo, toda suite de scripts/ roda, mensagens de commit no padrao, nenhum advisory HIGH/CRITICAL em dependencia de producao e nenhum JWT service_role no bundle publicado
- **Quando falha:** o check fica vermelho; nao ha branch protection neste repo, entao quem mergeia e responsavel por ler o resultado
- **Quem é avisado:** ninguem (o resultado do check e a prova); falha em push na main abre issue pelo notifica-falha-main.yml

### Inventário do estado real (semanal) (`inventario-estado-semanal.yml`)

- **Gatilho:** agendado (seg 10:41 UTC) e dispatch
- **O que prova:** inventario/estado (banco, rotas, edges) regerado do banco do projeto e do codigo
- **Quando falha:** rotas/edges quebrados deixam o job vermelho; no agendado, banco sem secret so avisa
- **Quem é avisado:** PR automation/inventario-estado com o inventario novo

### Freight Quest CI/CD (`main.yml`)

- **Gatilho:** push em main/develop e pull_request para main
- **O que prova:** lint, typecheck, guard de integridade do AGENTS.md (em PR), Vitest do front, testes Deno das edges e E2E Playwright
- **Quando falha:** o check fica vermelho; nao ha branch protection neste repo, entao quem mergeia e responsavel por ler o resultado
- **Quem é avisado:** ninguem no PR; falha na main abre issue pelo notifica-falha-main.yml

### Notifica falha na main (`notifica-falha-main.yml`)

- **Gatilho:** workflow_run (conclusao dos workflows deste repo na main)
- **O que prova:** issue `[falha-main]` aberta (ou comentada) quando um workflow termina em failure, startup_failure ou timed_out na main
- **Quando falha:** a falha do workflow original fica sem issue de acompanhamento
- **Quem é avisado:** o dono, pela issue `[falha-main] <workflow> falhou na main` com label `falha-main`

### types-sync (`types-sync.yml`)

- **Gatilho:** push na main que toque supabase/migrations ou scripts/types-sync; a cada 10 min (minuto 7); dispatch
- **O que prova:** src/integrations/supabase/types.ts gerado do banco oficial bate com o commitado (Gates 1 e 2)
- **Quando falha:** PR em `automation/types-sync` ou issue `[types-sync]`; nunca passa com tipo divergente
- **Quem é avisado:** PR de types e issue de gate

## O que NÃO é bug

> Comportamentos que parecem erros mas são design intencional.
> Cada item vem do bloco `# nao-e-bug:` do YAML do workflow.

| Workflow | Situação | Por quê não é bug |
|---|---|---|
| [`branch-hygiene-audit.yml`](../../.github/workflows/branch-hygiene-audit.yml) | **code-scanning-vazio** | este repo nao tem code scanning ligado, entao a consulta devolve 403 "Code scanning is not enabled for this repository", o passo avisa e segue (o SLA passa a valer no dia em que o dono ligar) |
| [`branch-hygiene-audit.yml`](../../.github/workflows/branch-hygiene-audit.yml) | **nada-podavel** | relatorio sem nenhuma branch listada significa que nao ha branch patch-equivalente a main com mais de 7 dias |
| [`contexto.yml`](../../.github/workflows/contexto.yml) | **sem-commit** | "nada mudou" no publicar significa que nenhuma das três fontes mudou desde a última publicação |
| [`contexto.yml`](../../.github/workflows/contexto.yml) | **metricas** | métricas/manifests do banco aguardam 60 min desde a coleta publicada; commits de código não reiniciam o prazo; data ausente/inválida/futura e mudanças de saúde/estado do índice publicam sem espera |
| [`contexto.yml`](../../.github/workflows/contexto.yml) | **banco-pulado** | sem o secret SUPABASE_DB_URL o job do banco sai verde com aviso e a pasta supabase/ fica como estava |
| [`guards.yml`](../../.github/workflows/guards.yml) | **doc-desatualizada** | `--check` vermelho significa que o YAML mudou e a doc gerada nao foi regerada; rode o gerador e comite, nao edite o .md |
| [`guards.yml`](../../.github/workflows/guards.yml) | **suite-orfa** | check-test-inventory vermelho significa que uma suite nova de scripts/ nao tem passo que a execute em nenhum workflow |
| [`guards.yml`](../../.github/workflows/guards.yml) | **bundle-so-na-main** | o job do bundle precisa de `bun run build` (minutos de Actions em repo privado), entao roda no push que vai para producao, nao em cada PR |
| [`main.yml`](../../.github/workflows/main.yml) | **nome-do-arquivo** | o `name:` ainda e "Freight Quest CI/CD", herdado de outro projeto; renomear quebraria a lista de `workflows:` do notifica-falha-main.yml, que casa por nome |
| [`main.yml`](../../.github/workflows/main.yml) | **deno-faixa-flutuante** | `deno-version: v1.x` nao e versao fixa de proposito, e por isso deno NAO esta em .github/toolchain.json |
| [`main.yml`](../../.github/workflows/main.yml) | **e2e-com-placeholder** | sem os secrets VITE_*, o E2E sobe o dev server com valores de placeholder e falha nos fluxos logados |
| [`notifica-falha-main.yml`](../../.github/workflows/notifica-falha-main.yml) | **sem-comentario** | falha repetida do mesmo workflow dentro de 6 h nao gera comentario novo (a issue aberta ja aponta o problema); a janela existe para o contexto.yml, que roda a cada 10 min, nao transformar a issue em 144 comentarios por dia |
| [`notifica-falha-main.yml`](../../.github/workflows/notifica-falha-main.yml) | **issue-aberta-depois-do-verde** | a issue nao fecha sozinha; quem corrigiu fecha a issue (nenhum workflow sabe dizer que a causa raiz foi resolvida) |
| [`types-sync.yml`](../../.github/workflows/types-sync.yml) | **banco-pulado** | sem o secret SUPABASE_DB_URL o job sai VERDE com aviso no agendamento e no push; no workflow_dispatch falha de proposito, para a pessoa ver |
| [`types-sync.yml`](../../.github/workflows/types-sync.yml) | **sem-pr-novo** | "nada mudou" quando o PR de sync ja esta aberto com o mesmo types.ts — create-pull-request nao cria commit identico |
| [`types-sync.yml`](../../.github/workflows/types-sync.yml) | **debounce** | se o PR de sync tem commit com menos de 20 min, o run e pulado (cadencia de 10 min nao deve empilhar commit) |
| [`types-sync.yml`](../../.github/workflows/types-sync.yml) | **TYPES_SYNC_PR_TOKEN ausente** | esperado — o workflow usa GITHUB_TOKEN; o passo "Destravar os checks" aprova os runs com actions:write |

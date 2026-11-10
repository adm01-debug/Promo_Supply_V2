# Automação local — Promo_Supply_V2

O dispatcher `scripts/automation.mjs` liga as suites, o motor de manutenção e o adaptador de grafo. O perfil versionado `scripts/automation.config.json` é a fonte dos aliases e do registro exato de scripts. Apenas ferramentas determinísticas locais: não há chamadas de IA nem cobrança de API de IA. O CI usa minutos do GitHub Actions sujeitos ao plano da conta; execução local usa os recursos da máquina.

## Comandos

| Alias | Comando executado | Efeito |
|---|---|---|
| `automation:doctor` | `node scripts/automation.mjs doctor` | Verifica arquivos, aliases, registros e instalação local de hooks. |
| `automation:test` | `node scripts/automation.mjs test` | Roda exclusivamente as suites registradas abaixo. |
| `automation:check` | `node scripts/automation.mjs check --ref HEAD` | Inspeciona a referência HEAD em worktree isolada. |
| `automation:heal` | `node scripts/automation.mjs heal --ref origin/main` | Propõe e valida correções limitadas a partir de origin/main; não faz push. |
| `automation:nightly` | `node scripts/automation.mjs nightly --ref origin/main` | Atualiza o grafo e tenta manutenção isolada; relata as duas falhas independentemente. |
| `automation:graph` | `node scripts/automation.mjs graph` | Encaminha subcomandos do grafo; acrescente status, query, path ou explain. |
| `automation:status` | `node scripts/automation.mjs graph status` | Mostra a situação local do grafo. |
| `automation:install-hooks` | `node scripts/automation.mjs install-hooks` | Instala pontes locais reversíveis, encadeando hooks originais. |
| `automation:uninstall-hooks` | `node scripts/automation.mjs uninstall-hooks` | Restaura o hooksPath anterior, recusando sobrescrever alteração de terceiros. |

O comando estático para CI é `node scripts/automation.mjs doctor --static`. Ele verifica contratos; não comprova merge, execução remota, timer ou ponte instalada. `doctor` sem `--static` também exige a instalação local. Ausência de dependência é erro explícito; o dispatcher não instala pacotes automaticamente.

## Gatilhos e ativação

| Gatilho | Cadeia real de execução | Ativação |
|---|---|---|
| PR para main / push em main / dispatch | `.github/workflows/automation-local.yml` → `doctor --static` → `test` → suites exatas do perfil | Workflow versionado; atividade remota depende de publicação/merge e run observado. |
| pre-commit com tooling staged | Ponte privada → hook original → `automation.mjs hook pre-commit` → suites registradas | `automation:install-hooks` instala por clone; não é instalado pelo prepare. |
| pre-push | Ponte privada → hook original → doctor local → suites registradas | A mesma instalação local; erro bloqueia a operação. |
| Fontes staged / post-commit / post-merge / post-checkout | Ponte privada → hook original → adaptador de grafo marca estado sujo | Não reconstrói grafo durante commit nem altera staging. |
| Noturno local, previsto 04:30 | Callback externo `repo-automation-nightly` → `automation.mjs nightly --ref origin/main` → graph ensure + motor heal | Configuração do timer fica fora do repositório, sob responsabilidade do runtime local. Este perfil declara o comando e não afirma timer ativo. |

A ponte privada fica em `.tools/repo-automation/`; não substitui os arquivos Husky. Preserva erros, argumentos e stdin dos hooks originais, incluindo commit-msg. `prepare`, hooks e guards existentes foram preservados. Para reverter, use `automation:uninstall-hooks`. `nightly.file` não é definido enquanto não houver callback real validável; nenhum arquivo fictício é usado como evidência de agendamento. O runtime deve conferir `systemctl --user status` e a cadeia do callback instalado antes de declarar o timer ativo.

## Suites efetivamente executadas

- `scripts/automation.unit.mjs`
- `scripts/maintenance/maintenance.unit.mjs`
- `scripts/graphify-local.unit.mjs`

O inventário de testes legado reconhece apenas paths literais em run/imports. O CI também executa explicitamente as suites core e graph para satisfazer esse contrato; a manutenção já tem agregador em `scripts/ci/maintenance.unit.mjs`. Essa repetição é limitada a esses dois contratos novos.

As suites usam fixtures descartáveis e não executam os scripts operacionais do inventário. O motor mantém isolamento de rede, validações obrigatórias, escopo e quotas; um gate herdado vermelho bloqueia o patch. Nenhuma referência, tipo gerado, configuração de produção ou regra de negócio é alterada para forçar verde. O grafo usa o perfil específico `graphify.local.json`; seu estado local fica em `.tools/graphify/local-state/`.

## Registro exato dos demais scripts

Os registros `legacy` abaixo preservam ferramentas anteriores e seus chamadores; não são incluídos automaticamente no novo pipeline. Referência literal indica onde o arquivo é citado, sem garantir que esse caminho rode nem autorização para executar operações contra serviços. Sem referência, o arquivo é mantido manual porque função, parâmetros e ambiente precisam de revisão antes de ativar qualquer gatilho. Scripts novos não cobertos por registro fazem `doctor --static` falhar; não existe registro genérico `scripts/**` para ocultá-los.

| Arquivo exato | Invocação manual de inventário | Chamadores literais / justificativa |
|---|---|---|
| `scripts/ai-context/cenarios.mjs` | `node scripts/ai-context/cenarios.mjs` | .github/workflows/contexto.yml |
| `scripts/ai-context/gerar.mjs` | `node scripts/ai-context/gerar.mjs` | package.json:scripts, .github/workflows/contexto.yml |
| `scripts/ai-context/gerar.unit.mjs` | `node --test scripts/ai-context/gerar.unit.mjs` | .github/workflows/contexto.yml |
| `scripts/ci/actions-kpi.mjs` | `node scripts/ci/actions-kpi.mjs` | package.json:scripts, .github/workflows/branch-hygiene-audit.yml, .github/workflows/guards.yml, .github/workflows/main.yml |
| `scripts/ci/actions-kpi.unit.mjs` | `node --test scripts/ci/actions-kpi.unit.mjs` | package.json:scripts, .github/workflows/guards.yml, .github/workflows/main.yml |
| `scripts/ci/agents-docs-baseline.unit.mjs` | `node --test scripts/ci/agents-docs-baseline.unit.mjs` | package.json:scripts, .github/workflows/guards.yml, .github/workflows/main.yml |
| `scripts/ci/ai-context-generator.unit.mjs` | `node --test scripts/ci/ai-context-generator.unit.mjs` | package.json:scripts, .github/workflows/guards.yml, .github/workflows/main.yml |
| `scripts/ci/audit-prod.mjs` | `node scripts/ci/audit-prod.mjs` | package.json:scripts, .github/workflows/guards.yml, .github/workflows/main.yml |
| `scripts/ci/audit-prod.unit.mjs` | `node --test scripts/ci/audit-prod.unit.mjs` | package.json:scripts, .github/workflows/guards.yml, .github/workflows/main.yml |
| `scripts/ci/branch-podaveis.mjs` | `node scripts/ci/branch-podaveis.mjs` | package.json:scripts, .github/workflows/branch-hygiene-audit.yml, .github/workflows/guards.yml, .github/workflows/main.yml |
| `scripts/ci/branch-podaveis.unit.mjs` | `node --test scripts/ci/branch-podaveis.unit.mjs` | package.json:scripts, .github/workflows/guards.yml, .github/workflows/main.yml |
| `scripts/ci/bump-toolchain.mjs` | `node scripts/ci/bump-toolchain.mjs` | package.json:scripts, .github/workflows/branch-hygiene-audit.yml, .github/workflows/guards.yml, .github/workflows/main.yml |
| `scripts/ci/check-agents-md-integrity.mjs` | `node scripts/ci/check-agents-md-integrity.mjs` | package.json:scripts, .github/workflows/guards.yml, .github/workflows/main.yml |
| `scripts/ci/check-bundle-secrets.mjs` | `node scripts/ci/check-bundle-secrets.mjs` | package.json:scripts, .github/workflows/guards.yml, .github/workflows/main.yml |
| `scripts/ci/check-bundle-secrets.unit.mjs` | `node --test scripts/ci/check-bundle-secrets.unit.mjs` | package.json:scripts, .github/workflows/guards.yml, .github/workflows/main.yml |
| `scripts/ci/check-test-inventory.mjs` | `node scripts/ci/check-test-inventory.mjs` | package.json:scripts, .github/workflows/guards.yml, .github/workflows/main.yml |
| `scripts/ci/check-test-inventory.unit.mjs` | `node --test scripts/ci/check-test-inventory.unit.mjs` | package.json:scripts, .github/workflows/guards.yml, .github/workflows/main.yml |
| `scripts/ci/commit-msg-lint.mjs` | `node scripts/ci/commit-msg-lint.mjs` | package.json:scripts, .github/workflows/guards.yml, .github/workflows/main.yml |
| `scripts/ci/commit-msg-lint.unit.mjs` | `node --test scripts/ci/commit-msg-lint.unit.mjs` | package.json:scripts, .github/workflows/guards.yml, .github/workflows/main.yml |
| `scripts/ci/gerar-matriz-edge-tabela.mjs` | `node scripts/ci/gerar-matriz-edge-tabela.mjs` | package.json:scripts, .github/workflows/guards.yml, .github/workflows/main.yml |
| `scripts/ci/gerar-matriz-edge-tabela.unit.mjs` | `node --test scripts/ci/gerar-matriz-edge-tabela.unit.mjs` | package.json:scripts, .github/workflows/guards.yml, .github/workflows/main.yml |
| `scripts/ci/maintenance.unit.mjs` | `node --test scripts/ci/maintenance.unit.mjs` | package.json:scripts, .github/workflows/guards.yml, .github/workflows/main.yml |
| `scripts/ci/regras-negocio.unit.mjs` | `node --test scripts/ci/regras-negocio.unit.mjs` | package.json:scripts, .github/workflows/guards.yml, .github/workflows/main.yml |
| `scripts/ci/render-workflow-docs.mjs` | `node scripts/ci/render-workflow-docs.mjs` | package.json:scripts, .github/workflows/guards.yml, .github/workflows/main.yml |
| `scripts/ci/render-workflow-docs.unit.mjs` | `node --test scripts/ci/render-workflow-docs.unit.mjs` | package.json:scripts, .github/workflows/guards.yml, .github/workflows/main.yml |
| `scripts/ci/sla-code-scanning.mjs` | `node scripts/ci/sla-code-scanning.mjs` | package.json:scripts, .github/workflows/branch-hygiene-audit.yml, .github/workflows/guards.yml, .github/workflows/main.yml |
| `scripts/ci/sla-code-scanning.unit.mjs` | `node --test scripts/ci/sla-code-scanning.unit.mjs` | package.json:scripts, .github/workflows/guards.yml, .github/workflows/main.yml |
| `scripts/ci/supabase-snapshot.unit.mjs` | `node --test scripts/ci/supabase-snapshot.unit.mjs` | package.json:scripts, .github/workflows/guards.yml, .github/workflows/main.yml |
| `scripts/ci/toolchain-schedule.unit.mjs` | `node --test scripts/ci/toolchain-schedule.unit.mjs` | package.json:scripts, .github/workflows/guards.yml, .github/workflows/main.yml |
| `scripts/ci/workflow-test-support.mjs` | `node scripts/ci/workflow-test-support.mjs` | package.json:scripts, .github/workflows/guards.yml, .github/workflows/main.yml |
| `scripts/db-explain-analyze.ts` | `bun scripts/db-explain-analyze.ts` | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/inventario/gerar-banco.mjs` | `node scripts/inventario/gerar-banco.mjs` | .github/workflows/inventario-estado-semanal.yml |
| `scripts/inventario/gerar-repo.mjs` | `node scripts/inventario/gerar-repo.mjs` | .github/workflows/inventario-estado-semanal.yml |
| `scripts/inventario/gerar-rotas.mjs` | `node scripts/inventario/gerar-rotas.mjs` | .github/workflows/inventario-estado-semanal.yml |
| `scripts/inventario/mudou-conteudo.mjs` | `node scripts/inventario/mudou-conteudo.mjs` | .github/workflows/inventario-estado-semanal.yml |
| `scripts/lib/seguranca-processo.mjs` | `node scripts/lib/seguranca-processo.mjs` | package.json:scripts, .github/workflows/guards.yml, .github/workflows/main.yml |
| `scripts/lib/seguranca-processo.test.mjs` | `node --test scripts/lib/seguranca-processo.test.mjs` | package.json:scripts, .github/workflows/guards.yml, .github/workflows/main.yml |
| `scripts/realtime-audit.ts` | `bun scripts/realtime-audit.ts` | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/regras_negocio/generate.py` | `python3 scripts/regras_negocio/generate.py` | package.json:scripts, .github/workflows/contexto.yml |
| `scripts/regras_negocio/indice.py` | `python3 scripts/regras_negocio/indice.py` | package.json:scripts, .github/workflows/contexto.yml |
| `scripts/regras_negocio/publish.sh` | `sh scripts/regras_negocio/publish.sh` | .github/workflows/contexto.yml |
| `scripts/regras_negocio/test_generate.py` | `python3 scripts/regras_negocio/test_generate.py` | .github/workflows/contexto.yml |
| `scripts/rls-audit.ts` | `bun scripts/rls-audit.ts` | .github/workflows/main.yml |
| `scripts/squash-migrations.sh` | `sh scripts/squash-migrations.sh` | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/stress-test.ts` | `bun scripts/stress-test.ts` | Sem chamador literal; manter manual e revisar parâmetros/ambiente antes de executar. |
| `scripts/supabase_snapshot/snapshot.py` | `python3 scripts/supabase_snapshot/snapshot.py` | package.json:scripts, .github/workflows/contexto.yml |
| `scripts/supabase_snapshot/test_snapshot.py` | `python3 scripts/supabase_snapshot/test_snapshot.py` | .github/workflows/contexto.yml |
| `scripts/types-sync/check-remocoes-destrutivas.mjs` | `node scripts/types-sync/check-remocoes-destrutivas.mjs` | .github/workflows/types-sync.yml |
| `scripts/types-sync/gen-types.sh` | `sh scripts/types-sync/gen-types.sh` | .github/workflows/types-sync.yml |
| `scripts/types-sync/identidade-banco.mjs` | `node scripts/types-sync/identidade-banco.mjs` | .github/workflows/types-sync.yml |
| `scripts/types-sync/install-pgbouncer.sh` | `sh scripts/types-sync/install-pgbouncer.sh` | .github/workflows/types-sync.yml |
| `scripts/types-sync/install-postgresql-client.sh` | `sh scripts/types-sync/install-postgresql-client.sh` | .github/workflows/types-sync.yml |
| `scripts/types-sync/local-pg-proxy.mjs` | `node scripts/types-sync/local-pg-proxy.mjs` | .github/workflows/types-sync.yml |
| `scripts/types-sync/typecheck-ratchet.mjs` | `node scripts/types-sync/typecheck-ratchet.mjs` | .github/workflows/types-sync.yml |
| `scripts/validate-bridge.ts` | `bun scripts/validate-bridge.ts` | package.json:scripts |

## Hooks e workflows anteriores

Hooks inventariados: `(default do Git)` era o hooksPath observado. A tabela registra os arquivos, sem afirmar bootstrap instalado ou execução efetiva em outro clone. O registro legacy desses hooks limita apenas execução arbitrária pelo dispatcher; o Git e a ponte preservam os gatilhos originais.

| Hook exato | Gatilho Git original | Referência de inventário |
|---|---|---|
| Nenhum hook versionado inventariado | — | A instalação do novo kit é independente. |

Workflows anteriores preservados: 7. Os gatilhos e condições de cada arquivo continuam definidos no YAML original; esta listagem não os promove ao novo pipeline e não executa suas operações.

- `.github/workflows/branch-hygiene-audit.yml`
- `.github/workflows/contexto.yml`
- `.github/workflows/guards.yml`
- `.github/workflows/inventario-estado-semanal.yml`
- `.github/workflows/main.yml`
- `.github/workflows/notifica-falha-main.yml`
- `.github/workflows/types-sync.yml`

Os helpers dos corretores anteriores são cobertos por suites de regressão em fixtures; a chamada operacional original continua no respectivo hook/workflow. Os quatro registros principais e helpers ficam explícitos no JSON, sem globs para novos arquivos.

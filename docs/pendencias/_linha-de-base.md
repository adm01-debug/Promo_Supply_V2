# Linha de base de regressão — Promo_Supply_V2

Data: 2026-11-26 · Branch origem: `main` @ `3e84319c` · Auditoria: `docs/auditoria-implementacao-261120.md` (commit `063d9a4c`, branch `claude/clever-ptolemy-8z7y27`)

## Battery (repo padrão)
| Checagem | Comando | Resultado |
|---|---|---|
| Typecheck | `npm run typecheck` | exit 0 |
| Lint | `npx eslint .` | 0 errors / 9 warnings |
| Testes | `npx vitest run` | 2328 passed / 12 skipped (113 files) |
| Guards | `npm run guards` | test:scripts 542 pass/0 fail; inventory OK; docs/ci OK; matriz OK |

## Regra de validacao (todo item)
Cada correção/feature, antes de PR: `typecheck` + `lint` + `vitest` nos arquivos tocados, e algum teste novo que falhe sem a mudança (quando comportamental). Erro herdado do main vai para "Próximos passos", não bloqueia a PR.

## Estado do runtime (NÃO VERIFICADO nesta fase)
- 99/162 tabelas vazias (ESTADO_ATUAL.md) — histór ia pendente.
- Paridade edges repo 37 = 37 deployed, sem órfãos (validado em sessão anterior, #164-#166).
- Secrets/Vault, cron jobs vivos e gradiente prod não revalidados aqui — ver item `runtime-audit`.

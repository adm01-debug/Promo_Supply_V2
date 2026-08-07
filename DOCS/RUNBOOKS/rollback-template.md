# Runbook: Rollback de Migração

> Template padrão. Duplicar como `rollback-<YYYYMMDDHHMMSS>-<slug>.md` a cada
> migration nova e preencher antes do merge.

## Identificação

- **Migration file:** `supabase/migrations/<timestamp>_<slug>.sql`
- **Autor:** <@handle>
- **Data:** YYYY-MM-DD
- **Risco:** Baixo · Médio · **Alto**
- **Janela recomendada de rollback:** ex. até 24h após deploy

## O que a migração faz (resumo em 1 parágrafo)

<Descreva em uma frase o efeito no schema.>

## Impacto em produção

- Tabelas tocadas: `...`
- Policies alteradas: `...`
- Funções/triggers alterados: `...`
- Downstream (frontend/edge functions) que precisa ser revertido junto: `...`

## Como reverter

### 1. SQL de rollback (executar como service_role)

```sql
-- Reverter na ordem inversa da migração original.
-- Exemplo:
-- DROP POLICY IF EXISTS "..." ON public.<tabela>;
-- ALTER TABLE public.<tabela> DROP COLUMN IF EXISTS <coluna>;
-- DROP FUNCTION IF EXISTS public.<fn>(<sig>);
```

### 2. Reverter código frontend / edge functions

- Revert commit(s): `<sha1> <sha2>`
- Redeploy edge functions afetadas.

### 3. Validação pós-rollback

- [ ] `bunx vitest run --config ./vitest.rls.config.ts`
- [ ] Smoke test manual: <URL>
- [ ] Confirmar que dashboards críticos abrem sem erro.
- [ ] `supabase--linter` sem novos ERRORs.

## Dados a preservar

<Se o rollback destrói dados, exportar antes:
`psql -c "COPY (SELECT ...) TO STDOUT WITH CSV HEADER" > backup.csv`>

## Comunicação

- Anunciar em `#eng-ops` antes de executar.
- Registrar em `audit_logs` com `action_type='migration_rollback'`.

## Postmortem (após rollback)

- Causa raiz:
- Sinal que disparou o rollback:
- Ação preventiva:

# Auditoria de Código — 2026 Q3

Data: 2026-07-13
Escopo: `src/`, `supabase/functions/`, migrations, CI, docs.

## Sumário Executivo

Projeto maduro, com forte cobertura de RLS (100% das tabelas públicas), 90+ ondas
de hardening backend, observabilidade DB completa (health scan, wraparound,
locks, spill, idle-in-transaction, hotspots, índices ociosos/duplicados) e
suíte E2E + fuzzing + contratos. O código-base **não apresenta bugs críticos
abertos** — os pontos abaixo são dívida técnica de baixo/médio impacto.

## Achados

| ID | Severidade | Categoria | Descrição | Status |
|----|------------|-----------|-----------|--------|
| A-01 | 🟡 | Type-safety | 144 `as any` em 65 arquivos, concentrados em `components/compras/*` e helpers de dashboard | Aberto — refatoração incremental |
| A-02 | 🟡 | Observabilidade | 13 `console.*` diretos em hooks (`useAccountLockout`, `useContactNotes`, `useBulkOperations`, `useFeedback`, `useRecentlyViewed`) em vez de `logger` | **Corrigido parcial** (auth + notes) |
| A-03 | 🔵 | Gambiarra | `EliteButton` usava `{...(props as any)}` para contornar tipagem de `HTMLMotionProps` | **Corrigido** — extração explícita de `onClick` |
| A-04 | 🔵 | Type-safety | `.from("telemetry_logs" as any)` em `AppLogsView` — tabela existe nos types gerados; cast é remanescente pré-migração | Aberto |
| A-05 | 🔵 | Duplicação | `SourcingHistoryConsole` usa string union comparada com `("intelligence" as any)` — cast desnecessário | Aberto |
| A-06 | 🟢 | Estilo | `forwardRef` em `atoms/EliteButton` — permitido pelas regras (é UI atômico, não App/Providers/Routes) | OK |
| A-07 | 🟢 | Segurança | 109 warnings do linter Supabase são allowlist arquitetural de `SECURITY DEFINER` documentada em `mem://constraints/security-definer-grants` | OK |

## Recomendações Priorizadas

### P1 — Eliminar `as any` em módulos críticos (2–3 sprints)
Alvo: `components/compras/executive/KraljicMatrix.tsx`, `SupplierBonificationsPanel.tsx`,
`delivery-calendar/deliveryCalendarHelpers.ts`. Ação: regenerar tipos com joins
explícitos (`Database['public']['Tables'][...]['Row'] & { categorias: {...} }`) e
substituir os casts por tipos derivados.

### P2 — Padronizar logger em 100% dos hooks
Aplicar `logger.error/warn` no lugar de `console.*` nos 5 hooks restantes.
Benefício: telemetria consistente, redaction de PII e correlação com `tenant_id`.

### P3 — Remover casts obsoletos de string unions
Casos `("intelligence" as any)` são resíduo de refactor incompleto; basta tipar
`viewMode: 'list' | 'intelligence' | 'neural'` no estado.

## Correções Aplicadas Nesta Rodada

1. **`src/components/atoms/EliteButton.tsx`** — removido `props as any`; `onClick`
   extraído do rest-spread e tipado corretamente.
2. **`src/hooks/useAccountLockout.ts`** — 5 `console.error` migrados para `logger.error`.
3. **`src/hooks/useContactNotes.ts`** — 4 `console.error` migrados para `logger.error`.

## Métricas Pós-Correção

- `as any` remanescentes: 141 (−3)
- `console.*` em hooks: 4 (−9)
- Gambiarras identificadas removidas: 1/1 desta rodada
- Build: verde
- Linter Supabase: 109 warnings (baseline)

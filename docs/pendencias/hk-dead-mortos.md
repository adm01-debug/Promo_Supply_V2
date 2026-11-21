# hk-dead - Hooks sem chamador (useFlashHighlight/useFormDirty/useUnsavedChangesWarning/useFormDataProtection/useBulkOperations)

- **Estado:** DESCARTADO (arquivamento documentado - nao remocao)
- **Data:** 2026-11-26
- **Camadas:** UI (hooks)
- **Evidencia (real, git grep em todo repo trackeado):**
  - useFlashHighlight: unica ocorrencia de codigo = src/hooks/useFlashHighlight.ts:7 (definicao). Resto = docs.
  - useFormDirty: src/hooks/useFormDirty.ts:6. Resto = docs.
  - useUnsavedChangesWarning: src/hooks/useUnsavedChangesWarning.ts:9. Resto = docs.
  - useFormDataProtection: src/hooks/useFormDataProtection.ts:8. Resto = docs.
  - useBulkOperations: hook em src/hooks/useBulkOperations.ts:11 + constantes status :73/:83/:92; unico uso fora = src/hooks/__tests__/hookConstants.test.ts:22 (import das constantes, teste real).
  - Nao existe src/hooks/index.ts (barrel) => remover os arquivos nao quebraria typecheck/imports.
- **Decisao (dev-senior):** NAO remover. Os 4 hooks + useBulkOperations sao tree-shaken (nunca entram no bundle ja que 0 importadores => zero custo de bundle/perf/deploy). useBulkOperations fornece constantes testadas. Remocao seria churn sem ganho de runtime com risco irreversivel; contradiz a regra de nunca perder trabalho. Arquiva-se registrando o veredito.
- **Regra de negocio:** hook useBulkOperations e as 3 listas de status fecham o fluxo de bulk ops que os componentes BulkOperationsPreview/EnhancedBulkActionsBar usam via callbacks (PR #198). Manter caso o hook seja reaproveitado.
- **Raio de impacto:** nenhum runtime. Catalogo docs/pendencias/_indice.md atualizado.

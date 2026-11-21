# edge-bridge - external-db-bridge: integracao completa, falta credencial em prod

- **Estado:** CONCLUIDO (refutado como morto - integracao real completa)
- **Data:** 2026-11-26
- **Camadas:** edge
- **Evidencia (real):** implementacao completa em supabase/functions/external-db-bridge/index.ts (JWT :119 + allowlist :147 + rate limit :157 + clamp limit :144). Allowlist estrita em supabase/functions/_shared/external-bridge-allowlist.ts. No script de deploy: deploy_edge_functions_promo_supply.sh:100. Contrato documentado em src/pages/admin/DeveloperDocs.tsx:53-111. Script de validacao: scripts/validate-bridge.ts. "Sem chamador prod" = so validate-bridge invoca, mas falha 500 explícita :174-179 por design quando EXTERNAL_DB_URL/EXTERNAL_DB_KEY ausentes.
- **Decisao (dev-senior):** NAO remover. E integracao ponta (banco externo) com allowlist estreita e segura. Falta apenas configurar EXTERNAL_DB_URL/EXTERNAL_DB_KEY em prod. Remover seria perder integracao. Item reaberto como "setar credencial + hook", nao como morte.
- **Regra de negocio:** ponte sob demanda para outro Postgres/Supabase confiavel, apenas tabelas/RPCs em allowlist.
- **Raio de impacto:** habilita integracao com banco externo. Catalogo atualizado.

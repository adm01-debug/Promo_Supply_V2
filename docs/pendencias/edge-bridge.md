# edge-bridge - external-db-bridge: integracao completa, BLOQUEADA por alvo + secret

- **Estado:** CONCLUIDO (refutado como morto) / BLOQUEADO para ativacao
- **Data:** 2026-11-26
- **Camadas:** edge
- **Evidencia (real):** implementacao completa em `supabase/functions/external-db-bridge/index.ts` (JWT :119 + allowlist :147 + rate limit :157 + clamp limit :144). Allowlist estrita em `supabase/functions/_shared/external-bridge-allowlist.ts`. No script de deploy: `deploy_edge_functions_promo_supply.sh:100`. Contrato documentado em `src/pages/admin/DeveloperDocs.tsx:53-111`. Script de validacao: `scripts/validate-bridge.ts` (falha 500 explicita `:174-179` por design quando EXTERNAL_DB_URL/EXTERNAL_DB_KEY ausentes).
- **Decisao (dev-senior):** NAO remover - integracao ponta real com allowlist estreita e segura. Para ativar em producao falta: (1) definir QUAL banco externo e o alvo - decisao de negocio (regra 8: credencial/arquitetura), e (2) setar EXTERNAL_DB_URL/EXTERNAL_DB_KEY como secrets, nunca em código/commit (regra 8: segredos so em env/secret do servico).
- **Bloqueio (regra 8):** este item aguarda decisao do dono sobre o alvo + fornecimento das secrets. Nao ha trabalho de codigo a finalizar; o codigo esta completo e correto.
- **Regra de negocio:** ponte sob demanda para outro Postgres/Supabase confiavel, apenas tabelas/RPCs em allowlist.
- **Raio de impacto:** zero enquanto inativo. Habilita integracao com banco externo quando alvo+secrets definidos.

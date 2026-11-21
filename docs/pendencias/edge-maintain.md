# edge-maintain - maintain-partitions: edge completa, falta agendador em prod

- **Estado:** CONCLUIDO (refutado como morta - operacao real completa)
- **Data:** 2026-11-26
- **Camadas:** edge / DB
- **Evidencia (real):** implementacao completa em supabase/functions/maintain-partitions/index.ts (JWT cron + recordCronHeartbeat + allowlist). RPC real existente: supabase/migrations/20260719000004_partition_maintenance.sql:9 (maintain_monthly_partitions). Bootstrap :113-122. Nao existe cron.schedule para a edge no repositorio (sem agendador).
- **Decisao (dev-senior):** NAO remover. A edge faz manutencao real de particoes (operacional). Falta apenas um cron.schedule para disparam-la em producao. Remover seria perder funcionalidade. Item reaberto como "ligar agendador", nao como morte.
- **Regra de negocio:** manutencao mensal de particoes de pedidos/pagamentos para performance de queries em tabelas grandes.
- **Raio de impacto:** se agendada, mantem indices/particoes de tabelas transacionais. Catalogo atualizado.

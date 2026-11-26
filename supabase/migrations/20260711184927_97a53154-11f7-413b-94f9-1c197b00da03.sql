-- Autovacuum tuning para tabelas append-only de alto churn.
-- Default: autovacuum_vacuum_scale_factor=0.2 (20%) → tarde demais em tabelas grandes.
-- Ajuste: dispara a cada ~1000 tuplas mortas + analyze mais frequente.

ALTER TABLE public.telemetry_logs SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_vacuum_threshold = 1000,
  autovacuum_analyze_scale_factor = 0.02,
  autovacuum_analyze_threshold = 500,
  autovacuum_vacuum_cost_delay = 10
);

ALTER TABLE public.login_attempts SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_vacuum_threshold = 1000,
  autovacuum_analyze_scale_factor = 0.02,
  autovacuum_analyze_threshold = 500
);

ALTER TABLE public.rate_limit_logs SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_vacuum_threshold = 1000,
  autovacuum_analyze_scale_factor = 0.02,
  autovacuum_analyze_threshold = 500
);

ALTER TABLE public.geo_access_logs SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_vacuum_threshold = 1000,
  autovacuum_analyze_scale_factor = 0.02,
  autovacuum_analyze_threshold = 500
);

ALTER TABLE public.webhook_events SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_vacuum_threshold = 500,
  autovacuum_analyze_scale_factor = 0.02,
  autovacuum_analyze_threshold = 200
);

-- Também para audit_logs e security_logs (retenção 365d/180d já ativa; alto volume)
ALTER TABLE public.audit_logs SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.05
);

ALTER TABLE public.security_logs SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.05
);

-- Roda ANALYZE agora para atualizar planner após retention crons
ANALYZE public.telemetry_logs;
ANALYZE public.login_attempts;
ANALYZE public.rate_limit_logs;
ANALYZE public.geo_access_logs;
ANALYZE public.webhook_events;
ANALYZE public.audit_logs;
ANALYZE public.security_logs;
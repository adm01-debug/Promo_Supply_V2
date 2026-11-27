-- ---------------------------------------------------------------------------
-- Verificacao de comportamento da migration 20261128198000_claim_alerts_batch
-- (etapas 159 e 160, metade do alert-dispatcher). Nao e teste do CI: e a prova
-- executavel registrada na PR e em 05-PROGRESSO.md.
--
-- Roda em Postgres descartavel, sem tocar em banco real: cria os roles do
-- Supabase e um stub de system_alerts, aplica a migration de verdade, exercita
-- o claim (filtro, lease, SKIP LOCKED, lote, teto) e aplica o rollback.
--
-- Como rodar (WSL, a partir da RAIZ do repositorio):
--   createdb wt_claim_test
--   psql -v ON_ERROR_STOP=1 -d wt_claim_test -f docs/qa/verificacoes/20261128198000_claim_alerts_batch_validacao.sql
--   dropdb wt_claim_test
-- A ultima consulta imprime `falhas | total`; o esperado e' 0 | 20.
-- ---------------------------------------------------------------------------
\set ON_ERROR_STOP on

\echo === STUBS (roles do Supabase + system_alerts) ===
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END $$;

CREATE TABLE public.system_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  created_at timestamptz DEFAULT now(),
  description text,
  dispatch_error text,
  dispatch_status text,
  dispatched_at timestamptz,
  message text,
  metadata jsonb,
  resolved_at timestamptz,
  resolved_by text,
  severity text,
  source text,
  tenant_id uuid,
  title text
);

\echo === APLICA A MIGRATION NOVA ===
\i 'supabase/migrations/20261128198000_claim_alerts_batch.sql'

CREATE TABLE public.t_checks (nome text, passou boolean, detalhe text);
CREATE TABLE public.t_lote (LIKE public.system_alerts INCLUDING DEFAULTS);

INSERT INTO public.t_checks
SELECT 'coluna dispatch_lease_until e timestamptz nullable',
       (SELECT data_type = 'timestamp with time zone' AND is_nullable = 'YES'
          FROM information_schema.columns
         WHERE table_schema='public' AND table_name='system_alerts' AND column_name='dispatch_lease_until'),
       NULL
UNION ALL SELECT 'indice parcial da fila existe',
       EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_system_alerts_fila_dispatch'
                AND indexdef ILIKE '%WHERE (dispatched_at IS NULL)%'), NULL
UNION ALL SELECT 'claim e SECURITY DEFINER com search_path fixo',
       (SELECT p.prosecdef AND array_to_string(p.proconfig, ',') LIKE '%search_path=public%'
          FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname='public' AND p.proname='claim_alerts_batch'), NULL
UNION ALL SELECT 'anon nao executa o claim',
       NOT has_function_privilege('anon','public.claim_alerts_batch(integer)','EXECUTE'), NULL
UNION ALL SELECT 'authenticated nao executa o claim',
       NOT has_function_privilege('authenticated','public.claim_alerts_batch(integer)','EXECUTE'), NULL
UNION ALL SELECT 'service_role executa o claim',
       has_function_privilege('service_role','public.claim_alerts_batch(integer)','EXECUTE'), NULL;

\echo === CENARIO A: filtro de fila ===
INSERT INTO public.system_alerts (alert_type, severity, created_at, tenant_id)
VALUES ('alto-1','HIGH', now() - interval '40 min', gen_random_uuid()),
       ('alto-2','HIGH', now() - interval '30 min', gen_random_uuid()),
       ('critico-minusculo','critical', now() - interval '20 min', gen_random_uuid()),
       ('baixo','LOW', now() - interval '50 min', NULL),
       ('ja-entregue','HIGH', now() - interval '55 min', NULL);
UPDATE public.system_alerts SET dispatched_at = now() WHERE alert_type = 'ja-entregue';

TRUNCATE public.t_lote;
INSERT INTO public.t_lote SELECT * FROM public.claim_alerts_batch(50);

INSERT INTO public.t_checks
SELECT 'claim pega so as 3 linhas elegiveis',
       (SELECT count(*) = 3 FROM public.t_lote), (SELECT 'n=' || count(*) FROM public.t_lote)
UNION ALL SELECT 'claim nao entrega severidade nao critica',
       NOT EXISTS (SELECT 1 FROM public.t_lote WHERE alert_type = 'baixo'), NULL
UNION ALL SELECT 'claim nao repete alerta ja entregue',
       NOT EXISTS (SELECT 1 FROM public.t_lote WHERE alert_type = 'ja-entregue'), NULL
UNION ALL SELECT 'claim aceita severidade legada em minusculas',
       EXISTS (SELECT 1 FROM public.t_lote WHERE alert_type = 'critico-minusculo'), NULL
UNION ALL SELECT 'lease carimbado em ~10 min',
       (SELECT bool_and(dispatch_lease_until > now() + interval '9 min'
                    AND dispatch_lease_until < now() + interval '11 min') FROM public.t_lote), NULL;

\echo === CENARIO B: lease em uso x lease expirado ===
INSERT INTO public.system_alerts (alert_type, severity, created_at, dispatch_lease_until)
VALUES ('lease-em-uso','EMERGENCY', now() - interval '45 min', now() + interval '5 min'),
       ('lease-expirado','EMERGENCY', now() - interval '35 min', now() - interval '1 min');

TRUNCATE public.t_lote;
INSERT INTO public.t_lote SELECT * FROM public.claim_alerts_batch(50);

INSERT INTO public.t_checks
SELECT 'claim nao rouba linha com lease valido',
       NOT EXISTS (SELECT 1 FROM public.t_lote WHERE alert_type = 'lease-em-uso'), NULL
UNION ALL SELECT 'claim reivindica linha com lease expirado',
       EXISTS (SELECT 1 FROM public.t_lote WHERE alert_type = 'lease-expirado'), NULL
UNION ALL SELECT 'rodada seguinte nao reentrega o mesmo lote',
       NOT EXISTS (SELECT * FROM public.claim_alerts_batch(50)), NULL;

\echo === CENARIO C: lote e piso ===
INSERT INTO public.system_alerts (alert_type, severity, created_at)
SELECT 'novo-' || g, 'HIGH', now() - interval '5 min' FROM generate_series(1,3) g;
INSERT INTO public.t_checks
SELECT 'batch_size=2 devolve 2',
       (SELECT count(*) = 2 FROM public.claim_alerts_batch(2)), NULL;

INSERT INTO public.system_alerts (alert_type, severity, created_at) VALUES ('piso-1','HIGH', now());
INSERT INTO public.t_checks
SELECT 'batch_size=0 cai no piso de 1',
       (SELECT count(*) = 1 FROM public.claim_alerts_batch(0)), NULL;

\echo === CENARIO D: teto duro ===
INSERT INTO public.system_alerts (alert_type, severity, created_at)
SELECT 'enxurrada-' || g, 'CRITICAL', now() - interval '10 min' FROM generate_series(1,250) g;
INSERT INTO public.t_checks
SELECT 'batch_size=9999 e'||' limitado a 200',
       (SELECT count(*) = 200 FROM public.claim_alerts_batch(9999)), NULL;

\echo === REVERT ===
\i 'supabase/rollbacks/20261128198000_revert_claim_alerts_batch.sql'

INSERT INTO public.t_checks
SELECT 'revert remove a funcao',
       NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                    WHERE n.nspname='public' AND p.proname='claim_alerts_batch'), NULL
UNION ALL SELECT 'revert remove o indice da fila',
       NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_system_alerts_fila_dispatch'), NULL
UNION ALL SELECT 'revert remove a coluna de lease',
       NOT EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema='public' AND table_name='system_alerts'
                      AND column_name='dispatch_lease_until'), NULL;

\echo === RESULTADO ===
SELECT nome, CASE WHEN passou THEN 'PASS' ELSE 'FAIL' END AS r, detalhe FROM public.t_checks ORDER BY r DESC, nome;
SELECT count(*) FILTER (WHERE passou IS NOT TRUE) AS falhas, count(*) AS total FROM public.t_checks;
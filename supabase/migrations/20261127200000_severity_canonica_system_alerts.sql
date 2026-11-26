-- 209 / JOB-10 -- severity canonica em public.system_alerts.
--
-- Causa raiz medida em producao (leitura real via psql, 26/11/2026):
--   468 linhas, 0 nulas, 5 fora do padrao: 'critical' x4 (TODAS em aberto) e 'high' x1.
--   8 funcoes do banco gravavam severidade em minusculas (levantadas por
--   pg_proc.prosrc): scan_table_growth, scan_unused_indexes, scan_duplicate_indexes,
--   scan_txid_wraparound, scan_scan_runs_sla, scan_security_definer_drift,
--   get_db_health_snapshot e xbz_sync_watchdog.
--
-- Efeito do bug:
--   - src/hooks/useCriticalAlertsBadge.ts filtra .in('severity',['CRITICAL','EMERGENCY'])
--     -- sensivel a caixa -- e mostrava 0 com 4 alertas criticos em aberto.
--   - idx_system_alerts_pending_dispatch (WHERE dispatched_at IS NULL AND
--     severity IN ('HIGH','CRITICAL')) nao cobria as linhas minusculas.
--
-- Correcao: normaliza o que existe e impede a regressao por gatilho, que cobre as 8
-- funcoes -- e qualquer codigo futuro -- sem reescrever logica de negocio.
-- O CHECK fecha o dominio em maiusculas; NOT VALID + VALIDATE evita lock longo.
--
-- Reversao (rodar manualmente se necessario; o UPDATE nao e reversivel):
--   DROP TRIGGER IF EXISTS trg_system_alerts_severity_canonica ON public.system_alerts;
--   DROP FUNCTION IF EXISTS public.system_alerts_severity_canonica();
--   ALTER TABLE public.system_alerts DROP CONSTRAINT IF EXISTS system_alerts_severity_canonica_check;

CREATE OR REPLACE FUNCTION public.system_alerts_severity_canonica()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $fn$
BEGIN
  IF NEW.severity IS NOT NULL THEN
    NEW.severity := upper(btrim(NEW.severity));
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_system_alerts_severity_canonica ON public.system_alerts;
CREATE TRIGGER trg_system_alerts_severity_canonica
  BEFORE INSERT OR UPDATE OF severity ON public.system_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.system_alerts_severity_canonica();

UPDATE public.system_alerts
   SET severity = upper(btrim(severity))
 WHERE severity <> upper(btrim(severity));

ALTER TABLE public.system_alerts
  DROP CONSTRAINT IF EXISTS system_alerts_severity_canonica_check;
ALTER TABLE public.system_alerts
  ADD CONSTRAINT system_alerts_severity_canonica_check
  CHECK (severity ~ '^[A-Z][A-Z_]*$') NOT VALID;
ALTER TABLE public.system_alerts
  VALIDATE CONSTRAINT system_alerts_severity_canonica_check;

-- 1. Remove sobrecargas legadas (nenhum código as chama)
DROP FUNCTION IF EXISTS public.scan_unused_indexes(integer);
DROP FUNCTION IF EXISTS public.scan_sequence_exhaustion(numeric);
DROP FUNCTION IF EXISTS public.scan_long_running_transactions(integer, integer);

-- 2. Torna message nullable (title/description cobrem o payload nos novos scanners)
ALTER TABLE public.system_alerts ALTER COLUMN message DROP NOT NULL;

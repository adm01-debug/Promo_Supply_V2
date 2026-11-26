-- SEG-04 / etapa 150: duas SECURITY DEFINER executavam SQL arbitrario.
--
--   public.exec_sql(text)          - concatena a string recebida e EXECUTE;
--   public.execute_read_query(text) - so valida o prefixo EXPLAIN e o comando seguinte por
--                                     regex, entao CTE de escrita (WITH ... DELETE),
--                                     SELECT com funcao volatil e EXPLAIN ANALYZE de DML
--                                     passam pela checagem.
--
-- Ambas rodam como dono postgres. O revoke de 20261112165500 e de 20261112134500 ja tinha
-- tirado anon/authenticated, entao o risco residual e' de conta comprometida com
-- service_role - mas o achado e' o desenho: nenhuma funcionalidade precisa de SQL arbitrario.
--
-- Uso real: supabase/functions/run-audit/index.ts:22 chama exec_sql com UM select literal
-- sobre pg_policies; scripts/db-explain-analyze.ts:17 ja nao usa execute_read_query (passou a
-- falar psql direto, esta escrito no proprio cabecalho do script).
--
-- Correcao: as duas saem. No lugar entra public.audit_rls_policies(), SEM argumento e com o
-- conjunto de colunas fixo, que e' tudo o que run-audit le. SECURITY DEFINER continua
-- necessario (service_role nao tem grant em pg_catalog.pg_policies) e a superficie deixa de
-- aceitar texto do chamador.
--
-- Reversao: supabase/rollbacks/20261126183000_revert_dropa_sql_arbitrario.sql

BEGIN;

-- 1) substituto sem SQL arbitrario
CREATE OR REPLACE FUNCTION public.audit_rls_policies()
RETURNS TABLE (
  tablename        text,
  policyname       text,
  roles            text[],
  cmd              text,
  using_expression text,
  check_expression text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $fn$
  SELECT p.tablename::text,
         p.policyname::text,
         p.roles::text[],
         p.cmd::text,
         p.qual::text,
         p.with_check::text
    FROM pg_catalog.pg_policies p
   WHERE p.schemaname = 'public';
$fn$;

REVOKE ALL ON FUNCTION public.audit_rls_policies() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.audit_rls_policies() TO service_role;

-- 2) as funcoes de SQL arbitrario saem
DROP FUNCTION IF EXISTS public.exec_sql(text);
DROP FUNCTION IF EXISTS public.execute_read_query(text);

COMMIT;
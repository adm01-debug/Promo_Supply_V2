-- Diagnostico temporario: lista as assinaturas reais de cron.* disponiveis.
-- Termina em EXCEPTION de proposito -> a transacao inteira sofre rollback e
-- nenhum estado e alterado. Serve apenas para imprimir no log do workflow.
DO $do$
DECLARE v_lista text;
BEGIN
  SELECT string_agg(p.proname || '(' || pg_get_function_arguments(p.oid) || ')', E'\n' ORDER BY p.proname)
  INTO v_lista
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'cron';

  RAISE EXCEPTION E'DIAGNOSTICO cron.*:\n%', v_lista;
END;
$do$;
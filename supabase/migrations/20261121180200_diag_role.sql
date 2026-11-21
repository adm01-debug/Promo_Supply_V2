-- Diagnostico temporario (termina em EXCEPTION -> rollback total).
DO $do$
DECLARE v text; v_rota text;
BEGIN
  SELECT string_agg(k || '=' || left(coalesce(current_setting(k, true),'<null>'), 60), E'\n')
  INTO v
  FROM unnest(ARRAY['current_user','session_user','role','search_path']) k;

  BEGIN
    SET ROLE postgres;
    v_rota := 'SET ROLE postgres: OK';
    RESET ROLE;
  EXCEPTION WHEN others THEN
    v_rota := 'SET ROLE postgres: ' || SQLERRM;
  END;

  RAISE EXCEPTION E'DIAG2\n%\n%s', v, v_rota;
END;
$do$;
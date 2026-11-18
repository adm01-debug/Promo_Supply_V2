CREATE OR REPLACE FUNCTION public.audit_logs_bloquear_alteracao()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  pilha text;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION
      'audit_logs e append-only: UPDATE bloqueado (ISO 27001 A.8.15 / LGPD art.16)'
      USING ERRCODE = '42501';
  END IF;

  -- DELETE so e legitimo na retencao legal de 5 anos. A autorizacao e dada
  -- pela propria pilha de chamada: se o DELETE nasceu dentro de
  -- apply_lgpd_retention(), passa. Isso evita ter que reescrever aquela funcao
  -- (12 politicas de retencao ja validadas) so para hastear um sinalizador.
  -- O GUC app.retencao_legal continua aceito como escape consciente para
  -- operacao manual autorizada, e fica registrado em quem o setou.
  GET DIAGNOSTICS pilha = PG_CONTEXT;

  IF pilha ~ 'apply_lgpd_retention'
     OR coalesce(current_setting('app.retencao_legal', true), '') = 'on' THEN
    RETURN OLD;
  END IF;

  RAISE EXCEPTION
    'audit_logs e append-only: DELETE permitido apenas pela retencao legal de 5 anos (apply_lgpd_retention)'
    USING ERRCODE = '42501';
END;
$function$

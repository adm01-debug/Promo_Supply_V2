-- ============================================================================
-- ROLLBACK de 20261128160000_lockout_servidor_guarda.sql (etapa 057)
-- Restaura clear_login_lockout sem guarda de chamador (estado anterior).
-- ATENCAO: reabre o vetor "qualquer sessao limpa o bloqueio de qualquer e-mail".
-- ============================================================================

CREATE OR REPLACE FUNCTION public.clear_login_lockout(_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.account_lockouts
  SET failed_attempts = 0,
      locked_until = NULL,
      updated_at = now()
  WHERE email = _email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.clear_login_lockout(text) TO authenticated;
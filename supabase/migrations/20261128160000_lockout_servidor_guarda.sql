-- ============================================================================
-- MIGRATION: lockout de conta passa a ter guarda de chamador no servidor
-- Etapa 057 do docs/qa/04-PLANO.md (SEC-08, parte 1 de 2)
--
-- Causa: `public.clear_login_lockout(_email text)` e' SECURITY DEFINER, nao
-- checava quem estava chamando e estava concedida a `authenticated`. Qualquer
-- conta logada no sistema zerava o bloqueio de QUALQUER e-mail -- inclusive o da
-- conta que ela propria acabou de estourar as 5 tentativas. A contagem de
-- tentativas roda no cliente (src/hooks/useAccountLockout.ts), entao era um
-- bloqueio cooperativo: quem quisesse, ignorava.
--
-- Correcao: a limpeza passa a valer apenas para
--   (a) o e-mail da propria sessao (auth.email());
--   (b) admin (matriz de seguranca, via has_role);
--   (c) service_role (cron/edge/integracoes).
-- O e-mail e' normalizado (lower+btrim) igual a coluna account_lockouts.email,
-- que ja tem trigger de normalizacao.
--
-- O que NAO muda: `is_account_locked` e `record_failed_login` continuam
-- executaveis por anon/authenticated porque a tela de login as chama ANTES de
-- existir sessao. O bloqueio inviolavel do lado do servidor e' o Auth Hook do
-- GoTrue (parte 2, PR separada: mexe na arquitetura de login).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.clear_login_lockout(_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email  text := lower(btrim(coalesce(_email, '')));
  v_caller text := lower(btrim(coalesce(auth.email(), '')));
  v_role   text := coalesce(auth.role(), current_user);
BEGIN
  IF v_email = '' THEN
    RAISE EXCEPTION 'e-mail obrigatorio' USING ERRCODE = '22023';
  END IF;

  IF NOT (
    v_role = 'service_role'
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (v_caller <> '' AND v_caller = v_email)
  ) THEN
    RAISE EXCEPTION 'sem permissao para limpar o bloqueio de outra conta'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.account_lockouts
  SET failed_attempts = 0,
      locked_until = NULL,
      updated_at = now()
  WHERE email = v_email;
END;
$$;

-- PUBLIC/anon nao tem mais o que fazer nesta funcao; a sessao pos-login (que e'
-- quem chama) e o service_role continuam liberados.
REVOKE EXECUTE ON FUNCTION public.clear_login_lockout(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clear_login_lockout(text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Prova: a guarda existe, anon perdeu o acesso, authenticated manteve, e o
-- comportamento real (atacante tentando limpar e-mail alheio -> 42501).
-- ---------------------------------------------------------------------------
DO $prova$
DECLARE
  v_def      text;
  v_atacante uuid := '00000000-0000-0000-0000-0000000000aa'::uuid;
  v_barrado  boolean := false;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_def
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'clear_login_lockout';

  IF v_def IS NULL THEN
    RAISE EXCEPTION 'clear_login_lockout nao existe depois do CREATE';
  END IF;
  IF v_def NOT LIKE '%sem permissao para limpar o bloqueio de outra conta%' THEN
    RAISE EXCEPTION 'a guarda de chamador nao ficou na funcao';
  END IF;
  IF v_def NOT LIKE '%SECURITY DEFINER%' THEN
    RAISE EXCEPTION 'a funcao perdeu SECURITY DEFINER';
  END IF;

  IF has_function_privilege('anon', 'public.clear_login_lockout(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon ainda pode executar clear_login_lockout (PUBLIC incluido)';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.clear_login_lockout(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated perdeu EXECUTE em clear_login_lockout';
  END IF;

  IF public.has_role(v_atacante, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'uuid de teste e admin; a simulacao nao provaria nada';
  END IF;

  -- Sessao simulada: usuario comum (nao-admin) com sessao valida.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_atacante::text, 'email', 'atacante@exemplo.com',
                      'role', 'authenticated')::text, true);

  IF lower(coalesce(auth.email(), '')) <> 'atacante@exemplo.com' THEN
    RAISE EXCEPTION 'simulacao nao leu o e-mail da sessao (auth.email=%))', auth.email();
  END IF;

  BEGIN
    PERFORM public.clear_login_lockout('vitima@exemplo.com');
  EXCEPTION WHEN insufficient_privilege THEN
    v_barrado := true;
  END;

  IF NOT v_barrado THEN
    RAISE EXCEPTION 'clear_login_lockout aceitou limpar o bloqueio de e-mail alheio';
  END IF;

  -- O proprio e-mail continua liberado (fluxo pos-login da tela de auth).
  PERFORM public.clear_login_lockout('atacante@exemplo.com');
END
$prova$;
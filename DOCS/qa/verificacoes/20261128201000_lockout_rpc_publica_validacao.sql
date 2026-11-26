-- ---------------------------------------------------------------------------
-- Verificacao de comportamento da migration 20261128201000_lockout_rpc_publica
-- (etapa 140, FN-06 parte 1). Nao e teste do CI: e a prova executavel
-- registrada na PR e em 05-PROGRESSO.md.
--
-- Roda em Postgres descartavel, sem tocar em banco real: cria os roles do
-- Supabase, as tabelas de lockout/login com o gatilho de normalizacao que
-- existe em producao, e um stub de blocked_ips/ip_whitelist.
--
-- A prova tem DOIS tempos, porque a migration so vale se o defeito existir
-- antes dela:
--   1) aplica o ROLLBACK (que contem o corpo original das funcoes) e mostra o
--      defeito: e-mail com maiuscula estoura unique_violation no contador,
--      is_account_locked nao acha a linha e log_login_attempt grava o IP que o
--      chamador mandou;
--   2) aplica a MIGRATION e mostra o comportamento correto.
--
-- Como rodar (WSL, a partir da RAIZ do repositorio):
--   createdb wt_lockout_test
--   psql -v ON_ERROR_STOP=1 -d wt_lockout_test -f docs/qa/verificacoes/20261128201000_lockout_rpc_publica_validacao.sql
--   dropdb wt_lockout_test
-- A ultima consulta imprime `falhas | total`; o esperado e' 0 | 24.
-- ---------------------------------------------------------------------------
\set ON_ERROR_STOP on

\echo === STUBS (roles, tabelas e gatilho de normalizacao) ===
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END $$;

CREATE TABLE public.account_lockouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  failed_attempts integer NOT NULL DEFAULT 0,
  lockout_count integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  last_failed_attempt timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_address text,
  user_agent text,
  success boolean NOT NULL DEFAULT false,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.blocked_ips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL UNIQUE,
  reason text NOT NULL,
  blocked_by uuid,
  blocked_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  permanent boolean NOT NULL DEFAULT false,
  attempts_count integer DEFAULT 0
);

CREATE TABLE public.ip_whitelist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL UNIQUE,
  description text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.is_ip_whitelisted(_ip_address text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$ SELECT EXISTS (SELECT 1 FROM public.ip_whitelist w WHERE w.ip_address = _ip_address); $$;

CREATE OR REPLACE FUNCTION public.normalize_email_lowercase()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.email := lower(btrim(NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_normalize_email BEFORE INSERT OR UPDATE OF email
  ON public.account_lockouts FOR EACH ROW EXECUTE FUNCTION public.normalize_email_lowercase();
CREATE TRIGGER trg_normalize_email BEFORE INSERT OR UPDATE OF email
  ON public.login_attempts FOR EACH ROW EXECUTE FUNCTION public.normalize_email_lowercase();

CREATE TABLE public.t_checks (nome text, passou boolean, detalhe text);
INSERT INTO public.t_checks VALUES ('stub montado', true, 'roles, tabelas e gatilho de normalizacao');

\echo === TEMPO 1: corpo ANTIGO (rollback) -- o defeito tem de aparecer ===
\i 'supabase/rollbacks/20261128201000_revert_lockout_rpc_publica.sql'

-- 1) e-mail digitado com maiuscula: o contador nao sobe, o INSERT estoura unique
DO $$
DECLARE v_erro text;
BEGIN
  INSERT INTO public.account_lockouts (email, failed_attempts, last_failed_attempt)
  VALUES ('prova140@exemplo.com', 1, now());

  BEGIN
    PERFORM public.record_failed_login('Prova140@Exemplo.com');
    v_erro := NULL;
  EXCEPTION WHEN unique_violation THEN
    v_erro := 'unique_violation';
  END;

  INSERT INTO public.t_checks VALUES
    ('antes: record_failed_login com e-mail em maiuscula estoura unique_violation',
     v_erro = 'unique_violation', coalesce(v_erro, 'sem excecao'));
END $$;

-- 2) is_account_locked com maiuscula nao acha o bloqueio existente
DO $$
DECLARE v_locked_maiuscula boolean; v_locked_minuscula boolean;
BEGIN
  UPDATE public.account_lockouts
     SET locked_until = now() + INTERVAL '10 minutes'
   WHERE email = 'prova140@exemplo.com';

  v_locked_maiuscula := (public.is_account_locked('Prova140@Exemplo.com') ->> 'locked')::boolean;
  v_locked_minuscula := (public.is_account_locked('prova140@exemplo.com') ->> 'locked')::boolean;

  INSERT INTO public.t_checks VALUES
    ('antes: is_account_locked com maiuscula nao acha a linha (defeito)',
     v_locked_maiuscula = false AND v_locked_minuscula = true,
     'maiuscula=' || v_locked_maiuscula::text || ' minuscula=' || v_locked_minuscula::text);
END $$;

-- 3) log_login_attempt grava o IP do parametro ignorando o header do request
DO $$
DECLARE v_id uuid; v_ip text;
BEGIN
  PERFORM set_config('request.headers',
    json_build_object('x-forwarded-for', '203.0.113.10')::text, true);
  v_id := public.log_login_attempt('prova140@exemplo.com', '198.51.100.7', 'ua', false, 'prova');
  SELECT ip_address INTO v_ip FROM public.login_attempts WHERE id = v_id;

  INSERT INTO public.t_checks VALUES
    ('antes: log_login_attempt grava o IP escolhido pelo chamador',
     v_ip = '198.51.100.7', 'gravou ' || coalesce(v_ip, '<null>'));

  DELETE FROM public.login_attempts WHERE id = v_id;
END $$;

DELETE FROM public.account_lockouts WHERE email = 'prova140@exemplo.com';

\echo === TEMPO 2: migration aplicada ===
\i 'supabase/migrations/20261128201000_lockout_rpc_publica.sql'

-- ACL: sem PUBLIC, com anon/authenticated/service_role (a tela de login precisa de anon)
INSERT INTO public.t_checks
SELECT 'depois: anon mantem EXECUTE em ' || f,
       has_function_privilege('anon', ('public.' || f)::regprocedure, 'EXECUTE'), NULL
FROM unnest(ARRAY['record_failed_login(text)',
                  'is_account_locked(text)',
                  'log_login_attempt(text, text, text, boolean, text)']) f;

INSERT INTO public.t_checks
SELECT 'depois: ' || papel || ' mantem EXECUTE nas tres',
       bool_and(has_function_privilege(papel, ('public.' || f)::regprocedure, 'EXECUTE')), NULL
FROM unnest(ARRAY['record_failed_login(text)',
                  'is_account_locked(text)',
                  'log_login_attempt(text, text, text, boolean, text)']) f,
     unnest(ARRAY['authenticated', 'service_role']) papel
GROUP BY papel;

INSERT INTO public.t_checks
SELECT 'depois: ACL de ' || f || ' nao tem entrada para PUBLIC',
       NOT EXISTS (
         SELECT 1
           FROM pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
          WHERE p.oid = ('public.' || f)::regprocedure AND a.grantee = 0 AND a.privilege_type = 'EXECUTE'
       ),
       coalesce((SELECT p.proacl::text FROM pg_proc p WHERE p.oid = ('public.' || f)::regprocedure), '<null>')
FROM unnest(ARRAY['record_failed_login(text)',
                  'is_account_locked(text)',
                  'log_login_attempt(text, text, text, boolean, text)']) f;

-- Comportamento: e-mail com maiuscula e espaco cai na mesma linha e conta
DO $$
DECLARE
  v_ret    jsonb;
  v_linhas integer;
  v_attempts integer;
  v_locked boolean;
  v_minutos integer;
  v_estado record;
BEGIN
  DELETE FROM public.account_lockouts WHERE email = 'prova140@exemplo.com';

  PERFORM public.record_failed_login('  Prova140@Exemplo.COM ');
  PERFORM public.record_failed_login('prova140@exemplo.com');
  PERFORM public.record_failed_login('PROVA140@EXEMPLO.COM');
  v_ret := public.record_failed_login('Prova140@Exemplo.com ');

  SELECT count(*), max(failed_attempts) INTO v_linhas, v_attempts
  FROM public.account_lockouts WHERE email = 'prova140@exemplo.com';

  INSERT INTO public.t_checks VALUES
    ('depois: 4 falhas com e-mail em maiuscula caem na MESMA linha',
     v_linhas = 1, 'linhas=' || v_linhas::text),
    ('depois: a 4a falha conta 4 tentativas',
     (v_ret ->> 'attempts')::int = 4 AND v_attempts = 4,
     'retorno=' || coalesce(v_ret ->> 'attempts', '?') || ' coluna=' || coalesce(v_attempts::text, '?')),
    ('depois: com 4 falhas a conta ainda nao esta bloqueada',
     (public.is_account_locked('PROVA140@EXEMPLO.COM') ->> 'locked')::boolean = false, NULL);

  v_ret := public.record_failed_login('Prova140@Exemplo.com');
  v_locked := (v_ret ->> 'locked')::boolean;
  v_minutos := (v_ret ->> 'lockout_minutes')::int;

  INSERT INTO public.t_checks VALUES
    ('depois: a 5a falha bloqueia com backoff de 1 minuto',
     v_locked AND v_minutos = 1, 'retorno=' || v_ret::text);

  SELECT failed_attempts, lockout_count, locked_until INTO v_estado
  FROM public.account_lockouts WHERE email = 'prova140@exemplo.com';

  INSERT INTO public.t_checks VALUES
    ('depois: a linha fica com failed_attempts=0 e lockout_count=1',
     v_estado.failed_attempts = 0 AND v_estado.lockout_count = 1, NULL),
    ('depois: is_account_locked com maiuscula acha o bloqueio',
     (public.is_account_locked('Prova140@Exemplo.Com') ->> 'locked')::boolean, NULL);

  DELETE FROM public.account_lockouts WHERE email = 'prova140@exemplo.com';
END $$;

-- IP: o header vence o parametro; sem header o parametro continua valendo
DO $$
DECLARE v_id uuid; v_ip text;
BEGIN
  PERFORM set_config('request.headers',
    json_build_object('x-forwarded-for', '203.0.113.10, 10.0.0.1')::text, true);
  v_id := public.log_login_attempt('Prova140@Exemplo.com', '198.51.100.7', 'ua', false, 'prova');
  SELECT ip_address INTO v_ip FROM public.login_attempts WHERE id = v_id;
  INSERT INTO public.t_checks VALUES
    ('depois: log_login_attempt usa o 1o IP do x-forwarded-for',
     v_ip = '203.0.113.10', 'gravou ' || coalesce(v_ip, '<null>'));

  PERFORM set_config('request.headers', '', true);
  v_id := public.log_login_attempt('Prova140@Exemplo.com', '192.0.2.9', 'ua', false, 'prova');
  SELECT ip_address INTO v_ip FROM public.login_attempts WHERE id = v_id;
  INSERT INTO public.t_checks VALUES
    ('depois: sem header, o parametro continua valendo (fallback)',
     v_ip = '192.0.2.9', 'gravou ' || coalesce(v_ip, '<null>'));

  DELETE FROM public.login_attempts WHERE email = 'prova140@exemplo.com';
END $$;

-- Auto-bloqueio de IP: 5 falhas do MESMO IP do request passam a criar a linha
DO $$
DECLARE i integer;
BEGIN
  PERFORM set_config('request.headers',
    json_build_object('x-forwarded-for', '203.0.113.55')::text, true);
  FOR i IN 1..5 LOOP
    PERFORM public.log_login_attempt('prova140-ip@exemplo.com', '198.51.100.1', 'ua', false, 'prova');
  END LOOP;
  INSERT INTO public.t_checks VALUES
    ('depois: 5 falhas do mesmo IP criam o auto-bloqueio em blocked_ips',
     EXISTS (SELECT 1 FROM public.blocked_ips WHERE ip_address = '203.0.113.55'),
     (SELECT coalesce(max(attempts_count)::text, 'sem linha') FROM public.blocked_ips WHERE ip_address = '203.0.113.55'));
END $$;

-- E-mail vazio e' recusado (nao cria linha lixo)
DO $$
DECLARE v_erro text;
BEGIN
  BEGIN
    PERFORM public.record_failed_login('   ');
    v_erro := NULL;
  EXCEPTION WHEN invalid_parameter_value THEN
    v_erro := '22023';
  END;
  INSERT INTO public.t_checks VALUES
    ('depois: e-mail vazio e recusado com 22023', v_erro = '22023', coalesce(v_erro, 'sem excecao'));
END $$;

DELETE FROM public.login_attempts WHERE email LIKE 'prova140%';
DELETE FROM public.blocked_ips WHERE ip_address = '203.0.113.55';

\echo === TEMPO 3: rollback devolve o corpo e preserva o acesso ===
\i 'supabase/rollbacks/20261128201000_revert_lockout_rpc_publica.sql'

DO $$
DECLARE v_erro text; v_anon boolean;
BEGIN
  INSERT INTO public.account_lockouts (email, failed_attempts, last_failed_attempt)
  VALUES ('prova140-rollback@exemplo.com', 1, now())
  ON CONFLICT (email) DO NOTHING;

  BEGIN
    PERFORM public.record_failed_login('Prova140-Rollback@Exemplo.com');
    v_erro := NULL;
  EXCEPTION WHEN unique_violation THEN
    v_erro := 'unique_violation';
  END;

  v_anon := has_function_privilege('anon', 'public.record_failed_login(text)'::regprocedure, 'EXECUTE');

  INSERT INTO public.t_checks VALUES
    ('rollback: corpo original volta (e-mail em maiuscula estoura unique)',
     v_erro = 'unique_violation', coalesce(v_erro, 'sem excecao')),
    ('rollback: anon continua com EXECUTE (login nao quebra)',
     v_anon, 'anon=' || v_anon::text);

  DELETE FROM public.account_lockouts WHERE email LIKE 'prova140%';
END $$;

\echo === RESULTADO ===
SELECT nome, passou, detalhe FROM public.t_checks WHERE NOT passou ORDER BY nome;
SELECT count(*) FILTER (WHERE NOT passou) AS falhas, count(*) AS total FROM public.t_checks;
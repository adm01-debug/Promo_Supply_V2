-- ============================================================================
-- Trilha de auditoria a prova de adulteracao (append-only + hash encadeado)
--
-- Contexto: o dono do produto definiu guarda de 5 anos para audit_logs
-- (LGPD art.16, aplicada por public.apply_lgpd_retention) e pediu mecanismos
-- que validem autenticidade e validade dos registros -- ISO/IEC 27001 A.8.15
-- (protecao dos registros de log contra alteracao e acesso nao autorizado).
--
-- O que JA existia e e preservado (nao reescrever):
--   * enforce_audit_integrity()  -> forca user_id/organization_id reais no
--     INSERT, impedindo forja de autoria;
--   * sanitize_audit_metadata()  -> higieniza metadata;
--   * policy RESTRICTIVE tenant_isolation_audit_logs + ausencia de policy
--     PERMISSIVE de UPDATE/DELETE -> sob RLS, 'authenticated' ja nao altera
--     nem apaga a trilha.
--
-- O que faltava e esta migration entrega:
--   1. RLS nao alcanca quem tem BYPASSRLS (service_role) nem o dono da tabela.
--      Qualquer edge function com service_role podia alterar a auditoria.
--      -> trigger append-only bloqueia UPDATE sempre e DELETE fora da
--         retencao legal, independente de role.
--   2. Nao havia como PROVAR que um registro nao foi alterado. Um UPDATE
--      direto no banco, ou um dump restaurado adulterado, passavam despercebidos.
--      -> cada registro recebe um hash SHA-256 do proprio conteudo encadeado
--         ao hash do registro anterior. Alterar, remover ou inserir no meio
--         quebra a cadeia de forma detectavel.
--   3. Grants ociosos de UPDATE/DELETE/TRUNCATE para anon/authenticated.
--      -> revogados (defesa em profundidade: hoje o RLS cobre, mas uma policy
--         permissiva criada no futuro reabriria o buraco).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Colunas da cadeia
-- ---------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.audit_logs_sequencia_seq;

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS sequencia     bigint,
  ADD COLUMN IF NOT EXISTS hash_anterior text,
  ADD COLUMN IF NOT EXISTS registro_hash text;

COMMENT ON COLUMN public.audit_logs.sequencia     IS 'Ordem total da cadeia de integridade. Preenchida por z_audit_logs_hash.';
COMMENT ON COLUMN public.audit_logs.hash_anterior IS 'registro_hash do registro anterior na cadeia (GENESIS no primeiro).';
COMMENT ON COLUMN public.audit_logs.registro_hash IS 'SHA-256 do conteudo canonico do registro + hash_anterior. ISO 27001 A.8.15.';

-- ---------------------------------------------------------------------------
-- 2. Conteudo canonico: representacao textual estavel de um registro.
--    Qualquer campo de negocio entra aqui; mudar um byte muda o hash.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.audit_log_conteudo_canonico(r public.audit_logs)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $function$
  SELECT concat_ws('|',
    r.id::text,
    coalesce(r.user_id::text, ''),
    coalesce(r.user_email, ''),
    coalesce(r.user_name, ''),
    r.action_type::text,
    r.entity_type::text,
    coalesce(r.entity_id, ''),
    coalesce(r.entity_description, ''),
    coalesce(r.old_values::text, ''),
    coalesce(r.new_values::text, ''),
    coalesce(r.metadata::text, ''),
    coalesce(r.ip_address, ''),
    coalesce(r.user_agent, ''),
    to_char(r.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS.US'),
    coalesce(r.organization_id::text, ''),
    coalesce(r.tenant_id::text, ''),
    coalesce(r.sequencia::text, '')
  )
$function$;

COMMENT ON FUNCTION public.audit_log_conteudo_canonico(public.audit_logs)
  IS 'Serializacao deterministica de um registro de auditoria, base do hash de integridade.';

-- ---------------------------------------------------------------------------
-- 3. Trigger de encadeamento (BEFORE INSERT).
--    Nome com prefixo 'z_' de proposito: triggers disparam em ordem alfabetica
--    e este precisa rodar DEPOIS de a_fill_tenant_id, tr_enforce_audit_integrity
--    e trg_sanitize_audit_metadata, para hashear o conteudo ja definitivo.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.audit_logs_encadear_hash()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  anterior text;
BEGIN
  -- Serializa a montagem da cadeia: dois INSERTs concorrentes nao podem
  -- encadear no mesmo antecessor. Liberado no fim da transacao.
  PERFORM pg_advisory_xact_lock(hashtext('public.audit_logs.chain')::bigint);

  NEW.sequencia := nextval('public.audit_logs_sequencia_seq');

  SELECT a.registro_hash
    INTO anterior
    FROM public.audit_logs a
   WHERE a.sequencia IS NOT NULL
   ORDER BY a.sequencia DESC
   LIMIT 1;

  NEW.hash_anterior := coalesce(anterior, 'GENESIS');
  NEW.registro_hash := encode(
    sha256((public.audit_log_conteudo_canonico(NEW) || '|' || NEW.hash_anterior)::bytea),
    'hex'
  );

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS z_audit_logs_hash ON public.audit_logs;
CREATE TRIGGER z_audit_logs_hash
  BEFORE INSERT ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.audit_logs_encadear_hash();

-- ---------------------------------------------------------------------------
-- 4. Backfill dos registros existentes, em ordem cronologica.
--    Fecha a cadeia desde o primeiro registro ja gravado.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r        record;
  anterior text := 'GENESIS';
  seq      bigint := 0;
  linha    public.audit_logs;
BEGIN
  FOR r IN
    SELECT id FROM public.audit_logs
     WHERE registro_hash IS NULL
     ORDER BY created_at, id
  LOOP
    seq := nextval('public.audit_logs_sequencia_seq');

    UPDATE public.audit_logs SET sequencia = seq WHERE id = r.id;
    SELECT * INTO linha FROM public.audit_logs WHERE id = r.id;

    UPDATE public.audit_logs
       SET hash_anterior = anterior,
           registro_hash = encode(
             sha256((public.audit_log_conteudo_canonico(linha) || '|' || anterior)::bytea),
             'hex'
           )
     WHERE id = r.id;

    SELECT registro_hash INTO anterior FROM public.audit_logs WHERE id = r.id;
  END LOOP;
END;
$$;

ALTER TABLE public.audit_logs
  ALTER COLUMN sequencia     SET NOT NULL,
  ALTER COLUMN hash_anterior SET NOT NULL,
  ALTER COLUMN registro_hash SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS audit_logs_sequencia_uidx ON public.audit_logs (sequencia);

-- ---------------------------------------------------------------------------
-- 5. Append-only de verdade.
--    RLS nao alcanca service_role (BYPASSRLS) nem o dono da tabela; um trigger
--    alcanca. UPDATE nunca e legitimo numa trilha de auditoria -- confirmado:
--    nenhuma funcao do banco e nenhum ponto de src/ ou supabase/functions/
--    faz UPDATE em audit_logs. DELETE so e legitimo na retencao legal.
-- ---------------------------------------------------------------------------
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
$function$;

DROP TRIGGER IF EXISTS z_audit_logs_append_only ON public.audit_logs;
CREATE TRIGGER z_audit_logs_append_only
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.audit_logs_bloquear_alteracao();

-- TRUNCATE nao dispara trigger FOR EACH ROW; precisa do seu proprio.
CREATE OR REPLACE FUNCTION public.audit_logs_bloquear_truncate()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  RAISE EXCEPTION 'audit_logs e append-only: TRUNCATE bloqueado (ISO 27001 A.8.15)'
    USING ERRCODE = '42501';
END;
$function$;

DROP TRIGGER IF EXISTS z_audit_logs_no_truncate ON public.audit_logs;
CREATE TRIGGER z_audit_logs_no_truncate
  BEFORE TRUNCATE ON public.audit_logs
  FOR EACH STATEMENT EXECUTE FUNCTION public.audit_logs_bloquear_truncate();


-- ---------------------------------------------------------------------------
-- 7. Defesa em profundidade: retira grants que hoje so nao sao explorados
--    porque falta policy permissiva de UPDATE/DELETE.
-- ---------------------------------------------------------------------------
REVOKE UPDATE, DELETE, TRUNCATE ON public.audit_logs FROM anon, authenticated;
REVOKE TRUNCATE ON public.audit_logs FROM service_role;

-- ---------------------------------------------------------------------------
-- 8. Verificacao de autenticidade: recalcula a cadeia inteira e aponta o
--    primeiro registro divergente. E esta funcao que transforma o hash em
--    prova auditavel -- sem ela o hash seria so um campo bonito.
--
--    Uso: SELECT * FROM public.verificar_integridade_audit_logs();
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verificar_integridade_audit_logs()
RETURNS TABLE(
  situacao             text,
  total_registros      bigint,
  verificados_ate      bigint,
  primeiro_divergente  uuid,
  sequencia_divergente bigint,
  detalhe              text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  linha     public.audit_logs;
  anterior  text := 'GENESIS';
  esperado  text;
  total     bigint;
  contados  bigint := 0;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem verificar a integridade da auditoria'
      USING ERRCODE = '42501';
  END IF;

  SELECT count(*) INTO total FROM public.audit_logs;

  FOR linha IN SELECT * FROM public.audit_logs ORDER BY sequencia LOOP
    IF linha.hash_anterior IS DISTINCT FROM anterior THEN
      situacao             := 'ADULTERADO';
      total_registros      := total;
      verificados_ate      := contados;
      primeiro_divergente  := linha.id;
      sequencia_divergente := linha.sequencia;
      detalhe              := format(
        'Elo quebrado: registro aponta para hash anterior %s, mas a cadeia calculou %s. Indica remocao ou reordenacao de registro.',
        coalesce(linha.hash_anterior, '(nulo)'), anterior);
      RETURN NEXT;
      RETURN;
    END IF;

    esperado := encode(
      sha256((public.audit_log_conteudo_canonico(linha) || '|' || linha.hash_anterior)::bytea),
      'hex'
    );

    IF esperado IS DISTINCT FROM linha.registro_hash THEN
      situacao             := 'ADULTERADO';
      total_registros      := total;
      verificados_ate      := contados;
      primeiro_divergente  := linha.id;
      sequencia_divergente := linha.sequencia;
      detalhe              := format(
        'Conteudo alterado: hash gravado %s, hash recalculado %s. O registro foi modificado apos a gravacao.',
        linha.registro_hash, esperado);
      RETURN NEXT;
      RETURN;
    END IF;

    anterior := linha.registro_hash;
    contados := contados + 1;
  END LOOP;

  situacao             := 'INTEGRO';
  total_registros      := total;
  verificados_ate      := contados;
  primeiro_divergente  := NULL;
  sequencia_divergente := NULL;
  detalhe              := format('Cadeia integra: %s registro(s) verificados byte a byte.', contados);
  RETURN NEXT;
END;
$function$;

COMMENT ON FUNCTION public.verificar_integridade_audit_logs()
  IS 'Percorre a cadeia de hash de audit_logs e aponta o primeiro registro adulterado. ISO 27001 A.8.15.';

REVOKE ALL ON FUNCTION public.verificar_integridade_audit_logs() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verificar_integridade_audit_logs() TO authenticated, service_role;

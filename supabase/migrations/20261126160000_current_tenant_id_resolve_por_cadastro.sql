-- RLS-02 / etapa 027: current_tenant_id() dependia de uma claim do JWT que nada
-- preenche e por isso devolvia nulo em producao.
--
-- Causa: a versao vigente da funcao (20260805160000_fix_frontend_comms.sql) tenta
-- request.jwt.claims ->> 'tenant_id' e, se vazio, cai no fallback
-- "SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid() AND is_default = true".
-- Nao existe custom access token hook no projeto (nenhuma migration cria
-- access_token_hook/custom_access_token e o painel Authentication > Hooks esta vazio),
-- logo a claim nunca vem. E o fallback nao cobre o cadastro normal: nenhum trigger
-- insere em public.user_tenants - o unico INSERT automatico e
-- public.grant_tenant_access_on_insert(), que roda em INSERT/UPDATE de public.tenants
-- (20260619205841_08fc0043:150-168). Um usuario criado por handle_new_user() ganha
-- profiles.tenant_id mas nenhuma linha em user_tenants, entao a funcao devolvia NULL e
-- cinco telas morriam em silencio (WorkflowAdmin nao salvava template/regra, SSOConfig
-- nunca buscava a configuracao, useSupplierSlaData, SourcingIntelligenceWidget e
-- ProductSupplierManager com guarda !tenantId), alem de audit_logs gravar sem empresa e
-- a policy de erp_field_mappings ficar inerte.
--
-- Correcao: redefinir public.current_tenant_id() mantendo a assinatura, STABLE,
-- SECURITY DEFINER e SET search_path TO public, com a precedencia que o resto do banco
-- ja usa para "qual e a empresa do usuario":
--   1. claim tenant_id do JWT, quando um dia existir hook (inalterado);
--   2. vinculo em user_tenants (is_default primeiro, senao o mais antigo) - agora sem
--      exigir is_default = true, porque o backfill de 20260619205841:53 insere com o
--      default false;
--   3. profiles.tenant_id, preenchido por handle_new_user() no autocadastro e por
--      fill_tenant_id_from_profile nos demais fluxos.
-- Devolve NULL so quando o usuario nao tem vinculo nenhum (comportamento de falha
-- fechada preservado).
--
-- Nao toca em: tenant_in_my_group(), get_user_grupo_id() e o trigger de tenant_id
-- (base de ~70 policies), nem em nenhuma tela do app.
-- Reversao: supabase/rollbacks/20261126160000_revert_current_tenant_id_resolve_por_cadastro.sql

BEGIN;

CREATE OR REPLACE FUNCTION public.current_tenant_id()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $fn$
DECLARE
  v_tenant uuid;
  v_claims text;
BEGIN
  -- 1) Claim do token, quando houver custom access token hook.
  BEGIN
    v_claims := current_setting('request.jwt.claims', true);
  EXCEPTION WHEN OTHERS THEN
    v_claims := NULL;
  END;
  IF v_claims IS NOT NULL THEN
    BEGIN
      v_tenant := nullif(v_claims::jsonb ->> 'tenant_id', '')::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_tenant := NULL;
    END;
  END IF;
  IF v_tenant IS NOT NULL THEN
    RETURN v_tenant;
  END IF;

  -- 2) Vinculo explicito do usuario (padrao primeiro, senao o mais antigo).
  BEGIN
    SELECT ut.tenant_id INTO v_tenant
    FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
    ORDER BY ut.is_default DESC, ut.joined_at ASC, ut.tenant_id
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_tenant := NULL;
  END;
  IF v_tenant IS NOT NULL THEN
    RETURN v_tenant;
  END IF;

  -- 3) Cadastro: handle_new_user/fill_tenant_id_from_profile preenchem profiles.tenant_id.
  BEGIN
    SELECT p.tenant_id INTO v_tenant
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_tenant := NULL;
  END;

  RETURN v_tenant;
END;
$fn$;

COMMIT;

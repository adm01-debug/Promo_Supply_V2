-- EDGA-10 (parte 1 de 2) / etapa 050: spot_pedidos passa a ter empresa e isolamento por grupo.
--
-- Causa: a edge supabase/functions/spot-api resolvia o chamador so por papel
-- (ALLOWED_ROLES = admin/coordinator/buyer, index.ts:40) e nunca resolvia a empresa - nao
-- havia leitura de user_tenants no arquivo, e authorize (:88-126) devolvia { userId, isCron }.
-- Sem identificar o dono, createOrder (:568-580) gravava pedido real na conta SPOT com
-- .upsert({ spot_order_id, internal_reference, status, valor_total, codigo_rastreamento,
-- itens, last_synced_at, status_synced_at }) sem coluna de empresa, e a tabela nao tinha
-- tenant_id para gatear: as duas policies eram por papel ("Authenticated users can view spot
-- orders", com auth.uid() IS NOT NULL, e "Buyers coordinators admins can manage spot orders").
--
-- Esta migration e o lado do banco do achado; a atribuicao de empresa nas linhas novas passa
-- a ser feita pela edge na etapa 051.
--
-- Passos, em transacao unica:
--   1. tenant_id uuid em public.spot_pedidos (nullable: a ingestao do cron e historica);
--   2. FK public.spot_pedidos.tenant_id -> public.tenants(id) ON DELETE RESTRICT, mesmo
--      criterio da etapa 131 - a empresa nao se apaga junto com o pedido;
--   3. backfill fail-closed: com exatamente UMA empresa cadastrada, toda linha sem dono
--      recebe essa empresa; se sobrar qualquer linha sem dono, a transacao ABORTA. Nao
--      adivinhamos a empresa de um pedido;
--   4. indice idx_spot_pedidos_tenant;
--   5. policy tenant_isolation_spot_pedidos AS RESTRICTIVE FOR ALL, no molde de
--      20261112170347_rls_tenant_isolation_restrictive.sql.
--
-- Por que fail-closed no passo 3: public.tenant_in_my_group(NULL) devolve false
-- (20260805160000_fix_frontend_comms.sql:25), ou seja, linha sem empresa ficaria invisivel
-- para todo mundo se a RESTRICTIVE entrasse sem backfill completo.
--
-- Efeito observavel hoje: nenhum. 'authenticated' nao tem GRANT algum em spot_pedidos
-- (nenhuma migration concedeu SELECT/INSERT/UPDATE/DELETE nessa tabela) e nenhum arquivo de
-- src/ le ou escreve a tabela (o unico match de spot_pedidos em src/ e o teste
-- src/tests/spot/spotApi.test.ts). A edge usa service_role e nao passa por RLS. A policy
-- entra como defesa em profundidade para quando um GRANT for concedido.
--
-- Reversao: supabase/rollbacks/20261128140000_revert_spot_pedidos_tenant.sql

BEGIN;

DO $$
DECLARE
  v_empresas    integer;
  v_dono        uuid;
  v_linhas      integer;
  v_sem_empresa integer;
  v_constraint  text;
BEGIN
  SELECT count(*) INTO v_empresas FROM public.tenants;
  SELECT id       INTO v_dono     FROM public.tenants ORDER BY created_at, id LIMIT 1;

  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute
     WHERE attrelid = 'public.spot_pedidos'::regclass
       AND attname  = 'tenant_id'
       AND NOT attisdropped
  ) THEN
    ALTER TABLE public.spot_pedidos ADD COLUMN tenant_id uuid;
    RAISE NOTICE 'coluna criada: public.spot_pedidos.tenant_id';
  ELSE
    RAISE NOTICE 'coluna ja existia, preservada: public.spot_pedidos.tenant_id';
  END IF;

  SELECT c.conname INTO v_constraint
    FROM pg_constraint c
    JOIN pg_attribute a
      ON a.attrelid = c.conrelid
     AND a.attnum   = c.conkey[1]
   WHERE c.contype    = 'f'
     AND c.conrelid   = 'public.spot_pedidos'::regclass
     AND c.confrelid  = 'public.tenants'::regclass
     AND a.attname    = 'tenant_id'
     AND array_length(c.conkey, 1) = 1;

  IF v_constraint IS NULL THEN
    ALTER TABLE public.spot_pedidos
      ADD CONSTRAINT spot_pedidos_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;
    RAISE NOTICE 'FK criada: spot_pedidos_tenant_id_fkey -> public.tenants(id) ON DELETE RESTRICT';
  ELSE
    RAISE NOTICE 'FK ja existia, preservada: %', v_constraint;
  END IF;

  IF v_empresas = 0 THEN
    RAISE EXCEPTION 'spot_pedidos: nenhuma empresa cadastrada em public.tenants - backfill impossivel';
  ELSIF v_empresas = 1 THEN
    UPDATE public.spot_pedidos SET tenant_id = v_dono WHERE tenant_id IS NULL;
    GET DIAGNOSTICS v_linhas = ROW_COUNT;
    RAISE NOTICE 'backfill: % linha(s) atribuida(s) a empresa %', v_linhas, v_dono;
  ELSE
    RAISE NOTICE 'backfill por empresa unica nao se aplica: % empresas cadastradas', v_empresas;
  END IF;

  SELECT count(*) INTO v_sem_empresa FROM public.spot_pedidos WHERE tenant_id IS NULL;
  IF v_sem_empresa > 0 THEN
    RAISE EXCEPTION 'spot_pedidos: % linha(s) sem empresa e % empresa(s) cadastrada(s) - backfill por internal_reference necessario antes de isolar por tenant', v_sem_empresa, v_empresas;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_spot_pedidos_tenant ON public.spot_pedidos(tenant_id);

DROP POLICY IF EXISTS tenant_isolation_spot_pedidos ON public.spot_pedidos;
CREATE POLICY tenant_isolation_spot_pedidos ON public.spot_pedidos AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id)) WITH CHECK (public.tenant_in_my_group(tenant_id));

-- Prova impressa no log do run de aplicacao: nenhuma linha sem empresa, FK em RESTRICT e
-- a policy nova presente.
SELECT (SELECT count(*) FROM public.spot_pedidos)                          AS pedidos,
       (SELECT count(*) FROM public.spot_pedidos WHERE tenant_id IS NOT NULL) AS com_empresa,
       (SELECT count(*) FROM public.spot_pedidos WHERE tenant_id IS NULL)     AS sem_empresa,
       (SELECT count(*) FROM public.tenants)                                  AS empresas;

SELECT c.conname            AS constraint_fk,
       c.confdeltype        AS on_delete,
       c.convalidated       AS validada
  FROM pg_constraint c
 WHERE c.contype  = 'f'
   AND c.conrelid = 'public.spot_pedidos'::regclass;

SELECT polname        AS policy,
       polcmd         AS comando,
       polpermissive  AS permissiva
  FROM pg_policy
 WHERE polrelid = 'public.spot_pedidos'::regclass
 ORDER BY polname;

COMMIT;

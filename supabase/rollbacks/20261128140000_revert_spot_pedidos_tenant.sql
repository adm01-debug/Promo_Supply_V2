-- Reversao da migration 20261128140000_spot_pedidos_tenant.sql (etapa 050 / EDGA-10).
--
-- Volta public.spot_pedidos ao estado anterior: sem a policy de isolamento por empresa, sem
-- o indice e sem a coluna tenant_id. A coluna so cai se nenhuma linha tiver empresa - se a
-- edge (etapa 051) ja tiver gravado dono em alguma linha, o DROP COLUMN apagaria essa
-- informacao e esta reversao ABORTA antes de perder dado.
--
-- Quando usar: se o isolamento por empresa quebrar a leitura da integracao SPOT de um jeito
-- que a etapa 051 nao cubra. Nao e caminho de rotina.

BEGIN;

DO $$
DECLARE
  v_com_empresa integer;
  v_constraint  text;
BEGIN
  DROP POLICY IF EXISTS tenant_isolation_spot_pedidos ON public.spot_pedidos;

  IF EXISTS (
    SELECT 1 FROM pg_attribute
     WHERE attrelid = 'public.spot_pedidos'::regclass
       AND attname  = 'tenant_id'
       AND NOT attisdropped
  ) THEN
    SELECT count(*) INTO v_com_empresa FROM public.spot_pedidos WHERE tenant_id IS NOT NULL;
    IF v_com_empresa > 0 THEN
      RAISE EXCEPTION 'reversao abortada: % linha(s) com empresa atribuida em spot_pedidos; decida o destino antes de dropar a coluna', v_com_empresa;
    END IF;

    SELECT c.conname INTO v_constraint
      FROM pg_constraint c
      JOIN pg_attribute a
        ON a.attrelid = c.conrelid
       AND a.attnum   = c.conkey[1]
     WHERE c.contype   = 'f'
       AND c.conrelid  = 'public.spot_pedidos'::regclass
       AND c.confrelid = 'public.tenants'::regclass
       AND a.attname   = 'tenant_id';

    IF v_constraint IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.spot_pedidos DROP CONSTRAINT %I', v_constraint);
      RAISE NOTICE 'FK removida: %', v_constraint;
    END IF;

    ALTER TABLE public.spot_pedidos DROP COLUMN tenant_id;
    RAISE NOTICE 'coluna removida: public.spot_pedidos.tenant_id';
  ELSE
    RAISE NOTICE 'coluna ausente, nada a remover: public.spot_pedidos.tenant_id';
  END IF;

  DROP INDEX IF EXISTS public.idx_spot_pedidos_tenant;
END $$;

COMMIT;

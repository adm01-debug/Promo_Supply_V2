-- 1. Create security schema if not exists
CREATE SCHEMA IF NOT EXISTS security;

-- 2. Fix Search Path for critical functions (Hardening)
DO $$ 
DECLARE 
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT n.nspname, p.proname, pg_get_function_arguments(p.oid) as args
        FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' 
        AND p.prokind = 'f'
    LOOP
        BEGIN
            EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_temp;', 
                func_record.nspname, func_record.proname, func_record.args);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not alter function %.%: %', func_record.nspname, func_record.proname, SQLERRM;
        END;
    END LOOP;
END $$;

-- 3. Optimization Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_pedidos_tenant_status ON public.pedidos (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_tenant_priority ON public.solicitacoes (tenant_id, prioridade);
CREATE INDEX IF NOT EXISTS idx_cotacoes_solicitacao_fornecedor ON public.cotacoes (solicitacao_id, fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_vencimento_status ON public.pagamentos (data_vencimento, status);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_entity ON public.workflow_instances (entity_type, entity_id);

-- 4. Query Telemetry Cleanup
CREATE OR REPLACE FUNCTION public.cleanup_old_telemetry()
RETURNS trigger AS $$
BEGIN
  DELETE FROM public.query_telemetry WHERE created_at < NOW() - INTERVAL '30 days';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trig_cleanup_telemetry ON public.query_telemetry;
CREATE TRIGGER trig_cleanup_telemetry
AFTER INSERT ON public.query_telemetry
FOR EACH STATEMENT
EXECUTE FUNCTION public.cleanup_old_telemetry();

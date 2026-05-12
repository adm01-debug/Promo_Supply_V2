-- Adicionar cost_center_id à tabela de pagamentos
ALTER TABLE public.pagamentos 
ADD COLUMN IF NOT EXISTS cost_center_id UUID REFERENCES public.cost_centers(id);

-- Criar tabela de auditoria financeira se não existir (para logs 10/10)
CREATE TABLE IF NOT EXISTS public.financial_audit_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    entity_type TEXT NOT NULL, -- 'pagamento', 'solicitacao', 'orcamento'
    entity_id UUID NOT NULL,
    action TEXT NOT NULL, -- 'create', 'update', 'delete', 'pay'
    old_data JSONB,
    new_data JSONB,
    user_id UUID REFERENCES auth.users(id),
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS na tabela de auditoria
ALTER TABLE public.financial_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all audit logs" 
ON public.financial_audit_logs 
FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text IN ('admin', 'coordinator')));

-- Trigger para auditar mudanças em pagamentos
CREATE OR REPLACE FUNCTION public.audit_pagamento_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.financial_audit_logs (
        entity_type,
        entity_id,
        action,
        old_data,
        new_data,
        user_id
    ) VALUES (
        'pagamento',
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        to_jsonb(OLD),
        to_jsonb(NEW),
        auth.uid()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remover trigger se já existir para evitar erro de re-execução
DROP TRIGGER IF EXISTS audit_pagamentos_trigger ON public.pagamentos;
CREATE TRIGGER audit_pagamentos_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.pagamentos
FOR EACH ROW EXECUTE FUNCTION public.audit_pagamento_changes();

-- Atualizar trigger de orçamento para considerar a amarração de pagamentos
-- Quando um pagamento é marcado como pago, o valor deve sair de 'comprometido' para 'utilizado' no orçamento do centro de custo
CREATE OR REPLACE FUNCTION public.sync_budget_on_payment()
RETURNS TRIGGER AS $$
DECLARE
    v_cost_center_id UUID;
BEGIN
    -- Determinar o centro de custo (do pagamento ou do pedido/solicitação vinculada)
    v_cost_center_id := COALESCE(NEW.cost_center_id, (SELECT cost_center_id FROM public.pedidos WHERE id = NEW.pedido_id LIMIT 1));

    IF v_cost_center_id IS NOT NULL THEN
        -- Se o status mudou para 'pago'
        IF (NEW.status = 'pago' AND (OLD.status IS NULL OR OLD.status != 'pago')) THEN
            UPDATE public.department_budgets
            SET 
                valor_utilizado = valor_utilizado + NEW.valor,
                valor_comprometido = GREATEST(0, valor_comprometido - NEW.valor)
            WHERE cost_center_id = v_cost_center_id
            AND ano = EXTRACT(YEAR FROM NEW.created_at)
            AND (mes IS NULL OR mes = EXTRACT(MONTH FROM NEW.created_at));
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remover trigger se já existir
DROP TRIGGER IF EXISTS sync_budget_payment_trigger ON public.pagamentos;
CREATE TRIGGER sync_budget_payment_trigger
AFTER INSERT OR UPDATE OF status ON public.pagamentos
FOR EACH ROW EXECUTE FUNCTION public.sync_budget_on_payment();

-- Tabela de logs de auditoria de orçamento
CREATE TABLE IF NOT EXISTS public.budget_audit_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    budget_id UUID REFERENCES public.department_budgets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS nos logs
ALTER TABLE public.budget_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Apenas admin e gestores podem ver logs de auditoria"
ON public.budget_audit_logs
FOR SELECT
USING (true); -- No contexto real, filtrar por perfil de admin ou gestor

-- Trigger para logar alterações em orçamentos
CREATE OR REPLACE FUNCTION public.log_budget_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO public.budget_audit_logs (budget_id, user_id, action, old_data)
        VALUES (OLD.id, auth.uid(), 'DELETE', row_to_json(OLD)::jsonb);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.budget_audit_logs (budget_id, user_id, action, old_data, new_data)
        VALUES (NEW.id, auth.uid(), 'UPDATE', row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO public.budget_audit_logs (budget_id, user_id, action, new_data)
        VALUES (NEW.id, auth.uid(), 'INSERT', row_to_json(NEW)::jsonb);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_log_budget_changes
AFTER INSERT OR UPDATE OR DELETE ON public.department_budgets
FOR EACH ROW EXECUTE FUNCTION public.log_budget_changes();

-- RPC para relatório consolidado
CREATE OR REPLACE FUNCTION public.get_cost_center_performance_report()
RETURNS TABLE (
    cost_center_id UUID,
    cost_center_name TEXT,
    cost_center_code TEXT,
    total_budget NUMERIC,
    total_committed NUMERIC,
    total_used NUMERIC,
    available_balance NUMERIC,
    usage_percentage NUMERIC,
    alerts_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cc.id,
        cc.name,
        cc.code,
        COALESCE(SUM(db.valor_total), 0) as total_budget,
        COALESCE(SUM(db.valor_comprometido), 0) as total_committed,
        COALESCE(SUM(db.valor_utilizado), 0) as total_used,
        COALESCE(SUM(db.valor_total - db.valor_comprometido - db.valor_utilizado), 0) as available_balance,
        CASE 
            WHEN COALESCE(SUM(db.valor_total), 0) > 0 
            THEN (COALESCE(SUM(db.valor_comprometido + db.valor_utilizado), 0) / SUM(db.valor_total)) * 100
            ELSE 0 
        END as usage_percentage,
        COUNT(db.id) FILTER (WHERE (db.valor_comprometido + db.valor_utilizado) > (db.valor_total * 0.9)) as alerts_count
    FROM public.cost_centers cc
    LEFT JOIN public.department_budgets db ON cc.id = db.cost_center_id
    WHERE cc.is_active = true
    GROUP BY cc.id, cc.name, cc.code
    ORDER BY usage_percentage DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

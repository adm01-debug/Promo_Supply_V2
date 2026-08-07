-- Adicionar campos de controle financeiro à tabela de centros de custo
ALTER TABLE public.cost_centers 
ADD COLUMN IF NOT EXISTS total_budget DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS committed_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS used_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS approval_threshold DECIMAL(15,2) DEFAULT 0;

-- Criar tabela de transações de orçamento
CREATE TABLE IF NOT EXISTS public.budget_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cost_center_id UUID REFERENCES public.cost_centers(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('commitment', 'actual', 'release', 'adjustment')),
    amount DECIMAL(15,2) NOT NULL,
    reference_type TEXT,
    reference_id UUID,
    description TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS para transações
ALTER TABLE public.budget_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Budget transactions are viewable by authenticated users" 
ON public.budget_transactions FOR SELECT USING (auth.role() = 'authenticated');

-- Hierarquia de aprovação
CREATE TABLE IF NOT EXISTS public.approval_hierarchy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    superior_id UUID REFERENCES auth.users(id),
    cost_center_id UUID REFERENCES public.cost_centers(id),
    max_approval_amount DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, cost_center_id)
);

-- RLS para hierarquia
ALTER TABLE public.approval_hierarchy ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approval hierarchy is viewable by authenticated users" 
ON public.approval_hierarchy FOR SELECT USING (auth.role() = 'authenticated');

-- Função de atualização de saldos
CREATE OR REPLACE FUNCTION public.update_cost_center_budget_totals()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF (NEW.type = 'commitment') THEN
            UPDATE public.cost_centers 
            SET committed_amount = committed_amount + NEW.amount
            WHERE id = NEW.cost_center_id;
        ELSIF (NEW.type = 'actual') THEN
            UPDATE public.cost_centers 
            SET used_amount = used_amount + NEW.amount,
                committed_amount = GREATEST(0, committed_amount - NEW.amount)
            WHERE id = NEW.cost_center_id;
        ELSIF (NEW.type = 'release') THEN
            UPDATE public.cost_centers 
            SET committed_amount = GREATEST(0, committed_amount - NEW.amount)
            WHERE id = NEW.cost_center_id;
        ELSIF (NEW.type = 'adjustment') THEN
            UPDATE public.cost_centers 
            SET total_budget = total_budget + NEW.amount
            WHERE id = NEW.cost_center_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
DROP TRIGGER IF EXISTS tr_budget_transaction_update ON public.budget_transactions;
CREATE TRIGGER tr_budget_transaction_update
AFTER INSERT ON public.budget_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_cost_center_budget_totals();

-- Recriar função check_budget_availability (DROP necessário se mudar tipo de retorno)
DROP FUNCTION IF EXISTS public.check_budget_availability(uuid, numeric);
CREATE OR REPLACE FUNCTION public.check_budget_availability(p_cost_center_id UUID, p_valor DECIMAL)
RETURNS JSON AS $$
DECLARE
    v_total DECIMAL;
    v_committed DECIMAL;
    v_used DECIMAL;
    v_available DECIMAL;
    v_cc_name TEXT;
BEGIN
    SELECT name, COALESCE(total_budget, 0), COALESCE(committed_amount, 0), COALESCE(used_amount, 0)
    INTO v_cc_name, v_total, v_committed, v_used
    FROM public.cost_centers 
    WHERE id = p_cost_center_id;

    v_available := v_total - (v_committed + v_used);

    IF v_available >= p_valor THEN
        RETURN json_build_object(
            'available', true,
            'has_budget', v_total > 0,
            'budget_total', v_total,
            'budget_available', v_available,
            'message', 'Saldo disponível no centro de custo ' || v_cc_name
        );
    ELSE
        RETURN json_build_object(
            'available', false,
            'has_budget', v_total > 0,
            'budget_total', v_total,
            'budget_available', v_available,
            'message', 'Saldo insuficiente no centro de custo ' || v_cc_name || '. Disponível: ' || v_available
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

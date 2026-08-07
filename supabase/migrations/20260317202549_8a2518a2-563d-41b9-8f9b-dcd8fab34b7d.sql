
-- ============================================
-- CONTRACTS: SLA Penalties, Quality & Score
-- ============================================

-- 1. Add SLA/Penalty columns to contracts
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS sla_delivery_days integer DEFAULT 30,
  ADD COLUMN IF NOT EXISTS penalty_rate_per_day numeric DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS penalty_cap_percent numeric DEFAULT 20,
  ADD COLUMN IF NOT EXISTS min_quality_score numeric DEFAULT 3.0,
  ADD COLUMN IF NOT EXISTS quality_penalty_percent numeric DEFAULT 10,
  ADD COLUMN IF NOT EXISTS return_policy text DEFAULT 'Itens fora do padrão serão devolvidos com nota de devolução e desconto aplicado no próximo pagamento.',
  ADD COLUMN IF NOT EXISTS min_supplier_score numeric DEFAULT 3.0,
  ADD COLUMN IF NOT EXISTS auto_block_below_score boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS penalty_clauses jsonb DEFAULT '[]'::jsonb;

-- 2. Create contract_penalties table to track actual penalties applied
CREATE TABLE IF NOT EXISTS public.contract_penalties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  pedido_id uuid REFERENCES public.pedidos(id),
  penalty_type text NOT NULL DEFAULT 'delivery_delay',
  description text NOT NULL,
  days_late integer DEFAULT 0,
  penalty_percent numeric DEFAULT 0,
  penalty_value numeric NOT NULL DEFAULT 0,
  applied_to_payment boolean DEFAULT false,
  pagamento_id uuid REFERENCES public.pagamentos(id),
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contract_penalties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view contract penalties"
  ON public.contract_penalties FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin coordinator finance can manage contract penalties"
  ON public.contract_penalties FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'finance'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'finance'::app_role));

CREATE TRIGGER trg_update_contract_penalties_updated_at
  BEFORE UPDATE ON public.contract_penalties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Auto-calculate penalty when pedido is delivered late
CREATE OR REPLACE FUNCTION public.auto_calculate_delivery_penalty()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_contract RECORD;
  v_days_late integer;
  v_penalty_pct numeric;
  v_penalty_val numeric;
BEGIN
  IF NEW.status = 'entregue' AND OLD.status != 'entregue' 
     AND NEW.data_entrega IS NOT NULL AND NEW.data_previsao IS NOT NULL
     AND NEW.data_entrega > NEW.data_previsao THEN
    
    -- Find active contract for this supplier
    FOR v_contract IN
      SELECT c.* FROM contracts c
      WHERE c.supplier_id = NEW.fornecedor_id::text
        AND c.status = 'active'
        AND c.sla_delivery_days IS NOT NULL
      ORDER BY c.created_at DESC LIMIT 1
    LOOP
      v_days_late := (NEW.data_entrega - NEW.data_previsao);
      v_penalty_pct := LEAST(
        v_days_late * COALESCE(v_contract.penalty_rate_per_day, 0.5),
        COALESCE(v_contract.penalty_cap_percent, 20)
      );
      v_penalty_val := ROUND(NEW.valor_total * v_penalty_pct / 100, 2);

      IF v_penalty_val > 0 THEN
        INSERT INTO contract_penalties (
          contract_id, pedido_id, penalty_type, description,
          days_late, penalty_percent, penalty_value, status
        ) VALUES (
          v_contract.id, NEW.id, 'delivery_delay',
          'Multa por atraso: ' || v_days_late || ' dia(s) de atraso no pedido ' || NEW.numero || 
          '. Taxa: ' || v_penalty_pct || '% sobre R$ ' || NEW.valor_total,
          v_days_late, v_penalty_pct, v_penalty_val, 'pending'
        );

        -- Notify admins
        INSERT INTO notifications (user_id, title, message, type, priority)
        SELECT ur.user_id,
          'Multa aplicada: ' || NEW.numero,
          'Pedido ' || NEW.numero || ' entregue com ' || v_days_late || ' dia(s) de atraso. Multa de R$ ' || v_penalty_val || ' (' || v_penalty_pct || '%) aplicada automaticamente.',
          'contract_penalty', 'high'
        FROM user_roles ur WHERE ur.role IN ('admin', 'coordinator', 'finance');
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_penalty_on_late_delivery
  AFTER UPDATE ON public.pedidos
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_calculate_delivery_penalty();

-- 4. Auto-block supplier when score drops below contract minimum
CREATE OR REPLACE FUNCTION public.auto_block_low_score_supplier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_contract RECORD;
BEGIN
  IF NEW.avaliacao IS NOT NULL AND (OLD.avaliacao IS NULL OR NEW.avaliacao < OLD.avaliacao) THEN
    FOR v_contract IN
      SELECT c.* FROM contracts c
      WHERE c.supplier_id = NEW.id::text
        AND c.status = 'active'
        AND c.auto_block_below_score = true
        AND c.min_supplier_score IS NOT NULL
    LOOP
      IF NEW.avaliacao < v_contract.min_supplier_score THEN
        -- Block supplier
        UPDATE fornecedores SET status = 'bloqueado', updated_at = now() WHERE id = NEW.id;

        -- Notify
        INSERT INTO notifications (user_id, title, message, type, priority)
        SELECT ur.user_id,
          'Fornecedor bloqueado: ' || NEW.razao_social,
          'O fornecedor ' || NEW.razao_social || ' foi bloqueado automaticamente. Score: ' || 
          NEW.avaliacao || ' (mínimo contratual: ' || v_contract.min_supplier_score || ').',
          'supplier_blocked', 'critical'
        FROM user_roles ur WHERE ur.role IN ('admin', 'coordinator');
        
        EXIT; -- One block is enough
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_block_low_score
  AFTER UPDATE ON public.fornecedores
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_block_low_score_supplier();

-- 5. Enable realtime for penalties
ALTER PUBLICATION supabase_realtime ADD TABLE public.contract_penalties;

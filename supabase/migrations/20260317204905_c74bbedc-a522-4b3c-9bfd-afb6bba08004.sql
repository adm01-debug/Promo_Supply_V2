
-- Compliance summary view
CREATE OR REPLACE VIEW public.supplier_compliance_summary AS
SELECT 
  f.id AS fornecedor_id,
  f.razao_social,
  f.avaliacao,
  f.status AS supplier_status,
  COALESCE(pen.penalty_count, 0) AS penalty_count,
  COALESCE(pen.total_penalty_value, 0) AS total_penalty_value,
  COALESCE(del.total_deliveries, 0) AS total_deliveries,
  COALESCE(del.on_time_deliveries, 0) AS on_time_deliveries,
  COALESCE(del.late_deliveries, 0) AS late_deliveries,
  CASE 
    WHEN COALESCE(del.total_deliveries, 0) > 0 
    THEN ROUND((COALESCE(del.on_time_deliveries, 0)::numeric / del.total_deliveries) * 100, 1)
    ELSE 100
  END AS on_time_rate,
  COALESCE(qual.avg_quality_score, 0) AS avg_quality_score,
  COALESCE(qual.total_inspections, 0) AS total_inspections,
  COALESCE(qual.rejected_count, 0) AS rejected_count,
  COALESCE(bon.active_bonifications, 0) AS active_bonifications
FROM fornecedores f
LEFT JOIN (
  SELECT c.supplier_id::uuid AS supplier_uuid, COUNT(*) AS penalty_count, SUM(cp.penalty_value) AS total_penalty_value
  FROM contract_penalties cp JOIN contracts c ON c.id = cp.contract_id
  GROUP BY c.supplier_id
) pen ON pen.supplier_uuid = f.id
LEFT JOIN (
  SELECT fornecedor_id, COUNT(*) AS total_deliveries,
    COUNT(*) FILTER (WHERE data_entrega IS NOT NULL AND data_previsao IS NOT NULL AND data_entrega <= data_previsao) AS on_time_deliveries,
    COUNT(*) FILTER (WHERE data_entrega IS NOT NULL AND data_previsao IS NOT NULL AND data_entrega > data_previsao) AS late_deliveries
  FROM pedidos WHERE status IN ('entregue', 'parcial') GROUP BY fornecedor_id
) del ON del.fornecedor_id = f.id
LEFT JOIN (
  SELECT fornecedor_id, AVG(overall_score) AS avg_quality_score, COUNT(*) AS total_inspections,
    COUNT(*) FILTER (WHERE status = 'rejected') AS rejected_count
  FROM receiving_checklists GROUP BY fornecedor_id
) qual ON qual.fornecedor_id = f.id
LEFT JOIN (
  SELECT fornecedor_id, COUNT(*) AS active_bonifications
  FROM supplier_bonifications WHERE is_active = true GROUP BY fornecedor_id
) bon ON bon.fornecedor_id = f.id;

-- Default escalation rules
INSERT INTO public.penalty_escalation_config (level, min_infractions, max_infractions, action_type, penalty_multiplier, block_days, description) VALUES
(1, 1, 1, 'warning', 0, 0, '1ª infração: Advertência formal sem multa'),
(2, 2, 2, 'standard_fine', 1.0, 0, '2ª infração: Multa padrão conforme contrato'),
(3, 3, 3, 'double_fine', 2.0, 30, '3ª infração: Multa dobrada + bloqueio 30 dias'),
(4, 4, NULL, 'permanent_block', 3.0, 0, '4ª+ infração: Multa tripla + bloqueio permanente');

-- Trigger: auto-calculate overall_score
CREATE OR REPLACE FUNCTION public.calc_checklist_overall_score()
RETURNS TRIGGER AS $$
BEGIN
  NEW.overall_score := ROUND((NEW.packaging_score + NEW.conformity_score + NEW.quantity_score + NEW.documentation_score)::numeric / 4, 2);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calc_checklist_score BEFORE INSERT OR UPDATE ON public.receiving_checklists
  FOR EACH ROW EXECUTE FUNCTION public.calc_checklist_overall_score();

-- Trigger: apply penalty escalation
CREATE OR REPLACE FUNCTION public.apply_penalty_escalation()
RETURNS TRIGGER AS $$
DECLARE
  infraction_count INTEGER;
  escalation_record RECORD;
  supplier_id_val TEXT;
BEGIN
  SELECT supplier_id INTO supplier_id_val FROM contracts WHERE id = NEW.contract_id;
  SELECT COUNT(*) INTO infraction_count FROM contract_penalties cp JOIN contracts c ON c.id = cp.contract_id WHERE c.supplier_id = supplier_id_val AND cp.id != NEW.id;
  infraction_count := infraction_count + 1;
  SELECT * INTO escalation_record FROM penalty_escalation_config
    WHERE is_active = true AND (contract_id IS NULL OR contract_id = NEW.contract_id)
    AND infraction_count >= min_infractions AND (max_infractions IS NULL OR infraction_count <= max_infractions)
    ORDER BY contract_id NULLS LAST, level DESC LIMIT 1;
  IF FOUND THEN
    NEW.penalty_value := NEW.penalty_value * escalation_record.penalty_multiplier;
    IF escalation_record.action_type IN ('temp_block', 'permanent_block') THEN
      UPDATE fornecedores SET status = 'bloqueado', updated_at = now() WHERE id = supplier_id_val::uuid;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_apply_penalty_escalation BEFORE INSERT ON public.contract_penalties
  FOR EACH ROW EXECUTE FUNCTION public.apply_penalty_escalation();

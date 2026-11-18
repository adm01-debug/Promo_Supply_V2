CREATE OR REPLACE FUNCTION public.apply_penalty_escalation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$

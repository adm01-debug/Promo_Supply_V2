CREATE OR REPLACE FUNCTION public.auto_block_low_score_supplier()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
        INSERT INTO notifications (user_id, title, message, type, priority, tenant_id)
        SELECT ur.user_id,
          'Fornecedor bloqueado: ' || NEW.razao_social,
          'O fornecedor ' || NEW.razao_social || ' foi bloqueado automaticamente. Score: ' ||
          NEW.avaliacao || ' (mínimo contratual: ' || v_contract.min_supplier_score || ').',
          'supplier_blocked', 'critical', NEW.tenant_id
        FROM user_roles ur WHERE ur.role IN ('admin', 'coordinator');

        EXIT; -- One block is enough
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$

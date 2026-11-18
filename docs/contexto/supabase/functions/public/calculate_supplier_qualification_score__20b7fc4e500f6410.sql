CREATE OR REPLACE FUNCTION public.calculate_supplier_qualification_score(p_fornecedor_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total_weight INTEGER := 0;
  v_achieved_weight INTEGER := 0;
  v_document_score NUMERIC := 0;
  v_compliance_score NUMERIC := 0;
  v_expiry_score NUMERIC := 0;
  v_overall_score NUMERIC := 0;
  v_next_expiry DATE;
  v_docs_pending INTEGER := 0;
  v_docs_approved INTEGER := 0;
  v_docs_expired INTEGER := 0;
  v_docs_rejected INTEGER := 0;
  v_status TEXT := 'pending';
  v_supplier_type TEXT;
BEGIN
  -- Get supplier type
  SELECT tipo INTO v_supplier_type FROM public.fornecedores WHERE id = p_fornecedor_id;
  
  -- Calculate total possible weight from applicable requirements
  SELECT COALESCE(SUM(weight), 0) INTO v_total_weight
  FROM public.qualification_requirements
  WHERE is_active = true 
  AND is_mandatory = true
  AND v_supplier_type = ANY(applies_to_types);
  
  -- Calculate achieved weight from approved documents
  SELECT COALESCE(SUM(qr.weight), 0) INTO v_achieved_weight
  FROM public.supplier_documents sd
  JOIN public.qualification_requirements qr ON qr.id = sd.requirement_id
  WHERE sd.fornecedor_id = p_fornecedor_id
  AND sd.status = 'approved'
  AND (sd.expiry_date IS NULL OR sd.expiry_date > CURRENT_DATE)
  AND qr.is_mandatory = true;
  
  -- Count documents by status
  SELECT 
    COUNT(*) FILTER (WHERE status = 'pending'),
    COUNT(*) FILTER (WHERE status = 'approved' AND (expiry_date IS NULL OR expiry_date > CURRENT_DATE)),
    COUNT(*) FILTER (WHERE status = 'approved' AND expiry_date <= CURRENT_DATE),
    COUNT(*) FILTER (WHERE status = 'rejected')
  INTO v_docs_pending, v_docs_approved, v_docs_expired, v_docs_rejected
  FROM public.supplier_documents
  WHERE fornecedor_id = p_fornecedor_id;
  
  -- Get next expiry date
  SELECT MIN(expiry_date) INTO v_next_expiry
  FROM public.supplier_documents
  WHERE fornecedor_id = p_fornecedor_id
  AND status = 'approved'
  AND expiry_date > CURRENT_DATE;
  
  -- Calculate scores
  IF v_total_weight > 0 THEN
    v_document_score := (v_achieved_weight::NUMERIC / v_total_weight) * 100;
  END IF;
  
  -- Compliance score (penalize pending and rejected)
  IF (v_docs_pending + v_docs_approved + v_docs_expired + v_docs_rejected) > 0 THEN
    v_compliance_score := (v_docs_approved::NUMERIC / (v_docs_pending + v_docs_approved + v_docs_expired + v_docs_rejected)) * 100;
  END IF;
  
  -- Expiry score (penalize expired documents)
  IF (v_docs_approved + v_docs_expired) > 0 THEN
    v_expiry_score := (v_docs_approved::NUMERIC / (v_docs_approved + v_docs_expired)) * 100;
  ELSE
    v_expiry_score := 100;
  END IF;
  
  -- Overall score (weighted average)
  v_overall_score := (v_document_score * 0.5) + (v_compliance_score * 0.3) + (v_expiry_score * 0.2);
  
  -- Determine status
  IF v_docs_expired > 0 OR v_docs_rejected > 0 THEN
    v_status := 'disqualified';
  ELSIF v_overall_score >= 100 THEN
    v_status := 'qualified';
  ELSIF v_overall_score >= 70 THEN
    v_status := 'partially_qualified';
  ELSIF v_docs_pending > 0 THEN
    v_status := 'pending';
  ELSE
    v_status := 'disqualified';
  END IF;
  
  -- Upsert score record
  INSERT INTO public.supplier_qualification_scores (
    fornecedor_id, overall_score, document_score, compliance_score, expiry_score,
    qualification_status, next_expiry_date, documents_pending, documents_approved,
    documents_expired, documents_rejected, last_calculated_at
  ) VALUES (
    p_fornecedor_id, v_overall_score, v_document_score, v_compliance_score, v_expiry_score,
    v_status, v_next_expiry, v_docs_pending, v_docs_approved,
    v_docs_expired, v_docs_rejected, now()
  )
  ON CONFLICT (fornecedor_id) DO UPDATE SET
    overall_score = EXCLUDED.overall_score,
    document_score = EXCLUDED.document_score,
    compliance_score = EXCLUDED.compliance_score,
    expiry_score = EXCLUDED.expiry_score,
    qualification_status = EXCLUDED.qualification_status,
    next_expiry_date = EXCLUDED.next_expiry_date,
    documents_pending = EXCLUDED.documents_pending,
    documents_approved = EXCLUDED.documents_approved,
    documents_expired = EXCLUDED.documents_expired,
    documents_rejected = EXCLUDED.documents_rejected,
    last_calculated_at = now(),
    updated_at = now();
  
  RETURN v_overall_score;
END;
$function$

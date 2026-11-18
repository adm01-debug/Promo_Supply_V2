CREATE OR REPLACE FUNCTION public.count_legacy_storage_urls()
 RETURNS TABLE(bucket text, table_name text, column_name text, legacy_count bigint, migrated_count bigint, total_with_url bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uuid_re CONSTANT TEXT := '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
  migrated_re TEXT;
  legacy_re TEXT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  -- comprovantes / pagamentos
  migrated_re := '/object/public/comprovantes/' || uuid_re || '/' || uuid_re || '/';
  legacy_re   := '/object/public/comprovantes/' || uuid_re || '/';
  RETURN QUERY
  SELECT 'comprovantes'::TEXT, 'pagamentos'::TEXT, 'comprovante_url'::TEXT,
    (SELECT COUNT(*) FROM public.pagamentos
       WHERE comprovante_url ~ legacy_re AND comprovante_url !~ migrated_re),
    (SELECT COUNT(*) FROM public.pagamentos WHERE comprovante_url ~ migrated_re),
    (SELECT COUNT(*) FROM public.pagamentos WHERE comprovante_url IS NOT NULL);

  -- comprovantes / payment_history
  RETURN QUERY
  SELECT 'comprovantes'::TEXT, 'payment_history'::TEXT, 'comprovante_url'::TEXT,
    (SELECT COUNT(*) FROM public.payment_history
       WHERE comprovante_url ~ legacy_re AND comprovante_url !~ migrated_re),
    (SELECT COUNT(*) FROM public.payment_history WHERE comprovante_url ~ migrated_re),
    (SELECT COUNT(*) FROM public.payment_history WHERE comprovante_url IS NOT NULL);

  -- documentos / contract_documents
  migrated_re := '/object/public/documentos/' || uuid_re || '/' || uuid_re || '/';
  legacy_re   := '/object/public/documentos/' || uuid_re || '/';
  RETURN QUERY
  SELECT 'documentos'::TEXT, 'contract_documents'::TEXT, 'file_url'::TEXT,
    (SELECT COUNT(*) FROM public.contract_documents
       WHERE file_url ~ legacy_re AND file_url !~ migrated_re),
    (SELECT COUNT(*) FROM public.contract_documents WHERE file_url ~ migrated_re),
    (SELECT COUNT(*) FROM public.contract_documents WHERE file_url IS NOT NULL);

  -- documentos / supplier_documents
  RETURN QUERY
  SELECT 'documentos'::TEXT, 'supplier_documents'::TEXT, 'file_url'::TEXT,
    (SELECT COUNT(*) FROM public.supplier_documents
       WHERE file_url ~ legacy_re AND file_url !~ migrated_re),
    (SELECT COUNT(*) FROM public.supplier_documents WHERE file_url ~ migrated_re),
    (SELECT COUNT(*) FROM public.supplier_documents WHERE file_url IS NOT NULL);
END;
$function$

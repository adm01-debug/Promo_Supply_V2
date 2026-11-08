CREATE OR REPLACE FUNCTION public.count_legacy_storage_urls()
RETURNS TABLE (
  bucket TEXT,
  table_name TEXT,
  column_name TEXT,
  legacy_count BIGINT,
  migrated_count BIGINT,
  total_with_url BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  -- Apenas admins podem rodar.
  SELECT public.has_role(auth.uid(), 'admin') INTO v_is_admin;
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  -- Legacy: /object/public/{bucket}/{uuid}/... onde primeiro segmento é user_id (não é tenant_id).
  -- Migrado: /object/public/{bucket}/{tenant_uuid}/{user_uuid}/...
  -- Distinguimos pela presença do path com 2 segmentos UUID consecutivos após o bucket.
  RETURN QUERY
  WITH targets(bucket, table_name, column_name) AS (
    VALUES
      ('comprovantes','pagamentos','comprovante_url'),
      ('comprovantes','payment_history','comprovante_url'),
      ('documentos','contract_documents','file_url'),
      ('documentos','supplier_documents','file_url')
  )
  SELECT
    t.bucket,
    t.table_name,
    t.column_name,
    (
      SELECT COUNT(*) FROM (
        SELECT 1 FROM (
          SELECT format('SELECT %I AS url FROM public.%I WHERE %I IS NOT NULL', t.column_name, t.table_name, t.column_name)
        ) AS _ignored
      ) AS _placeholder
    ) AS legacy_count, -- substituído abaixo
    0::BIGINT,
    0::BIGINT
  FROM targets t;
END;
$$;

-- A função acima é um stub; substituímos por implementação real com UNION ALL dinâmico via consultas estáticas (4 tabelas conhecidas):
CREATE OR REPLACE FUNCTION public.count_legacy_storage_urls()
RETURNS TABLE (
  bucket TEXT,
  table_name TEXT,
  column_name TEXT,
  legacy_count BIGINT,
  migrated_count BIGINT,
  total_with_url BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

REVOKE ALL ON FUNCTION public.count_legacy_storage_urls() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.count_legacy_storage_urls() TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_legacy_storage_urls() TO service_role;
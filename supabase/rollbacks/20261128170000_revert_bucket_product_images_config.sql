-- ============================================================================
-- ROLLBACK de 20261128170000_bucket_product_images_config.sql (etapa 062)
-- Devolve o bucket product-images sem limite de tipo/tamanho e a leitura publica
-- do bucket inteiro.
-- ============================================================================

UPDATE storage.buckets
SET allowed_mime_types = NULL,
    file_size_limit = NULL
WHERE id = 'product-images';

DROP POLICY IF EXISTS "storage_produtos_leitura_publica" ON storage.objects;
CREATE POLICY "storage_produtos_leitura_publica" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'product-images');
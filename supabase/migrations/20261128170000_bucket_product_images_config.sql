-- ============================================================================
-- MIGRATION: bucket product-images ganha limite de tipo e de tamanho
-- Etapa 062 do docs/qa/04-PLANO.md (SEC-12)
--
-- Causa: o bucket foi criado publico e sem `allowed_mime_types` nem
-- `file_size_limit`. A unica barreira de tipo era o atributo `accept="image/*"`
-- do input -- dica para o seletor de arquivos, nao regra: qualquer upload feito
-- por chamada direta a API de Storage (com token de admin/coordinator/buyer)
-- gravava o que quisesse, de qualquer tamanho.
--
-- Correcao: limite no proprio bucket (a unica camada que o cliente nao escolhe).
--   allowed_mime_types: png, jpeg, webp
--   file_size_limit: 5 MB
-- A leitura publica continua (o bucket segue `public = true` e nao ha consumidor
-- interno no app: `CatalogoProdutos` virou somente leitura e a imagem vem do PIM
-- por URL externa). Decidir se as imagens podem deixar de ser publicas e' decisao
-- do dono e nao foi tomada aqui.
--
-- A policy de SELECT para anon foi restringida ao prefixo `products/` APENAS se
-- nao existir nenhum objeto fora dele -- caso contrario a migration mantem a
-- policy como esta e registra, para nao quebrar imagem ja publicada.
-- ============================================================================

DO $cfg$
DECLARE
  v_fora integer;
BEGIN
  UPDATE storage.buckets
  SET allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp'],
      file_size_limit = 5242880
  WHERE id = 'product-images';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'bucket product-images nao existe';
  END IF;

  SELECT count(*) INTO v_fora
  FROM storage.objects
  WHERE bucket_id = 'product-images'
    AND name NOT LIKE 'products/%';

  IF v_fora = 0 THEN
    DROP POLICY IF EXISTS "storage_produtos_leitura_publica" ON storage.objects;
    CREATE POLICY "storage_produtos_leitura_publica" ON storage.objects
      FOR SELECT TO anon, authenticated
      USING (bucket_id = 'product-images' AND name LIKE 'products/%');
    RAISE NOTICE 'leitura publica restrita ao prefixo products/';
  ELSE
    RAISE NOTICE 'policy de leitura mantida ampla: % objeto(s) fora de products/', v_fora;
  END IF;
END
$cfg$;

-- ---------------------------------------------------------------------------
-- Prova do que ficou gravado.
-- ---------------------------------------------------------------------------
DO $prova$
DECLARE
  r      record;
  v_expr text;
BEGIN
  SELECT public, file_size_limit, allowed_mime_types
    INTO r
    FROM storage.buckets
   WHERE id = 'product-images';

  IF r.file_size_limit IS DISTINCT FROM 5242880 THEN
    RAISE EXCEPTION 'file_size_limit nao aplicado: %', r.file_size_limit;
  END IF;

  IF r.allowed_mime_types IS NULL OR array_length(r.allowed_mime_types, 1) <> 3 THEN
    RAISE EXCEPTION 'allowed_mime_types nao aplicado: %', r.allowed_mime_types;
  END IF;
  IF NOT ('image/png' = ANY (r.allowed_mime_types))
     OR NOT ('image/jpeg' = ANY (r.allowed_mime_types))
     OR NOT ('image/webp' = ANY (r.allowed_mime_types)) THEN
    RAISE EXCEPTION 'lista de mime inesperada: %', r.allowed_mime_types;
  END IF;

  SELECT pg_get_expr(polqual, polrelid) INTO v_expr
  FROM pg_policy
  WHERE polname = 'storage_produtos_leitura_publica';

  IF v_expr IS NULL THEN
    RAISE EXCEPTION 'policy de leitura de product-images sumiu';
  END IF;
END
$prova$;
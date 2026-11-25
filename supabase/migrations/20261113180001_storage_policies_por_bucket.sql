-- fix(storage): recria as policies de storage.objects — upload estava quebrado em todos os buckets.
--
-- Causa: em produção storage.objects tem RLS ligada e 0 policies (pg_policies schemaname='storage'
-- vazio). Toda escrita do app volta "42501 new row violates row-level security policy for table
-- objects". As policies existiam só em migrations antigas (20260315164635, 20260322181916,
-- 20260402113615, 20260507204531, 20260516112846, 20260522142837, 20260619145543,
-- 20260619183456) que nunca chegaram a este banco — não há ledger de migration e o schema
-- `storage` ficou de fora quando o banco foi montado.
--
-- Tenant pelo cadastro, não pela claim: nenhum usuário tem `tenant_id` no JWT (não há
-- access-token hook), então current_tenant_id() é NULL para todos e não serve aqui. O 1º
-- segmento do caminho é aceito quando o usuário pertence a esse tenant em public.user_tenants
-- (public.user_belongs_to_tenant, SECURITY DEFINER já existente). O segmento só vira uuid depois
-- de passar no regex (CASE garante a ordem), então caminho fora do padrão dá false, não erro.
--
-- Efeito (caminhos = os que o front usa):
--   documentos / comprovantes (privados) — `{tenant_id}/{user_id}/...`: o próprio usuário sobe,
--     lê e apaga na própria pasta de um tenant seu; admin/coordinator (documentos) e
--     admin/finance (comprovantes) leem tudo do tenant; admin apaga no tenant.
--   fiscal-documents (privado) — `uploads/{user_id}/...` (DocumentosFiscais.tsx): o próprio
--     usuário sobe/lê/apaga; admin/finance leem os arquivos de quem é do mesmo tenant (perfil do
--     dono em public.profiles). A edge process-invoice-idp lê com service_role (fora de RLS).
--   product-images (público) — leitura para anon/authenticated; upload em `products/...` por
--     admin/coordinator/buyer; apagar só o dono.
--   UPDATE: nenhuma policy. Policies permissivas somam por OR — com UPDATE em mais de um bucket o
--     dono movia arquivo privado para product-images (público). O front só usa upload sem upsert,
--     então UPDATE (sobrescrever/mover) fica negado a authenticated/anon.
--   Outro tenant ou anon em bucket privado: sem acesso.
--
-- Só usa funções existentes (user_belongs_to_tenant, has_role); nenhuma função nova.
-- Idempotente: DROP POLICY IF EXISTS antes de cada CREATE.


-- Nomes das migrations antigas (caso algum ambiente ainda tenha alguma)
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins and coordinators can delete documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Finance can view all comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Owner can delete own comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload fiscal documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view fiscal documents" ON storage.objects;
DROP POLICY IF EXISTS "Fiscal docs: upload na própria pasta" ON storage.objects;
DROP POLICY IF EXISTS "Fiscal docs: ver da própria pasta" ON storage.objects;
DROP POLICY IF EXISTS "Fiscal docs: admin vê todos" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Auth Upload" ON storage.objects;
DROP POLICY IF EXISTS "Auth Delete" ON storage.objects;
DROP POLICY IF EXISTS "documentos: owner reads within tenant" ON storage.objects;
DROP POLICY IF EXISTS "documentos: admin reads within tenant" ON storage.objects;
DROP POLICY IF EXISTS "documentos: insert into own tenant/user" ON storage.objects;
DROP POLICY IF EXISTS "documentos: owner updates within tenant" ON storage.objects;
DROP POLICY IF EXISTS "documentos: owner deletes within tenant" ON storage.objects;
DROP POLICY IF EXISTS "documentos: admin deletes within tenant" ON storage.objects;
DROP POLICY IF EXISTS "comprovantes: owner reads within tenant" ON storage.objects;
DROP POLICY IF EXISTS "comprovantes: admin/finance reads within tenant" ON storage.objects;
DROP POLICY IF EXISTS "comprovantes: insert into own tenant/user" ON storage.objects;
DROP POLICY IF EXISTS "comprovantes: owner updates within tenant" ON storage.objects;
DROP POLICY IF EXISTS "comprovantes: owner deletes within tenant" ON storage.objects;
DROP POLICY IF EXISTS "comprovantes: admin deletes within tenant" ON storage.objects;


-- Versão anterior desta migration (tinha UPDATE e fiscal FOR ALL)
DROP POLICY IF EXISTS "storage_tenant_dono_update" ON storage.objects;
DROP POLICY IF EXISTS "storage_produtos_dono_update" ON storage.objects;
DROP POLICY IF EXISTS "storage_fiscal_dono_all" ON storage.objects;

-- =============== documentos / comprovantes: {tenant_id}/{user_id}/... ===============

DROP POLICY IF EXISTS "storage_tenant_dono_select" ON storage.objects;
CREATE POLICY "storage_tenant_dono_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id IN ('documentos', 'comprovantes')
    AND (storage.foldername(name))[2] = (auth.uid())::text
    AND CASE WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
             THEN public.user_belongs_to_tenant(auth.uid(), ((storage.foldername(name))[1])::uuid)
             ELSE false END
  );

DROP POLICY IF EXISTS "storage_tenant_dono_insert" ON storage.objects;
CREATE POLICY "storage_tenant_dono_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('documentos', 'comprovantes')
    AND (storage.foldername(name))[2] = (auth.uid())::text
    AND CASE WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
             THEN public.user_belongs_to_tenant(auth.uid(), ((storage.foldername(name))[1])::uuid)
             ELSE false END
  );

DROP POLICY IF EXISTS "storage_tenant_dono_delete" ON storage.objects;
CREATE POLICY "storage_tenant_dono_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id IN ('documentos', 'comprovantes')
    AND (storage.foldername(name))[2] = (auth.uid())::text
    AND CASE WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
             THEN public.user_belongs_to_tenant(auth.uid(), ((storage.foldername(name))[1])::uuid)
             ELSE false END
  );

DROP POLICY IF EXISTS "storage_tenant_gestor_select" ON storage.objects;
CREATE POLICY "storage_tenant_gestor_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    (
      (bucket_id = 'documentos'
        AND (public.has_role(auth.uid(), 'admin'::public.app_role)
             OR public.has_role(auth.uid(), 'coordinator'::public.app_role)))
      OR (bucket_id = 'comprovantes'
        AND (public.has_role(auth.uid(), 'admin'::public.app_role)
             OR public.has_role(auth.uid(), 'finance'::public.app_role)))
    )
    AND CASE WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
             THEN public.user_belongs_to_tenant(auth.uid(), ((storage.foldername(name))[1])::uuid)
             ELSE false END
  );

DROP POLICY IF EXISTS "storage_tenant_admin_delete" ON storage.objects;
CREATE POLICY "storage_tenant_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id IN ('documentos', 'comprovantes')
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
    AND CASE WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
             THEN public.user_belongs_to_tenant(auth.uid(), ((storage.foldername(name))[1])::uuid)
             ELSE false END
  );

-- =============== fiscal-documents: uploads/{user_id}/... ===============

DROP POLICY IF EXISTS "storage_fiscal_dono_select" ON storage.objects;
CREATE POLICY "storage_fiscal_dono_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'fiscal-documents'
    AND (storage.foldername(name))[1] = 'uploads'
    AND (storage.foldername(name))[2] = (auth.uid())::text
  );

DROP POLICY IF EXISTS "storage_fiscal_dono_insert" ON storage.objects;
CREATE POLICY "storage_fiscal_dono_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'fiscal-documents'
    AND (storage.foldername(name))[1] = 'uploads'
    AND (storage.foldername(name))[2] = (auth.uid())::text
  );

DROP POLICY IF EXISTS "storage_fiscal_dono_delete" ON storage.objects;
CREATE POLICY "storage_fiscal_dono_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'fiscal-documents'
    AND (storage.foldername(name))[1] = 'uploads'
    AND (storage.foldername(name))[2] = (auth.uid())::text
  );

-- substitui "Fiscal docs: admin vê todos" (20260619145543), agora restrita ao tenant do admin
DROP POLICY IF EXISTS "storage_fiscal_gestor_select" ON storage.objects;
CREATE POLICY "storage_fiscal_gestor_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'fiscal-documents'
    AND (storage.foldername(name))[1] = 'uploads'
    AND (public.has_role(auth.uid(), 'admin'::public.app_role)
         OR public.has_role(auth.uid(), 'finance'::public.app_role))
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE (p.user_id)::text = (storage.foldername(objects.name))[2]
        AND public.user_belongs_to_tenant(auth.uid(), p.tenant_id)
    )
  );

-- =============== product-images (público): products/... ===============

DROP POLICY IF EXISTS "storage_produtos_leitura_publica" ON storage.objects;
CREATE POLICY "storage_produtos_leitura_publica" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "storage_produtos_insert" ON storage.objects;
CREATE POLICY "storage_produtos_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = 'products'
    AND (public.has_role(auth.uid(), 'admin'::public.app_role)
         OR public.has_role(auth.uid(), 'coordinator'::public.app_role)
         OR public.has_role(auth.uid(), 'buyer'::public.app_role))
  );

DROP POLICY IF EXISTS "storage_produtos_dono_delete" ON storage.objects;
CREATE POLICY "storage_produtos_dono_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND (owner = auth.uid() OR owner_id = (auth.uid())::text));

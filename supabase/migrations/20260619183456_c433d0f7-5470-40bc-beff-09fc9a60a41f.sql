
-- ============================================================================
-- Storage tenant isolation: buckets `documentos` and `comprovantes`
-- New path convention: {tenant_id}/{user_id}/<file>
-- All policies require the first path segment to match the caller's tenant.
-- ============================================================================

-- Drop existing leaky/legacy policies
DROP POLICY IF EXISTS "Admins and coordinators can delete documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Finance can view all comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Owner can delete own comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own documents" ON storage.objects;

-- =============== DOCUMENTOS ===============

-- SELECT: own files within tenant
CREATE POLICY "documentos: owner reads within tenant"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documentos'
  AND (storage.foldername(name))[1] = (public.current_tenant_id())::text
  AND (storage.foldername(name))[2] = (auth.uid())::text
);

-- SELECT: admin/coordinator reads any file inside their tenant
CREATE POLICY "documentos: admin reads within tenant"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documentos'
  AND (storage.foldername(name))[1] = (public.current_tenant_id())::text
  AND (public.has_role(auth.uid(), 'admin'::app_role)
       OR public.has_role(auth.uid(), 'coordinator'::app_role))
);

-- INSERT: must place file under own tenant + own user folder
CREATE POLICY "documentos: insert into own tenant/user"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documentos'
  AND (storage.foldername(name))[1] = (public.current_tenant_id())::text
  AND (storage.foldername(name))[2] = (auth.uid())::text
);

-- UPDATE: owner within tenant
CREATE POLICY "documentos: owner updates within tenant"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'documentos'
  AND (storage.foldername(name))[1] = (public.current_tenant_id())::text
  AND (storage.foldername(name))[2] = (auth.uid())::text
)
WITH CHECK (
  bucket_id = 'documentos'
  AND (storage.foldername(name))[1] = (public.current_tenant_id())::text
  AND (storage.foldername(name))[2] = (auth.uid())::text
);

-- DELETE: owner within tenant
CREATE POLICY "documentos: owner deletes within tenant"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'documentos'
  AND (storage.foldername(name))[1] = (public.current_tenant_id())::text
  AND (storage.foldername(name))[2] = (auth.uid())::text
);

-- DELETE: admin/coordinator within tenant
CREATE POLICY "documentos: admin deletes within tenant"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'documentos'
  AND (storage.foldername(name))[1] = (public.current_tenant_id())::text
  AND (public.has_role(auth.uid(), 'admin'::app_role)
       OR public.has_role(auth.uid(), 'coordinator'::app_role))
);

-- =============== COMPROVANTES ===============

CREATE POLICY "comprovantes: owner reads within tenant"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'comprovantes'
  AND (storage.foldername(name))[1] = (public.current_tenant_id())::text
  AND (storage.foldername(name))[2] = (auth.uid())::text
);

CREATE POLICY "comprovantes: admin/finance reads within tenant"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'comprovantes'
  AND (storage.foldername(name))[1] = (public.current_tenant_id())::text
  AND (public.has_role(auth.uid(), 'admin'::app_role)
       OR public.has_role(auth.uid(), 'finance'::app_role))
);

CREATE POLICY "comprovantes: insert into own tenant/user"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'comprovantes'
  AND (storage.foldername(name))[1] = (public.current_tenant_id())::text
  AND (storage.foldername(name))[2] = (auth.uid())::text
);

CREATE POLICY "comprovantes: owner updates within tenant"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'comprovantes'
  AND (storage.foldername(name))[1] = (public.current_tenant_id())::text
  AND (storage.foldername(name))[2] = (auth.uid())::text
)
WITH CHECK (
  bucket_id = 'comprovantes'
  AND (storage.foldername(name))[1] = (public.current_tenant_id())::text
  AND (storage.foldername(name))[2] = (auth.uid())::text
);

CREATE POLICY "comprovantes: owner deletes within tenant"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'comprovantes'
  AND (storage.foldername(name))[1] = (public.current_tenant_id())::text
  AND (storage.foldername(name))[2] = (auth.uid())::text
);

CREATE POLICY "comprovantes: admin deletes within tenant"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'comprovantes'
  AND (storage.foldername(name))[1] = (public.current_tenant_id())::text
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

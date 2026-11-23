-- Etapa QA 010: RPC SECURITY DEFINER para leitura de permissoes do usuario logado
-- Necessario porque as tabelas permissions/role_permissions tem RLS restrita a admin.
-- Esta funcao faz o JOIN por dentro com SECURITY DEFINER e retorna apenas as permissoes
-- do auth.uid() atual, sem expor dados de outros usuarios.

CREATE OR REPLACE FUNCTION public.get_my_permissions()
RETURNS TABLE(module TEXT, action TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.module, p.action
  FROM public.user_roles ur
  JOIN public.role_permissions rp ON ur.role = rp.role
  JOIN public.permissions p ON rp.permission_id = p.id
  WHERE ur.user_id = auth.uid()
$$;

REVOKE ALL ON FUNCTION public.get_my_permissions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_permissions() TO authenticated;
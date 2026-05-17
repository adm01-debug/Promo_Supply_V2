-- Fix for Function Search Path Mutable
ALTER FUNCTION public.update_estoque_saldo() SET search_path = public;

-- Fix for Public Execute Security Definer
REVOKE ALL ON FUNCTION public.update_estoque_saldo() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_estoque_saldo() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_estoque_saldo() TO service_role;

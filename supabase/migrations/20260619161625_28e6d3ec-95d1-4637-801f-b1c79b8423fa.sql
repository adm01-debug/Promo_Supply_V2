-- Tighten Data API privileges after security policy hardening.

REVOKE ALL ON public.audit_logs FROM anon;
REVOKE ALL ON public.audit_logs FROM public;
REVOKE UPDATE, DELETE ON public.audit_logs FROM authenticated;
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

REVOKE ALL ON public.produto_fornecedores FROM anon;
REVOKE ALL ON public.produto_fornecedores FROM public;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.produto_fornecedores TO authenticated;
GRANT ALL ON public.produto_fornecedores TO service_role;

REVOKE ALL ON public.repurchase_suggestions FROM anon;
REVOKE ALL ON public.repurchase_suggestions FROM public;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.repurchase_suggestions TO authenticated;
GRANT ALL ON public.repurchase_suggestions TO service_role;
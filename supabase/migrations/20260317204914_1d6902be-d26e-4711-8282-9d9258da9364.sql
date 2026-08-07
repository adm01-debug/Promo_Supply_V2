
-- Fix security definer view
ALTER VIEW public.supplier_compliance_summary SET (security_invoker = on);

-- Fix function search_path
ALTER FUNCTION public.calc_checklist_overall_score() SET search_path = public;
ALTER FUNCTION public.apply_penalty_escalation() SET search_path = public;

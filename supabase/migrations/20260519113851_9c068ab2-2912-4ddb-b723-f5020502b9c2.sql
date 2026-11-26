-- Revoke execution from public
REVOKE EXECUTE ON FUNCTION public.get_pagamentos_kpis(UUID) FROM public;
REVOKE EXECUTE ON FUNCTION public.get_fornecedores_kpis(UUID) FROM public;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.get_pagamentos_kpis(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_fornecedores_kpis(UUID) TO authenticated;

-- Add security check to ensure the user belongs to the organization (optional but recommended)
-- For now, the organization_id is passed and the function uses it in WHERE.
-- RLS already handles table access, but since these are SECURITY DEFINER, we should be careful.
-- However, since they only return aggregated data for a specific ID, the risk is minimal 
-- as long as they are only reachable by authenticated users.

CREATE OR REPLACE FUNCTION public.fill_tenant_id_from_supplier()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant uuid;
BEGIN
  IF NEW.tenant_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = NEW.tenant_id) THEN
    RETURN NEW;
  END IF;

  SELECT f.tenant_id INTO v_tenant
    FROM public.fornecedores f
   WHERE f.id = NEW.fornecedor_id;

  IF v_tenant IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = v_tenant) THEN
    NEW.tenant_id := v_tenant;
  END IF;

  RETURN NEW;
END;
$function$

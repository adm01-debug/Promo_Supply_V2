CREATE OR REPLACE FUNCTION public.log_audit_event(p_module text, p_action text, p_entity_id text DEFAULT NULL::text, p_entity_description text DEFAULT NULL::text, p_old_data jsonb DEFAULT NULL::jsonb, p_new_data jsonb DEFAULT NULL::jsonb, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_user_name TEXT;
  v_audit_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  -- Busca info do usuário logado
  IF v_user_id IS NOT NULL THEN
    SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
    SELECT nome_completo INTO v_user_name FROM public.profiles WHERE id = v_user_id;
  END IF;

  INSERT INTO public.audit_logs (
    user_id,
    user_email,
    user_name,
    action_type, -- Mapeado de p_action (precisa ser compatível com o enum existente)
    entity_type, -- Mapeado de p_module (precisa ser compatível com o enum existente)
    entity_id,
    entity_description,
    old_values,
    new_values,
    metadata,
    ip_address,
    user_agent
  )
  VALUES (
    v_user_id,
    v_user_email,
    v_user_name,
    'update'::public.audit_event_type, -- Fallback seguro se não houver mapeamento direto
    'solicitacao'::public.entity_type, -- Fallback seguro se não houver mapeamento direto
    p_entity_id,
    COALESCE(p_entity_description, p_module || ' - ' || p_action),
    public.mask_sensitive_data(p_old_data),
    public.mask_sensitive_data(p_new_data),
    p_metadata || jsonb_build_object('module', p_module, 'original_action', p_action),
    nullif(current_setting('request.headers', true)::jsonb ->> 'x-real-ip', ''),
    nullif(current_setting('request.headers', true)::jsonb ->> 'user-agent', '')
  )
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$function$

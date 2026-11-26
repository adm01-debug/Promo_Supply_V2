-- Garante que os tipos ENUM existam ou os atualiza
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_event_type') THEN
        CREATE TYPE public.audit_event_type AS ENUM ('create', 'update', 'delete', 'approve', 'reject', 'auth', 'security', 'export');
    END IF;
END $$;

-- Função para mascarar dados sensíveis
CREATE OR REPLACE FUNCTION public.mask_sensitive_data(data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  sensitive_keys TEXT[] := ARRAY['password', 'token', 'secret', 'key', 'cvv', 'card_number', 'mfa_code', 'session_id'];
  key TEXT;
BEGIN
  IF data IS NULL THEN
    RETURN NULL;
  END IF;

  FOR key IN SELECT * FROM unnest(sensitive_keys)
  LOOP
    IF data ? key THEN
      data := data || jsonb_build_object(key, '********');
    END IF;
  END LOOP;
  
  RETURN data;
END;
$$;

-- Função auxiliar unificada para registrar eventos usando a estrutura de audit_logs existente
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_module TEXT,
  p_action TEXT,
  p_entity_id TEXT DEFAULT NULL,
  p_entity_description TEXT DEFAULT NULL,
  p_old_data JSONB DEFAULT NULL,
  p_new_data JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

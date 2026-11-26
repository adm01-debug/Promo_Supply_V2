-- =====================================================
-- CORREÇÃO DE POLÍTICAS RLS PERMISSIVAS (USING true)
-- =====================================================

-- 1. password_reset_tokens - Remover política permissiva
-- Service role já bypassa RLS, então não precisa de política ALL com true
DROP POLICY IF EXISTS "System can manage password reset tokens" ON public.password_reset_tokens;

-- Criar políticas específicas para tokens de reset
CREATE POLICY "Users can view their own reset tokens" 
ON public.password_reset_tokens 
FOR SELECT 
USING (auth.uid() = user_id);

-- 2. active_sessions - Corrigir política permissiva
DROP POLICY IF EXISTS "System can manage sessions" ON public.active_sessions;

-- Usuários podem criar suas próprias sessões
CREATE POLICY "Users can create their own sessions" 
ON public.active_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Usuários podem atualizar suas próprias sessões
CREATE POLICY "Users can update their own sessions" 
ON public.active_sessions 
FOR UPDATE 
USING (auth.uid() = user_id);

-- 3. audit_logs - Remover política de dev que permite anon ver tudo
DROP POLICY IF EXISTS "Allow anon to view audit logs (dev only)" ON public.audit_logs;

-- Remover política que permite anon inserir
DROP POLICY IF EXISTS "Allow anon to insert audit logs" ON public.audit_logs;

-- Manter apenas insert para usuários autenticados (já existe, mas recriar com check)
DROP POLICY IF EXISTS "Authenticated users can create audit logs" ON public.audit_logs;

CREATE POLICY "Authenticated users can create audit logs" 
ON public.audit_logs 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND (user_id IS NULL OR user_id = auth.uid())
);

-- 4. rate_limit_logs - Restringir insert
DROP POLICY IF EXISTS "System can insert rate limit logs" ON public.rate_limit_logs;

-- Permitir insert apenas quando há um user_id válido ou para logs anônimos de rate limit
CREATE POLICY "Authenticated can insert rate limit logs" 
ON public.rate_limit_logs 
FOR INSERT 
WITH CHECK (
  -- Usuário autenticado pode inserir seus próprios logs
  (auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid()))
  -- OU é um log sem user_id (sistema)
  OR user_id IS NULL
);

-- 5. security_logs - Restringir insert
DROP POLICY IF EXISTS "System can insert security logs" ON public.security_logs;

CREATE POLICY "Authenticated can insert security logs" 
ON public.security_logs 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND (user_id IS NULL OR user_id = auth.uid())
);

-- 6. geo_access_logs - Restringir insert
DROP POLICY IF EXISTS "System can insert geo access logs" ON public.geo_access_logs;

CREATE POLICY "Authenticated can insert geo access logs" 
ON public.geo_access_logs 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- 7. webauthn_challenges - Corrigir política permissiva
DROP POLICY IF EXISTS "Service role can manage challenges" ON public.webauthn_challenges;

-- Usuários podem ver seus próprios challenges
CREATE POLICY "Users can view their own challenges" 
ON public.webauthn_challenges 
FOR SELECT 
USING (
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR (auth.email() IS NOT NULL AND email = auth.email())
);

-- Usuários podem criar challenges para si mesmos
CREATE POLICY "Users can create their own challenges" 
ON public.webauthn_challenges 
FOR INSERT 
WITH CHECK (
  (auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid()))
  OR (auth.email() IS NOT NULL AND (email IS NULL OR email = auth.email()))
);

-- Usuários podem deletar seus próprios challenges
CREATE POLICY "Users can delete their own challenges" 
ON public.webauthn_challenges 
FOR DELETE 
USING (
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR (auth.email() IS NOT NULL AND email = auth.email())
);

-- =====================================================
-- VERIFICAÇÃO FINAL - Garantir que não há mais USING(true)
-- =====================================================

-- Nota: As seguintes tabelas têm políticas que precisam de service_role
-- e não devem ter políticas públicas permissivas:
-- - password_reset_tokens (gerenciado por edge functions)
-- - webauthn_challenges (gerenciado por edge functions)
-- 
-- As edge functions usam SUPABASE_SERVICE_ROLE_KEY que bypassa RLS,
-- então não precisam de políticas permissivas.
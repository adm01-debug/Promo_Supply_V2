-- =====================================================
-- CORREÇÃO DAS 4 POLÍTICAS RLS PERMISSIVAS RESTANTES
-- =====================================================

-- 1. account_lockouts - Corrigir política "System can manage lockouts"
DROP POLICY IF EXISTS "System can manage lockouts" ON public.account_lockouts;

-- Admins podem gerenciar lockouts
CREATE POLICY "Admins can manage lockouts" 
ON public.account_lockouts 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Sistema pode verificar lockouts (para login) - SELECT apenas
CREATE POLICY "Anyone can check lockout status" 
ON public.account_lockouts 
FOR SELECT 
USING (true);

-- 2. login_attempts - Corrigir política "System can insert login attempts"
DROP POLICY IF EXISTS "System can insert login attempts" ON public.login_attempts;

-- Permitir insert apenas para tentativas do próprio email ou quando autenticado
CREATE POLICY "Authenticated can insert login attempts" 
ON public.login_attempts 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL OR auth.email() = email);

-- Admins podem ver todas as tentativas
CREATE POLICY "Admins can view all login attempts" 
ON public.login_attempts 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. notifications - Corrigir política "System can create notifications"
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- Apenas usuários autenticados podem criar notificações para outros usuários
-- (geralmente isso é feito via triggers ou edge functions com service_role)
CREATE POLICY "Authenticated users can create notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- 4. password_reset_requests - Corrigir política "System can update requests"
DROP POLICY IF EXISTS "System can update requests" ON public.password_reset_requests;

-- Admins podem atualizar qualquer request (aprovar/rejeitar)
CREATE POLICY "Admins can update any reset request" 
ON public.password_reset_requests 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));
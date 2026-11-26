-- =============================================
-- MÓDULO DE SEGURANÇA COMPLETO
-- =============================================

-- 1. TABELA DE PERMISSÕES
CREATE TABLE public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    module TEXT NOT NULL,
    action TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(module, action)
);

-- 2. TABELA DE PERMISSÕES POR ROLE
CREATE TABLE public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role app_role NOT NULL,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(role, permission_id)
);

-- 3. CONFIGURAÇÕES MFA POR USUÁRIO
CREATE TABLE public.mfa_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    mfa_enabled BOOLEAN NOT NULL DEFAULT false,
    mfa_method TEXT DEFAULT 'totp',
    backup_codes TEXT[],
    last_verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. TENTATIVAS DE LOGIN (para detectar brute force)
CREATE TABLE public.login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    success BOOLEAN NOT NULL DEFAULT false,
    failure_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. IPs BLOQUEADOS
CREATE TABLE public.blocked_ips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address TEXT NOT NULL UNIQUE,
    reason TEXT NOT NULL,
    blocked_by UUID REFERENCES auth.users(id),
    blocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    permanent BOOLEAN NOT NULL DEFAULT false,
    attempts_count INTEGER DEFAULT 0
);

-- 6. WHITELIST DE IPs
CREATE TABLE public.ip_whitelist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address TEXT NOT NULL UNIQUE,
    description TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. LOGS DE RATE LIMIT
CREATE TABLE public.rate_limit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 1,
    window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
    blocked BOOLEAN NOT NULL DEFAULT false,
    user_id UUID REFERENCES auth.users(id),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. SESSÕES ATIVAS (para controle de sessões)
CREATE TABLE public.active_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    ip_address TEXT,
    user_agent TEXT,
    device_info JSONB,
    last_activity TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. TOKENS DE RECUPERAÇÃO DE SENHA
CREATE TABLE public.password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT false,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. LOGS DE SEGURANÇA
CREATE TABLE public.security_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    event_type TEXT NOT NULL,
    event_description TEXT,
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    severity TEXT NOT NULL DEFAULT 'info',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- ÍNDICES PARA PERFORMANCE
-- =============================================
CREATE INDEX idx_login_attempts_email ON public.login_attempts(email);
CREATE INDEX idx_login_attempts_ip ON public.login_attempts(ip_address);
CREATE INDEX idx_login_attempts_created ON public.login_attempts(created_at DESC);
CREATE INDEX idx_blocked_ips_ip ON public.blocked_ips(ip_address);
CREATE INDEX idx_rate_limit_logs_ip ON public.rate_limit_logs(ip_address);
CREATE INDEX idx_rate_limit_logs_created ON public.rate_limit_logs(created_at DESC);
CREATE INDEX idx_security_logs_user ON public.security_logs(user_id);
CREATE INDEX idx_security_logs_event ON public.security_logs(event_type);
CREATE INDEX idx_security_logs_created ON public.security_logs(created_at DESC);
CREATE INDEX idx_active_sessions_user ON public.active_sessions(user_id);
CREATE INDEX idx_password_reset_token ON public.password_reset_tokens(token);

-- =============================================
-- HABILITAR RLS EM TODAS AS TABELAS
-- =============================================
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mfa_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- POLÍTICAS RLS
-- =============================================

-- Permissions: apenas admins podem gerenciar
CREATE POLICY "Admins can manage permissions" ON public.permissions
    FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view permissions" ON public.permissions
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Role Permissions: apenas admins
CREATE POLICY "Admins can manage role permissions" ON public.role_permissions
    FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view role permissions" ON public.role_permissions
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- MFA Settings: usuários gerenciam suas próprias configurações
CREATE POLICY "Users can manage their own MFA settings" ON public.mfa_settings
    FOR ALL USING (auth.uid() = user_id);

-- Login Attempts: admins podem ver, sistema pode inserir
CREATE POLICY "Admins can view login attempts" ON public.login_attempts
    FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert login attempts" ON public.login_attempts
    FOR INSERT WITH CHECK (true);

-- Blocked IPs: apenas admins
CREATE POLICY "Admins can manage blocked IPs" ON public.blocked_ips
    FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view blocked IPs" ON public.blocked_ips
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- IP Whitelist: apenas admins
CREATE POLICY "Admins can manage IP whitelist" ON public.ip_whitelist
    FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view IP whitelist" ON public.ip_whitelist
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Rate Limit Logs: admins podem ver
CREATE POLICY "Admins can view rate limit logs" ON public.rate_limit_logs
    FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert rate limit logs" ON public.rate_limit_logs
    FOR INSERT WITH CHECK (true);

-- Active Sessions: usuários veem suas próprias sessões, admins veem todas
CREATE POLICY "Users can view their own sessions" ON public.active_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions" ON public.active_sessions
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all sessions" ON public.active_sessions
    FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete any session" ON public.active_sessions
    FOR DELETE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can manage sessions" ON public.active_sessions
    FOR ALL USING (true);

-- Password Reset Tokens: sistema gerencia
CREATE POLICY "System can manage password reset tokens" ON public.password_reset_tokens
    FOR ALL USING (true);

-- Security Logs: admins podem ver, sistema pode inserir
CREATE POLICY "Admins can view security logs" ON public.security_logs
    FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert security logs" ON public.security_logs
    FOR INSERT WITH CHECK (true);

-- =============================================
-- FUNÇÕES DE SEGURANÇA
-- =============================================

-- Função para verificar se IP está bloqueado
CREATE OR REPLACE FUNCTION public.is_ip_blocked(_ip_address TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.blocked_ips
        WHERE ip_address = _ip_address
        AND (permanent = true OR expires_at > now())
    )
$$;

-- Função para verificar se IP está na whitelist
CREATE OR REPLACE FUNCTION public.is_ip_whitelisted(_ip_address TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.ip_whitelist
        WHERE ip_address = _ip_address
    )
$$;

-- Função para verificar permissão específica
CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _module TEXT, _action TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.user_roles ur
        JOIN public.role_permissions rp ON ur.role = rp.role
        JOIN public.permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = _user_id
        AND p.module = _module
        AND p.action = _action
    )
$$;

-- Função para registrar tentativa de login
CREATE OR REPLACE FUNCTION public.log_login_attempt(
    _email TEXT,
    _ip_address TEXT,
    _user_agent TEXT,
    _success BOOLEAN,
    _failure_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _id UUID;
BEGIN
    INSERT INTO public.login_attempts (email, ip_address, user_agent, success, failure_reason)
    VALUES (_email, _ip_address, _user_agent, _success, _failure_reason)
    RETURNING id INTO _id;
    
    -- Auto-bloquear IP após 5 tentativas falhas em 15 minutos
    IF NOT _success THEN
        DECLARE
            _failed_count INTEGER;
        BEGIN
            SELECT COUNT(*) INTO _failed_count
            FROM public.login_attempts
            WHERE ip_address = _ip_address
            AND success = false
            AND created_at > now() - INTERVAL '15 minutes';
            
            IF _failed_count >= 5 AND NOT is_ip_whitelisted(_ip_address) THEN
                INSERT INTO public.blocked_ips (ip_address, reason, expires_at, attempts_count)
                VALUES (_ip_address, 'Auto-blocked: Too many failed login attempts', now() + INTERVAL '1 hour', _failed_count)
                ON CONFLICT (ip_address) DO UPDATE
                SET attempts_count = blocked_ips.attempts_count + 1,
                    expires_at = now() + INTERVAL '1 hour';
            END IF;
        END;
    END IF;
    
    RETURN _id;
END;
$$;

-- Função para registrar evento de segurança
CREATE OR REPLACE FUNCTION public.log_security_event(
    _user_id UUID,
    _event_type TEXT,
    _event_description TEXT,
    _ip_address TEXT DEFAULT NULL,
    _user_agent TEXT DEFAULT NULL,
    _metadata JSONB DEFAULT '{}',
    _severity TEXT DEFAULT 'info'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _id UUID;
BEGIN
    INSERT INTO public.security_logs (user_id, event_type, event_description, ip_address, user_agent, metadata, severity)
    VALUES (_user_id, _event_type, _event_description, _ip_address, _user_agent, _metadata, _severity)
    RETURNING id INTO _id;
    
    RETURN _id;
END;
$$;

-- Função para contar tentativas de login falhas recentes
CREATE OR REPLACE FUNCTION public.get_failed_login_count(_email TEXT, _minutes INTEGER DEFAULT 15)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COUNT(*)::INTEGER
    FROM public.login_attempts
    WHERE email = _email
    AND success = false
    AND created_at > now() - (_minutes || ' minutes')::INTERVAL
$$;

-- Trigger para atualizar updated_at em mfa_settings
CREATE TRIGGER update_mfa_settings_updated_at
    BEFORE UPDATE ON public.mfa_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- PERMISSÕES PADRÃO DO SISTEMA
-- =============================================
INSERT INTO public.permissions (name, description, module, action) VALUES
-- Módulo de Solicitações
('solicitacoes.view', 'Visualizar solicitações', 'solicitacoes', 'view'),
('solicitacoes.create', 'Criar solicitações', 'solicitacoes', 'create'),
('solicitacoes.edit', 'Editar solicitações', 'solicitacoes', 'edit'),
('solicitacoes.delete', 'Excluir solicitações', 'solicitacoes', 'delete'),
('solicitacoes.approve', 'Aprovar solicitações', 'solicitacoes', 'approve'),

-- Módulo de Cotações
('cotacoes.view', 'Visualizar cotações', 'cotacoes', 'view'),
('cotacoes.create', 'Criar cotações', 'cotacoes', 'create'),
('cotacoes.edit', 'Editar cotações', 'cotacoes', 'edit'),
('cotacoes.delete', 'Excluir cotações', 'cotacoes', 'delete'),
('cotacoes.select', 'Selecionar cotação vencedora', 'cotacoes', 'select'),

-- Módulo de Fornecedores
('fornecedores.view', 'Visualizar fornecedores', 'fornecedores', 'view'),
('fornecedores.create', 'Criar fornecedores', 'fornecedores', 'create'),
('fornecedores.edit', 'Editar fornecedores', 'fornecedores', 'edit'),
('fornecedores.delete', 'Excluir fornecedores', 'fornecedores', 'delete'),

-- Módulo de Pedidos
('pedidos.view', 'Visualizar pedidos', 'pedidos', 'view'),
('pedidos.create', 'Criar pedidos', 'pedidos', 'create'),
('pedidos.edit', 'Editar pedidos', 'pedidos', 'edit'),
('pedidos.delete', 'Excluir pedidos', 'pedidos', 'delete'),
('pedidos.approve', 'Aprovar pedidos', 'pedidos', 'approve'),

-- Módulo de Pagamentos
('pagamentos.view', 'Visualizar pagamentos', 'pagamentos', 'view'),
('pagamentos.create', 'Criar pagamentos', 'pagamentos', 'create'),
('pagamentos.edit', 'Editar pagamentos', 'pagamentos', 'edit'),
('pagamentos.delete', 'Excluir pagamentos', 'pagamentos', 'delete'),
('pagamentos.approve', 'Aprovar pagamentos', 'pagamentos', 'approve'),

-- Módulo de Contratos
('contratos.view', 'Visualizar contratos', 'contratos', 'view'),
('contratos.create', 'Criar contratos', 'contratos', 'create'),
('contratos.edit', 'Editar contratos', 'contratos', 'edit'),
('contratos.delete', 'Excluir contratos', 'contratos', 'delete'),
('contratos.approve', 'Aprovar contratos', 'contratos', 'approve'),

-- Módulo de Relatórios
('relatorios.view', 'Visualizar relatórios', 'relatorios', 'view'),
('relatorios.export', 'Exportar relatórios', 'relatorios', 'export'),

-- Módulo de Auditoria
('auditoria.view', 'Visualizar auditoria', 'auditoria', 'view'),
('auditoria.export', 'Exportar auditoria', 'auditoria', 'export'),

-- Módulo de Segurança
('security.view', 'Visualizar painel de segurança', 'security', 'view'),
('security.manage_ips', 'Gerenciar IPs bloqueados/whitelist', 'security', 'manage_ips'),
('security.view_logs', 'Visualizar logs de segurança', 'security', 'view_logs'),
('security.manage_sessions', 'Gerenciar sessões ativas', 'security', 'manage_sessions'),

-- Módulo de Usuários
('users.view', 'Visualizar usuários', 'users', 'view'),
('users.create', 'Criar usuários', 'users', 'create'),
('users.edit', 'Editar usuários', 'users', 'edit'),
('users.delete', 'Excluir usuários', 'users', 'delete'),
('users.manage_roles', 'Gerenciar roles de usuários', 'users', 'manage_roles'),

-- Módulo de Configurações
('settings.view', 'Visualizar configurações', 'settings', 'view'),
('settings.edit', 'Editar configurações', 'settings', 'edit');

-- =============================================
-- PERMISSÕES PADRÃO POR ROLE
-- =============================================

-- Admin tem todas as permissões
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'admin'::app_role, id FROM public.permissions;

-- Coordinator
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'coordinator'::app_role, id FROM public.permissions 
WHERE name IN (
    'solicitacoes.view', 'solicitacoes.create', 'solicitacoes.edit', 'solicitacoes.approve',
    'cotacoes.view', 'cotacoes.create', 'cotacoes.edit', 'cotacoes.select',
    'fornecedores.view', 'fornecedores.create', 'fornecedores.edit',
    'pedidos.view', 'pedidos.create', 'pedidos.edit', 'pedidos.approve',
    'pagamentos.view',
    'contratos.view', 'contratos.create', 'contratos.edit',
    'relatorios.view', 'relatorios.export',
    'auditoria.view',
    'users.view'
);

-- Buyer
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'buyer'::app_role, id FROM public.permissions 
WHERE name IN (
    'solicitacoes.view', 'solicitacoes.create', 'solicitacoes.edit',
    'cotacoes.view', 'cotacoes.create', 'cotacoes.edit',
    'fornecedores.view', 'fornecedores.create',
    'pedidos.view', 'pedidos.create', 'pedidos.edit',
    'pagamentos.view',
    'contratos.view',
    'relatorios.view'
);

-- Finance
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'finance'::app_role, id FROM public.permissions 
WHERE name IN (
    'solicitacoes.view',
    'cotacoes.view',
    'fornecedores.view',
    'pedidos.view',
    'pagamentos.view', 'pagamentos.create', 'pagamentos.edit', 'pagamentos.approve',
    'contratos.view',
    'relatorios.view', 'relatorios.export',
    'auditoria.view'
);

-- Habilitar realtime para alertas
ALTER PUBLICATION supabase_realtime ADD TABLE public.security_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.blocked_ips;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rate_limit_logs;
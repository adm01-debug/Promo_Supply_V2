-- ---------------------------------------------------------------------------
-- permissions / role_permissions estavam VAZIAS em producao.
--
-- Medido antes: `select count(*) from permissions` = 0 e `role_permissions` = 0,
-- embora a migration 20251231120356 crie as tabelas e o seed. O seed nunca
-- chegou ao banco (a tabela foi criada, os INSERTs nao).
--
-- Efeito no negocio: `usePermissions().hasPermission()` retorna false para todo
-- usuario nao-admin, entao todo `<PermissionGate>` renderiza o fallback — o
-- painel de seguranca e a matriz de permissoes aparecem vazios para
-- coordinator/buyer/finance.
--
-- Idempotente: ON CONFLICT nas duas tabelas, pode rodar de novo sem duplicar.
-- ---------------------------------------------------------------------------

INSERT INTO public.permissions (name, description, module, action) VALUES
('solicitacoes.view', 'Visualizar solicitações', 'solicitacoes', 'view'),
('solicitacoes.create', 'Criar solicitações', 'solicitacoes', 'create'),
('solicitacoes.edit', 'Editar solicitações', 'solicitacoes', 'edit'),
('solicitacoes.delete', 'Excluir solicitações', 'solicitacoes', 'delete'),
('solicitacoes.approve', 'Aprovar solicitações', 'solicitacoes', 'approve'),
('cotacoes.view', 'Visualizar cotações', 'cotacoes', 'view'),
('cotacoes.create', 'Criar cotações', 'cotacoes', 'create'),
('cotacoes.edit', 'Editar cotações', 'cotacoes', 'edit'),
('cotacoes.delete', 'Excluir cotações', 'cotacoes', 'delete'),
('cotacoes.select', 'Selecionar cotação vencedora', 'cotacoes', 'select'),
('fornecedores.view', 'Visualizar fornecedores', 'fornecedores', 'view'),
('fornecedores.create', 'Criar fornecedores', 'fornecedores', 'create'),
('fornecedores.edit', 'Editar fornecedores', 'fornecedores', 'edit'),
('fornecedores.delete', 'Excluir fornecedores', 'fornecedores', 'delete'),
('pedidos.view', 'Visualizar pedidos', 'pedidos', 'view'),
('pedidos.create', 'Criar pedidos', 'pedidos', 'create'),
('pedidos.edit', 'Editar pedidos', 'pedidos', 'edit'),
('pedidos.delete', 'Excluir pedidos', 'pedidos', 'delete'),
('pedidos.approve', 'Aprovar pedidos', 'pedidos', 'approve'),
('pagamentos.view', 'Visualizar pagamentos', 'pagamentos', 'view'),
('pagamentos.create', 'Criar pagamentos', 'pagamentos', 'create'),
('pagamentos.edit', 'Editar pagamentos', 'pagamentos', 'edit'),
('pagamentos.delete', 'Excluir pagamentos', 'pagamentos', 'delete'),
('pagamentos.approve', 'Aprovar pagamentos', 'pagamentos', 'approve'),
('contratos.view', 'Visualizar contratos', 'contratos', 'view'),
('contratos.create', 'Criar contratos', 'contratos', 'create'),
('contratos.edit', 'Editar contratos', 'contratos', 'edit'),
('contratos.delete', 'Excluir contratos', 'contratos', 'delete'),
('contratos.approve', 'Aprovar contratos', 'contratos', 'approve'),
('relatorios.view', 'Visualizar relatórios', 'relatorios', 'view'),
('relatorios.export', 'Exportar relatórios', 'relatorios', 'export'),
('auditoria.view', 'Visualizar auditoria', 'auditoria', 'view'),
('auditoria.export', 'Exportar auditoria', 'auditoria', 'export'),
('security.view', 'Visualizar painel de segurança', 'security', 'view'),
('security.manage_ips', 'Gerenciar IPs bloqueados/whitelist', 'security', 'manage_ips'),
('security.view_logs', 'Visualizar logs de segurança', 'security', 'view_logs'),
('security.manage_sessions', 'Gerenciar sessões ativas', 'security', 'manage_sessions'),
('users.view', 'Visualizar usuários', 'users', 'view'),
('users.create', 'Criar usuários', 'users', 'create'),
('users.edit', 'Editar usuários', 'users', 'edit'),
('users.delete', 'Excluir usuários', 'users', 'delete'),
('users.manage_roles', 'Gerenciar roles de usuários', 'users', 'manage_roles'),
('settings.view', 'Visualizar configurações', 'settings', 'view'),
('settings.edit', 'Editar configurações', 'settings', 'edit')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'admin'::app_role, id FROM public.permissions
ON CONFLICT (role, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'coordinator'::app_role, id FROM public.permissions
WHERE module || '.' || action IN (
  'solicitacoes.view','solicitacoes.create','solicitacoes.edit','solicitacoes.approve',
  'cotacoes.view','cotacoes.create','cotacoes.edit','cotacoes.select',
  'fornecedores.view','fornecedores.create','fornecedores.edit',
  'pedidos.view','pedidos.create','pedidos.edit','pedidos.approve',
  'pagamentos.view','contratos.view','contratos.create','contratos.edit',
  'relatorios.view','relatorios.export','auditoria.view','users.view'
)
ON CONFLICT (role, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'buyer'::app_role, id FROM public.permissions
WHERE module || '.' || action IN (
  'solicitacoes.view','solicitacoes.create','solicitacoes.edit',
  'cotacoes.view','cotacoes.create','cotacoes.edit',
  'fornecedores.view','fornecedores.create',
  'pedidos.view','pedidos.create','pedidos.edit',
  'pagamentos.view','contratos.view','relatorios.view'
)
ON CONFLICT (role, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'finance'::app_role, id FROM public.permissions
WHERE module || '.' || action IN (
  'solicitacoes.view','cotacoes.view','fornecedores.view','pedidos.view',
  'pagamentos.view','pagamentos.create','pagamentos.edit','pagamentos.approve',
  'contratos.view','relatorios.view','relatorios.export','auditoria.view'
)
ON CONFLICT (role, permission_id) DO NOTHING;
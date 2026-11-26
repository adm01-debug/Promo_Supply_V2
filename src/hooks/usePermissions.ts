import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth';

export interface Permission {
  id: string;
  name: string;
  description: string | null;
  module: string;
  action: string;
  created_at: string;
}

export interface RolePermission {
  id: string;
  role: string;
  permission_id: string;
  created_at: string;
  permission?: Permission;
}

export const usePermissions = () => {
  const { user, role, isAdmin } = useAuth();

  // Fetch all permissions (admin matrix only). Some so a matriz de papeis
  // (`PermissionMatrix`) usa o catalogo: para quem nao e' admin a leitura volta
  // vazia pela RLS, entao nao se pede. As permissoes efetivas do usuario vem da
  // RPC `get_my_permissions` logo abaixo.
  const { data: permissions, isLoading: permissionsLoading } = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('module', { ascending: true });

      if (error) throw error;
      return data as Permission[];
    },
    enabled: !!user && isAdmin,
  });

  // Fetch user's role permissions via SECURITY DEFINER RPC (bypasses RLS on role_permissions).
  // For admin the admin-shortcut in hasPermission fires first, so we skip the RPC.
  const { data: userPermissions, isLoading: userPermissionsLoading } = useQuery({
    queryKey: ['user-permissions', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // A RPC ja esta em `types.ts` (gerado do banco): sem cast, o retorno vem
      // tipado como `{ module, action }[]`.
      const { data, error } = await supabase.rpc('get_my_permissions');
      if (error) throw error;

      // Reshape to the same structure consumers expect
      return (data ?? []).map((row) => ({
        id: `${row.module}:${row.action}`,
        role: role ?? '',
        permission_id: `${row.module}:${row.action}`,
        created_at: '',
        permission: {
          id: `${row.module}:${row.action}`,
          name: `${row.module}.${row.action}`,
          description: null,
          module: row.module,
          action: row.action,
          created_at: '',
        } as Permission,
      })) as (RolePermission & { permission: Permission })[];
    },
    enabled: !!user && !isAdmin,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch ALL role permissions (admin matrix only)
  const { data: allRolePermissions, isLoading: allRolePermissionsLoading } = useQuery({
    queryKey: ['all-role-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_permissions')
        .select(`
          *,
          permission:permissions(*)
        `)
        .order('role');

      if (error) throw error;
      return data as (RolePermission & { permission: Permission })[];
    },
    enabled: !!user && isAdmin,
  });

  // Check if user has specific permission
  const hasPermission = (module: string, action: string): boolean => {
    if (!role) return false;
    if (isAdmin) return true;
    if (!userPermissions) return false;
    return userPermissions.some(
      rp => rp.permission?.module === module && rp.permission?.action === action
    );
  };

  // Check multiple permissions (OR logic)
  const hasAnyPermission = (checks: { module: string; action: string }[]): boolean => {
    return checks.some(check => hasPermission(check.module, check.action));
  };

  // Check multiple permissions (AND logic)
  const hasAllPermissions = (checks: { module: string; action: string }[]): boolean => {
    return checks.every(check => hasPermission(check.module, check.action));
  };

  // Get all permissions for a module
  const getModulePermissions = (module: string): Permission[] => {
    if (!permissions) return [];
    return permissions.filter(p => p.module === module);
  };

  // Group permissions by module
  const groupedPermissions = permissions?.reduce((acc, perm) => {
    if (!acc[perm.module]) {
      acc[perm.module] = [];
    }
    acc[perm.module].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  return {
    permissions,
    userPermissions,
    allRolePermissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getModulePermissions,
    groupedPermissions,
    isLoading: permissionsLoading || userPermissionsLoading || allRolePermissionsLoading,
  };
};

// Module labels in Portuguese
export const moduleLabels: Record<string, string> = {
  solicitacoes: 'Solicitações',
  cotacoes: 'Cotações',
  fornecedores: 'Fornecedores',
  pedidos: 'Pedidos',
  pagamentos: 'Pagamentos',
  contratos: 'Contratos',
  relatorios: 'Relatórios',
  auditoria: 'Auditoria',
  security: 'Segurança',
  users: 'Usuários',
  settings: 'Configurações',
};

// Action labels in Portuguese
export const actionLabels: Record<string, string> = {
  view: 'Visualizar',
  create: 'Criar',
  edit: 'Editar',
  delete: 'Excluir',
  approve: 'Aprovar',
  select: 'Selecionar',
  export: 'Exportar',
  manage_ips: 'Gerenciar IPs',
  view_logs: 'Ver Logs',
  manage_sessions: 'Gerenciar Sessões',
  manage_roles: 'Gerenciar Roles',
};

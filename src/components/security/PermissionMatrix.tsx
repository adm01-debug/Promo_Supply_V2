import { useState } from 'react';
import { Shield, Check, X, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from "@/lib/feedbackToast";
import { usePermissions, moduleLabels, actionLabels, Permission } from '@/hooks/usePermissions';
import { useAuth } from '@/hooks/useAuth';
import { AppRole, roleLabels, roleColors } from '@/hooks/authRoles';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

type RolePermissions = Record<string, Record<string, boolean>>;

export const PermissionMatrix = () => {
  const { permissions, allRolePermissions, groupedPermissions, isLoading } = usePermissions();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [changes, setChanges] = useState<RolePermissions>({});
  const [saving, setSaving] = useState(false);

  const roles: AppRole[] = ['admin', 'coordinator', 'buyer', 'finance'];

  const togglePermission = (role: AppRole, permissionId: string, currentValue: boolean) => {
    if (role === 'admin') return; // Admin always has all permissions

    setChanges(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [permissionId]: !currentValue,
      },
    }));
  };

  const hasPermission = (role: AppRole, permissionId: string): boolean => {
    if (role === 'admin') return true;
    
    // Check if there's a pending change
    if (changes[role]?.[permissionId] !== undefined) {
      return changes[role][permissionId];
    }

    // Check database using all role permissions
    const rolePerms = allRolePermissions?.filter(
      rp => rp.role === role && rp.permission_id === permissionId
    );
    return !!rolePerms?.length;
  };

  const saveChanges = useMutation({
    mutationFn: async () => {
      setSaving(true);
      
      for (const [roleKey, perms] of Object.entries(changes)) {
        const role = roleKey as AppRole;
        for (const [permissionId, enabled] of Object.entries(perms)) {
          if (enabled) {
            // Add permission
            await supabase.from('role_permissions').upsert({
              role: role as AppRole,
              permission_id: permissionId,
            }, {
              onConflict: 'role,permission_id',
            });
          } else {
            // Remove permission
            await supabase
              .from('role_permissions')
              .delete()
              .eq('role', role)
              .eq('permission_id', permissionId);
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['all-role-permissions'] });
      setChanges({});
      toast.success('Permissões atualizadas com sucesso');
    },
    onError: () => {
      toast.error('Erro ao salvar permissões');
    },
    onSettled: () => {
      setSaving(false);
    },
  });

  const hasChanges = Object.keys(changes).length > 0;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8 text-muted-foreground">
          <Shield className="w-5 h-5 mr-2" />
          Apenas administradores podem gerenciar permissões
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Matriz de Permissões
          </CardTitle>
          <CardDescription>
            Configure as permissões de cada role no sistema
          </CardDescription>
        </div>
        {hasChanges && (
          <Button onClick={() => saveChanges.mutate()} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar Alterações
              </>
            )}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table aria-label="Tabela de dados">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Módulo / Ação</TableHead>
                {roles.map(role => (
                  <TableHead key={role} className="text-center min-w-[100px]">
                    <Badge variant="outline" className={roleColors[role]}>
                      {roleLabels[role]}
                    </Badge>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedPermissions && Object.entries(groupedPermissions).map(([module, perms]) => (
                <>
                  <TableRow key={module} className="bg-muted/30">
                    <TableCell colSpan={roles.length + 1} className="font-semibold">
                      {moduleLabels[module] || module}
                    </TableCell>
                  </TableRow>
                  {perms.map((perm: Permission) => (
                    <TableRow key={perm.id}>
                      <TableCell className="pl-8">
                        {actionLabels[perm.action] || perm.action}
                        <span className="text-xs text-muted-foreground ml-2">
                          ({perm.name})
                        </span>
                      </TableCell>
                      {roles.map(role => {
                        const enabled = hasPermission(role, perm.id);
                        const isChanged = changes[role]?.[perm.id] !== undefined;
                        const isAdminRole = role === 'admin';

                        return (
                          <TableCell key={role} className="text-center">
                            {isAdminRole ? (
                              <Check className="w-5 h-5 text-success mx-auto" />
                            ) : (
                              <Checkbox
                                checked={enabled}
                                onCheckedChange={() => togglePermission(role, perm.id, enabled)}
                                className={isChanged ? 'border-primary' : ''}
                              />
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="mt-6 flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-success" />
            <span>Permissão concedida (Admin sempre tem todas)</span>
          </div>
          <div className="flex items-center gap-2">
            <X className="w-4 h-4 text-muted-foreground" />
            <span>Sem permissão</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

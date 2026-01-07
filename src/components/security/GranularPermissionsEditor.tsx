import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Save, Search, Users, Lock, Eye, Edit, Trash2, Plus, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Permission {
  id: string;
  name: string;
  module: string;
  action: string;
  description?: string;
}

interface Role {
  name: string;
  label: string;
  description: string;
  permissions: string[];
}

const defaultRoles: Role[] = [
  { 
    name: 'admin', 
    label: 'Administrador', 
    description: 'Acesso total ao sistema',
    permissions: []
  },
  { 
    name: 'coordinator', 
    label: 'Coordenador', 
    description: 'Gerencia equipe e aprova solicitações',
    permissions: []
  },
  { 
    name: 'buyer', 
    label: 'Comprador', 
    description: 'Realiza cotações e pedidos',
    permissions: []
  },
  { 
    name: 'finance', 
    label: 'Financeiro', 
    description: 'Gerencia pagamentos',
    permissions: []
  },
  { 
    name: 'viewer', 
    label: 'Visualizador', 
    description: 'Somente leitura',
    permissions: []
  },
];

const defaultModules = [
  { name: 'solicitacoes', label: 'Solicitações' },
  { name: 'cotacoes', label: 'Cotações' },
  { name: 'pedidos', label: 'Pedidos' },
  { name: 'pagamentos', label: 'Pagamentos' },
  { name: 'fornecedores', label: 'Fornecedores' },
  { name: 'relatorios', label: 'Relatórios' },
  { name: 'configuracoes', label: 'Configurações' },
  { name: 'usuarios', label: 'Usuários' },
];

const defaultActions = [
  { name: 'view', label: 'Visualizar', icon: Eye },
  { name: 'create', label: 'Criar', icon: Plus },
  { name: 'edit', label: 'Editar', icon: Edit },
  { name: 'delete', label: 'Excluir', icon: Trash2 },
  { name: 'approve', label: 'Aprovar', icon: ShieldCheck },
];

interface GranularPermissionsEditorProps {
  roles?: Role[];
  onSave?: (roles: Role[]) => Promise<void>;
  isLoading?: boolean;
}

export function GranularPermissionsEditor({
  roles = defaultRoles,
  onSave,
  isLoading,
}: GranularPermissionsEditorProps) {
  const [editedRoles, setEditedRoles] = React.useState<Role[]>(roles);
  const [selectedRole, setSelectedRole] = React.useState(roles[0]?.name);
  const [hasChanges, setHasChanges] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const currentRole = editedRoles.find(r => r.name === selectedRole);

  const getPermissionKey = (module: string, action: string) => `${module}:${action}`;

  const hasPermission = (module: string, action: string) => {
    if (!currentRole) return false;
    // Admin has all permissions
    if (currentRole.name === 'admin') return true;
    return currentRole.permissions.includes(getPermissionKey(module, action));
  };

  const togglePermission = (module: string, action: string) => {
    if (!currentRole || currentRole.name === 'admin') return;

    const key = getPermissionKey(module, action);
    setEditedRoles(prev => prev.map(role => {
      if (role.name !== selectedRole) return role;
      
      const hasIt = role.permissions.includes(key);
      return {
        ...role,
        permissions: hasIt
          ? role.permissions.filter(p => p !== key)
          : [...role.permissions, key],
      };
    }));
    setHasChanges(true);
  };

  const toggleModuleAll = (module: string, enable: boolean) => {
    if (!currentRole || currentRole.name === 'admin') return;

    setEditedRoles(prev => prev.map(role => {
      if (role.name !== selectedRole) return role;

      const modulePerms = defaultActions.map(a => getPermissionKey(module, a.name));
      
      if (enable) {
        const newPerms = [...new Set([...role.permissions, ...modulePerms])];
        return { ...role, permissions: newPerms };
      } else {
        return {
          ...role,
          permissions: role.permissions.filter(p => !modulePerms.includes(p)),
        };
      }
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!onSave) return;
    
    setIsSaving(true);
    try {
      await onSave(editedRoles);
      setHasChanges(false);
      toast.success('Permissões salvas com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar permissões');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredModules = defaultModules.filter(m =>
    m.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              Gerenciamento de Permissões
            </CardTitle>
            <CardDescription>
              Configure permissões granulares por role
            </CardDescription>
          </div>
          {onSave && (
            <Button 
              onClick={handleSave} 
              disabled={!hasChanges || isSaving}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar alterações
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Role selector */}
        <Tabs value={selectedRole} onValueChange={setSelectedRole} className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full">
            {editedRoles.map(role => (
              <TabsTrigger key={role.name} value={role.name}>
                {role.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {editedRoles.map(role => (
            <TabsContent key={role.name} value={role.name}>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{role.description}</p>
                
                {role.name === 'admin' && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    <Lock className="w-3 h-3 mr-1" />
                    Acesso total (não editável)
                  </Badge>
                )}

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar módulo..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Permissions matrix */}
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">Módulo</th>
                        {defaultActions.map(action => (
                          <th key={action.name} className="px-3 py-3 text-center font-medium">
                            <div className="flex flex-col items-center gap-1">
                              <action.icon className="w-4 h-4" />
                              <span className="text-xs">{action.label}</span>
                            </div>
                          </th>
                        ))}
                        <th className="px-3 py-3 text-center font-medium text-xs">Todos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredModules.map(module => {
                        const allChecked = defaultActions.every(a => 
                          hasPermission(module.name, a.name)
                        );
                        const someChecked = defaultActions.some(a => 
                          hasPermission(module.name, a.name)
                        );

                        return (
                          <tr key={module.name} className="border-t hover:bg-muted/30">
                            <td className="px-4 py-3 font-medium">{module.label}</td>
                            {defaultActions.map(action => (
                              <td key={action.name} className="px-3 py-3 text-center">
                                <Checkbox
                                  checked={hasPermission(module.name, action.name)}
                                  onCheckedChange={() => togglePermission(module.name, action.name)}
                                  disabled={role.name === 'admin'}
                                />
                              </td>
                            ))}
                            <td className="px-3 py-3 text-center">
                              <Checkbox
                                checked={allChecked}
                                onCheckedChange={(checked) => 
                                  toggleModuleAll(module.name, checked as boolean)
                                }
                                disabled={role.name === 'admin'}
                                className={someChecked && !allChecked ? 'data-[state=checked]:bg-muted' : ''}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}

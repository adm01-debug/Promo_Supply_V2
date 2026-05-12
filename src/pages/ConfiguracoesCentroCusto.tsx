import React, { useState } from 'react';
import { MainLayout } from '@/components/compras/MainLayout';
import { PageTransition } from '@/components/animations/MotionComponents';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useSolicitacoes, type CostCenter } from '@/hooks/useSolicitacoes';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Building2, Plus, Edit2, Trash2, Search, CheckCircle2, XCircle, Loader2
} from 'lucide-react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ConfiguracoesCentroCusto = () => {
  const { costCenters, loadingCostCenters } = useSolicitacoes();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCC, setEditingCC] = useState<CostCenter | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ 
    name: '', 
    code: '', 
    is_active: true,
    manager_id: '',
    department: '',
    parent_id: ''
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, full_name').order('full_name');
      if (error) throw error;
      return data;
    }
  });

  const filteredCCs = costCenters.filter(cc => 
    cc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    cc.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenDialog = (cc?: CostCenter) => {
    if (cc) {
      setEditingCC(cc);
      setForm({ 
        name: cc.name, 
        code: cc.code, 
        is_active: cc.is_active,
        manager_id: cc.manager_id || '',
        department: cc.department || '',
        parent_id: cc.parent_id || ''
      });
    } else {
      setEditingCC(null);
      setForm({ 
        name: '', 
        code: '', 
        is_active: true,
        manager_id: '',
        department: '',
        parent_id: ''
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.code) {
      toast.error('Preencha nome e código');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: form.name,
        code: form.code,
        is_active: form.is_active,
        manager_id: form.manager_id || null,
        department: form.department || null,
        parent_id: form.parent_id || null
      };

      if (editingCC) {
        const { error } = await supabase
          .from('cost_centers')
          .update(payload)
          .eq('id', editingCC.id);
        if (error) throw error;
        toast.success('Centro de custo atualizado');
      } else {
        const { error } = await supabase
          .from('cost_centers')
          .insert(payload);
        if (error) throw error;
        toast.success('Centro de custo criado');
      }
      queryClient.invalidateQueries({ queryKey: ['cost-centers'] });
      setIsDialogOpen(false);
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este centro de custo?')) return;
    try {
      const { error } = await supabase.from('cost_centers').delete().eq('id', id);
      if (error) throw error;
      toast.success('Centro de custo excluído');
      queryClient.invalidateQueries({ queryKey: ['cost-centers'] });
    } catch (error: any) {
      toast.error('Erro ao excluir: ' + error.message);
    }
  };

  return (
    <MainLayout>
      <PageTransition className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Building2 className="w-6 h-6 text-primary" />
              Centros de Custo
            </h1>
            <p className="text-sm text-muted-foreground">Gerencie as unidades de custo da organização</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}><Plus className="w-4 h-4 mr-2" />Novo Centro de Custo</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCC ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Marketing" />
                </div>
                <div className="space-y-2">
                  <Label>Código</Label>
                  <Input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} placeholder="Ex: CC-001" />
                </div>
                <div className="space-y-2">
                  <Label>Departamento</Label>
                  <Input value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} placeholder="Ex: Financeiro" />
                </div>
                <div className="space-y-2">
                  <Label>Gestor Responsável</Label>
                  <Select value={form.manager_id} onValueChange={v => setForm(p => ({ ...p, manager_id: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um gestor" />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map(profile => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.full_name || 'Sem nome'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Centro de Custo Pai (Opcional)</Label>
                  <Select value={form.parent_id} onValueChange={v => setForm(p => ({ ...p, parent_id: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Nenhum" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {costCenters.filter(cc => cc.id !== editingCC?.id).map(cc => (
                        <SelectItem key={cc.id} value={cc.id}>
                          {cc.code} - {cc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
                  <Label>Ativo</Label>
                </div>
                <Button className="w-full" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {editingCC ? 'Salvar Alterações' : 'Criar Centro de Custo'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="p-4">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              className="pl-9" 
              placeholder="Buscar por nome ou código..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Gestor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingCostCenters ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                    </TableCell>
                  </TableRow>
                ) : filteredCCs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Nenhum centro de custo encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCCs.map((cc) => (
                    <TableRow key={cc.id}>
                      <TableCell className="font-medium">{cc.code}</TableCell>
                      <TableCell>{cc.name}</TableCell>
                      <TableCell>{cc.department || '-'}</TableCell>
                      <TableCell>{cc.manager?.full_name || '-'}</TableCell>
                      <TableCell>
                        {cc.is_active ? (
                          <div className="flex items-center gap-1 text-emerald-500 text-xs font-medium">
                            <CheckCircle2 className="w-3 h-3" /> Ativo
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-muted-foreground text-xs font-medium">
                            <XCircle className="w-3 h-3" /> Inativo
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(cc)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(cc.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </PageTransition>
    </MainLayout>
  );
};

export default ConfiguracoesCentroCusto;

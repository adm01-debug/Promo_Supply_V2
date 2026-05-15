import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Shield, Plus, Trash2, Loader2, AlertTriangle, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

interface EscalationConfig {
  id: string;
  contract_id: string | null;
  level: number;
  min_infractions: number;
  max_infractions: number | null;
  action_type: string;
  penalty_multiplier: number;
  block_days: number | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  warning: { label: 'Advertência', color: 'bg-warning/10 text-warning' },
  fine: { label: 'Multa', color: 'bg-destructive/10 text-destructive' },
  temp_block: { label: 'Bloqueio Temporário', color: 'bg-destructive/20 text-destructive' },
  permanent_block: { label: 'Bloqueio Permanente', color: 'bg-destructive text-destructive-foreground' },
};

export const PenaltyEscalationConfigPanel = () => {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    level: 1, min_infractions: 1, max_infractions: '',
    action_type: 'warning', penalty_multiplier: 1, block_days: '',
    description: '',
  });

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['penalty-escalation-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('penalty_escalation_config')
        .select('*')
        .order('level');
      if (error) throw error;
      return data as EscalationConfig[];
    },
    enabled: !!user,
  });

  const createConfig = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('penalty_escalation_config').insert({
        level: form.level,
        min_infractions: form.min_infractions,
        max_infractions: form.max_infractions ? parseInt(form.max_infractions) : null,
        action_type: form.action_type,
        penalty_multiplier: form.penalty_multiplier,
        block_days: form.block_days ? parseInt(form.block_days) : null,
        description: form.description || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['penalty-escalation-config'] });
      toast.success('Regra de escalonamento criada');
      setShowAdd(false);
    },
    onError: () => toast.error('Erro ao criar regra'),
  });

  const deleteConfig = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('penalty_escalation_config').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['penalty-escalation-config'] });
      toast.success('Regra removida');
    },
  });

  if (isLoading) {
    return <Card><CardContent className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></CardContent></Card>;
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-destructive" />
              Escalonamento de Penalidades
            </CardTitle>
            <CardDescription>
              Configure a progressão automática de penalidades por reincidência
            </CardDescription>
          </div>
          {isAdmin && (
            <Button onClick={() => setShowAdd(true)}>
              <Plus className="w-4 h-4 mr-2" /> Adicionar Nível
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {configs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Nenhuma regra de escalonamento configurada</p>
              <p className="text-sm">As penalidades serão aplicadas sem progressão</p>
            </div>
          ) : (
            <Table aria-label="Configuração de escalonamento">
              <TableHeader>
                <TableRow>
                  <TableHead>Nível</TableHead>
                  <TableHead>Infrações</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Multiplicador</TableHead>
                  <TableHead>Bloqueio</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin && <TableHead className="text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map((c) => {
                  const action = ACTION_LABELS[c.action_type] || { label: c.action_type, color: '' };
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-bold text-lg">{c.level}</TableCell>
                      <TableCell>{c.min_infractions}{c.max_infractions ? `–${c.max_infractions}` : '+'}</TableCell>
                      <TableCell><Badge className={action.color}>{action.label}</Badge></TableCell>
                      <TableCell className="font-mono">{c.penalty_multiplier}x</TableCell>
                      <TableCell>{c.block_days ? `${c.block_days} dias` : '—'}</TableCell>
                      <TableCell>
                        <Badge variant={c.is_active ? 'default' : 'secondary'}>
                          {c.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => deleteConfig.mutate(c.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Nova Regra de Escalonamento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nível</Label>
                <Input type="number" min={1} value={form.level} onChange={e => setForm(f => ({ ...f, level: parseInt(e.target.value) || 1 }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Ação</Label>
                <Select value={form.action_type} onValueChange={v => setForm(f => ({ ...f, action_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="warning">Advertência</SelectItem>
                    <SelectItem value="fine">Multa</SelectItem>
                    <SelectItem value="temp_block">Bloqueio Temporário</SelectItem>
                    <SelectItem value="permanent_block">Bloqueio Permanente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Mín. Infrações</Label>
                <Input type="number" min={1} value={form.min_infractions} onChange={e => setForm(f => ({ ...f, min_infractions: parseInt(e.target.value) || 1 }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Máx. Infrações (vazio = ilimitado)</Label>
                <Input type="number" value={form.max_infractions} onChange={e => setForm(f => ({ ...f, max_infractions: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Multiplicador de Multa</Label>
                <Input type="number" step="0.1" min={1} value={form.penalty_multiplier} onChange={e => setForm(f => ({ ...f, penalty_multiplier: parseFloat(e.target.value) || 1 }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Dias de Bloqueio</Label>
                <Input type="number" value={form.block_days} onChange={e => setForm(f => ({ ...f, block_days: e.target.value }))} placeholder="Apenas para bloqueios" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button onClick={() => createConfig.mutate()} disabled={createConfig.isPending}>
              {createConfig.isPending ? 'Salvando...' : 'Criar Regra'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

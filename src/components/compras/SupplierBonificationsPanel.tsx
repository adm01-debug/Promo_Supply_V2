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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Award, Plus, Loader2, Gift, Percent, Calendar } from 'lucide-react';
import { toast } from '@/lib/feedbackToast';
import { format } from "date-fns/format";
import { ptBR } from "date-fns/locale/pt-BR";

const TYPE_LABELS: Record<string, string> = {
  discount: 'Desconto',
  rebate: 'Rebate',
  credit: 'Crédito',
  free_shipping: 'Frete Grátis',
  bonus_items: 'Itens Bônus',
};

type FornecedorRef = { razao_social?: string | null; nome_fantasia?: string | null };
interface BonificationRow {
  id: string;
  fornecedor_id: string;
  bonification_type: string;
  value_percent: number | string | null;
  reason: string | null;
  period_start: string | null;
  period_end: string | null;
  is_active: boolean | null;
  fornecedor: FornecedorRef | FornecedorRef[] | null;
}
const pickFornecedor = (f: BonificationRow['fornecedor']): FornecedorRef | null =>
  Array.isArray(f) ? f[0] ?? null : f;

export const SupplierBonificationsPanel = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    fornecedor_id: '',
    bonification_type: 'discount',
    value_percent: '',
    reason: '',
    period_start: new Date().toISOString().split('T')[0],
    period_end: '',
  });

  const { data: bonifications = [], isLoading } = useQuery({
    queryKey: ['supplier-bonifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_bonifications')
        .select('*, fornecedor:fornecedores(razao_social, nome_fantasia)')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as BonificationRow[];
    },
    enabled: !!user,
  });

  const { data: fornecedores = [] } = useQuery({
    queryKey: ['fornecedores-bonif'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fornecedores')
        .select('id, razao_social, nome_fantasia')
        .eq('status', 'ativo')
        .order('razao_social');
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('supplier_bonifications').insert({
        fornecedor_id: form.fornecedor_id,
        bonification_type: form.bonification_type,
        value_percent: parseFloat(form.value_percent) || 0,
        reason: form.reason || null,
        period_start: form.period_start,
        period_end: form.period_end || null,
        granted_by: user?.id,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-bonifications'] });
      toast.success('Bonificação registrada!');
      setShowAdd(false);
      setForm({ fornecedor_id: '', bonification_type: 'discount', value_percent: '', reason: '', period_start: new Date().toISOString().split('T')[0], period_end: '' });
    },
    onError: () => toast.error('Erro ao registrar bonificação'),
  });

  const activeCount = bonifications.filter((b) => b.is_active).length;

  if (isLoading) {
    return <Card><CardContent className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></CardContent></Card>;
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              Bonificações de Fornecedores
            </CardTitle>
            <CardDescription>
              {bonifications.length} registros | {activeCount} ativas
            </CardDescription>
          </div>
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 mr-2" /> Nova Bonificação
          </Button>
        </CardHeader>
        <CardContent>
          {bonifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Gift className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Nenhuma bonificação registrada</p>
            </div>
          ) : (
            <div className="max-h-[400px] overflow-auto">
              <Table aria-label="Bonificações">
                <TableHeader>
                  <TableRow>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-center">Valor %</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bonifications.map((b) => {
                    const forn = pickFornecedor(b.fornecedor);
                    return (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">
                        {forn?.nome_fantasia || forn?.razao_social || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{TYPE_LABELS[b.bonification_type] || b.bonification_type}</Badge>
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {Number(b.value_percent).toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {b.period_start ? format(new Date(b.period_start), 'dd/MM/yy', { locale: ptBR }) : '—'}
                        {b.period_end ? ` — ${format(new Date(b.period_end), 'dd/MM/yy', { locale: ptBR })}` : ' →'}
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{b.reason || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={b.is_active ? 'default' : 'secondary'}>
                          {b.is_active ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              Nova Bonificação
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Fornecedor</Label>
              <Select value={form.fornecedor_id} onValueChange={v => setForm(f => ({ ...f, fornecedor_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {fornecedores.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.nome_fantasia || f.razao_social}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={form.bonification_type} onValueChange={v => setForm(f => ({ ...f, bonification_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Valor (%)</Label>
                <Input type="number" step="0.1" value={form.value_percent} onChange={e => setForm(f => ({ ...f, value_percent: e.target.value }))} placeholder="Ex: 5.0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Início</Label>
                <Input type="date" value={form.period_start} onChange={e => setForm(f => ({ ...f, period_start: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Fim (opcional)</Label>
                <Input type="date" value={form.period_end} onChange={e => setForm(f => ({ ...f, period_end: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Motivo</Label>
              <Textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} rows={2} placeholder="Ex: Atingiu meta de 95% de pontualidade" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!form.fornecedor_id || !form.value_percent || createMutation.isPending}>
              {createMutation.isPending ? 'Salvando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

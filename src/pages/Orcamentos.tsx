import { useState, useMemo } from 'react';
import { MainLayout } from '@/features/layout/components/MainLayout';
import { ModuleErrorBoundary } from '@/features/layout/components/ModuleErrorBoundary';
import { PageTransition } from '@/components/animations/MotionComponents';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useBudgetManagement } from '@/hooks/useBudgetManagement';
import { useSolicitacoes } from '@/features/solicitacoes';
import { 
  Wallet, Plus, TrendingUp, AlertTriangle, CheckCircle2, Trash2, PiggyBank, BarChart3, Loader2, PieChart
} from 'lucide-react';
import { motion } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, Cell
} from 'recharts';

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const meses = [
  { value: '', label: 'Anual' },
  { value: '1', label: 'Janeiro' }, { value: '2', label: 'Fevereiro' },
  { value: '3', label: 'Março' }, { value: '4', label: 'Abril' },
  { value: '5', label: 'Maio' }, { value: '6', label: 'Junho' },
  { value: '7', label: 'Julho' }, { value: '8', label: 'Agosto' },
  { value: '9', label: 'Setembro' }, { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' }, { value: '12', label: 'Dezembro' },
];

const Orcamentos = () => {
  const { budgets, loading, createBudget, updateBudget, deleteBudget, summary } = useBudgetManagement();
  const { costCenters, loadingCostCenters } = useSolicitacoes();
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ cost_center_id: '', centro_custo: '', departamento: '', ano: new Date().getFullYear().toString(), mes: '', valor_total: '' });

  const handleCreate = () => {
    const valor = parseFloat(form.valor_total.replace(/[^\d,]/g, '').replace(',', '.'));
    if (!form.cost_center_id || !form.departamento || isNaN(valor)) return;
    createBudget.mutate({
      cost_center_id: form.cost_center_id,
      centro_custo: form.centro_custo,
      departamento: form.departamento,
      ano: parseInt(form.ano),
      mes: form.mes ? parseInt(form.mes) : null,
      valor_total: valor,
    }, {
      onSuccess: () => {
        setIsOpen(false);
        setForm({ cost_center_id: '', centro_custo: '', departamento: '', ano: new Date().getFullYear().toString(), mes: '', valor_total: '' });
      },
    });
  };

  const chartData = useMemo(() => {
    return budgets.map(b => ({
      name: b.centro_custo || b.departamento,
      total: Number(b.valor_total),
      utilizado: Number(b.valor_utilizado) + Number(b.valor_comprometido),
      disponivel: Math.max(0, Number(b.valor_total) - Number(b.valor_utilizado) - Number(b.valor_comprometido)),
    }));
  }, [budgets]);

  const getUsageColor = (pct: number) => {
    if (pct >= 90) return 'text-destructive';
    if (pct >= 70) return 'text-warning';
    return 'text-success';
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-28" />)}
          </div>
          <Skeleton className="h-96" />
        </div>
      </MainLayout>
    );
  }

  return (
    <ModuleErrorBoundary module="orcamentos">
      <MainLayout>
      <PageTransition className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Wallet className="w-6 h-6 text-primary" />
              Gestão de Orçamentos
            </h1>
            <p className="text-sm text-muted-foreground">Controle de orçamento por centro de custo</p>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Novo Orçamento</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Orçamento</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Centro de Custo</Label>
                    <Select 
                      value={form.cost_center_id} 
                      onValueChange={v => {
                        const cc = costCenters.find(c => c.id === v);
                        setForm(p => ({ ...p, cost_center_id: v, centro_custo: cc?.name || '' }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={loadingCostCenters ? "Carregando..." : "Selecione"} />
                      </SelectTrigger>
                      <SelectContent>
                        {costCenters.map(cc => (
                          <SelectItem key={cc.id} value={cc.id}>{cc.name} ({cc.code})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Departamento</Label>
                    <Input value={form.departamento} onChange={e => setForm(p => ({ ...p, departamento: e.target.value }))} placeholder="Marketing" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Ano</Label>
                    <Input type="number" value={form.ano} onChange={e => setForm(p => ({ ...p, ano: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Período</Label>
                    <Select value={form.mes} onValueChange={v => setForm(p => ({ ...p, mes: v }))}>
                      <SelectTrigger><SelectValue placeholder="Anual" /></SelectTrigger>
                      <SelectContent>
                        {meses.map(m => <SelectItem key={m.value || 'anual'} value={m.value || 'anual'}>{m.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Valor Total (R$)</Label>
                    <Input value={form.valor_total} onChange={e => setForm(p => ({ ...p, valor_total: e.target.value }))} placeholder="100.000,00" />
                  </div>
                </div>
                <Button onClick={handleCreate} disabled={createBudget.isPending}>
                  {createBudget.isPending ? 'Criando...' : 'Criar Orçamento'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Orçamento Total', value: formatCurrency(summary.totalBudget), icon: PiggyBank, color: 'text-primary' },
            { label: 'Comprometido', value: formatCurrency(summary.totalCommitted), icon: TrendingUp, color: 'text-warning' },
            { label: 'Utilizado', value: formatCurrency(summary.totalUsed), icon: BarChart3, color: 'text-info' },
            { label: 'Disponível', value: formatCurrency(summary.available), icon: CheckCircle2, color: summary.available < 0 ? 'text-destructive' : 'text-success' },
          ].map((kpi, i) => (
            <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}>
              <Card className="p-4 bg-card/50 backdrop-blur-sm border-primary/10 hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-background shadow-inner`}>
                    <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground leading-tight">{kpi.value}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{kpi.label}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Charts and Visualizations */}
        {budgets.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Comparativo por Centro de Custo
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value / 1000}k`} />
                    <RechartsTooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Bar dataKey="utilizado" name="Utilizado" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="disponivel" name="Disponível" stackId="a" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-primary" />
                Distribuição Orçamentária
              </h3>
              <div className="space-y-4">
                {budgets.slice(0, 5).map((b, i) => {
                  const pct = (Number(b.valor_total) / summary.totalBudget) * 100;
                  return (
                    <div key={b.id} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{b.centro_custo}</span>
                        <span className="text-muted-foreground">{pct.toFixed(1)}%</span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </div>
                  );
                })}
                {budgets.length > 5 && <p className="text-xs text-center text-muted-foreground">E outros {budgets.length - 5} centros de custo</p>}
              </div>
            </Card>
          </div>
        )}

        {/* Usage bar */}
        {summary.totalBudget > 0 && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Utilização Global</span>
              <span className={`text-sm font-bold ${getUsageColor(summary.usagePercent)}`}>
                {summary.usagePercent.toFixed(1)}%
              </span>
            </div>
            <Progress value={Math.min(summary.usagePercent, 100)} className="h-3" />
          </Card>
        )}

        {/* Budget list */}
        {budgets.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <Wallet className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum orçamento cadastrado</p>
            <p className="text-xs mt-1">Crie orçamentos por centro de custo para controlar gastos</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {budgets.map((budget) => {
              const available = Number(budget.valor_total) - Number(budget.valor_comprometido) - Number(budget.valor_utilizado);
              const pct = Number(budget.valor_total) > 0
                ? ((Number(budget.valor_comprometido) + Number(budget.valor_utilizado)) / Number(budget.valor_total)) * 100
                : 0;
              const mesLabel = budget.mes ? meses.find(m => m.value === String(budget.mes))?.label : 'Anual';

              return (
                <Card key={budget.id} className="p-5">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-foreground">{budget.departamento}</h3>
                        <Badge variant="outline">{budget.cost_center?.name || budget.centro_custo}</Badge>
                        <Badge variant="secondary">{mesLabel} {budget.ano}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Total: {formatCurrency(Number(budget.valor_total))}</span>
                        <span>Comprometido: {formatCurrency(Number(budget.valor_comprometido))}</span>
                        <span>Utilizado: {formatCurrency(Number(budget.valor_utilizado))}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-40 space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className={`font-bold ${getUsageColor(pct)}`}>{formatCurrency(available)}</span>
                          <span className="text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
                        </div>
                        <Progress value={Math.min(pct, 100)} className="h-2" />
                        {pct >= 90 && (
                          <div className="flex items-center gap-1 text-[10px] text-destructive">
                            <AlertTriangle className="w-3 h-3" />
                            Orçamento crítico
                          </div>
                        )}
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => deleteBudget.mutate(budget.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </PageTransition>
      </MainLayout>
    </ModuleErrorBoundary>
  );
};

export default Orcamentos;

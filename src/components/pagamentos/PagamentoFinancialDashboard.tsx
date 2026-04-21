import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from "recharts";
import { Building2, TrendingUp, Calendar as CalendarIcon, PieChart as PieChartIcon } from "lucide-react";
import { startOfWeek } from "date-fns/startOfWeek";
import { addWeeks } from "date-fns/addWeeks";
import { format } from "date-fns/format";
import { differenceInDays } from "date-fns/differenceInDays";
import { startOfMonth } from "date-fns/startOfMonth";
import { addMonths } from "date-fns/addMonths";
import { endOfMonth } from "date-fns/endOfMonth";
import { eachDayOfInterval } from "date-fns/eachDayOfInterval";
import { ptBR } from "date-fns/locale/pt-BR";
import type { Pagamento } from "@/hooks/usePagamentos";

interface Props {
  pagamentos: Pagamento[];
}

const COLORS = [
  "hsl(var(--primary))", "hsl(var(--accent))",
  "#f59e0b", "#10b981", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"
];

export const PagamentoFinancialDashboard = ({ pagamentos }: Props) => {
  // Concentração por fornecedor
  const concentracao = useMemo(() => {
    const map = new Map<string, { nome: string; valor: number }>();
    pagamentos.filter(p => p.status !== 'cancelado').forEach(p => {
      const nome = p.fornecedor?.razao_social || 'Outros';
      const existing = map.get(nome) || { nome, valor: 0 };
      existing.valor += p.valor - (p.valor_pago || 0);
      map.set(nome, existing);
    });
    const sorted = Array.from(map.values()).sort((a, b) => b.valor - a.valor);
    const top5 = sorted.slice(0, 5);
    const outros = sorted.slice(5).reduce((s, i) => s + i.valor, 0);
    if (outros > 0) top5.push({ nome: 'Outros', valor: outros });
    const total = top5.reduce((s, i) => s + i.valor, 0);
    return top5.map(i => ({ ...i, percent: total > 0 ? ((i.valor / total) * 100).toFixed(1) : '0' }));
  }, [pagamentos]);

  // Fluxo de caixa projetado (próximas 8 semanas)
  const fluxoCaixa = useMemo(() => {
    const hoje = new Date();
    const pendentes = pagamentos.filter(p => !['pago', 'cancelado'].includes(p.status));
    const weeks: { semana: string; saida: number; }[] = [];
    for (let i = 0; i < 8; i++) {
      const weekStart = startOfWeek(addWeeks(hoje, i), { weekStartsOn: 1 });
      const weekEnd = addWeeks(weekStart, 1);
      const saida = pendentes.filter(p => {
        const d = new Date(p.data_vencimento);
        return d >= weekStart && d < weekEnd;
      }).reduce((s, p) => s + (p.valor - (p.valor_pago || 0)), 0);
      weeks.push({ semana: format(weekStart, 'dd/MM', { locale: ptBR }), saida });
    }
    return weeks;
  }, [pagamentos]);

  // Calendário de vencimentos (mês atual)
  const calendarioVencimentos = useMemo(() => {
    const hoje = new Date();
    const inicio = startOfMonth(hoje);
    const fim = endOfMonth(hoje);
    const dias = eachDayOfInterval({ start: inicio, end: fim });
    const pendentes = pagamentos.filter(p => !['pago', 'cancelado'].includes(p.status));
    return dias.map(dia => {
      const diaStr = dia.toISOString().split('T')[0];
      const vencimentos = pendentes.filter(p => p.data_vencimento === diaStr);
      const valor = vencimentos.reduce((s, p) => s + (p.valor - (p.valor_pago || 0)), 0);
      return { dia, diaStr, count: vencimentos.length, valor, isToday: diaStr === hoje.toISOString().split('T')[0] };
    });
  }, [pagamentos]);

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtK = (v: number) => v >= 1000 ? `R$ ${(v / 1000).toFixed(0)}k` : `R$ ${v.toFixed(0)}`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Concentração por Fornecedor */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <PieChartIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Concentração por Fornecedor</span>
        </div>
        {concentracao.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
        ) : (
          <div className="flex items-center gap-4">
            <div className="w-32 h-32">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={concentracao} dataKey="valor" nameKey="nome" cx="50%" cy="50%" innerRadius={25} outerRadius={55} paddingAngle={2}>
                    {concentracao.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-1.5">
              {concentracao.map((item, i) => (
                <div key={item.nome} className="flex items-center gap-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="truncate flex-1">{item.nome}</span>
                  <span className="font-medium text-muted-foreground">{item.percent}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Fluxo de Caixa Projetado */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Fluxo de Caixa (8 semanas)</span>
        </div>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={fluxoCaixa} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="semana" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={fmtK} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => fmt(v)} labelFormatter={(l) => `Semana ${l}`} />
              <Bar dataKey="saida" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} name="Saídas" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Calendário de Vencimentos */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Vencimentos - {format(new Date(), 'MMMM yyyy', { locale: ptBR })}</span>
        </div>
        <div className="grid grid-cols-7 gap-0.5 text-center">
          {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((d, i) => (
            <div key={i} className="text-[10px] text-muted-foreground font-medium py-1">{d}</div>
          ))}
          {/* Offset for first day */}
          {Array.from({ length: (calendarioVencimentos[0]?.dia.getDay() + 6) % 7 }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {calendarioVencimentos.map((d) => (
            <div
              key={d.diaStr}
              className={`relative p-1 rounded text-[10px] ${
                d.isToday ? 'ring-1 ring-primary font-bold' :
                d.count > 0 ? 'font-semibold' : 'text-muted-foreground'
              } ${d.count > 0 ? 'bg-destructive/10' : ''}`}
              title={d.count > 0 ? `${d.count} vencimento(s): ${fmt(d.valor)}` : ''}
            >
              {d.dia.getDate()}
              {d.count > 0 && (
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-destructive" />
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Clock, AlertTriangle, CheckCircle2, DollarSign, TrendingUp, TrendingDown,
  Calendar, BarChart3, Percent, Timer
} from "lucide-react";
import { differenceInDays } from "date-fns/differenceInDays";
import { subMonths } from "date-fns/subMonths";
import { startOfMonth } from "date-fns/startOfMonth";
import { endOfMonth } from "date-fns/endOfMonth";
import { motion } from "framer-motion";
import type { Pagamento } from "@/hooks/usePagamentos";
import { ExecutiveMetricCard } from "@/components/compras/executive/ExecutiveMetricCard";
import { cn, formatCurrency } from "@/lib/utils";

interface PagamentoAdvancedKPIsProps {
  pagamentos: Pagamento[];
}

export const PagamentoAdvancedKPIs = ({ pagamentos }: PagamentoAdvancedKPIsProps) => {
  const kpis = useMemo(() => {
    const hoje = new Date();
    const hojeStr = hoje.toISOString().split('T')[0];
    const mesAtual = startOfMonth(hoje);
    const mesAnterior = startOfMonth(subMonths(hoje, 1));
    const fimMesAnterior = endOfMonth(subMonths(hoje, 1));

    const pendentes = pagamentos.filter(p => !['pago', 'cancelado'].includes(p.status));
    const pagos = pagamentos.filter(p => p.status === 'pago');
    const vencidos = pendentes.filter(p => p.data_vencimento < hojeStr);
    const venceHoje = pendentes.filter(p => p.data_vencimento === hojeStr);
    const vence7d = pendentes.filter(p => {
      const dias = differenceInDays(new Date(p.data_vencimento), hoje);
      return dias > 0 && dias <= 7;
    });

    const pagosComDatas = pagos.filter(p => p.data_pagamento && p.data_vencimento);
    const dpo = pagosComDatas.length > 0
      ? Math.round(pagosComDatas.reduce((sum, p) => {
          const venc = new Date(p.data_vencimento);
          const pgto = new Date(p.data_pagamento!);
          return sum + differenceInDays(pgto, venc);
        }, 0) / pagosComDatas.length)
      : 0;

    const onTime = pagosComDatas.filter(p => p.data_pagamento! <= p.data_vencimento).length;
    const onTimeRate = pagosComDatas.length > 0 ? Math.round((onTime / pagosComDatas.length) * 100) : 100;

    const valorPendente = pendentes.reduce((s, p) => s + (p.valor - (p.valor_pago || 0)), 0);
    const valorVencido = vencidos.reduce((s, p) => s + (p.valor - (p.valor_pago || 0)), 0);

    const forecast30 = pendentes.filter(p => {
      const d = differenceInDays(new Date(p.data_vencimento), hoje);
      return d >= 0 && d <= 30;
    }).reduce((s, p) => s + (p.valor - (p.valor_pago || 0)), 0);

    const forecast60 = pendentes.filter(p => {
      const d = differenceInDays(new Date(p.data_vencimento), hoje);
      return d > 30 && d <= 60;
    }).reduce((s, p) => s + (p.valor - (p.valor_pago || 0)), 0);

    const forecast90 = pendentes.filter(p => {
      const d = differenceInDays(new Date(p.data_vencimento), hoje);
      return d > 60 && d <= 90;
    }).reduce((s, p) => s + (p.valor - (p.valor_pago || 0)), 0);

    const aging = {
      d0_7: vencidos.filter(p => Math.abs(differenceInDays(new Date(p.data_vencimento), hoje)) <= 7)
        .reduce((s, p) => s + (p.valor - (p.valor_pago || 0)), 0),
      d8_15: vencidos.filter(p => { const d = Math.abs(differenceInDays(new Date(p.data_vencimento), hoje)); return d > 7 && d <= 15; })
        .reduce((s, p) => s + (p.valor - (p.valor_pago || 0)), 0),
      d16_30: vencidos.filter(p => { const d = Math.abs(differenceInDays(new Date(p.data_vencimento), hoje)); return d > 15 && d <= 30; })
        .reduce((s, p) => s + (p.valor - (p.valor_pago || 0)), 0),
      d30plus: vencidos.filter(p => Math.abs(differenceInDays(new Date(p.data_vencimento), hoje)) > 30)
        .reduce((s, p) => s + (p.valor - (p.valor_pago || 0)), 0),
    };

    const pagosMesAtual = pagos.filter(p => p.data_pagamento && new Date(p.data_pagamento) >= mesAtual)
      .reduce((s, p) => s + p.valor, 0);

    return {
      pendentes: pendentes.length, vencidos: vencidos.length, venceHoje: venceHoje.length,
      vence7d: vence7d.length, dpo, onTimeRate, valorPendente, valorVencido,
      forecast30, forecast60, forecast90, aging, pagosMesAtual,
    };
  }, [pagamentos]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        <ExecutiveMetricCard title="Pending" value={kpis.pendentes} icon={Clock} subtitle={formatCurrency(kpis.valorPendente)} delay={0} />
        <ExecutiveMetricCard title="Overdue" value={kpis.vencidos} icon={AlertTriangle} subtitle={formatCurrency(kpis.valorVencido)} delay={1} urgent={kpis.vencidos} />
        <ExecutiveMetricCard title="Paid (Month)" value={kpis.pagosMesAtual} icon={CheckCircle2} format="currency" delay={2} />
        <ExecutiveMetricCard title="DPO" value={kpis.dpo} icon={Timer} subtitle="Avg days to pay" delay={3} />
        <ExecutiveMetricCard title="On Time" value={kpis.onTimeRate} icon={Percent} format="percent" delay={4} />
        <ExecutiveMetricCard title="Due Today" value={kpis.venceHoje} icon={Calendar} subtitle={`+${kpis.vence7d} in 7 days`} delay={5} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="rounded-[2rem] border-white/5 bg-white/[0.03] backdrop-blur-2xl overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-white/5 flex items-center gap-3">
             <BarChart3 className="w-5 h-5 text-violet-400" />
             <h3 className="font-black uppercase tracking-tight text-white">Aging Report (Overdue)</h3>
          </div>
          <CardContent className="p-8 space-y-6">
            {[
              { label: "0-7 days", value: kpis.aging.d0_7, color: "bg-amber-400" },
              { label: "8-15 days", value: kpis.aging.d8_15, color: "bg-amber-500" },
              { label: "16-30 days", value: kpis.aging.d16_30, color: "bg-rose-500" },
              { label: "30+ days", value: kpis.aging.d30plus, color: "bg-rose-700" },
            ].map((bucket) => {
              const total = kpis.valorVencido || 1;
              const pct = (bucket.value / total) * 100;
              return (
                <div key={bucket.label} className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                    <span className="text-zinc-500">{bucket.label}</span>
                    <span className="text-zinc-300">{formatCurrency(bucket.value)}</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      className={cn("h-full", bucket.color)} 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(pct, 100)}%` }}
                      transition={{ duration: 1.5, ease: "circOut" }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-white/5 bg-white/[0.03] backdrop-blur-2xl overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-white/5 flex items-center gap-3">
             <TrendingUp className="w-5 h-5 text-emerald-400" />
             <h3 className="font-black uppercase tracking-tight text-white">Cash Out Forecast</h3>
          </div>
          <CardContent className="p-8 space-y-5">
            {[
              { label: "Next 30 days", value: kpis.forecast30, color: "text-emerald-400" },
              { label: "31-60 days", value: kpis.forecast60, color: "text-violet-400" },
              { label: "61-90 days", value: kpis.forecast90, color: "text-fuchsia-400" },
            ].map((period) => (
              <div key={period.label} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 transition-all hover:bg-white/[0.04]">
                <span className="text-xs font-black uppercase tracking-widest text-zinc-500">{period.label}</span>
                <span className={cn("text-base font-black tracking-tighter", period.color)}>{formatCurrency(period.value)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-6 mt-2 border-t border-white/5">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Total 90-Day Outlook</span>
              <span className="text-xl font-black text-white tracking-tighter">
                {formatCurrency(kpis.forecast30 + kpis.forecast60 + kpis.forecast90)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

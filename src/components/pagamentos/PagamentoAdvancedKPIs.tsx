import { useMemo } from "react";
import { Card } from "@/components/ui/card";
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
import { format } from "date-fns/format";
import type { Pagamento } from "@/hooks/usePagamentos";

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

    // DPO - Days Payable Outstanding
    const pagosComDatas = pagos.filter(p => p.data_pagamento && p.data_vencimento);
    const dpo = pagosComDatas.length > 0
      ? Math.round(pagosComDatas.reduce((sum, p) => {
          const venc = new Date(p.data_vencimento);
          const pgto = new Date(p.data_pagamento!);
          return sum + differenceInDays(pgto, venc);
        }, 0) / pagosComDatas.length)
      : 0;

    // % On Time
    const onTime = pagosComDatas.filter(p => p.data_pagamento! <= p.data_vencimento).length;
    const onTimeRate = pagosComDatas.length > 0 ? Math.round((onTime / pagosComDatas.length) * 100) : 100;

    // Valor pendente
    const valorPendente = pendentes.reduce((s, p) => s + (p.valor - (p.valor_pago || 0)), 0);
    const valorVencido = vencidos.reduce((s, p) => s + (p.valor - (p.valor_pago || 0)), 0);
    const valorPago = pagos.reduce((s, p) => s + p.valor, 0);

    // Forecast 30/60/90 dias
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

    // Aging buckets
    const aging = {
      current: pendentes.filter(p => differenceInDays(new Date(p.data_vencimento), hoje) > 0)
        .reduce((s, p) => s + (p.valor - (p.valor_pago || 0)), 0),
      d0_7: vencidos.filter(p => Math.abs(differenceInDays(new Date(p.data_vencimento), hoje)) <= 7)
        .reduce((s, p) => s + (p.valor - (p.valor_pago || 0)), 0),
      d8_15: vencidos.filter(p => { const d = Math.abs(differenceInDays(new Date(p.data_vencimento), hoje)); return d > 7 && d <= 15; })
        .reduce((s, p) => s + (p.valor - (p.valor_pago || 0)), 0),
      d16_30: vencidos.filter(p => { const d = Math.abs(differenceInDays(new Date(p.data_vencimento), hoje)); return d > 15 && d <= 30; })
        .reduce((s, p) => s + (p.valor - (p.valor_pago || 0)), 0),
      d30plus: vencidos.filter(p => Math.abs(differenceInDays(new Date(p.data_vencimento), hoje)) > 30)
        .reduce((s, p) => s + (p.valor - (p.valor_pago || 0)), 0),
    };

    // MoM comparison
    const pagosMesAtual = pagos.filter(p => p.data_pagamento && new Date(p.data_pagamento) >= mesAtual)
      .reduce((s, p) => s + p.valor, 0);
    const pagosMesAnterior = pagos.filter(p => p.data_pagamento && new Date(p.data_pagamento) >= mesAnterior && new Date(p.data_pagamento) <= fimMesAnterior)
      .reduce((s, p) => s + p.valor, 0);
    const momVariation = pagosMesAnterior > 0 ? ((pagosMesAtual - pagosMesAnterior) / pagosMesAnterior * 100) : 0;

    return {
      pendentes: pendentes.length, vencidos: vencidos.length, venceHoje: venceHoje.length,
      vence7d: vence7d.length, dpo, onTimeRate, valorPendente, valorVencido, valorPago,
      forecast30, forecast60, forecast90, aging, pagosMesAtual, momVariation,
    };
  }, [pagamentos]);

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-4">
      {/* Row 1: Main KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-md bg-warning/10"><Clock className="h-4 w-4 text-warning" /></div>
            <span className="text-xs text-muted-foreground">Pendentes</span>
          </div>
          <p className="text-xl font-bold">{kpis.pendentes}</p>
          <p className="text-xs text-muted-foreground">{fmt(kpis.valorPendente)}</p>
        </Card>

        <Card className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-md bg-destructive/10"><AlertTriangle className="h-4 w-4 text-destructive" /></div>
            <span className="text-xs text-muted-foreground">Vencidos</span>
          </div>
          <p className="text-xl font-bold text-destructive">{kpis.vencidos}</p>
          <p className="text-xs text-destructive">{fmt(kpis.valorVencido)}</p>
        </Card>

        <Card className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-md bg-success/10"><CheckCircle2 className="h-4 w-4 text-success" /></div>
            <span className="text-xs text-muted-foreground">Pago (Mês)</span>
          </div>
          <p className="text-xl font-bold text-success">{fmt(kpis.pagosMesAtual)}</p>
          <div className="flex items-center gap-1 text-xs">
            {kpis.momVariation >= 0 
              ? <TrendingUp className="h-3 w-3 text-destructive" />
              : <TrendingDown className="h-3 w-3 text-success" />
            }
            <span className={kpis.momVariation >= 0 ? "text-destructive" : "text-success"}>
              {Math.abs(kpis.momVariation).toFixed(1)}% MoM
            </span>
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-md bg-info/10"><Timer className="h-4 w-4 text-info" /></div>
            <span className="text-xs text-muted-foreground">DPO</span>
          </div>
          <p className="text-xl font-bold">{kpis.dpo}d</p>
          <p className="text-xs text-muted-foreground">Dias para pagar</p>
        </Card>

        <Card className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-md bg-purple-500/10"><Percent className="h-4 w-4 text-purple-600" /></div>
            <span className="text-xs text-muted-foreground">No Prazo</span>
          </div>
          <p className="text-xl font-bold">{kpis.onTimeRate}%</p>
          <Progress value={kpis.onTimeRate} className="h-1.5 mt-1" />
        </Card>

        <Card className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-md bg-warning/10"><Calendar className="h-4 w-4 text-warning" /></div>
            <span className="text-xs text-muted-foreground">Vence Hoje</span>
          </div>
          <p className="text-xl font-bold text-warning">{kpis.venceHoje}</p>
          <p className="text-xs text-muted-foreground">+{kpis.vence7d} em 7 dias</p>
        </Card>
      </div>

      {/* Row 2: Aging + Forecast */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Aging Report */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Aging Report (Vencidos)</span>
          </div>
          <div className="space-y-2">
            {[
              { label: "0-7 dias", value: kpis.aging.d0_7, color: "bg-warning" },
              { label: "8-15 dias", value: kpis.aging.d8_15, color: "bg-warning" },
              { label: "16-30 dias", value: kpis.aging.d16_30, color: "bg-destructive" },
              { label: "30+ dias", value: kpis.aging.d30plus, color: "bg-red-700" },
            ].map((bucket) => {
              const total = kpis.valorVencido || 1;
              const pct = (bucket.value / total) * 100;
              return (
                <div key={bucket.label} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-16">{bucket.label}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${bucket.color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <span className="text-xs font-medium w-24 text-right">{fmt(bucket.value)}</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Forecast */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Forecast de Saída</span>
          </div>
          <div className="space-y-3">
            {[
              { label: "Próx. 30 dias", value: kpis.forecast30, color: "text-info" },
              { label: "31-60 dias", value: kpis.forecast60, color: "text-purple-600" },
              { label: "61-90 dias", value: kpis.forecast90, color: "text-indigo-600" },
            ].map((period) => (
              <div key={period.label} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <span className="text-sm text-muted-foreground">{period.label}</span>
                <span className={`text-sm font-bold ${period.color}`}>{fmt(period.value)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm font-medium">Total 90 dias</span>
              <span className="text-base font-bold text-primary">
                {fmt(kpis.forecast30 + kpis.forecast60 + kpis.forecast90)}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

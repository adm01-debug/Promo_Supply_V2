import { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  FileCheck,
  Target,
  PieChart,
  BarChart3,
  Clock,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  RefreshCw
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  Area,
  AreaChart
} from "recharts";
import { cn } from "@/lib/utils";
import { useKPITargetsStore, checkKPIStatus } from "@/stores/kpiTargetsStore";
import { KPITargetsConfig } from "./KPITargetsConfig";
import { KPIAlertsPanel } from "./KPIAlertsPanel";
import { useToast } from "@/hooks/use-toast";

// Mock data for KPIs
const kpiData = {
  procurementROI: {
    current: 4.2,
    previous: 3.8,
    target: 5.0,
    savings: 284500,
    investment: 67738
  },
  maverickSpend: {
    total: 1250000,
    maverick: 187500,
    percentage: 15,
    target: 10,
    byCategory: [
      { name: "TI", value: 45000, percentage: 24 },
      { name: "Marketing", value: 38000, percentage: 20 },
      { name: "Facilities", value: 52500, percentage: 28 },
      { name: "Outros", value: 52000, percentage: 28 }
    ]
  },
  contractCompliance: {
    percentage: 78,
    target: 90,
    contracts: 45,
    compliant: 35,
    expiring: 8,
    expired: 2
  },
  costAvoidance: {
    total: 156800,
    negotiated: 89400,
    competitive: 45200,
    standardization: 22200
  },
  poCycleTime: {
    current: 3.2,
    target: 2.0,
    trend: [
      { month: "Jul", days: 4.5 },
      { month: "Ago", days: 4.2 },
      { month: "Set", days: 3.8 },
      { month: "Out", days: 3.5 },
      { month: "Nov", days: 3.4 },
      { month: "Dez", days: 3.2 }
    ]
  },
  supplierConcentration: {
    top5Percentage: 68,
    herfindahlIndex: 0.12,
    risk: "medium",
    suppliers: [
      { name: "XBZ Brindes", percentage: 32 },
      { name: "Stricker", percentage: 15 },
      { name: "Asia Import", percentage: 10 },
      { name: "Só Marcas", percentage: 6 },
      { name: "Tech Solutions", percentage: 5 }
    ]
  },
  firstTimeMatchRate: {
    current: 87,
    target: 95,
    invoices: 234,
    matched: 204,
    exceptions: 30
  },
  savingsRealization: {
    projected: 450000,
    realized: 312000,
    percentage: 69,
    byQuarter: [
      { quarter: "Q1", projected: 100000, realized: 78000 },
      { quarter: "Q2", projected: 120000, realized: 95000 },
      { quarter: "Q3", projected: 115000, realized: 82000 },
      { quarter: "Q4", projected: 115000, realized: 57000 }
    ]
  }
};

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const TrendBadge = ({ current, previous }: { current: number; previous: number }) => {
  const diff = ((current - previous) / previous) * 100;
  if (diff > 0) {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
        <ArrowUpRight className="w-3 h-3 mr-1" />
        +{diff.toFixed(1)}%
      </Badge>
    );
  }
  if (diff < 0) {
    return (
      <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
        <ArrowDownRight className="w-3 h-3 mr-1" />
        {diff.toFixed(1)}%
      </Badge>
    );
  }
  return (
    <Badge className="bg-muted text-muted-foreground">
      <Minus className="w-3 h-3 mr-1" />
      0%
    </Badge>
  );
};

export const AdvancedProcurementKPIs = () => {
  const [period, setPeriod] = useState("30");
  const { targets, addAlert } = useKPITargetsStore();
  const { toast } = useToast();

  // Check KPIs against targets and generate alerts
  const checkAllKPIs = () => {
    const kpiChecks = [
      { id: 'procurement_roi', value: kpiData.procurementROI.current, isInverse: false },
      { id: 'maverick_spend', value: kpiData.maverickSpend.percentage, isInverse: true },
      { id: 'contract_compliance', value: kpiData.contractCompliance.percentage, isInverse: false },
      { id: 'cost_avoidance', value: kpiData.costAvoidance.total, isInverse: false },
      { id: 'po_cycle_time', value: kpiData.poCycleTime.current, isInverse: true },
      { id: 'supplier_concentration', value: kpiData.supplierConcentration.top5Percentage, isInverse: true },
      { id: 'first_time_match', value: kpiData.firstTimeMatchRate.current, isInverse: false },
      { id: 'savings_realization', value: kpiData.savingsRealization.percentage, isInverse: false },
    ];

    let alertsGenerated = 0;

    kpiChecks.forEach(({ id, value, isInverse }) => {
      const target = targets.find(t => t.id === id);
      if (!target || !target.enabled) return;

      const { status } = checkKPIStatus(id, value, target, isInverse);
      
      if (status !== 'success') {
        addAlert({
          kpiId: id,
          kpiName: target.name,
          type: status,
          message: status === 'critical' 
            ? `KPI crítico! Valor atual ${value.toFixed(1)}${target.unit} está muito abaixo da meta ${target.target}${target.unit}`
            : `Atenção: ${value.toFixed(1)}${target.unit} está abaixo da meta ${target.target}${target.unit}`,
          currentValue: value,
          targetValue: target.target
        });
        alertsGenerated++;
      }
    });

    toast({
      title: "Verificação Concluída",
      description: alertsGenerated > 0 
        ? `${alertsGenerated} alerta(s) gerado(s)` 
        : "Todos os KPIs estão dentro das metas",
    });
  };

  // Get status indicator for a KPI card
  const getKPIStatusIndicator = (kpiId: string, currentValue: number, isInverse: boolean = false) => {
    const target = targets.find(t => t.id === kpiId);
    if (!target || !target.enabled) return null;
    
    const { status } = checkKPIStatus(kpiId, currentValue, target, isInverse);
    
    if (status === 'success') return null;
    
    return (
      <div className={cn(
        "absolute top-2 right-2 w-2 h-2 rounded-full animate-pulse",
        status === 'critical' && "bg-red-500",
        status === 'warning' && "bg-amber-500"
      )} />
    );
  };

  return (
    <div className="space-y-6">
      {/* Period Filter & Actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
            <SelectItem value="365">Último ano</SelectItem>
          </SelectContent>
        </Select>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={checkAllKPIs} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Verificar KPIs
          </Button>
          <KPIAlertsPanel />
          <KPITargetsConfig />
        </div>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Procurement ROI */}
        <Card className="p-5 relative">
          {getKPIStatusIndicator('procurement_roi', kpiData.procurementROI.current, false)}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">ROI Procurement</span>
            </div>
            <TrendBadge current={kpiData.procurementROI.current} previous={kpiData.procurementROI.previous} />
          </div>
          <p className="text-3xl font-bold text-foreground">{kpiData.procurementROI.current}x</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Meta: {targets.find(t => t.id === 'procurement_roi')?.target || kpiData.procurementROI.target}x</span>
            <Progress 
              value={(kpiData.procurementROI.current / (targets.find(t => t.id === 'procurement_roi')?.target || kpiData.procurementROI.target)) * 100} 
              className="h-1.5 flex-1"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Economia: R$ {kpiData.procurementROI.savings.toLocaleString('pt-BR')}
          </p>
        </Card>

        {/* Maverick Spend */}
        <Card className="p-5 border-amber-500/30 relative">
          {getKPIStatusIndicator('maverick_spend', kpiData.maverickSpend.percentage, true)}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Maverick Spend</span>
            </div>
            <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">
              Meta: {targets.find(t => t.id === 'maverick_spend')?.target || kpiData.maverickSpend.target}%
            </Badge>
          </div>
          <p className="text-3xl font-bold text-amber-500">{kpiData.maverickSpend.percentage}%</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">R$ {kpiData.maverickSpend.maverick.toLocaleString('pt-BR')}</span>
            <Progress 
              value={kpiData.maverickSpend.percentage} 
              className="h-1.5 flex-1 [&>div]:bg-amber-500"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            do total de R$ {kpiData.maverickSpend.total.toLocaleString('pt-BR')}
          </p>
        </Card>

        {/* Contract Compliance */}
        <Card className="p-5 relative">
          {getKPIStatusIndicator('contract_compliance', kpiData.contractCompliance.percentage, false)}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileCheck className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Contract Compliance</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {kpiData.contractCompliance.compliant}/{kpiData.contractCompliance.contracts}
            </Badge>
          </div>
          <p className="text-3xl font-bold text-foreground">{kpiData.contractCompliance.percentage}%</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Meta: {targets.find(t => t.id === 'contract_compliance')?.target || kpiData.contractCompliance.target}%</span>
            <Progress 
              value={kpiData.contractCompliance.percentage} 
              className="h-1.5 flex-1"
            />
          </div>
          <div className="flex gap-2 mt-2">
            <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-500">
              {kpiData.contractCompliance.expiring} expirando
            </Badge>
            <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-500">
              {kpiData.contractCompliance.expired} expirados
            </Badge>
          </div>
        </Card>

        {/* Cost Avoidance */}
        <Card className="p-5 relative">
          {getKPIStatusIndicator('cost_avoidance', kpiData.costAvoidance.total, false)}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-500" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Cost Avoidance</span>
            </div>
            <Badge variant="outline" className="text-[10px]">
              Meta: R$ {((targets.find(t => t.id === 'cost_avoidance')?.target || 150000) / 1000).toFixed(0)}k
            </Badge>
          </div>
          <p className="text-3xl font-bold text-emerald-500">
            R$ {(kpiData.costAvoidance.total / 1000).toFixed(0)}k
          </p>
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Negociação</span>
              <span className="text-foreground">R$ {kpiData.costAvoidance.negotiated.toLocaleString('pt-BR')}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Competitivo</span>
              <span className="text-foreground">R$ {kpiData.costAvoidance.competitive.toLocaleString('pt-BR')}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Padronização</span>
              <span className="text-foreground">R$ {kpiData.costAvoidance.standardization.toLocaleString('pt-BR')}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Secondary KPIs Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* PO Cycle Time */}
        <Card className="p-5 relative">
          {getKPIStatusIndicator('po_cycle_time', kpiData.poCycleTime.current, true)}
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-foreground">PO Cycle Time</span>
          </div>
          <div className="flex items-end gap-2">
            <p className="text-2xl font-bold text-foreground">{kpiData.poCycleTime.current}</p>
            <p className="text-sm text-muted-foreground mb-0.5">dias</p>
            <Badge className="ml-auto bg-emerald-500/10 text-emerald-500 text-[10px]">
              Meta: {targets.find(t => t.id === 'po_cycle_time')?.target || kpiData.poCycleTime.target}d
            </Badge>
          </div>
          <div className="h-24 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={kpiData.poCycleTime.trend}>
                <defs>
                  <linearGradient id="colorDays" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area 
                  type="monotone" 
                  dataKey="days" 
                  stroke="hsl(var(--primary))" 
                  fill="url(#colorDays)"
                  strokeWidth={2}
                />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Supplier Concentration */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <PieChart className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-foreground">Concentração de Fornecedores</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-24 h-24">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={kpiData.supplierConcentration.suppliers}
                    cx="50%"
                    cy="50%"
                    innerRadius={25}
                    outerRadius={40}
                    paddingAngle={2}
                    dataKey="percentage"
                  >
                    {kpiData.supplierConcentration.suppliers.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </RechartsPie>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-1">
              {kpiData.supplierConcentration.suppliers.slice(0, 4).map((s, i) => (
                <div key={s.name} className="flex items-center gap-2 text-xs">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-muted-foreground truncate flex-1">{s.name}</span>
                  <span className="font-medium">{s.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-border flex justify-between text-xs">
            <span className="text-muted-foreground">Top 5 concentram</span>
            <Badge variant={kpiData.supplierConcentration.top5Percentage > 70 ? "destructive" : "secondary"}>
              {kpiData.supplierConcentration.top5Percentage}%
            </Badge>
          </div>
        </Card>

        {/* First-Time Match Rate */}
        <Card className="p-5 relative">
          {getKPIStatusIndicator('first_time_match', kpiData.firstTimeMatchRate.current, false)}
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-foreground">First-Time Match Rate</span>
          </div>
          <div className="flex items-end gap-2">
            <p className="text-2xl font-bold text-foreground">{kpiData.firstTimeMatchRate.current}%</p>
            <Badge className="ml-auto bg-primary/10 text-primary text-[10px]">
              Meta: {targets.find(t => t.id === 'first_time_match')?.target || kpiData.firstTimeMatchRate.target}%
            </Badge>
          </div>
          <Progress 
            value={kpiData.firstTimeMatchRate.current} 
            className="h-2 mt-3"
          />
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded bg-emerald-500/10 text-center">
              <p className="font-bold text-emerald-500">{kpiData.firstTimeMatchRate.matched}</p>
              <p className="text-muted-foreground">Matched</p>
            </div>
            <div className="p-2 rounded bg-red-500/10 text-center">
              <p className="font-bold text-red-500">{kpiData.firstTimeMatchRate.exceptions}</p>
              <p className="text-muted-foreground">Exceções</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Maverick Spend by Category */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Maverick Spend por Categoria
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kpiData.maverickSpend.byCategory} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" tickFormatter={(v) => `R$ ${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" width={80} />
                <Tooltip 
                  formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Valor']}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="value" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Savings Realization */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            Savings Realization
          </h3>
          <div className="flex items-center gap-4 mb-4">
            <div>
              <p className="text-xs text-muted-foreground">Projetado</p>
              <p className="text-lg font-bold text-foreground">
                R$ {(kpiData.savingsRealization.projected / 1000).toFixed(0)}k
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Realizado</p>
              <p className="text-lg font-bold text-emerald-500">
                R$ {(kpiData.savingsRealization.realized / 1000).toFixed(0)}k
              </p>
            </div>
            <Badge className={cn(
              "ml-auto",
              kpiData.savingsRealization.percentage >= 80 
                ? "bg-emerald-500/10 text-emerald-500" 
                : "bg-amber-500/10 text-amber-500"
            )}>
              {kpiData.savingsRealization.percentage}% realizado
            </Badge>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kpiData.savingsRealization.byQuarter}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="quarter" />
                <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip 
                  formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, '']}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar dataKey="projected" name="Projetado" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="realized" name="Realizado" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
};

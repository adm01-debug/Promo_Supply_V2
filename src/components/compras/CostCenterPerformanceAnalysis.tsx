import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, TrendingDown, TrendingUp, AlertTriangle, 
  Search, Download, BarChart3, PieChart as PieIcon,
  Building2, CheckCircle2, Wallet
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
  PieChart, Pie
} from 'recharts';
import { Button } from "@/components/ui/button";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export const CostCenterPerformanceAnalysis = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: report = [], isLoading } = useQuery({
    queryKey: ['cost-center-performance-report'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_cost_center_performance_report');
      if (error) throw error;
      return data as any[];
    }
  });

  const filteredReport = useMemo(() => {
    return report.filter(item => 
      item.cost_center_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.cost_center_code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [report, searchTerm]);

  const pieData = useMemo(() => {
    return report
      .slice(0, 5)
      .map(item => ({
        name: item.cost_center_name,
        value: Number(item.total_used) + Number(item.total_committed)
      }));
  }, [report]);

  const totals = useMemo(() => ({
    budget: report.reduce((s, r) => s + Number(r.total_budget), 0),
    used: report.reduce((s, r) => s + Number(r.total_used), 0),
    committed: report.reduce((s, r) => s + Number(r.total_committed), 0),
    available: report.reduce((s, r) => s + Number(r.available_balance), 0),
    alerts: report.filter(r => r.usage_percentage > 90).length
  }), [report]);

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Wallet className="w-3.5 h-3.5" /> Orçamento Global
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(totals.budget)}</div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-warning" /> Comprometido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-warning">{formatCurrency(totals.committed)}</div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-success" /> Realizado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-success">{formatCurrency(totals.used)}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-l-4 border-destructive">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-destructive" /> Centros em Alerta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-destructive">{totals.alerts}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" /> Top 10 Consumo por Unidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={report.slice(0, 10)} margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="cost_center_name" type="category" fontSize={11} width={100} axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                    formatter={(val: number) => formatCurrency(val)}
                  />
                  <Bar dataKey="total_used" name="Realizado" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-primary" /> Distribuição de Gastos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: number) => formatCurrency(val)} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" /> Performance Detalhada
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="relative w-48 sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input 
                className="pl-8 h-8 text-xs" 
                placeholder="Filtrar centro de custo..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
              <Download className="w-3.5 h-3.5" /> Exportar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-xs">Centro de Custo</TableHead>
                  <TableHead className="text-xs">Orçamento</TableHead>
                  <TableHead className="text-xs">Comprometido</TableHead>
                  <TableHead className="text-xs">Realizado</TableHead>
                  <TableHead className="text-xs">Disponível</TableHead>
                  <TableHead className="text-xs w-[180px]">Utilização</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReport.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-xs">
                      Nenhum resultado encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReport.map((row) => (
                    <TableRow key={row.cost_center_id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="font-medium text-xs">{row.cost_center_name}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{row.cost_center_code}</div>
                      </TableCell>
                      <TableCell className="text-xs">{formatCurrency(row.total_budget)}</TableCell>
                      <TableCell className="text-xs text-warning">{formatCurrency(row.total_committed)}</TableCell>
                      <TableCell className="text-xs text-success font-medium">{formatCurrency(row.total_used)}</TableCell>
                      <TableCell className={`text-xs ${row.available_balance < 0 ? 'text-destructive font-bold' : ''}`}>
                        {formatCurrency(row.available_balance)}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-bold">
                            <span className={row.usage_percentage > 90 ? 'text-destructive' : ''}>
                              {row.usage_percentage.toFixed(1)}%
                            </span>
                            {row.usage_percentage > 100 && <Badge variant="destructive" className="h-3.5 px-1 text-[8px] animate-pulse">OVER</Badge>}
                          </div>
                          <Progress 
                            value={Math.min(row.usage_percentage, 100)} 
                            className={`h-1.5 ${row.usage_percentage > 90 ? '[&>div]:bg-destructive' : ''}`} 
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

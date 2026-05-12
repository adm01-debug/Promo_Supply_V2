import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingDown, TrendingUp, AlertTriangle } from "lucide-react";

export const CostCenterPerformanceAnalysis = () => {
  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ['cost-center-performance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('department_budgets')
        .select(`
          *,
          cost_center:cost_centers(name, code, manager:profiles(full_name))
        `)
        .eq('ano', new Date().getFullYear());
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Orçado (Anual)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {budgets.reduce((s, b) => s + Number(b.valor_total), 0).toLocaleString('pt-BR')}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Comprometido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              R$ {budgets.reduce((s, b) => s + Number(b.valor_comprometido), 0).toLocaleString('pt-BR')}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Utilizado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">
              R$ {budgets.reduce((s, b) => s + Number(b.valor_utilizado), 0).toLocaleString('pt-BR')}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Desempenho por Centro de Custo</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Centro de Custo</TableHead>
                <TableHead>Gestor</TableHead>
                <TableHead>Orçado</TableHead>
                <TableHead>Utilizado + Comprometido</TableHead>
                <TableHead>Progresso</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {budgets.map((budget: any) => {
                const totalUsed = Number(budget.valor_utilizado) + Number(budget.valor_comprometido);
                const percent = budget.valor_total > 0 ? (totalUsed / budget.valor_total) * 100 : 0;
                
                return (
                  <TableRow key={budget.id}>
                    <TableCell>
                      <div className="font-medium">{budget.cost_center?.name}</div>
                      <div className="text-xs text-muted-foreground">{budget.cost_center?.code}</div>
                    </TableCell>
                    <TableCell>{budget.cost_center?.manager?.full_name || 'N/A'}</TableCell>
                    <TableCell>R$ {Number(budget.valor_total).toLocaleString('pt-BR')}</TableCell>
                    <TableCell>R$ {totalUsed.toLocaleString('pt-BR')}</TableCell>
                    <TableCell className="w-[200px]">
                      <div className="space-y-1">
                        <Progress value={percent} className={percent > 90 ? "bg-destructive/20" : ""} />
                        <span className="text-xs text-muted-foreground">{Math.round(percent)}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {percent > 100 ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="w-3 h-3" /> Excedido
                        </Badge>
                      ) : percent > 80 ? (
                        <Badge variant="outline" className="text-orange-500 border-orange-500 gap-1">
                          <TrendingUp className="w-3 h-3" /> Alerta
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-emerald-500 border-emerald-500 gap-1">
                          <TrendingDown className="w-3 h-3" /> Saudável
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

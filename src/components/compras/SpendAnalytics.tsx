import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid,
  Legend
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Layers, Info } from "lucide-react";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

export const SpendAnalytics = () => {
  const { data: spendByUnspsc, isLoading } = useQuery({
    queryKey: ["spend-by-unspsc"],
    queryFn: async () => {
      // For MVP, we simulate some data by joining pedido_itens with unspsc_codes
      // Real implementation would use real assigned codes
      const { data, error } = await supabase
        .from('pedido_itens')
        .select('valor_total, unspsc:unspsc_codes(nome)');
      
      if (error) throw error;
      
      // Group by unspsc name
      const groups: Record<string, number> = {};
      data?.forEach(item => {
        const name = (item.unspsc as any)?.nome || 'Não Classificado';
        groups[name] = (groups[name] || 0) + Number(item.valor_total || 0);
      });

      return Object.entries(groups).map(([name, value]) => ({ name, value }));
    }
  });

  if (isLoading) return <Skeleton className="h-[400px] w-full" />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              Gasto por Taxonomia UNSPSC
            </h3>
            <Badge variant="outline">World-Class Standard</Badge>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={spendByUnspsc}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {spendByUnspsc?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => `R$ ${value.toLocaleString('pt-BR')}`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold flex items-center gap-2">
              Pareto 80/20 por Categoria
            </h3>
            <Info className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spendByUnspsc?.sort((a, b) => b.value - a.value)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="name" fontSize={10} hide />
                <YAxis fontSize={10} tickFormatter={(val) => `R$ ${val/1000}k`} />
                <Tooltip formatter={(value: any) => `R$ ${value.toLocaleString('pt-BR')}`} />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">Detalhamento Taxonômico</h3>
        <div className="space-y-2">
          {spendByUnspsc?.sort((a,b) => b.value - a.value).map((item, i) => (
            <div key={i} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-sm font-medium">{item.name}</span>
              </div>
              <div className="flex items-center gap-8">
                <span className="text-sm font-bold">R$ {item.value.toLocaleString('pt-BR')}</span>
                <Badge variant="secondary">{((item.value / spendByUnspsc.reduce((a,b) => a + b.value, 0)) * 100).toFixed(1)}%</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
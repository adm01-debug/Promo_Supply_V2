import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GitCompare, AlertCircle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { formatCurrency } from './executiveDashboardData';

const priceVarianceData = [
  { item: 'Notebook Dell', minPrice: 4500, maxPrice: 5800, variance: 28.8, avgPrice: 5150 },
  { item: 'Cadeira Ergonômica', minPrice: 850, maxPrice: 1200, variance: 41.1, avgPrice: 1025 },
  { item: 'Papel A4 (Cx)', minPrice: 180, maxPrice: 210, variance: 16.6, avgPrice: 195 },
  { item: 'Licença Software', minPrice: 1200, maxPrice: 1250, variance: 4.1, avgPrice: 1225 },
  { item: 'Monitor 24"', minPrice: 750, maxPrice: 950, variance: 26.6, avgPrice: 850 },
];

export const PriceVarianceAnalysis = () => {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <GitCompare className="h-5 w-5 text-primary" />
          Análise de Variação de Preço (SKU)
        </CardTitle>
        <p className="text-xs text-muted-foreground">Comparativo de menor vs maior preço por item no período</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={priceVarianceData} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
            <XAxis type="number" hide />
            <YAxis 
              dataKey="item" 
              type="category" 
              className="text-[10px]" 
              width={100}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-background border border-border p-2 rounded shadow-md text-xs">
                      <p className="font-bold mb-1">{data.item}</p>
                      <p>Mín: {formatCurrency(data.minPrice)}</p>
                      <p>Máx: {formatCurrency(data.maxPrice)}</p>
                      <p className="text-primary font-semibold mt-1">Variação: {data.variance}%</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="variance" name="Variação %" radius={[0, 4, 4, 0]}>
              {priceVarianceData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.variance > 30 ? 'hsl(var(--destructive))' : entry.variance > 15 ? 'hsl(var(--warning))' : 'hsl(var(--primary))'} 
                  fillOpacity={0.8}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        
        <div className="mt-4 flex items-start gap-2 p-2 bg-muted/30 rounded-lg border border-border/50">
          <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <p className="text-[10px] leading-tight text-muted-foreground">
            <strong>Oportunidade:</strong> Itens como "Cadeira Ergonômica" apresentam variação superior a 40%. Centralizar compras nestes itens pode gerar um saving adicional estimado de 15%.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
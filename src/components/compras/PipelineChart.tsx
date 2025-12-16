import { cn } from "@/lib/utils";

interface PipelineData {
  solicitacao: number;
  cotacao: number;
  pedido: number;
  pagamento: number;
  transito: number;
  entregue: number;
}

interface PipelineChartProps {
  data: PipelineData;
}

const stages = [
  { key: 'solicitacao', label: 'Solicitação', color: 'bg-emerald-500' },
  { key: 'cotacao', label: 'Cotação', color: 'bg-yellow-500' },
  { key: 'pedido', label: 'Pedido', color: 'bg-blue-500' },
  { key: 'pagamento', label: 'Pagamento', color: 'bg-orange-500' },
  { key: 'transito', label: 'Trânsito', color: 'bg-purple-500' },
  { key: 'entregue', label: 'Entregue', color: 'bg-green-600' },
] as const;

export const PipelineChart = ({ data }: PipelineChartProps) => {
  const maxValue = Math.max(...Object.values(data));
  
  return (
    <div className="space-y-4">
      {/* Bar Chart */}
      <div className="flex items-end gap-2 h-40">
        {stages.map((stage) => {
          const value = data[stage.key];
          const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
          
          return (
            <div key={stage.key} className="flex-1 flex flex-col items-center gap-2">
              <span className="text-sm font-semibold text-foreground">{value}</span>
              <div className="w-full bg-muted rounded-t-md relative" style={{ height: '120px' }}>
                <div 
                  className={cn("absolute bottom-0 left-0 right-0 rounded-t-md transition-all duration-500", stage.color)}
                  style={{ height: `${height}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Labels */}
      <div className="flex gap-2">
        {stages.map((stage) => (
          <div key={stage.key} className="flex-1 text-center">
            <span className="text-xs text-muted-foreground">{stage.label}</span>
          </div>
        ))}
      </div>

      {/* Legend Pills */}
      <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
        {stages.map((stage) => (
          <div key={stage.key} className="flex items-center gap-1.5">
            <div className={cn("w-3 h-3 rounded-full", stage.color)} />
            <span className="text-xs text-muted-foreground">{stage.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

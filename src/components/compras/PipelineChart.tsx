import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { forwardRef } from "react";

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

// Dark mode aware colors using CSS variables
const stages = [
  { key: 'solicitacao', label: 'Solicitação', bgClass: 'bg-kpi-emerald', glowClass: 'dark:shadow-[0_0_12px_hsl(var(--kpi-emerald)/0.4)]' },
  { key: 'cotacao', label: 'Cotação', bgClass: 'bg-warning', glowClass: 'dark:shadow-[0_0_12px_hsl(var(--warning)/0.4)]' },
  { key: 'pedido', label: 'Pedido', bgClass: 'bg-kpi-blue', glowClass: 'dark:shadow-[0_0_12px_hsl(var(--kpi-blue)/0.4)]' },
  { key: 'pagamento', label: 'Pagamento', bgClass: 'bg-kpi-orange', glowClass: 'dark:shadow-[0_0_12px_hsl(var(--kpi-orange)/0.4)]' },
  { key: 'transito', label: 'Trânsito', bgClass: 'bg-kpi-purple', glowClass: 'dark:shadow-[0_0_12px_hsl(var(--kpi-purple)/0.4)]' },
  { key: 'entregue', label: 'Entregue', bgClass: 'bg-success', glowClass: 'dark:shadow-[0_0_12px_hsl(var(--success)/0.4)]' },
] as const;

export const PipelineChart = ({ data }: PipelineChartProps) => {
  const maxValue = Math.max(...Object.values(data));
  
  return (
    <div className="space-y-4">
      {/* Bar Chart with animations */}
      <div className="flex items-end gap-2 h-40">
        {stages.map((stage, index) => {
          const value = data[stage.key];
          const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
          
          return (
            <motion.div 
              key={stage.key} 
              className="flex-1 flex flex-col items-center gap-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <motion.span 
                className="text-sm font-semibold text-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 + index * 0.05 }}
              >
                {value}
              </motion.span>
              <div className="w-full bg-muted dark:bg-muted/50 rounded-t-md relative" style={{ height: '120px' }}>
                <motion.div 
                  className={cn(
                    "absolute bottom-0 left-0 right-0 rounded-t-md transition-colors duration-300",
                    stage.bgClass,
                    stage.glowClass
                  )}
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
                />
              </div>
            </motion.div>
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

      {/* Legend Pills with hover effects */}
      <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
        {stages.map((stage) => (
          <div 
            key={stage.key} 
            className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-muted/50 transition-colors cursor-default"
          >
            <div className={cn("w-3 h-3 rounded-full", stage.bgClass, stage.glowClass)} />
            <span className="text-xs text-muted-foreground">{stage.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

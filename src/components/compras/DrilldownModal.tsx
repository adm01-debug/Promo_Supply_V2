/**
 * Drill-down Modal Component
 * Modal interativo para explorar dados detalhados dos gráficos
 */

import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import {
  ArrowLeft,
  Download,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DrilldownData {
  title: string;
  subtitle?: string;
  type: 'kpi' | 'chart' | 'category' | 'supplier' | 'status';
  mainValue?: string | number;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
  breakdown?: {
    label: string;
    value: number;
    percentage?: number;
    color?: string;
  }[];
  timeline?: {
    date: string;
    value: number;
  }[];
  items?: {
    id: string;
    title: string;
    subtitle?: string;
    value?: string | number;
    status?: string;
    date?: string;
  }[];
}

interface DrilldownModalProps {
  open: boolean;
  onClose: () => void;
  data: DrilldownData | null;
  onItemClick?: (id: string) => void;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export function DrilldownModal({ open, onClose, data, onItemClick }: DrilldownModalProps) {
  if (!data) return null;

  const TrendIcon = data.trend?.direction === 'up' 
    ? TrendingUp 
    : data.trend?.direction === 'down' 
      ? TrendingDown 
      : Minus;

  const trendColor = data.trend?.direction === 'up' 
    ? 'text-emerald-500' 
    : data.trend?.direction === 'down' 
      ? 'text-rose-500' 
      : 'text-muted-foreground';

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                {data.title}
                {data.trend && (
                  <Badge
                    variant="outline"
                    className={cn('gap-1', trendColor)}
                  >
                    <TrendIcon className="h-3 w-3" />
                    {Math.abs(data.trend.value)}%
                  </Badge>
                )}
              </DialogTitle>
              {data.subtitle && (
                <DialogDescription className="mt-1">
                  {data.subtitle}
                </DialogDescription>
              )}
            </div>
            {data.mainValue && (
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">
                  {typeof data.mainValue === 'number' 
                    ? data.mainValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                    : data.mainValue
                  }
                </div>
                <div className="text-xs text-muted-foreground">Valor total</div>
              </div>
            )}
          </div>
        </DialogHeader>

        <Tabs defaultValue="breakdown" className="p-6 pt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
            <TabsTrigger value="timeline">Evolução</TabsTrigger>
            <TabsTrigger value="items">Detalhes</TabsTrigger>
          </TabsList>

          <TabsContent value="breakdown" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="h-[300px]"
              >
                {data.breakdown && data.breakdown.length > 0 && (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.breakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="label"
                      >
                        {data.breakdown.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color || COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) =>
                          value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                        }
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </motion.div>

              {/* Breakdown List */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {data.breakdown?.map((item, index) => (
                      <motion.div
                        key={item.label}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                      >
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: item.color || COLORS[index % COLORS.length] }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{item.label}</div>
                          {item.percentage !== undefined && (
                            <div className="text-xs text-muted-foreground">
                              {item.percentage.toFixed(1)}% do total
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-semibold">
                            {item.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              </motion.div>
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="mt-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="h-[350px]"
            >
              {data.timeline && data.timeline.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.timeline}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) =>
                        new Intl.NumberFormat('pt-BR', {
                          notation: 'compact',
                          compactDisplay: 'short',
                        }).format(value)
                      }
                    />
                    <Tooltip
                      formatter={(value: number) =>
                        value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </motion.div>
          </TabsContent>

          <TabsContent value="items" className="mt-4">
            <ScrollArea className="h-[350px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {data.items?.map((item, index) => (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => onItemClick?.(item.id)}
                      >
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.title}</div>
                            {item.subtitle && (
                              <div className="text-xs text-muted-foreground">
                                {item.subtitle}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.status && (
                            <Badge variant="outline" className="capitalize">
                              {item.status}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.date}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {item.value}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <div className="p-6 pt-0 flex items-center justify-between border-t bg-muted/30">
          <Button variant="outline" size="sm" onClick={onClose}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filtrar
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook para gerar dados de drill-down a partir de diferentes fontes
export function useDrilldownData() {
  const generateKPIDrilldown = (
    kpiType: 'volume' | 'saving' | 'orders' | 'suppliers',
    data: Record<string, unknown>
  ): DrilldownData => {
    const configs: Record<string, Partial<DrilldownData>> = {
      volume: {
        title: 'Volume de Compras',
        subtitle: 'Detalhamento por categoria e período',
        type: 'kpi',
        breakdown: [
          { label: 'Materiais de Escritório', value: 45000, percentage: 35 },
          { label: 'Equipamentos', value: 32000, percentage: 25 },
          { label: 'Serviços', value: 25000, percentage: 20 },
          { label: 'TI', value: 18000, percentage: 14 },
          { label: 'Outros', value: 8000, percentage: 6 },
        ],
        timeline: [
          { date: 'Jan', value: 98000 },
          { date: 'Fev', value: 102000 },
          { date: 'Mar', value: 115000 },
          { date: 'Abr', value: 108000 },
          { date: 'Mai', value: 125000 },
          { date: 'Jun', value: 128000 },
        ],
      },
      saving: {
        title: 'Economia Gerada',
        subtitle: 'Economia por negociação e categoria',
        type: 'kpi',
        breakdown: [
          { label: 'Negociação Direta', value: 15000, percentage: 45 },
          { label: 'Cotação Múltipla', value: 12000, percentage: 36 },
          { label: 'Contrato Framework', value: 6000, percentage: 19 },
        ],
      },
      orders: {
        title: 'Pedidos Ativos',
        subtitle: 'Status e distribuição de pedidos',
        type: 'kpi',
        breakdown: [
          { label: 'Em Aprovação', value: 12, percentage: 30, color: 'hsl(48, 96%, 53%)' },
          { label: 'Em Trânsito', value: 18, percentage: 45, color: 'hsl(217, 91%, 60%)' },
          { label: 'Pendentes', value: 10, percentage: 25, color: 'hsl(0, 84%, 60%)' },
        ],
      },
      suppliers: {
        title: 'Fornecedores Ativos',
        subtitle: 'Performance e distribuição',
        type: 'kpi',
        breakdown: [
          { label: 'Avaliação A', value: 25, percentage: 50, color: 'hsl(142, 71%, 45%)' },
          { label: 'Avaliação B', value: 18, percentage: 36, color: 'hsl(48, 96%, 53%)' },
          { label: 'Avaliação C', value: 7, percentage: 14, color: 'hsl(0, 84%, 60%)' },
        ],
      },
    };

    return {
      ...configs[kpiType],
      mainValue: data.value as number | undefined,
      trend: data.trend as { value: number; direction: 'up' | 'down' | 'neutral' } | undefined,
      items: [
        { id: '1', title: 'PED-2024-001', subtitle: 'Fornecedor ABC', value: 'R$ 15.000', status: 'aprovado', date: '15/01/2024' },
        { id: '2', title: 'PED-2024-002', subtitle: 'Fornecedor XYZ', value: 'R$ 8.500', status: 'pendente', date: '16/01/2024' },
        { id: '3', title: 'PED-2024-003', subtitle: 'Fornecedor 123', value: 'R$ 22.000', status: 'em_transito', date: '17/01/2024' },
      ],
    } as DrilldownData;
  };

  return { generateKPIDrilldown };
}

export default DrilldownModal;

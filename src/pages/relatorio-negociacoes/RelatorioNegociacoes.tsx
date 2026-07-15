import { useState } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Calendar,
  Download,
  PiggyBank,
  Target,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { BuyerDrilldownModal } from "@/components/compras/BuyerDrilldownModal";
import { SavingsGoalPanel } from "@/components/compras/SavingsGoalPanel";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";
import type { TooltipProps } from 'recharts';
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';
import {
  historicoMensal,
  comparativoCompradores,
  economiaPorCategoria,
  economiaPorFornecedor,
  COLORS,
  type CompradorType,
} from './relatorioNegociacoesData';

const RelatorioNegociacoes = () => {
  const [periodo, setPeriodo] = useState("6m");
  const [selectedBuyer, setSelectedBuyer] = useState<CompradorType | null>(null);
  const [drilldownOpen, setDrilldownOpen] = useState(false);

  const handleBuyerClick = (comprador: typeof comparativoCompradores[0]) => {
    setSelectedBuyer(comprador);
    setDrilldownOpen(true);
  };

  const totalEconomia = historicoMensal.reduce((acc, curr) => acc + curr.economia, 0);
  const mediaPercentual = historicoMensal.reduce((acc, curr) => acc + curr.percentual, 0) / historicoMensal.length;
  const totalCotacoes = historicoMensal.reduce((acc, curr) => acc + curr.cotacoes, 0);

  const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
          <p className="font-medium text-foreground">{label}</p>
          {payload.map((entry, index: number) => (
            <p key={`${entry.dataKey ?? entry.name ?? index}`} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {String(entry.name).includes('R$') || entry.dataKey === 'economia' 
                ? `R$ ${Number(entry.value).toLocaleString('pt-BR')}` 
                : entry.dataKey === 'percentual' 
                  ? `${entry.value}%`
                  : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
...
      <BuyerDrilldownModal 
        open={drilldownOpen} 
        onOpenChange={setDrilldownOpen} 
        comprador={selectedBuyer} 
      />
    </div>
  );
};

export default RelatorioNegociacoes;

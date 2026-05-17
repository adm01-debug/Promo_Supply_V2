import { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  Clock,
  Package,
  Award,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  Filter,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  type SupplierScore,
  useSupplierScorecardData,
  getScoreColor,
  getScoreBg,
  getRiskBadge,
} from "./scorecard/supplierScorecardData";

const TrendIcon = ({ trend }: { trend: SupplierScore['trend'] }) => {
  if (trend === 'up') return <TrendingUp className="w-4 h-4 text-emerald-400" />;
  if (trend === 'down') return <TrendingDown className="w-4 h-4 text-rose-400" />;
  return <Minus className="w-4 h-4 text-zinc-500" />;
};

export const SupplierScorecard = () => {
  const [selectedPeriod, setSelectedPeriod] = useState("30");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierScore | null>(null);

  const { data: suppliers = [], isLoading } = useSupplierScorecardData(parseInt(selectedPeriod));

  const filteredSuppliers = useMemo(() =>
    suppliers.filter(s => selectedCategory === "all" || s.category === selectedCategory),
    [suppliers, selectedCategory]
  );

  const categories = useMemo(() => [...new Set(suppliers.map(s => s.category))], [suppliers]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 bg-white/5 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 bg-white/5 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-zinc-500" />
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[160px] bg-white/[0.03] border-white/10 rounded-lg text-xs font-black uppercase tracking-widest text-zinc-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#0a0a0f] border-white/10 rounded-xl">
              <SelectItem value="7" className="text-xs font-bold">Last 7 Days</SelectItem>
              <SelectItem value="30" className="text-xs font-bold">Last 30 Days</SelectItem>
              <SelectItem value="90" className="text-xs font-bold">Last 90 Days</SelectItem>
              <SelectItem value="365" className="text-xs font-bold">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[200px] bg-white/[0.03] border-white/10 rounded-lg text-xs font-black uppercase tracking-widest text-zinc-300">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent className="bg-[#0a0a0f] border-white/10 rounded-xl">
            <SelectItem value="all" className="text-xs font-bold">All Categories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat} className="text-xs font-bold">{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "Avg Partner Score", val: filteredSuppliers.length > 0 ? Math.round(filteredSuppliers.reduce((acc, s) => acc + s.overallScore, 0) / filteredSuppliers.length) : '—', icon: Award, color: "text-emerald-400" },
          { label: "Low Risk Partners", val: filteredSuppliers.filter(s => s.riskLevel === 'low').length, icon: CheckCircle, color: "text-emerald-400" },
          { label: "Moderate Risk", val: filteredSuppliers.filter(s => s.riskLevel === 'medium' || s.riskLevel === 'high').length, icon: AlertTriangle, color: "text-amber-400" },
          { label: "Critical Partners", val: filteredSuppliers.filter(s => s.riskLevel === 'critical').length, icon: XCircle, color: "text-rose-400" }
        ].map((item, i) => (
          <Card key={i} className="p-6 bg-white/[0.02] border-white/5 rounded-2xl flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-2 text-zinc-500 mb-3 uppercase text-[9px] font-black tracking-[0.2em]">
              <item.icon className={cn("w-4 h-4", item.color)} />
              {item.label}
            </div>
            <p className="text-4xl font-black text-white">{item.val}</p>
          </Card>
        ))}
      </div>

      <Card className="p-8 bg-white/[0.02] border-white/5 rounded-[2rem] backdrop-blur-3xl overflow-hidden shadow-2xl">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500 mb-8 flex items-center gap-3">
          <BarChart3 className="w-4 h-4 text-emerald-400" />
          Partner Performance Scorecard
          <Badge variant="outline" className="text-[10px] font-black border-emerald-500/30 text-emerald-400">{filteredSuppliers.length} Total</Badge>
        </h3>

        {filteredSuppliers.length === 0 ? (
          <div className="text-center py-20 text-zinc-600 font-black uppercase tracking-[0.2em] text-xs">
            No partner data found
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSuppliers.map((supplier, index) => {
              const riskBadge = getRiskBadge(supplier.riskLevel);
              const scoreDiff = supplier.overallScore - supplier.previousScore;

              return (
                <div
                  key={supplier.id}
                  className={cn(
                    "p-6 rounded-2xl border transition-all cursor-pointer hover:bg-white/[0.03] group",
                    selectedSupplier?.id === supplier.id ? "bg-white/[0.05] border-emerald-500/30" : "border-white/5 bg-transparent"
                  )}
                  onClick={() => setSelectedSupplier(selectedSupplier?.id === supplier.id ? null : supplier)}
                >
                  <div className="flex items-center gap-6">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black",
                      index === 0 && "bg-amber-500/10 text-amber-500",
                      index === 1 && "bg-zinc-500/10 text-zinc-400",
                      index === 2 && "bg-orange-600/10 text-orange-600",
                      index > 2 && "bg-white/[0.03] text-zinc-600"
                    )}>
                      #{index + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h4 className="font-black text-white uppercase tracking-tight group-hover:text-emerald-400 transition-colors">{supplier.name}</h4>
                        <Badge variant="outline" className="text-[9px] font-black uppercase border-zinc-700 text-zinc-500 px-3">{supplier.category}</Badge>
                        <Badge variant="outline" className={cn("text-[9px] font-black uppercase border-none px-3", riskBadge.className)}>
                          RISK: {riskBadge.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-6 text-[10px] text-zinc-500 font-black uppercase tracking-widest">
                        <span className="flex items-center gap-1.5"><Package className="w-3 h-3" /> {supplier.ordersCompleted} Orders</span>
                        <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {supplier.avgDeliveryDays.toFixed(1)} Days Avg</span>
                        <span className="flex items-center gap-1.5"><AlertTriangle className="w-3 h-3" /> {supplier.defectRate}% Defect Rate</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={cn("text-3xl font-black", getScoreColor(supplier.overallScore))}>
                        {supplier.overallScore}
                      </div>
                      <div className="flex items-center justify-end gap-1 text-[10px] font-black uppercase tracking-widest mt-1">
                        <TrendIcon trend={supplier.trend} />
                        <span className={cn(
                          scoreDiff > 0 ? "text-emerald-400" : scoreDiff < 0 ? "text-rose-400" : "text-zinc-500"
                        )}>
                          {scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff}
                        </span>
                      </div>
                    </div>
                  </div>

                  {selectedSupplier?.id === supplier.id && (
                    <div className="mt-6 pt-6 border-t border-white/5 grid grid-cols-2 md:grid-cols-6 gap-6">
                      {Object.entries(supplier.metrics).map(([key, value]) => {
                        const labels: Record<string, string> = {
                          slaCompliance: "SLA",
                          deliveryTime: "Delivery",
                          quality: "Quality",
                          pricing: "Price",
                          communication: "Comms",
                          flexibility: "Flex",
                        };
                        return (
                          <div key={key} className="space-y-2">
                            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em]">{labels[key]}</p>
                            <p className={cn("text-xl font-black", getScoreColor(value))}>{value}</p>
                            <Progress value={value} className="h-1 bg-white/5" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};
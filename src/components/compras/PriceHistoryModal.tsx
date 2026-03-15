import { useState, useMemo } from "react";
import { TrendingUp, TrendingDown, Minus, BarChart3 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { fetchAllRows } from "@/lib/paginatedFetch";

interface PriceHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CotacaoRecord {
  id: string;
  valor_unitario: number;
  valor_total: number;
  quantidade: number;
  fornecedor_id: string | null;
  solicitacao_id: string | null;
  created_at: string;
  status: string;
}

interface FornecedorRecord {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
}

export function PriceHistoryModal({ open, onOpenChange }: PriceHistoryModalProps) {
  const [selectedFornecedor, setSelectedFornecedor] = useState<string>("all");

  const { data: cotacoes = [] } = useQuery({
    queryKey: ["price-history-cotacoes"],
    queryFn: () =>
      fetchAllRows<CotacaoRecord>(
        "cotacoes",
        "id, valor_unitario, valor_total, quantidade, fornecedor_id, solicitacao_id, created_at, status"
      ),
    enabled: open,
  });

  const { data: fornecedores = [] } = useQuery({
    queryKey: ["price-history-fornecedores"],
    queryFn: () =>
      fetchAllRows<FornecedorRecord>("fornecedores", "id, razao_social, nome_fantasia"),
    enabled: open,
  });

  const fornecedorMap = useMemo(
    () => new Map(fornecedores.map((f) => [f.id, f.nome_fantasia || f.razao_social])),
    [fornecedores]
  );

  const filtered = useMemo(() => {
    let data = [...cotacoes].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    if (selectedFornecedor !== "all") {
      data = data.filter((c) => c.fornecedor_id === selectedFornecedor);
    }
    return data;
  }, [cotacoes, selectedFornecedor]);

  // Price trend analysis
  const trend = useMemo(() => {
    if (filtered.length < 2) return null;
    const recent = filtered.slice(0, Math.ceil(filtered.length / 2));
    const older = filtered.slice(Math.ceil(filtered.length / 2));
    const avgRecent = recent.reduce((s, c) => s + c.valor_unitario, 0) / recent.length;
    const avgOlder = older.reduce((s, c) => s + c.valor_unitario, 0) / older.length;
    const change = ((avgRecent - avgOlder) / avgOlder) * 100;
    return { avgRecent, avgOlder, change };
  }, [filtered]);

  // Group by month for chart-like display
  const monthlyData = useMemo(() => {
    const groups: Record<string, { total: number; count: number; min: number; max: number }> = {};
    filtered.forEach((c) => {
      const month = c.created_at.slice(0, 7); // YYYY-MM
      if (!groups[month]) {
        groups[month] = { total: 0, count: 0, min: Infinity, max: -Infinity };
      }
      groups[month].total += c.valor_unitario;
      groups[month].count++;
      groups[month].min = Math.min(groups[month].min, c.valor_unitario);
      groups[month].max = Math.max(groups[month].max, c.valor_unitario);
    });
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        avg: data.total / data.count,
        min: data.min,
        max: data.max,
        count: data.count,
      }));
  }, [filtered]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Histórico de Preços
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filters */}
          <Select value={selectedFornecedor} onValueChange={setSelectedFornecedor}>
            <SelectTrigger className="w-full md:w-64">
              <SelectValue placeholder="Filtrar por fornecedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Fornecedores</SelectItem>
              {fornecedores.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.nome_fantasia || f.razao_social}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Trend Summary */}
          {trend && (
            <Card className="p-4">
              <div className="flex items-center gap-3">
                {trend.change > 1 ? (
                  <TrendingUp className="w-5 h-5 text-destructive" />
                ) : trend.change < -1 ? (
                  <TrendingDown className="w-5 h-5 text-green-500" />
                ) : (
                  <Minus className="w-5 h-5 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {trend.change > 1
                      ? `Preço subiu ${Math.abs(trend.change).toFixed(1)}%`
                      : trend.change < -1
                      ? `Preço caiu ${Math.abs(trend.change).toFixed(1)}%`
                      : "Preço estável"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Média recente: R$ {trend.avgRecent.toFixed(2)} → Média anterior: R${" "}
                    {trend.avgOlder.toFixed(2)}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Monthly breakdown */}
          {monthlyData.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-foreground">Evolução Mensal</h3>
              <div className="grid gap-2">
                {monthlyData.map((m) => (
                  <Card key={m.month} className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {new Date(m.month + "-01").toLocaleDateString("pt-BR", {
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground">{m.count} cotação(ões)</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-foreground">
                          R$ {m.avg.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Min: R$ {m.min.toFixed(2)} / Max: R$ {m.max.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma cotação encontrada para análise de preços.
            </p>
          )}

          {/* Recent cotações */}
          {filtered.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-foreground">
                Últimas Cotações ({Math.min(filtered.length, 20)})
              </h3>
              <div className="grid gap-1">
                {filtered.slice(0, 20).map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString("pt-BR")}
                      </span>
                      <span className="text-foreground font-medium">
                        {c.fornecedor_id ? fornecedorMap.get(c.fornecedor_id) || "—" : "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-foreground">
                        R$ {c.valor_unitario.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {c.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

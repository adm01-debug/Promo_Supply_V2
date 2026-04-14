import { useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface CotacaoRecord {
  id: string;
  valor_unitario: number;
  valor_total: number;
  quantidade: number;
  fornecedor_id: string | null;
  solicitacao_id: string | null;
  created_at: string;
  status: string;
  numero: string;
}

export interface SolicitacaoRecord {
  id: string;
  titulo: string;
}

export interface FornecedorRecord {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
}

export const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(142, 76%, 36%)",
  "hsl(221, 83%, 53%)",
  "hsl(38, 92%, 50%)",
  "hsl(262, 83%, 58%)",
  "hsl(0, 84%, 60%)",
];

export const formatBRL = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function usePriceHistoryAnalysis(
  cotacoes: CotacaoRecord[],
  filtered: CotacaoRecord[],
  fornecedorMap: Map<string, string>,
  solicitacaoMap: Map<string, string>,
  selectedSolicitacao: string
) {
  const trend = useMemo(() => {
    if (filtered.length < 2) return null;
    const half = Math.ceil(filtered.length / 2);
    const recent = filtered.slice(half);
    const older = filtered.slice(0, half);
    const avgRecent = recent.reduce((s, c) => s + c.valor_unitario, 0) / recent.length;
    const avgOlder = older.reduce((s, c) => s + c.valor_unitario, 0) / older.length;
    const change = avgOlder > 0 ? ((avgRecent - avgOlder) / avgOlder) * 100 : 0;
    return { avgRecent, avgOlder, change };
  }, [filtered]);

  const monthlyEvolution = useMemo(() => {
    const groups: Record<string, { total: number; count: number; min: number; max: number }> = {};
    filtered.forEach((c) => {
      const month = c.created_at.slice(0, 7);
      if (!groups[month]) groups[month] = { total: 0, count: 0, min: Infinity, max: -Infinity };
      groups[month].total += c.valor_unitario;
      groups[month].count++;
      groups[month].min = Math.min(groups[month].min, c.valor_unitario);
      groups[month].max = Math.max(groups[month].max, c.valor_unitario);
    });
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month: format(new Date(month + "-01"), "MMM/yy", { locale: ptBR }),
        media: Math.round(data.total / data.count * 100) / 100,
        min: data.min === Infinity ? 0 : data.min,
        max: data.max === -Infinity ? 0 : data.max,
        cotacoes: data.count,
      }));
  }, [filtered]);

  const supplierComparison = useMemo(() => {
    const data = selectedSolicitacao !== "all"
      ? cotacoes.filter((c) => c.solicitacao_id === selectedSolicitacao)
      : cotacoes;

    const bySupplier: Record<string, { total: number; count: number; min: number; best: boolean }> = {};
    data.forEach((c) => {
      if (!c.fornecedor_id) return;
      const name = fornecedorMap.get(c.fornecedor_id) || "Desconhecido";
      if (!bySupplier[name]) bySupplier[name] = { total: 0, count: 0, min: Infinity, best: false };
      bySupplier[name].total += c.valor_unitario;
      bySupplier[name].count++;
      bySupplier[name].min = Math.min(bySupplier[name].min, c.valor_unitario);
    });

    return Object.entries(bySupplier)
      .map(([name, d]) => ({
        fornecedor: name.length > 20 ? name.slice(0, 20) + "…" : name,
        precoMedio: Math.round(d.total / d.count * 100) / 100,
        menorPreco: d.min === Infinity ? 0 : d.min,
        cotacoes: d.count,
      }))
      .sort((a, b) => a.precoMedio - b.precoMedio);
  }, [cotacoes, selectedSolicitacao, fornecedorMap]);

  const supplierMonthlyLines = useMemo(() => {
    const topSupplierIds = [...new Set(filtered.map((c) => c.fornecedor_id).filter(Boolean))].slice(0, 5);
    const months = [...new Set(filtered.map((c) => c.created_at.slice(0, 7)))].sort();

    return months.map((month) => {
      const row: Record<string, unknown> = {
        month: format(new Date(month + "-01"), "MMM/yy", { locale: ptBR }),
      };
      topSupplierIds.forEach((suppId) => {
        const items = filtered.filter(
          (c) => c.created_at.slice(0, 7) === month && c.fornecedor_id === suppId
        );
        if (items.length > 0) {
          const name = fornecedorMap.get(suppId!) || "Desconhecido";
          row[name] = Math.round((items.reduce((s, c) => s + c.valor_unitario, 0) / items.length) * 100) / 100;
        }
      });
      return row;
    });
  }, [filtered, fornecedorMap]);

  const supplierNames = useMemo(() => {
    const topIds = [...new Set(filtered.map((c) => c.fornecedor_id).filter(Boolean))].slice(0, 5);
    return topIds.map((id) => fornecedorMap.get(id!) || "Desconhecido");
  }, [filtered, fornecedorMap]);

  const solicitacoesWithCotacoes = useMemo(() => {
    const ids = [...new Set(cotacoes.map((c) => c.solicitacao_id).filter(Boolean))];
    return ids.map((id) => ({ id: id!, titulo: solicitacaoMap.get(id!) || id! })).slice(0, 50);
  }, [cotacoes, solicitacaoMap]);

  return { trend, monthlyEvolution, supplierComparison, supplierMonthlyLines, supplierNames, solicitacoesWithCotacoes };
}

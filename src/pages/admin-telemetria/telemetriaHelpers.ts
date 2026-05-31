import { format } from "date-fns/format";
import { toast } from '@/lib/feedbackToast';

export interface TelemetryRow {
  id: string;
  operation: string;
  table_name: string | null;
  rpc_name: string | null;
  duration_ms: number;
  record_count: number | null;
  query_limit: number | null;
  query_offset: number | null;
  count_mode: string | null;
  severity: string;
  error_message: string | null;
  user_id: string | null;
  created_at: string;
}

export type SeverityFilter = "all" | "slow" | "very_slow" | "error";
export type TimeFilter = "1h" | "6h" | "24h" | "7d" | "custom";

export const formatDuration = (ms: number) => {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
};

export const formatTime = (iso: string) => {
  return new Date(iso).toLocaleString("pt-BR", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    day: "2-digit", month: "2-digit",
  });
};

export function getTimeThreshold(timeFilter: TimeFilter, customDateFrom?: Date, customDateTo?: Date): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString();
  if (timeFilter === "custom" && customDateFrom) {
    const fromDate = new Date(customDateFrom);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = customDateTo ? new Date(customDateTo) : new Date();
    toDate.setHours(23, 59, 59, 999);
    return { from: fromDate.toISOString(), to: toDate.toISOString() };
  }
  const offsets: Record<string, number> = {
    "1h": 3600000, "6h": 21600000, "24h": 86400000, "7d": 604800000,
  };
  return { from: new Date(now.getTime() - (offsets[timeFilter] || 86400000)).toISOString(), to };
}

export function computeStats(rows: TelemetryRow[]) {
  const verySlow = rows.filter(r => r.severity === "very_slow").length;
  const slow = rows.filter(r => r.severity === "slow").length;
  const errors = rows.filter(r => r.severity === "error").length;
  const avgDuration = rows.length > 0 ? Math.round(rows.reduce((s, r) => s + r.duration_ms, 0) / rows.length) : 0;

  const tableStats = new Map<string, { count: number; totalMs: number; maxMs: number }>();
  for (const r of rows) {
    const key = r.rpc_name || r.table_name || "unknown";
    const prev = tableStats.get(key) || { count: 0, totalMs: 0, maxMs: 0 };
    tableStats.set(key, {
      count: prev.count + 1,
      totalMs: prev.totalMs + r.duration_ms,
      maxMs: Math.max(prev.maxMs, r.duration_ms),
    });
  }
  const topOffenders = [...tableStats.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8);

  return { verySlow, slow, errors, avgDuration, topOffenders };
}

export function exportCSV(rows: TelemetryRow[], timeFilter: string) {
  if (rows.length === 0) {
    toast.error("Nenhum dado para exportar");
    return;
  }
  const headers = ["Data/Hora", "Operação", "Tabela/RPC", "Duração (ms)", "Severidade", "Registros", "Limit", "Offset", "Count Mode", "Erro"];
  const csvRows = rows.map(r => [
    new Date(r.created_at).toLocaleString("pt-BR"),
    r.operation,
    r.table_name || r.rpc_name || "-",
    String(r.duration_ms),
    r.severity,
    r.record_count != null ? String(r.record_count) : "-",
    r.query_limit != null ? String(r.query_limit) : "-",
    r.query_offset != null ? String(r.query_offset) : "-",
    r.count_mode ?? "-",
    (r.error_message || "").replace(/"/g, '""'),
  ]);
  const escapeCSV = (v: string) =>
    v.includes(",") || v.includes('"') || v.includes("\n") ? `"${v}"` : v;
  const content = [headers.map(escapeCSV).join(";"), ...csvRows.map(r => r.map(escapeCSV).join(";"))].join("\r\n");
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `telemetria_${format(new Date(), "yyyy-MM-dd")}_${timeFilter}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  toast.success(`${rows.length} registros exportados para CSV`);
}

export async function exportPDF(rows: TelemetryRow[], timeFilter: string, stats: ReturnType<typeof computeStats>) {
  if (rows.length === 0) {
    toast.error("Nenhum dado para exportar");
    return;
  }
  try {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const now = new Date();

    doc.setFontSize(16);
    doc.text("Telemetria de Queries", 14, 15);
    doc.setFontSize(9);
    doc.text(`Exportado em ${now.toLocaleString("pt-BR")} · Período: ${timeFilter} · Filtro: all`, 14, 22);
    doc.text(`Total: ${rows.length} registros | Muito Lentas: ${stats.verySlow} | Lentas: ${stats.slow} | Erros: ${stats.errors} | Média: ${formatDuration(stats.avgDuration)}`, 14, 27);

    const headers = ["Data/Hora", "Operação", "Tabela/RPC", "Duração", "Severidade", "Registros", "Erro"];
    const body = rows.map(r => [
      formatTime(r.created_at),
      r.operation,
      r.rpc_name || r.table_name || "-",
      formatDuration(r.duration_ms),
      r.severity === "very_slow" ? "Muito Lenta" : r.severity === "slow" ? "Lenta" : r.severity === "error" ? "Erro" : r.severity,
      r.record_count != null ? String(r.record_count) : "-",
      (r.error_message || "-").substring(0, 60),
    ]);

    autoTable(doc, {
      head: [headers],
      body,
      startY: 32,
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [41, 37, 36], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 244] },
    });

    doc.save(`telemetria_${format(now, "yyyy-MM-dd")}_${timeFilter}.pdf`);
    toast.success("PDF exportado com sucesso");
  } catch (err) {
    console.error("PDF export error:", err);
    toast.error("Erro ao gerar PDF");
  }
}

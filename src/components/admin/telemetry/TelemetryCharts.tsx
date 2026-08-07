import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

interface TelemetryRow {
  id: string;
  operation: string;
  table_name: string | null;
  rpc_name: string | null;
  duration_ms: number;
  severity: string;
  created_at: string;
}

interface TelemetryChartsProps {
  rows: TelemetryRow[];
  timeFilter: string;
}

function formatBucketTime(ts: number, timeFilter: string): string {
  const d = new Date(ts);
  if (timeFilter === "7d") {
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  }
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export const TelemetryCharts = ({ rows, timeFilter }: TelemetryChartsProps) => {
  if (rows.length === 0) return null;

  // Bucket sizes per doc spec
  const bucketMs =
    timeFilter === "1h" ? 5 * 60 * 1000 :      // 5 min
    timeFilter === "6h" ? 30 * 60 * 1000 :     // 30 min
    timeFilter === "24h" ? 60 * 60 * 1000 :    // 1 hour
    6 * 60 * 60 * 1000;                         // 6 hours (7d)

  const now = Date.now();
  const rangeMs =
    timeFilter === "1h" ? 3600000 :
    timeFilter === "6h" ? 21600000 :
    timeFilter === "24h" ? 86400000 :
    604800000;

  const rangeStart = now - rangeMs;
  const bucketCount = Math.ceil(rangeMs / bucketMs);

  const timeBuckets = Array.from({ length: bucketCount }, (_, i) => {
    const start = rangeStart + i * bucketMs;
    const end = start + bucketMs;
    const br = rows.filter(r => {
      const t = new Date(r.created_at).getTime();
      return t >= start && t < end;
    });
    return {
      label: formatBucketTime(start, timeFilter),
      muitoLentas: br.filter(r => r.severity === "very_slow").length,
      lentas: br.filter(r => r.severity === "slow").length,
      erros: br.filter(r => r.severity === "error").length,
      mediaMs: br.length > 0 ? Math.round(br.reduce((s, r) => s + r.duration_ms, 0) / br.length) : 0,
      maxMs: br.length > 0 ? Math.max(...br.map(r => r.duration_ms)) : 0,
    };
  });

  // Top tables by alert count (horizontal bar)
  const tableMap = new Map<string, number>();
  for (const r of rows) {
    const key = r.rpc_name || r.table_name || "unknown";
    tableMap.set(key, (tableMap.get(key) || 0) + 1);
  }
  const topTables = [...tableMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({
      name: name.length > 18 ? name.slice(0, 18) + "…" : name,
      alertas: count,
    }));

  const tooltipStyle = {
    fontSize: 12,
    borderRadius: 8,
    border: "1px solid hsl(var(--border))",
    background: "hsl(var(--popover))",
    color: "hsl(var(--popover-foreground))",
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* 1. Alertas ao Longo do Tempo (AreaChart empilhado) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Alertas ao Longo do Tempo</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={timeBuckets}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="lentas" stackId="1" fill="hsl(45, 93%, 47%)" stroke="hsl(45, 93%, 47%)" fillOpacity={0.6} name="Lentas" />
              <Area type="monotone" dataKey="muitoLentas" stackId="1" fill="hsl(var(--destructive))" stroke="hsl(var(--destructive))" fillOpacity={0.6} name="Muito Lentas" />
              <Area type="monotone" dataKey="erros" stackId="1" fill="hsl(0, 84%, 60%)" stroke="hsl(0, 84%, 60%)" fillOpacity={0.6} name="Erros" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 2. Duração Média / Máxima (AreaChart) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Duração Média / Máxima (ms)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={timeBuckets}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number, name: string) => [`${value}ms`, name === "maxMs" ? "Máxima" : "Média"]}
              />
              <Area type="monotone" dataKey="maxMs" fill="hsl(var(--destructive))" stroke="hsl(var(--destructive))" fillOpacity={0.15} strokeWidth={1.5} name="maxMs" />
              <Area type="monotone" dataKey="mediaMs" fill="hsl(var(--primary))" stroke="hsl(var(--primary))" fillOpacity={0.3} strokeWidth={2} name="mediaMs" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 3. Alertas por Tabela (BarChart horizontal) */}
      {topTables.length > 0 && (
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Alertas por Tabela/RPC</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topTables} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="alertas" fill="hsl(var(--primary))" name="Alertas" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

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

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "hsl(45, 93%, 47%)",
  "hsl(142, 76%, 36%)",
  "hsl(262, 83%, 58%)",
  "hsl(200, 98%, 39%)",
  "hsl(24, 95%, 53%)",
  "hsl(330, 81%, 60%)",
];

export const TelemetryCharts = ({ rows, timeFilter }: TelemetryChartsProps) => {
  // Duration distribution over time
  const getTimeBuckets = () => {
    if (rows.length === 0) return [];
    const bucketCount = timeFilter === "1h" ? 12 : timeFilter === "6h" ? 12 : timeFilter === "24h" ? 24 : 7;
    const now = Date.now();
    const range = timeFilter === "1h" ? 3600000 : timeFilter === "6h" ? 21600000 : timeFilter === "24h" ? 86400000 : 604800000;
    const bucketSize = range / bucketCount;

    const buckets = Array.from({ length: bucketCount }, (_, i) => {
      const start = now - range + i * bucketSize;
      const end = start + bucketSize;
      const bucketRows = rows.filter(r => {
        const t = new Date(r.created_at).getTime();
        return t >= start && t < end;
      });
      const label = new Date(start).toLocaleString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        ...(timeFilter === "7d" ? { day: "2-digit", month: "2-digit" } : {}),
      });
      return {
        label,
        slow: bucketRows.filter(r => r.severity === "slow").length,
        very_slow: bucketRows.filter(r => r.severity === "very_slow").length,
        error: bucketRows.filter(r => r.severity === "error").length,
        avgMs: bucketRows.length > 0 ? Math.round(bucketRows.reduce((s, r) => s + r.duration_ms, 0) / bucketRows.length) : 0,
      };
    });
    return buckets;
  };

  // Severity distribution
  const severityData = [
    { name: "Lentas", value: rows.filter(r => r.severity === "slow").length, color: "hsl(45, 93%, 47%)" },
    { name: "Muito Lentas", value: rows.filter(r => r.severity === "very_slow").length, color: "hsl(var(--destructive))" },
    { name: "Erros", value: rows.filter(r => r.severity === "error").length, color: "hsl(0, 84%, 40%)" },
  ].filter(d => d.value > 0);

  // Top tables by avg duration
  const tableMap = new Map<string, number[]>();
  for (const r of rows) {
    const key = r.rpc_name || r.table_name || "unknown";
    if (!tableMap.has(key)) tableMap.set(key, []);
    tableMap.get(key)!.push(r.duration_ms);
  }
  const topByDuration = [...tableMap.entries()]
    .map(([name, durations]) => ({
      name: name.length > 18 ? name.slice(0, 18) + "…" : name,
      avg: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      max: Math.max(...durations),
    }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 8);

  const timeBuckets = getTimeBuckets();

  if (rows.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Timeline Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Alertas ao Longo do Tempo</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={timeBuckets}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--popover))", color: "hsl(var(--popover-foreground))" }}
              />
              <Bar dataKey="slow" stackId="a" fill="hsl(45, 93%, 47%)" name="Lentas" radius={[0, 0, 0, 0]} />
              <Bar dataKey="very_slow" stackId="a" fill="hsl(var(--destructive))" name="Muito Lentas" radius={[0, 0, 0, 0]} />
              <Bar dataKey="error" stackId="a" fill="hsl(0, 84%, 40%)" name="Erros" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Avg Duration Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Duração Média (ms)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={timeBuckets}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--popover))", color: "hsl(var(--popover-foreground))" }}
                formatter={(value: number) => [`${value}ms`, "Média"]}
              />
              <Line type="monotone" dataKey="avgMs" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} name="Média" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Severity Pie */}
      {severityData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Distribuição por Severidade</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Top by Duration */}
      {topByDuration.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top Tabelas por Duração Média</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topByDuration} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--popover))", color: "hsl(var(--popover-foreground))" }}
                  formatter={(value: number) => [`${value}ms`]}
                />
                <Bar dataKey="avg" fill="hsl(var(--primary))" name="Média (ms)" radius={[0, 4, 4, 0]} />
                <Bar dataKey="max" fill="hsl(var(--destructive))" name="Máx (ms)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

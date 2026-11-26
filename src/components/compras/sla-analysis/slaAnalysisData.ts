/**
 * SLA por fornecedor calculado a partir dos pedidos reais.
 *
 * Antes este modulo gerava numeros com Math.random() a cada render: pedidos,
 * lead time, atrasos e conformidade nunca refletiam nada do banco. Agora as
 * metricas saem de `pedidos` (data_previsao x data_entrega) e `fornecedores`
 * (prazo_medio_entrega / avaliacao). Sem amostra, o valor e null — a tela
 * mostra ausencia de dado em vez de inventar percentual.
 */

const SUPPLIER_COLORS: Record<string, string> = {
  'XBZ Brindes': 'hsl(var(--primary))',
  'Tech Brindes': 'hsl(142, 76%, 36%)',
  'Stricker / Spot Gifts': 'hsl(221, 83%, 53%)',
  'Premium Gifts': 'hsl(38, 92%, 50%)',
  'Asia Import': 'hsl(262, 83%, 58%)',
  'Eco Brindes': 'hsl(0, 84%, 60%)',
};

export { SUPPLIER_COLORS };

/** Cores de reserva para fornecedores fora do mapa fixo. */
export const SUPPLIER_PALETTE: readonly string[] = [
  'hsl(var(--primary))',
  'hsl(142, 76%, 36%)',
  'hsl(221, 83%, 53%)',
  'hsl(38, 92%, 50%)',
  'hsl(262, 83%, 58%)',
  'hsl(0, 84%, 60%)',
];

export interface MonthlySlaPoint {
  month: string;
  compliance: number | null;
  onTime: number | null;
}

export interface SupplierSLAData {
  id: string;
  name: string;
  /** Entregues no prazo / entregues (null sem entrega registrada). */
  slaCompliance: number | null;
  /** Entregues no prazo / pedidos com previsao ja vencida (null sem amostra). */
  onTimeDelivery: number | null;
  /** Media de dias entre emissao e entrega; cai para o prazo cadastrado. */
  avgLeadTime: number | null;
  totalOrders: number;
  /** Entregues depois da data prevista. */
  lateOrders: number;
  /** Em aberto com previsao vencida. */
  criticalOrders: number;
  /** Alias de lateOrders: atraso ja consumado. */
  overdueOrders: number;
  /** Nota cadastrada (0-5) convertida para 0-100. */
  qualityScore: number | null;
  trend: 'up' | 'down' | 'stable';
  /** Variacao em pontos percentuais da conformidade (3 meses vs 3 anteriores). */
  trendValue: number | null;
  monthlyTrend: MonthlySlaPoint[];
}

export interface SlaSupplierInput {
  id: string;
  name: string;
  prazo_medio_entrega?: number | null;
  avaliacao?: number | string | null;
}

export interface SlaOrderInput {
  fornecedor_id: string | null;
  status?: string | null;
  data_previsao?: string | null;
  data_entrega?: string | null;
  data_emissao?: string | null;
  created_at?: string | null;
}

const CLOSED_STATUSES = new Set(['entregue', 'cancelado', 'cancelada', 'rejeitado', 'rejeitada']);

const MONTH_ABBR = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function ratio(part: number, total: number): number | null {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : null;
}

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function lastMonths(count: number, today: Date): Array<{ key: string; label: string }> {
  const base = startOfMonth(today);
  const out: Array<{ key: string; label: string }> = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() - i, 1));
    out.push({ key: monthKey(d), label: MONTH_ABBR[d.getUTCMonth()] });
  }
  return out;
}

/**
 * Constroi as metricas de SLA por fornecedor. Funcao pura: recebe as linhas
 * cruas de `fornecedores` e `pedidos` e devolve o que a tela desenha.
 */
export function buildSupplierSLAData(
  suppliers: readonly SlaSupplierInput[],
  orders: readonly SlaOrderInput[],
  periodDays = 180,
  today: Date = new Date(),
): SupplierSLAData[] {
  const cutoff = new Date(today.getTime() - periodDays * 24 * 60 * 60 * 1000);
  const months = lastMonths(6, today);
  const nowMs = today.getTime();

  return suppliers.map((supplier) => {
    const own = orders.filter((o) => o.fornecedor_id === supplier.id);
    const inWindow = own.filter((o) => {
      const ref = toDate(o.data_emissao) ?? toDate(o.created_at);
      return !ref || ref >= cutoff;
    });

    const delivered: Array<{ prev: Date | null; real: Date; emit: Date | null }> = [];
    for (const o of inWindow) {
      const real = toDate(o.data_entrega);
      if (!real) continue;
      delivered.push({ prev: toDate(o.data_previsao), real, emit: toDate(o.data_emissao) });
    }

    const comparable = delivered.filter((d) => d.prev !== null);
    const onTime = comparable.filter((d) => d.real.getTime() <= (d.prev as Date).getTime());

    const lateOrders = comparable.length - onTime.length;

    let criticalOrders = 0;
    for (const o of inWindow) {
      const prev = toDate(o.data_previsao);
      if (!prev) continue;
      if (toDate(o.data_entrega)) continue;
      if (CLOSED_STATUSES.has(String(o.status ?? '').toLowerCase())) continue;
      if (prev.getTime() < nowMs) criticalOrders += 1;
    }

    const leadSampled = delivered
      .map((d) => (d.emit ? (d.real.getTime() - d.emit.getTime()) / 86400000 : NaN))
      .filter((v) => Number.isFinite(v) && v >= 0);
    const avgLeadTime = leadSampled.length > 0
      ? Math.round((leadSampled.reduce((a, b) => a + b, 0) / leadSampled.length) * 10) / 10
      : typeof supplier.prazo_medio_entrega === 'number'
        ? supplier.prazo_medio_entrega
        : null;

    const rating = supplier.avaliacao === null || supplier.avaliacao === undefined
      ? null
      : Number(supplier.avaliacao);
    const qualityScore = rating !== null && Number.isFinite(rating)
      ? Math.round(rating * 20 * 10) / 10
      : null;

    const monthlyTrend: MonthlySlaPoint[] = months.map(({ key, label }) => {
      const bucket = comparable.filter((d) => monthKey(d.real) === key);
      const ok = bucket.filter((d) => d.real.getTime() <= (d.prev as Date).getTime()).length;
      return {
        month: label,
        compliance: ratio(ok, bucket.length),
        onTime: ratio(ok, bucket.length),
      };
    });

    const recent = monthlyTrend.slice(3).filter((m) => m.compliance !== null);
    const previous = monthlyTrend.slice(0, 3).filter((m) => m.compliance !== null);
    const avgOf = (list: MonthlySlaPoint[]) =>
      list.reduce((acc, m) => acc + (m.compliance as number), 0) / list.length;

    let trend: SupplierSLAData['trend'] = 'stable';
    let trendValue: number | null = null;
    if (recent.length > 0 && previous.length > 0) {
      const delta = Math.round((avgOf(recent) - avgOf(previous)) * 10) / 10;
      trendValue = Math.abs(delta);
      trend = delta > 1 ? 'up' : delta < -1 ? 'down' : 'stable';
    }

    return {
      id: supplier.id,
      name: supplier.name,
      slaCompliance: ratio(onTime.length, comparable.length),
      onTimeDelivery: ratio(onTime.length, comparable.length + criticalOrders),
      avgLeadTime,
      totalOrders: inWindow.length,
      lateOrders,
      criticalOrders,
      overdueOrders: lateOrders,
      qualityScore,
      trend,
      trendValue,
      monthlyTrend,
    };
  });
}

/** Conformidade media apenas dos fornecedores com amostra. */
export function averageCompliance(rows: readonly SupplierSLAData[]): number | null {
  const withSample = rows
    .map((r) => r.slaCompliance)
    .filter((v): v is number => typeof v === 'number');
  if (withSample.length === 0) return null;
  return Math.round((withSample.reduce((a, b) => a + b, 0) / withSample.length) * 10) / 10;
}

export function getSLAColor(value: number): string {
  if (value >= 95) return 'text-success';
  if (value >= 85) return 'text-info';
  if (value >= 75) return 'text-warning';
  return 'text-destructive';
}

export function getSLABgColor(value: number): string {
  if (value >= 95) return 'bg-success';
  if (value >= 85) return 'bg-info';
  if (value >= 75) return 'bg-warning';
  return 'bg-destructive';
}

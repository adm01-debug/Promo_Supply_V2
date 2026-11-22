/**
 * Regras puras do alerta de vencimento de contrato.
 *
 * Por que mora aqui: o cron `contract-expiry-check` (job 115,
 * `20261121153000_religa_crons_negocio_vault.sql:52-58`) chama a edge
 * `check-expiry-alerts` -- a MESMA do job `expiry-alerts-check`. Aquela edge so
 * cobria cotacoes e pagamentos, entao contrato vencendo/vencido nunca gerou
 * alerta. Alterar o comando do job exige DDL em `cron.job`, que o role das
 * migrations nao possui (ver `20261121180000_fix_owner_crons_negocio.sql`),
 * entao o alerta de contrato entra no lugar que os dois jobs ja executam.
 *
 * Separado do handler para poder testar sem Supabase (contractExpiry_test.ts).
 */

export type ContractRenewalType = "automatic" | "manual" | string | null;

export interface ContractRow {
  id: string;
  contract_number: string | null;
  title: string | null;
  status: string | null;
  end_date: string | null;
  renewal_type: ContractRenewalType;
  renewal_notice_days: number | null;
  tenant_id: string | null;
}

export interface ContractAlert {
  contract_id: string;
  contract_number: string;
  title: string;
  days_left: number;
  end_date: string;
  renewal_type: ContractRenewalType;
  tenant_id: string | null;
  /** contrato ja venceu e continua marcado como ativo */
  expired: boolean;
  /** janela de aviso previa definida no contrato (`renewal_notice_days`) */
  in_notice_window: boolean;
  priority: "critical" | "high" | "medium";
}

export const DEFAULT_NOTICE_DAYS = 30;

/** Contratos que exigem acao: ja vencidos ou dentro da janela de aviso. */
export const RELEVANT_CONTRACT_STATUSES = ["active", "ativo"];

/** Normaliza para meia-noite UTC, do mesmo jeito que `end_date` (DATE) vem do banco. */
export function startOfUtcDay(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Dias inteiros entre hoje e o vencimento. Negativo = ja venceu. */
export function daysUntil(endDate: string, today: Date): number {
  const end = Date.parse(`${endDate}T00:00:00Z`);
  if (Number.isNaN(end)) return Number.NaN;
  return Math.round((startOfUtcDay(new Date(end)) - startOfUtcDay(today)) / 86_400_000);
}

function noticeWindow(contract: ContractRow): number {
  const n = contract.renewal_notice_days;
  return typeof n === "number" && n > 0 ? n : DEFAULT_NOTICE_DAYS;
}

export function priorityFor(daysLeft: number): ContractAlert["priority"] {
  if (daysLeft <= 7) return "critical";
  if (daysLeft <= 15) return "high";
  return "medium";
}

/**
 * Seleciona os contratos que precisam de alerta numa data.
 * - status terminal (`cancelled`, `encerrado`, `expirado`) e ignorado
 * - `pending_approval` nao alerta: ainda nao vale nada para o negocio
 * - vencido continua alertando ate alguem renovar ou encerrar (nao some do radar)
 */
export function selectContractAlerts(contracts: ContractRow[], today: Date): ContractAlert[] {
  const alerts: ContractAlert[] = [];
  for (const c of contracts) {
    if (!c.end_date) continue;
    const status = (c.status ?? "").toLowerCase();
    if (!RELEVANT_CONTRACT_STATUSES.includes(status)) continue;

    const daysLeft = daysUntil(c.end_date, today);
    if (Number.isNaN(daysLeft)) continue;

    const window = noticeWindow(c);
    const expired = daysLeft < 0;
    if (!expired && daysLeft > window) continue;

    alerts.push({
      contract_id: c.id,
      contract_number: c.contract_number ?? c.id,
      title: c.title ?? "contrato",
      days_left: daysLeft,
      end_date: c.end_date,
      renewal_type: c.renewal_type ?? null,
      tenant_id: c.tenant_id ?? null,
      expired,
      in_notice_window: !expired,
      priority: expired ? "critical" : priorityFor(daysLeft),
    });
  }
  return alerts.sort((a, b) => a.days_left - b.days_left);
}

export function formatBrDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return d && m && y ? `${d}/${m}/${y}` : isoDate;
}

/** Titulo determinstico: usado como chave de dedupe do `insertNotification`. */
export function alertTitle(a: ContractAlert): string {
  if (a.expired) return `Contrato ${a.contract_number} VENCIDO`;
  return `Contrato ${a.contract_number} vence em ${a.days_left} dia(s)`;
}

export function alertMessage(a: ContractAlert): string {
  const fim = formatBrDate(a.end_date);
  const renovacao = a.renewal_type === "automatic" ? "renovação automática" : "renovação manual";
  if (a.expired) {
    return `O contrato ${a.contract_number} (${a.title}) venceu em ${fim} e continua ativo. Regularize ou encerre para não deixar compras sem cobertura contratual.`;
  }
  return `O contrato ${a.contract_number} (${a.title}) vence em ${fim} — ${a.days_left} dia(s), ${renovacao}. Decida renovar ou encerrar antes do vencimento.`;
}
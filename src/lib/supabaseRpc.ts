/**
 * Strongly-typed wrappers for Supabase RPC calls (F-034).
 *
 * Each function is typed with the exact parameter and return shapes,
 * eliminating the `unknown` cast that raw `.rpc()` calls produce.
 * Call sites can migrate incrementally by importing from here instead of
 * calling supabase.rpc() directly.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Shared return types
// ---------------------------------------------------------------------------

export interface BudgetAvailability {
  available: boolean;
  budget_id: string | null;
  allocated: number;
  used: number;
  remaining: number;
  currency: string;
}

export interface KpiMetrics {
  total: number;
  total_valor: number;
  pendentes: number;
  aprovados: number;
  reprovados: number;
  em_andamento?: number;
  concluidos?: number;
  cancelados?: number;
  [key: string]: number | string | undefined;
}

export interface ApprovalRule {
  id: string;
  nivel: number;
  approver_id: string;
  tipo: string;
  [key: string]: unknown;
}

export interface EffectiveApprover {
  approver_id: string;
  email: string;
  nome: string | null;
  [key: string]: unknown;
}

export interface AccountLockStatus {
  locked: boolean;
  remaining_attempts: number;
  locked_until: string | null;
}

export interface LoginAttemptResult {
  locked: boolean;
  attempts: number;
  [key: string]: unknown;
}

export interface SlaStatusRow {
  status: string;
  count: number;
  avg_duration_ms: number;
  [key: string]: unknown;
}

export interface CostCenterPerformance {
  cost_center_id: string;
  nome: string;
  total_pedidos: number;
  valor_total: number;
  economia_total: number;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Typed RPC wrappers
// ---------------------------------------------------------------------------

type RpcResult<T> = Promise<{ data: T | null; error: import("@supabase/supabase-js").PostgrestError | null }>;

export function rpcCurrentTenantId(supabase: SupabaseClient): RpcResult<string> {
  return supabase.rpc("current_tenant_id") as unknown as RpcResult<string>;
}

export function rpcGenerateSequentialNumber(
  supabase: SupabaseClient,
  params: { prefix: string; table_name: string },
): RpcResult<string> {
  return supabase.rpc("generate_sequential_number", params) as unknown as RpcResult<string>;
}

export function rpcCheckBudgetAvailability(
  supabase: SupabaseClient,
  params: {
    p_tenant_id?: string;
    p_categoria_id?: string;
    p_valor: number;
    p_period?: string;
  },
): RpcResult<BudgetAvailability> {
  return supabase.rpc("check_budget_availability", params) as unknown as RpcResult<BudgetAvailability>;
}

export function rpcGetSolicitacoesKpis(
  supabase: SupabaseClient,
  params: { p_tenant_id?: string; p_period?: string },
): RpcResult<KpiMetrics> {
  return supabase.rpc("get_solicitacoes_kpis", params) as unknown as RpcResult<KpiMetrics>;
}

export function rpcGetPedidosKpis(
  supabase: SupabaseClient,
  params: { p_tenant_id?: string; p_period?: string },
): RpcResult<KpiMetrics> {
  return supabase.rpc("get_pedidos_kpis", params) as RpcResult<KpiMetrics>;
}

export function rpcGetComprasDashboardMetrics(
  supabase: SupabaseClient,
  params: { p_tenant_id?: string; p_start_date?: string; p_end_date?: string },
): RpcResult<KpiMetrics> {
  return supabase.rpc("get_compras_dashboard_metrics", params) as RpcResult<KpiMetrics>;
}

export function rpcGetFornecedoresKpis(
  supabase: SupabaseClient,
  params: { p_tenant_id?: string },
): RpcResult<KpiMetrics> {
  return supabase.rpc("get_fornecedores_kpis", params) as RpcResult<KpiMetrics>;
}

export function rpcGetPagamentosKpis(
  supabase: SupabaseClient,
  params: { p_tenant_id?: string; p_period?: string },
): RpcResult<KpiMetrics> {
  return supabase.rpc("get_pagamentos_kpis", params) as RpcResult<KpiMetrics>;
}

export function rpcFindApprovalRule(
  supabase: SupabaseClient,
  params: { p_valor: number; p_categoria_id?: string },
): RpcResult<ApprovalRule> {
  return supabase.rpc("find_approval_rule", params) as RpcResult<ApprovalRule>;
}

export function rpcGetEffectiveApprover(
  supabase: SupabaseClient,
  params: { p_approver_id: string; p_categoria_id?: string; p_valor?: number },
): RpcResult<EffectiveApprover> {
  return supabase.rpc("get_effective_approver", params) as RpcResult<EffectiveApprover>;
}

export function rpcIsAccountLocked(
  supabase: SupabaseClient,
  params: { _email: string },
): RpcResult<AccountLockStatus> {
  return supabase.rpc("is_account_locked", params) as RpcResult<AccountLockStatus>;
}

export function rpcRecordFailedLogin(
  supabase: SupabaseClient,
  params: { _email: string; _ip?: string },
): RpcResult<LoginAttemptResult> {
  return supabase.rpc("record_failed_login", params) as RpcResult<LoginAttemptResult>;
}

export function rpcClearLoginLockout(
  supabase: SupabaseClient,
  params: { _email: string },
): RpcResult<void> {
  return supabase.rpc("clear_login_lockout", params) as RpcResult<void>;
}

export function rpcLogLoginAttempt(
  supabase: SupabaseClient,
  params: { p_email: string; p_success: boolean; p_ip?: string; p_user_agent?: string },
): RpcResult<void> {
  return supabase.rpc("log_login_attempt", params) as RpcResult<void>;
}

export function rpcResolveAlert(
  supabase: SupabaseClient,
  params: { alert_id: string; resolved_by?: string },
): RpcResult<void> {
  return supabase.rpc("resolve_alert", params) as RpcResult<void>;
}

export function rpcCountLegacyStorageUrls(supabase: SupabaseClient): RpcResult<number> {
  return supabase.rpc("count_legacy_storage_urls") as RpcResult<number>;
}

export function rpcAdminScanRunsSlaStatus(supabase: SupabaseClient): RpcResult<SlaStatusRow[]> {
  return supabase.rpc("admin_scan_runs_sla_status") as RpcResult<SlaStatusRow[]>;
}

export function rpcGetCostCenterPerformanceReport(
  supabase: SupabaseClient,
): RpcResult<CostCenterPerformance[]> {
  return supabase.rpc("get_cost_center_performance_report") as RpcResult<CostCenterPerformance[]>;
}

export function rpcHasRole(
  supabase: SupabaseClient,
  params: { _user_id: string; _role: string },
): RpcResult<boolean> {
  return supabase.rpc("has_role", params) as RpcResult<boolean>;
}

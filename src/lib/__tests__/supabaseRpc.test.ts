import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  rpcCurrentTenantId,
  rpcGenerateSequentialNumber,
  rpcCheckBudgetAvailability,
  rpcGetSolicitacoesKpis,
  rpcGetPedidosKpis,
  rpcGetComprasDashboardMetrics,
  rpcGetFornecedoresKpis,
  rpcGetPagamentosKpis,
  rpcFindApprovalRule,
  rpcGetEffectiveApprover,
  rpcIsAccountLocked,
  rpcRecordFailedLogin,
  rpcClearLoginLockout,
  rpcLogLoginAttempt,
  rpcResolveAlert,
  rpcCountLegacyStorageUrls,
  rpcAdminScanRunsSlaStatus,
  rpcGetCostCenterPerformanceReport,
  rpcHasRole,
} from '../supabaseRpc';

// ─── supabaseRpc wrappers ─────────────────────────────────────────────────────

const mockRpc = vi.fn();
const supabase = { rpc: mockRpc } as any;

describe('supabaseRpc typed wrappers', () => {
  beforeEach(() => {
    mockRpc.mockReset();
    mockRpc.mockReturnValue({ data: null, error: null });
  });

  // ── each wrapper calls the correct RPC name ─────────────────────────────────

  it('rpcCurrentTenantId → rpc("current_tenant_id") with no params', async () => {
    await rpcCurrentTenantId(supabase);
    expect(mockRpc).toHaveBeenCalledOnce();
    expect(mockRpc).toHaveBeenCalledWith('current_tenant_id');
  });

  it('rpcGenerateSequentialNumber → correct name and params', async () => {
    const params = { prefix: 'SOL', table_name: 'solicitacoes' };
    await rpcGenerateSequentialNumber(supabase, params);
    expect(mockRpc).toHaveBeenCalledWith('generate_sequential_number', params);
  });

  it('rpcCheckBudgetAvailability → correct name and params', async () => {
    const params = { p_valor: 500, p_tenant_id: 'tenant1', p_categoria_id: 'cat1' };
    await rpcCheckBudgetAvailability(supabase, params);
    expect(mockRpc).toHaveBeenCalledWith('check_budget_availability', params);
  });

  it('rpcGetSolicitacoesKpis → correct name and params', async () => {
    const params = { p_tenant_id: 't1', p_period: 'monthly' };
    await rpcGetSolicitacoesKpis(supabase, params);
    expect(mockRpc).toHaveBeenCalledWith('get_solicitacoes_kpis', params);
  });

  it('rpcGetPedidosKpis → correct name and params', async () => {
    const params = { p_period: '2024-Q1' };
    await rpcGetPedidosKpis(supabase, params);
    expect(mockRpc).toHaveBeenCalledWith('get_pedidos_kpis', params);
  });

  it('rpcGetComprasDashboardMetrics → correct name and params', async () => {
    const params = { p_start_date: '2024-01-01', p_end_date: '2024-12-31' };
    await rpcGetComprasDashboardMetrics(supabase, params);
    expect(mockRpc).toHaveBeenCalledWith('get_compras_dashboard_metrics', params);
  });

  it('rpcGetFornecedoresKpis → correct name and params', async () => {
    const params = { p_tenant_id: 't1' };
    await rpcGetFornecedoresKpis(supabase, params);
    expect(mockRpc).toHaveBeenCalledWith('get_fornecedores_kpis', params);
  });

  it('rpcGetPagamentosKpis → correct name and params', async () => {
    const params = { p_tenant_id: 't2', p_period: 'weekly' };
    await rpcGetPagamentosKpis(supabase, params);
    expect(mockRpc).toHaveBeenCalledWith('get_pagamentos_kpis', params);
  });

  it('rpcFindApprovalRule → correct name and params', async () => {
    const params = { p_valor: 10000, p_categoria_id: 'cat-abc' };
    await rpcFindApprovalRule(supabase, params);
    expect(mockRpc).toHaveBeenCalledWith('find_approval_rule', params);
  });

  it('rpcGetEffectiveApprover → correct name and params', async () => {
    const params = { p_approver_id: 'user-uuid', p_valor: 500 };
    await rpcGetEffectiveApprover(supabase, params);
    expect(mockRpc).toHaveBeenCalledWith('get_effective_approver', params);
  });

  it('rpcIsAccountLocked → correct name and params', async () => {
    const params = { _email: 'user@example.com' };
    await rpcIsAccountLocked(supabase, params);
    expect(mockRpc).toHaveBeenCalledWith('is_account_locked', params);
  });

  it('rpcRecordFailedLogin → correct name and params', async () => {
    const params = { _email: 'bad@example.com', _ip: '192.168.1.1' };
    await rpcRecordFailedLogin(supabase, params);
    expect(mockRpc).toHaveBeenCalledWith('record_failed_login', params);
  });

  it('rpcClearLoginLockout → correct name and params', async () => {
    const params = { _email: 'unlocked@example.com' };
    await rpcClearLoginLockout(supabase, params);
    expect(mockRpc).toHaveBeenCalledWith('clear_login_lockout', params);
  });

  it('rpcLogLoginAttempt → correct name and params', async () => {
    const params = { p_email: 'user@example.com', p_success: true, p_ip: '10.0.0.1' };
    await rpcLogLoginAttempt(supabase, params);
    expect(mockRpc).toHaveBeenCalledWith('log_login_attempt', params);
  });

  it('rpcResolveAlert → correct name and params', async () => {
    const params = { alert_id: 'alert-uuid', resolved_by: 'admin-uuid' };
    await rpcResolveAlert(supabase, params);
    expect(mockRpc).toHaveBeenCalledWith('resolve_alert', params);
  });

  it('rpcCountLegacyStorageUrls → rpc("count_legacy_storage_urls") with no params', async () => {
    await rpcCountLegacyStorageUrls(supabase);
    expect(mockRpc).toHaveBeenCalledWith('count_legacy_storage_urls');
  });

  it('rpcAdminScanRunsSlaStatus → rpc("admin_scan_runs_sla_status") with no params', async () => {
    await rpcAdminScanRunsSlaStatus(supabase);
    expect(mockRpc).toHaveBeenCalledWith('admin_scan_runs_sla_status');
  });

  it('rpcGetCostCenterPerformanceReport → rpc("get_cost_center_performance_report") with no params', async () => {
    await rpcGetCostCenterPerformanceReport(supabase);
    expect(mockRpc).toHaveBeenCalledWith('get_cost_center_performance_report');
  });

  it('rpcHasRole → correct name and params', async () => {
    const params = { _user_id: 'user-1', _role: 'admin' };
    await rpcHasRole(supabase, params);
    expect(mockRpc).toHaveBeenCalledWith('has_role', params);
  });

  // ── return value is passed through unchanged ────────────────────────────────

  it('passes through data from successful rpc call', async () => {
    mockRpc.mockReturnValue({ data: 'tenant-uuid-123', error: null });
    const result = await rpcCurrentTenantId(supabase);
    expect(result).toEqual({ data: 'tenant-uuid-123', error: null });
  });

  it('passes through error from failed rpc call', async () => {
    const error = { message: 'relation does not exist', code: '42P01' };
    mockRpc.mockReturnValue({ data: null, error });
    const result = await rpcCurrentTenantId(supabase);
    expect(result.error).toEqual(error);
    expect(result.data).toBeNull();
  });

  it('each wrapper calls rpc exactly once per invocation', async () => {
    await rpcCurrentTenantId(supabase);
    await rpcHasRole(supabase, { _user_id: 'u', _role: 'r' });
    expect(mockRpc).toHaveBeenCalledTimes(2);
  });
});

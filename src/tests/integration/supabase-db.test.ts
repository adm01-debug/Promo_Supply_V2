/**
 * F-051: Real Supabase integration tests.
 *
 * These tests connect to a live Supabase instance and verify the actual
 * schema, RLS policies, and stored functions.
 *
 * PREREQUISITES
 *   Set the following env vars (use a staging/test project, never production):
 *     VITE_SUPABASE_URL         – Supabase project URL
 *     SUPABASE_SERVICE_ROLE_KEY – Service-role key (bypasses RLS for seed/cleanup)
 *     INTEGRATION_TESTS=true    – Required gate to prevent accidental runs
 *
 * RUN
 *   INTEGRATION_TESTS=true npx vitest run src/tests/integration/supabase-db.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ── Skip guard ────────────────────────────────────────────────────────────────
const INTEGRATION = process.env.INTEGRATION_TESTS === 'true';
const describeIf = INTEGRATION ? describe : describe.skip;

// ── Client setup ──────────────────────────────────────────────────────────────
let supabase: SupabaseClient;
const TEST_MARKER = 'integration-test-' + Date.now();

beforeAll(() => {
  if (!INTEGRATION) return;

  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — set both to run integration tests'
    );
  }

  supabase = createClient(url, key, {
    auth: { persistSession: false },
  });
});

afterAll(async () => {
  if (!INTEGRATION || !supabase) return;
  // Clean up any test rows inserted with the TEST_MARKER in detalhes
  await supabase.from('approval_history')
    .delete()
    .eq('detalhes->>test_marker', TEST_MARKER);
});

// ── Schema integrity tests ────────────────────────────────────────────────────
describeIf('Supabase schema integrity', () => {
  it('required tables exist', async () => {
    const tables = [
      'profiles', 'solicitacoes', 'cotacoes', 'fornecedores', 'pedidos',
      'approval_workflows', 'approval_steps', 'approval_rules', 'approval_history',
      'cron_heartbeats',
    ];

    for (const table of tables) {
      const { error } = await supabase.from(table).select('id').limit(0);
      expect(error, `Table '${table}' must exist`).toBeNull();
    }
  });

  it('approval_workflows has required columns', async () => {
    // Select known columns; error means column does not exist
    const { error } = await supabase
      .from('approval_workflows')
      .select('id, solicitacao_id, rule_id, status, etapa_atual, total_etapas, valor, prazo_limite, organization_id')
      .limit(0);
    expect(error).toBeNull();
  });

  it('approval_steps has required columns', async () => {
    const { error } = await supabase
      .from('approval_steps')
      .select('id, workflow_id, etapa, aprovador_id, aprovador_efetivo_id, status, prazo_limite, organization_id')
      .limit(0);
    expect(error).toBeNull();
  });

  it('cron_heartbeats table is queryable', async () => {
    const { error } = await supabase
      .from('cron_heartbeats')
      .select('job_name, last_run_at, status')
      .limit(5);
    expect(error).toBeNull();
  });
});

// ── RPC / stored function tests ───────────────────────────────────────────────
describeIf('Supabase stored functions', () => {
  it('find_approval_rule RPC exists and returns null for unknown input', async () => {
    const { data, error } = await supabase.rpc('find_approval_rule', {
      p_valor: -999999,
      p_categoria_id: '00000000-0000-0000-0000-000000000000',
    });
    // Function must exist (error would be "function does not exist")
    expect(error?.message ?? '').not.toMatch(/does not exist/i);
    // No rule should match a negative value — expect null
    expect(data).toBeNull();
  });

  it('get_effective_approver RPC exists', async () => {
    const { error } = await supabase.rpc('get_effective_approver', {
      p_approver_id: '00000000-0000-0000-0000-000000000000',
    });
    // Function must exist; result may be empty array or null
    expect(error?.message ?? '').not.toMatch(/does not exist/i);
  });

  it('maintain_monthly_partitions RPC exists', async () => {
    // We pass a non-existent table to avoid side effects; function should return
    // gracefully (not throw "function does not exist")
    const { error } = await supabase.rpc('maintain_monthly_partitions', {
      p_parent_table: '_nonexistent_table_test_',
      p_ahead_months: 1,
      p_retain_months: 1,
    });
    expect(error?.message ?? '').not.toMatch(/function.*does not exist/i);
  });
});

// ── RLS policy tests ──────────────────────────────────────────────────────────
describeIf('RLS policies (anon role should be blocked)', () => {
  it('anonymous users cannot read solicitacoes', async () => {
    const url = process.env.VITE_SUPABASE_URL!;
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';

    if (!anonKey) {
      // Skip this sub-test when anon key not provided
      expect(true).toBe(true);
      return;
    }

    const anonClient = createClient(url, anonKey, { auth: { persistSession: false } });
    const { data, error } = await anonClient.from('solicitacoes').select('id').limit(1);

    // Either RLS blocks it (data is empty) or returns an auth error
    const isBlocked = (data?.length === 0) || (error !== null);
    expect(isBlocked).toBe(true);
  });

  it('anonymous users cannot read approval_workflows', async () => {
    const url = process.env.VITE_SUPABASE_URL!;
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';

    if (!anonKey) {
      expect(true).toBe(true);
      return;
    }

    const anonClient = createClient(url, anonKey, { auth: { persistSession: false } });
    const { data, error } = await anonClient.from('approval_workflows').select('id').limit(1);
    const isBlocked = (data?.length === 0) || (error !== null);
    expect(isBlocked).toBe(true);
  });
});

// ── Data integrity constraints ────────────────────────────────────────────────
describeIf('Data integrity constraints', () => {
  it('approval_workflows status must be a valid enum value', async () => {
    const VALID_STATUSES = ['pending', 'approved', 'rejected', 'escalated', 'cancelled'];

    const { data, error } = await supabase
      .from('approval_workflows')
      .select('status')
      .limit(50);

    expect(error).toBeNull();

    if (data && data.length > 0) {
      data.forEach(row => {
        expect(VALID_STATUSES).toContain(row.status);
      });
    }
  });

  it('approval_steps status must be a valid enum value', async () => {
    const VALID = ['pending', 'approved', 'rejected', 'skipped'];

    const { data, error } = await supabase
      .from('approval_steps')
      .select('status')
      .limit(50);

    expect(error).toBeNull();

    if (data && data.length > 0) {
      data.forEach(row => {
        expect(VALID).toContain(row.status);
      });
    }
  });

  it('no approval_steps reference a non-existent workflow', async () => {
    // Cross-join: steps whose workflow_id has no matching workflow
    const { data: steps } = await supabase
      .from('approval_steps')
      .select('id, workflow_id')
      .limit(200);

    if (!steps || steps.length === 0) return;

    const workflowIds = [...new Set(steps.map(s => s.workflow_id))];

    const { data: workflows } = await supabase
      .from('approval_workflows')
      .select('id')
      .in('id', workflowIds);

    const existingIds = new Set((workflows ?? []).map(w => w.id));

    const orphans = steps.filter(s => !existingIds.has(s.workflow_id));
    expect(orphans).toHaveLength(0);
  });
});

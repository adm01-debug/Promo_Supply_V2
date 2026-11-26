/**
 * F-051 / etapa 300: schema, RPC e RLS do Supabase.
 *
 * Duas camadas:
 *
 * 1. ESTATICA (roda sempre, sem rede) — le supabase/migrations/*.sql e prova que
 *    tabelas, colunas, RPCs e `enable row level security` estao versionados.
 *    Antes desta camada a suite inteira era `describe.skip` controlado por
 *    INTEGRATION_TESTS — variavel que nenhum workflow define — entao os 13 testes
 *    apareciam como "skipped" em todo CI e nada verificava o schema de verdade
 *    (ver docs/qa/04-PLANO.md, etapa 300).
 *
 * 2. AO VIVO (opt-in) — apenas o que depende do banco real: residuo de execucao
 *    antiga, bloqueio do role anon e integridade dos dados gravados.
 *
 * PREREQUISITOS DA CAMADA AO VIVO (use um projeto de staging, nunca producao):
 *     VITE_SUPABASE_URL         – Supabase project URL
 *     SUPABASE_SERVICE_ROLE_KEY – Service-role key (somente leitura nesta suite)
 *     INTEGRATION_TESTS=true    – Trava contra execucao acidental
 *
 * COMO RODAR A CAMADA AO VIVO
 *     INTEGRATION_TESTS=true npx vitest run src/tests/integration/supabase-db.test.ts
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ── Camada estatica: leitura das migrations ───────────────────────────────────
const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations');

const SQL = readdirSync(MIGRATIONS_DIR)
  .filter((nome) => nome.endsWith('.sql'))
  .sort()
  .map((nome) => `-- ${nome}\n${readFileSync(join(MIGRATIONS_DIR, nome), 'utf8')}`)
  .join('\n');

/** Blocos `create table` da tabela mais todos os `alter table` posteriores. */
function definicaoTabela(tabela: string): string {
  const criar = new RegExp(
    `create\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?(?:public\\.)?"?${tabela}"?\\s*\\([\\s\\S]*?\\n\\);`,
    'gi',
  );
  const alterar = new RegExp(
    `alter\\s+table\\s+(?:only\\s+)?(?:public\\.)?"?${tabela}"?\\b[\\s\\S]*?;`,
    'gi',
  );
  return [...SQL.matchAll(criar), ...SQL.matchAll(alterar)].map((m) => m[0]).join('\n');
}

const TABELAS_DO_FLUXO = [
  'profiles', 'solicitacoes', 'cotacoes', 'fornecedores', 'pedidos',
  'approval_workflows', 'approval_steps', 'approval_rules', 'approval_history',
  'cron_heartbeats',
] as const;

const COLUNAS_WORKFLOWS = [
  'id', 'solicitacao_id', 'rule_id', 'status', 'etapa_atual', 'total_etapas',
  'valor', 'prazo_limite', 'organization_id',
] as const;

const COLUNAS_STEPS = [
  'id', 'workflow_id', 'etapa', 'aprovador_id', 'aprovador_efetivo_id', 'status',
  'prazo_limite', 'organization_id',
] as const;

const RPCS = ['find_approval_rule', 'get_effective_approver', 'maintain_monthly_partitions'] as const;

const TABELAS_COM_RLS = [
  'approval_workflows', 'approval_steps', 'approval_history', 'solicitacoes',
] as const;

describe('Supabase: schema versionado nas migrations (sem rede)', () => {
  it('as tabelas do fluxo existem em supabase/migrations', () => {
    for (const tabela of TABELAS_DO_FLUXO) {
      expect(definicaoTabela(tabela), `tabela '${tabela}' sem create table em supabase/migrations`)
        .toMatch(/create\s+table/i);
    }
  });

  it('approval_workflows declara as colunas esperadas', () => {
    const definicao = definicaoTabela('approval_workflows');
    for (const coluna of COLUNAS_WORKFLOWS) {
      expect(definicao, `coluna '${coluna}' ausente em approval_workflows`)
        .toMatch(new RegExp(`\\b${coluna}\\b`));
    }
  });

  it('approval_steps declara as colunas esperadas', () => {
    const definicao = definicaoTabela('approval_steps');
    for (const coluna of COLUNAS_STEPS) {
      expect(definicao, `coluna '${coluna}' ausente em approval_steps`)
        .toMatch(new RegExp(`\\b${coluna}\\b`));
    }
  });

  it('as RPCs de aprovacao existem em supabase/migrations', () => {
    for (const rpc of RPCS) {
      expect(SQL, `funcao '${rpc}' sem create or replace function em supabase/migrations`)
        .toMatch(new RegExp(`create\\s+or\\s+replace\\s+function\\s+(?:public\\.)?"?${rpc}"?\\b`, 'i'));
    }
  });

  it('RLS esta habilitada nas tabelas do fluxo', () => {
    for (const tabela of TABELAS_COM_RLS) {
      expect(SQL, `RLS nao habilitada em '${tabela}'`)
        .toMatch(new RegExp(
          `alter\\s+table\\s+(?:only\\s+)?(?:public\\.)?"?${tabela}"?\\s+enable\\s+row\\s+level\\s+security`,
          'i',
        ));
    }
  });
});

// ── Camada ao vivo (opt-in) ───────────────────────────────────────────────────
const INTEGRATION = process.env.INTEGRATION_TESTS === 'true';
const describeIf = INTEGRATION ? describe : describe.skip;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';

let supabase: SupabaseClient;

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

// Sem afterAll destrutivo: esta suite nao escreve nada, entao nao ha o que limpar.
// O bloco anterior fazia `.delete().eq('detalhes->>test_marker', ...)` com service_role
// — um DELETE real em producao (o unico alvo possivel deste repo) que so nao apagava
// nada porque nenhum teste usava o marcador. Substituido por uma checagem somente
// leitura: se houver residuo de execucao antiga, o teste falha e o dono investiga.
describeIf('Sem residuo de execucao antiga', () => {
  it('nenhuma linha de approval_history carrega marcador de teste', async () => {
    // Prefixo fixo (sem Date.now()): pega residuo de QUALQUER execucao antiga, nao so da atual.
    const { data, error } = await supabase
      .from('approval_history')
      .select('id')
      .like('detalhes->>test_marker', 'integration-test-%')
      .limit(1);
    expect(error).toBeNull();
    expect(data ?? []).toEqual([]);
  });
});

describeIf('RLS aplicada no banco real (anon deve ser bloqueado)', () => {
  it.skipIf(!ANON_KEY)('anonymous users cannot read solicitacoes', async () => {
    const anonClient = createClient(process.env.VITE_SUPABASE_URL!, ANON_KEY, {
      auth: { persistSession: false },
    });
    const { data, error } = await anonClient.from('solicitacoes').select('id').limit(1);

    // Either RLS blocks it (data is empty) or returns an auth error
    const isBlocked = (data?.length === 0) || (error !== null);
    expect(isBlocked).toBe(true);
  });

  it.skipIf(!ANON_KEY)('anonymous users cannot read approval_workflows', async () => {
    const anonClient = createClient(process.env.VITE_SUPABASE_URL!, ANON_KEY, {
      auth: { persistSession: false },
    });
    const { data, error } = await anonClient.from('approval_workflows').select('id').limit(1);
    const isBlocked = (data?.length === 0) || (error !== null);
    expect(isBlocked).toBe(true);
  });
});

describeIf('Integridade dos dados gravados', () => {
  it('approval_workflows status must be a valid enum value', async () => {
    const VALID_STATUSES = ['pending', 'approved', 'rejected', 'escalated', 'cancelled'];

    const { data, error } = await supabase
      .from('approval_workflows')
      .select('status')
      .limit(50);

    expect(error).toBeNull();

    data?.forEach((row) => {
      expect(VALID_STATUSES).toContain(row.status);
    });
  });

  it('approval_steps status must be a valid enum value', async () => {
    const VALID = ['pending', 'approved', 'rejected', 'skipped'];

    const { data, error } = await supabase
      .from('approval_steps')
      .select('status')
      .limit(50);

    expect(error).toBeNull();

    data?.forEach((row) => {
      expect(VALID).toContain(row.status);
    });
  });

  it('no approval_steps reference a non-existent workflow', async () => {
    const { data: steps, error: erroSteps } = await supabase
      .from('approval_steps')
      .select('id, workflow_id')
      .limit(200);

    expect(erroSteps).toBeNull();
    if (!steps || steps.length === 0) return; // sem linhas gravadas, nada a cruzar

    const workflowIds = [...new Set(steps.map((s) => s.workflow_id))];

    const { data: workflows } = await supabase
      .from('approval_workflows')
      .select('id')
      .in('id', workflowIds);

    const existingIds = new Set((workflows ?? []).map((w) => w.id));

    const orphans = steps.filter((s) => !existingIds.has(s.workflow_id));
    expect(orphans).toHaveLength(0);
  });
});
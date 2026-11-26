/**
 * Etapa 200 (HK-11): `tenantId` vem do RPC `current_tenant_id()`, cuja definicao em
 * producao so devolve valor quando o JWT traz o claim `tenant_id` -- e nada no
 * repositorio cria esse claim. Com ele ausente a lista de Licitacoes ficava muda
 * (`return []` + `enabled: false`: sem loading, sem erro, sem aviso) e criar licitacao
 * respondia "Login necessario" a um usuario logado. O resto do app ja cai para
 * `organizationId`; aqui o fallback passa a valer tambem.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const auth = vi.hoisted(() => ({
  tenantId: null as string | null,
  organizationId: 'org-1' as string | null,
}));

const toastError = vi.hoisted(() => vi.fn());
const toastSuccess = vi.hoisted(() => vi.fn());

vi.mock('@/features/auth', () => ({
  useAuth: () => ({ user: { id: 'u1' }, tenantId: auth.tenantId, organizationId: auth.organizationId }),
}));
vi.mock('@/lib/feedbackToast', () => ({ toast: { error: toastError, success: toastSuccess } }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() } }));
vi.mock('@/lib/realtime', () => ({ abrirCanalPostgres: vi.fn() }));

const estado = vi.hoisted(() => ({
  operacoes: [] as string[],
  filtroTenant: null as unknown,
  inserido: null as Record<string, unknown> | null,
}));

const linha = {
  id: 'lic-1',
  numero: 'LIC-1',
  objeto: 'Compra de brindes',
  modalidade: 'pregao',
  status: 'aberta',
  tenant_id: 'org-1',
  organization_id: 'org-1',
};

vi.mock('@/integrations/supabase/client', () => {
  type Cadeia = {
    select: (colunas?: string) => Cadeia;
    eq: (coluna: string, valor: unknown) => Cadeia;
    order: () => Cadeia;
    single: () => Promise<unknown>;
    then: (res?: (v: unknown) => unknown, rej?: (r: unknown) => unknown) => Promise<unknown>;
  };
  function construtor(tabela: string, tipo: 'select' | 'insert', payload?: Record<string, unknown>) {
    const b: Cadeia = {
      select() { if (tipo === 'select') estado.operacoes.push(`select:${tabela}`); return b; },
      eq(coluna: string, valor: unknown) { if (coluna === 'tenant_id') estado.filtroTenant = valor; return b; },
      order() { return b; },
      single() { return Promise.resolve({ data: tipo === 'insert' ? { ...linha, ...payload } : null, error: null }); },
      then(res?: (v: unknown) => unknown, rej?: (r: unknown) => unknown) {
        return Promise.resolve({ data: tipo === 'select' ? [linha] : [], error: null }).then(res, rej);
      },
    };
    return b;
  }
  return {
    supabase: {
      rpc: () => Promise.resolve({ data: 'LIC-1', error: null }),
      from: (tabela: string) => ({
        select: () => construtor(tabela, 'select').select(),
        insert: (payload: Record<string, unknown>) => {
          estado.operacoes.push(`insert:${tabela}`);
          estado.inserido = payload;
          return construtor(tabela, 'insert', payload);
        },
      }),
    },
  };
});

import { useLicitacoes } from '@/hooks/useLicitacoes';

function montar() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useLicitacoes(), { wrapper });
}

describe('useLicitacoes - fallback de empresa (etapa 200 / HK-11)', () => {
  beforeEach(() => {
    estado.operacoes.length = 0;
    estado.filtroTenant = null;
    estado.inserido = null;
    toastError.mockClear();
    toastSuccess.mockClear();
    auth.tenantId = null;
    auth.organizationId = 'org-1';
  });

  it('carrega a lista pela empresa quando o claim tenant_id nao vem no JWT', async () => {
    const { result } = montar();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await waitFor(() => expect(result.current.licitacoes).toHaveLength(1));

    expect(estado.operacoes).toContain('select:licitacoes');
    expect(estado.filtroTenant).toBe('org-1');
  });

  it('cria licitacao sem acusar login ausente quando so a empresa esta disponivel', async () => {
    const { result } = montar();

    await act(async () => {
      await result.current.createLicitacao({ objeto: 'Compra de brindes' });
    });

    expect(estado.inserido).not.toBeNull();
    expect(estado.inserido?.tenant_id).toBe('org-1');
    expect(estado.inserido?.organization_id).toBe('org-1');
    expect(estado.inserido?.created_by).toBe('u1');
    expect(toastError).not.toHaveBeenCalled();
  });

  it('prefere o tenant do claim quando ele existe, mesmo com empresa definida', async () => {
    auth.tenantId = 'tenant-1';

    const { result } = montar();

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(estado.filtroTenant).toBe('tenant-1');
  });

  it('nao consulta nada quando nao ha claim nem empresa', async () => {
    auth.organizationId = null;

    const { result } = montar();

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(estado.operacoes).not.toContain('select:licitacoes');
  });
});
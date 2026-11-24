import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useFornecedores } from '../useFornecedores';
import { toast } from '@/lib/feedbackToast';

// Etapa QA 119 (VAL-09): fornecedores.cnpj tem UNIQUE global, sem empresa. A
// segunda empresa recebia o texto cru do Postgres sobre um registro que a RLS
// nao deixava ver. Aqui: pre-checagem do CNPJ normalizado e traducao do 23505.

const h = vi.hoisted(() => ({
  cnpjCadastrado: null as null | { id: string; razao_social: string },
  erroChecagem: null as unknown,
  erroInsert: null as unknown,
  cnpjsConsultados: [] as string[],
  inseridos: [] as Array<Record<string, unknown>>,
}));

vi.mock('@/features/auth', () => ({
  useAuth: () => ({
    user: { id: 'u1', email: 'qa@empresa.com' },
    organizationId: 'df60b900-ede4-45db-8573-da40d13bf767',
    tenantId: '39838251-a1d7-4437-b47a-7329efe8f68f',
  }),
}));

vi.mock('@/lib/feedbackToast', () => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock('@/hooks/useRealtimeSubscription', () => ({
  useRealtimeSubscription: () => undefined,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: () => Promise.resolve({ data: 'FOR-012', error: null }),
    from: (table: string) => ({
      select: () => ({
        order: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
        eq: (_col: string, valor: string) => {
          h.cnpjsConsultados.push(valor);
          return {
            maybeSingle: () => Promise.resolve({ data: h.cnpjCadastrado, error: h.erroChecagem }),
          };
        },
      }),
      insert: (payload: Record<string, unknown>) => {
        if (table === 'fornecedores') h.inseridos.push(payload);
        return {
          select: () => ({
            single: () =>
              Promise.resolve(
                h.erroInsert
                  ? { data: null, error: h.erroInsert }
                  : { data: { id: 'f1', ...payload }, error: null },
              ),
          }),
          then: (resolve: (v: unknown) => unknown) => resolve({ data: null, error: null }),
        };
      },
    }),
  },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

async function cadastrar(input: Parameters<ReturnType<typeof useFornecedores>['createFornecedor']>[0]) {
  const { result } = renderHook(() => useFornecedores(), { wrapper });
  let retorno: unknown;
  await act(async () => {
    retorno = await result.current.createFornecedor(input);
  });
  return retorno;
}

describe('useFornecedores · createFornecedor (VAL-09)', () => {
  beforeEach(() => {
    h.cnpjCadastrado = null;
    h.erroChecagem = null;
    h.erroInsert = null;
    h.cnpjsConsultados.length = 0;
    h.inseridos.length = 0;
    vi.mocked(toast.error).mockClear();
  });

  it('consulta o CNPJ sem mascara e barra antes do insert quando ja existe', async () => {
    h.cnpjCadastrado = { id: 'f9', razao_social: 'Alfa Ltda' };

    const retorno = await cadastrar({ razao_social: 'Alfa 2', cnpj: '11.222.333/0001-81' });

    expect(h.cnpjsConsultados).toEqual(['11222333000181']);
    expect(h.inseridos).toHaveLength(0);
    expect(retorno).toBeNull();
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Alfa Ltda'));
  });

  it('traduz o 23505 de CNPJ quando o conflito vem de outra empresa (RLS esconde)', async () => {
    h.erroInsert = {
      code: '23505',
      message: 'duplicate key value violates unique constraint "fornecedores_cnpj_key"',
      details: 'Key (cnpj)=(11222333000181) already exists.',
    };

    const retorno = await cadastrar({ razao_social: 'Beta', cnpj: '11.222.333/0001-81' });

    expect(h.inseridos).toHaveLength(1);
    expect(retorno).toBeNull();
    const mensagem = vi.mocked(toast.error).mock.calls[0][0] as string;
    expect(mensagem).toContain('CNPJ');
    expect(mensagem).not.toContain('duplicate key');
    expect(mensagem).not.toContain('23505');
  });

  it('mantem o cadastro funcionando quando nao ha duplicidade', async () => {
    const retorno = await cadastrar({ razao_social: 'Gama', cnpj: '11.222.333/0001-81' });

    expect(h.inseridos).toHaveLength(1);
    expect(h.inseridos[0].cnpj).toBe('11.222.333/0001-81');
    expect(retorno).toMatchObject({ id: 'f1' });
    expect(toast.success).toHaveBeenCalledWith('Fornecedor cadastrado com sucesso!');
  });

  it('nao bloqueia o cadastro quando a pre-checagem falha por outro motivo', async () => {
    h.erroChecagem = { code: '42501', message: 'permission denied' };

    await cadastrar({ razao_social: 'Delta', cnpj: '11.222.333/0001-81' });

    expect(h.inseridos).toHaveLength(1);
  });

  it('nao consulta CNPJ quando o fornecedor e cadastrado sem CNPJ', async () => {
    await cadastrar({ razao_social: 'Sem documento' });

    expect(h.cnpjsConsultados).toEqual([]);
    expect(h.inseridos).toHaveLength(1);
  });
});
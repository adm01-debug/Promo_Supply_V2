import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';

// Etapa QA 119 (VAL-09): cost_centers.code e UNIQUE global, sem empresa. Antes,
// o usuario da segunda empresa recebia o texto cru do Postgres sobre um registro
// que a RLS escondia dele.

const h = vi.hoisted(() => ({
  codigoExistente: null as null | { id: string; name: string },
  erroInsert: null as unknown,
  inseridos: [] as Array<Record<string, unknown>>,
}));

vi.mock('@/features/layout/components/MainLayout', () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/animations/MotionComponents', () => ({
  PageTransition: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/features/solicitacoes', () => ({
  useSolicitacoes: () => ({
    costCenters: [{ id: 'cc-1', name: 'Marketing', code: 'CC-001', is_active: true }],
    loadingCostCenters: false,
  }),
}));

vi.mock('@/lib/feedbackToast', () => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
}));

vi.mock('@/features/auth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'admin@empresa.com' },
    tenantId: 'tenant-1',
    organizationId: 'org-1',
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        order: () => Promise.resolve({ data: [], error: null }),
        eq: () => ({ maybeSingle: () => Promise.resolve({ data: h.codigoExistente, error: null }) }),
      }),
      insert: (payload: Record<string, unknown>) => {
        h.inseridos.push(payload);
        return Promise.resolve({ data: null, error: h.erroInsert });
      },
      update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
      delete: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
    }),
  },
}));

import { toast } from '@/lib/feedbackToast';
import ConfiguracoesCentroCusto from '../ConfiguracoesCentroCusto';

function montar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ConfiguracoesCentroCusto />
    </QueryClientProvider>,
  );
}

async function preencherESalvar(nome: string, codigo: string) {
  fireEvent.click(screen.getByRole('button', { name: /Novo Centro de Custo/i }));
  fireEvent.change(await screen.findByPlaceholderText('Ex: Marketing'), { target: { value: nome } });
  fireEvent.change(screen.getByPlaceholderText('Ex: CC-001'), { target: { value: codigo } });
  fireEvent.click(screen.getByRole('button', { name: /Criar Centro de Custo/i }));
}

describe('ConfiguracoesCentroCusto · codigo unico (VAL-09)', () => {
  beforeEach(() => {
    h.codigoExistente = null;
    h.erroInsert = null;
    h.inseridos.length = 0;
    vi.mocked(toast.error).mockClear();
    vi.mocked(toast.success).mockClear();
  });
  afterEach(() => cleanup());

  it('barra o codigo ja usado e diz qual centro de custo o usa', async () => {
    h.codigoExistente = { id: 'cc-1', name: 'Marketing' };

    montar();
    await preencherESalvar('Marketing 2', 'CC-001');

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(h.inseridos).toHaveLength(0);
    const mensagem = vi.mocked(toast.error).mock.calls[0][0] as string;
    expect(mensagem).toContain('CC-001');
    expect(mensagem).toContain('Marketing');
  });

  it('traduz o 23505 quando o codigo existe em outra empresa', async () => {
    h.erroInsert = {
      code: '23505',
      message: 'duplicate key value violates unique constraint "cost_centers_code_key"',
      details: 'Key (code)=(CC-009) already exists.',
    };

    montar();
    await preencherESalvar('Operacoes', 'CC-009');

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(h.inseridos).toHaveLength(1);
    const mensagem = vi.mocked(toast.error).mock.calls[0][0] as string;
    expect(mensagem).toContain('CC-009');
    expect(mensagem).not.toContain('duplicate key');
  });

  it('cria o centro de custo quando o codigo esta livre', async () => {
    montar();
    await preencherESalvar('Operacoes', 'CC-009');

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Centro de custo criado'));
    expect(h.inseridos).toHaveLength(1);
    expect(h.inseridos[0].code).toBe('CC-009');
    expect(h.inseridos[0].name).toBe('Operacoes');
    expect(h.inseridos[0].tenant_id).toBe('tenant-1');
  });
});
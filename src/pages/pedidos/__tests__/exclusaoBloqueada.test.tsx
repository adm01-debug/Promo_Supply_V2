import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';

const h = vi.hoisted(() => ({
  pedidos: [] as Record<string, unknown>[],
}));

vi.mock('@/features/pedidos', () => ({
  usePedidos: () => ({
    pedidos: h.pedidos,
    loading: false,
    refetch: vi.fn(),
    bulkUpdateStatus: vi.fn(async () => true),
    bulkDelete: vi.fn(async () => true),
  }),
  usePedidosKPIs: () => ({
    kpis: { total: 1, pendentes: 1, emTransito: 0, entregues: 0, valorTotal: 100 },
  }),
}));
vi.mock('@/hooks/useFornecedores', () => ({ useFornecedores: () => ({ fornecedores: [] }) }));
vi.mock('@/features/empresas/hooks/useEmpresaFilter', () => ({ useEmpresaFilter: () => ({ empresaIds: [] }) }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));
vi.mock('@/lib/feedbackToast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({ order: vi.fn(() => ({ limit: vi.fn(async () => ({ data: [], error: null })) })) })),
    })),
    channel: vi.fn(() => ({ on: vi.fn(() => ({ subscribe: vi.fn() })), subscribe: vi.fn() })),
  },
}));

import { MemoryRouter } from 'react-router-dom';
import Pedidos from '../Pedidos';

function pedido(id: string, status: string) {
  return {
    id,
    numero: id,
    status,
    valor_total: 100,
    valor_frete: 0,
    desconto: 0,
    data_emissao: '2026-01-05',
    data_previsao: '2026-02-05',
    data_entrega: null,
    fornecedor_id: 'f1',
    solicitacao_id: null,
    cotacao_id: null,
    condicao_pagamento: null,
    endereco_entrega: null,
    observacoes: null,
    comprador_id: 'u1',
    organization_id: 'org-1',
    tenant_id: 'org-1',
    created_at: '2026-01-05T10:00:00.000Z',
    updated_at: '2026-01-05T10:00:00.000Z',
    fornecedor: { id: 'f1', razao_social: 'Fornecedor Teste', nome_fantasia: null, email: null },
    solicitacao: null,
  };
}

function renderPagina() {
  render(
    <MemoryRouter>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <Pedidos />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

function marcarLinhas(indices: number[]) {
  const checkboxes = screen.getAllByRole('checkbox');
  for (const indice of indices) fireEvent.click(checkboxes[indice]);
}

async function abrirAcoesEmMassa() {
  fireEvent.click(screen.getByRole('button', { name: /A\u00e7\u00f5es em Massa/i }));
  await screen.findByText('Selecione uma a\u00e7\u00e3o:');
}

beforeEach(() => {
  h.pedidos = [];
});

afterEach(() => {
  cleanup();
});

describe('acao de excluir na lista de pedidos', () => {
  it('some quando o pedido selecionado ja entrou no ciclo de recebimento', async () => {
    h.pedidos = [pedido('P-ENTREGUE', 'entregue')];
    renderPagina();
    marcarLinhas([1]);

    await abrirAcoesEmMassa();

    expect(screen.getByText('Alterar Status')).toBeTruthy();
    expect(screen.queryByText('Excluir')).toBeNull();
  });

  it('continua disponivel para pedido pendente', async () => {
    h.pedidos = [pedido('P-PENDENTE', 'pendente')];
    renderPagina();
    marcarLinhas([1]);

    await abrirAcoesEmMassa();

    expect(screen.getByText('Excluir')).toBeTruthy();
  });

  it('some na selecao mista de pendente com entregue', async () => {
    h.pedidos = [pedido('P-PENDENTE', 'pendente'), pedido('P-ENTREGUE', 'entregue')];
    renderPagina();
    marcarLinhas([1, 2]);

    await abrirAcoesEmMassa();

    expect(screen.getByText('Alterar Status')).toBeTruthy();
    expect(screen.queryByText('Excluir')).toBeNull();
  });
});

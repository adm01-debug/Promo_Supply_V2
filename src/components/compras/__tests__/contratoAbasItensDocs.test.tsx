import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ContractDetailsModal } from '../ContractDetailsModal';
import type { Contract } from '@/types/contract';

/**
 * Etapa 292 - o modal declarava 6 abas e so tinha 4 `TabsContent`: "Itens (n)" e
 * "Docs (n)" mostravam a contagem e abriam em branco, e `handleUploadDocument`
 * (upload no bucket `documentos` + insert em `contract_documents`) nao era
 * referenciado por nenhum elemento. Os mocks de Tabs/Dialog renderizam todos os
 * contents de uma vez para medir a paridade gatilho/conteudo sem depender do
 * Radix no jsdom.
 */

const { inserirDocumento, uploadStorage, documentosInseridos } = vi.hoisted(() => {
  const recebidos: Record<string, unknown>[] = [];
  return {
    documentosInseridos: recebidos,
    inserirDocumento: vi.fn((valores: Record<string, unknown>) => {
      recebidos.push(valores);
      return Promise.resolve({ error: null });
    }),
    uploadStorage: vi.fn(() => Promise.resolve({ error: null })),
  };
});

vi.mock('@/integrations/supabase/client', () => {
  const linhas: Record<string, unknown[]> = {
    contract_items: [
      { id: 'i1', contract_id: 'c1', item_name: 'Camiseta Polo', description: null, unit: 'un', quantity: 10, unit_price: 25, total_price: 250 },
    ],
    contract_documents: [
      { id: 'd1', contract_id: 'c1', file_name: 'contrato-assinado.pdf', file_url: 't1/u1/contracts/c1/contrato-assinado.pdf', file_type: 'application/pdf', file_size: 2048, uploaded_by: 'u1', created_at: '2026-11-01T10:00:00.000Z' },
    ],
    order_contracts: [
      { id: 'o1', contract_id: 'c1', order_id: 'p1', tenant_id: 't1', created_at: '2026-11-01T10:00:00.000Z' },
    ],
    contract_history: [],
    contract_penalties: [],
  };
  const tabela = (nome: string) => {
    const api: any = {
      select: () => api,
      eq: () => api,
      order: () => api,
      insert: (valores: unknown) => {
        inserirDocumento(valores as Record<string, unknown>);
        return api;
      },
      then: (res: any, rej: any) => Promise.resolve({ data: linhas[nome] ?? [], error: null }).then(res, rej),
    };
    return api;
  };
  return {
    supabase: {
      from: (nome: string) => tabela(nome),
      storage: { from: () => ({ upload: uploadStorage }) },
    },
  };
});

vi.mock('@/features/auth', () => ({
  useAuth: () => ({ user: { id: 'u1' }, tenantId: 't1' }),
}));

vi.mock('@/lib/feedbackToast', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: any) => <div>{children}</div>,
  TabsList: ({ children }: any) => <div>{children}</div>,
  TabsTrigger: ({ value, children }: any) => <div data-trigger={value}>{children}</div>,
  TabsContent: ({ value, children }: any) => <div data-content={value}>{children}</div>,
}));

const contrato: Contract = {
  id: 'c1',
  contract_number: 'CT-2026-001',
  title: 'Contrato de fornecimento',
  description: null,
  supplier_id: 's1',
  supplier_name: 'Fornecedor Teste',
  contract_type: 'supply',
  status: 'active',
  start_date: '2026-01-01',
  end_date: '2026-12-31',
  total_value: 250,
  payment_terms: '30 dias',
  renewal_type: 'manual',
  renewal_notice_days: 30,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

/** Renderiza e espera o fetch das abas resolver, para nao deixar update fora de act(). */
async function montar() {
  const resultado = render(<ContractDetailsModal open onOpenChange={() => {}} contract={contrato} />);
  await screen.findByRole('table', { name: 'Itens do contrato' });
  return resultado;
}

describe('ContractDetailsModal - abas Itens e Docs (etapa 292)', () => {
  beforeEach(() => {
    inserirDocumento.mockClear();
    uploadStorage.mockClear();
  });

  it('todo gatilho de aba tem um conteudo correspondente', async () => {
    const { container } = await montar();
    const gatilhos = Array.from(container.querySelectorAll('[data-trigger]')).map((el) => el.getAttribute('data-trigger'));
    const conteudos = Array.from(container.querySelectorAll('[data-content]')).map((el) => el.getAttribute('data-content'));
    expect(gatilhos.length).toBeGreaterThan(0);
    expect([...conteudos].sort()).toEqual([...gatilhos].sort());
    expect(conteudos).toContain('items');
    expect(conteudos).toContain('docs');
  });

  it('lista os itens do contrato e as ordens de compra vinculadas', async () => {
    await montar();
    expect(screen.getByText('Camiseta Polo')).toBeInTheDocument();
    expect(screen.getByText(/ordem de compra vinculada a este contrato/)).toBeInTheDocument();
  });

  it('lista os documentos e expoe o input de anexo', async () => {
    await montar();
    expect(screen.getByText('contrato-assinado.pdf')).toBeInTheDocument();
    expect(screen.getByLabelText('Anexar documento ao contrato')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Anexar documento/i })).toBeInTheDocument();
  });

  it('envia o arquivo escolhido para contract_documents', async () => {
    await montar();
    const entrada = screen.getByLabelText('Anexar documento ao contrato') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(entrada, {
        target: { files: [new File(['conteudo'], 'novo-anexo.pdf', { type: 'application/pdf' })] },
      });
    });
    expect(inserirDocumento).toHaveBeenCalledTimes(1);
    expect(uploadStorage).toHaveBeenCalledTimes(1);
    expect(documentosInseridos).toHaveLength(1);
    expect(documentosInseridos[0]).toMatchObject({
      contract_id: 'c1',
      file_name: 'novo-anexo.pdf',
      file_type: 'application/pdf',
    });
  });
});

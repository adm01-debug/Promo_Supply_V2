import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ContractModal } from '../ContractModal';

/**
 * Etapa 239 - o modal de contrato era o ultimo do fluxo central com `<Label>`
 * solto ao lado de 3 `<SelectTrigger>` sem `id` e de 2 gatilhos de data
 * (`<Button>` dentro de `Popover`): sem `htmlFor`/`id` nem aninhamento nao ha
 * associacao na arvore de acessibilidade e o campo e anunciado so pelo valor.
 * Janela de datas e gatilho de select nao tem texto proprio, entao o nome vinha
 * vazio.
 */

vi.mock('@/integrations/supabase/client', () => {
  const api: any = {
    select: () => api,
    eq: () => api,
    order: () => Promise.resolve({ data: [], error: null }),
    single: () => Promise.resolve({ data: null, error: null }),
    insert: () => api,
    update: () => api,
    then: (res: any, rej: any) => Promise.resolve({ data: null, error: null }).then(res, rej),
  };
  return { supabase: { from: () => api } };
});

vi.mock('@/lib/feedbackToast', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

// ContractModal resolve o tenant do insert via useAuth (tenant_id deixou de ter
// default no banco), entao o teste precisa de um contexto de sessao.
vi.mock('@/features/auth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'comprador@empresa.com' },
    tenantId: 'tenant-1',
    organizationId: 'org-1',
  }),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverContent: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children }: any) => <>{children}</>,
}));

vi.mock('@/components/ui/calendar', () => ({ Calendar: () => null }));
vi.mock('../contract/ContractSLASection', () => ({ ContractSLASection: () => null }));
vi.mock('../contract/ContractItemsEditor', () => ({ ContractItemsEditor: () => null }));
vi.mock('../contract/replaceContractItems', () => ({ replaceContractItems: vi.fn() }));

// Mock fino dos selects do Radix: o gatilho real e um <button id=...>, e o que
// interessa aqui e justamente o id que o componente passa para ele.
vi.mock('@/components/ui/select', () => {
  const Select = ({ children }: any) => <div>{children}</div>;
  const SelectTrigger = ({ id, children }: any) => <button type="button" id={id}>{children}</button>;
  const SelectValue = () => null;
  const SelectContent = ({ children }: any) => <div>{children}</div>;
  const SelectItem = ({ children }: any) => <div>{children}</div>;
  return { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
});

function montar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ContractModal open onOpenChange={() => {}} onSuccess={() => {}} />
    </QueryClientProvider>,
  );
}

describe('ContractModal - nome acessivel dos campos (etapa 239)', () => {
  it('associa os 3 rotulos de select ao gatilho certo', () => {
    montar();
    for (const [rotulo, id] of [
      [/Tipo de Contrato/i, 'contract_type'],
      [/^Status$/i, 'status'],
      [/Tipo de Renova\u00e7\u00e3o/i, 'renewal_type'],
    ] as const) {
      const controle = screen.getByLabelText(rotulo);
      expect(controle.tagName).toBe('BUTTON');
      expect(controle).toHaveAttribute('id', id);
    }
  });

  it('associa as duas janelas de data ao botao que as abre', () => {
    montar();
    const inicio = screen.getByLabelText(/Data In\u00edcio/i);
    expect(inicio.tagName).toBe('BUTTON');
    expect(inicio).toHaveAttribute('id', 'start_date');
    const fim = screen.getByLabelText(/Data Fim/i);
    expect(fim.tagName).toBe('BUTTON');
    expect(fim).toHaveAttribute('id', 'end_date');
  });

  it('todo label[for] do modal aponta para um elemento existente', () => {
    const { container } = montar();
    const labels = Array.from(container.querySelectorAll('label[for]'));
    expect(labels.length).toBeGreaterThanOrEqual(10);
    const orfaos = labels
      .map((l) => l.getAttribute('for') as string)
      .filter((id) => !container.querySelector(`#${id}`));
    expect(orfaos).toEqual([]);
  });

  it('nenhum label do modal ficou sem for', () => {
    const { container } = montar();
    const soltos = Array.from(container.querySelectorAll('label'))
      .filter((l) => !l.getAttribute('for'))
      .map((l) => l.textContent?.trim());
    expect(soltos).toEqual([]);
  });
});

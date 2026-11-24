import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RejectModal, DetailsModal } from '../pending-approvals/ApprovalModals';
import { FornecedorModal } from '../FornecedorModal';

/**
 * Etapa 238 (UX-06 parte 2/3) - os rotulos eram irmaos dos campos sem htmlFor/id
 * (nos modais de aprovacao) ou apontavam para um campo que nao tinha o id (nos
 * dois Selects do cadastro de fornecedor). Aqui a prova e a associacao real:
 * getByLabelText so resolve com o vinculo na arvore de acessibilidade, e o
 * botao so-icone de remover ramo precisa de nome.
 */

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const APROVACAO = {
  id: 'ap-1',
  solicitacao_numero: 'SOL-001',
  descricao: 'Compra de brindes',
  valor: 1234.5,
  solicitante: 'Alfa',
  categoria: 'Brindes',
  aprovadores_anteriores: [],
} as any;

const FORNECEDOR = {
  id: 'forn-1',
  razao_social: 'Alfa LTDA',
  nome_fantasia: 'Alfa Insumos',
  cnpj: '00.000.000/0000-00',
  tipo: 'FABRICANTE',
  ramos: ['Bolsas', 'Canetas'],
  vendeProduto: 'LISO',
  email: 'contato@alfa.com',
  telefone: '(11) 1111-1111',
  whatsapp: '(11) 91111-1111',
} as any;

const semAcao = () => {};

describe('Campos de formulario com nome acessivel (etapa 238)', () => {
  it('o modal de rejeicao associa o rotulo ao motivo', () => {
    render(
      <RejectModal
        open
        onOpenChange={semAcao}
        approval={APROVACAO}
        rejectReason=""
        onRejectReasonChange={semAcao}
        onConfirm={semAcao}
        loading={false}
      />,
    );

    const motivo = screen.getByLabelText(/Motivo da Rejeição/);
    expect(motivo.id).toBe('motivo-rejeicao');
    expect(document.querySelector('label[for="motivo-rejeicao"]')).not.toBeNull();
  });

  it('o modal de detalhes associa o rotulo ao comentario', () => {
    render(
      <DetailsModal
        open
        onOpenChange={semAcao}
        approval={APROVACAO}
        approveComment=""
        onApproveCommentChange={semAcao}
        onConfirm={semAcao}
      />,
    );

    expect(screen.getByLabelText(/Comentários da Aprovação/).id).toBe('comentario-aprovacao');
    expect(document.querySelector('label[for="comentario-aprovacao"]')).not.toBeNull();
  });

  it('o cadastro de fornecedor nomeia os campos, inclusive os dois selects e os ramos', () => {
    render(<FornecedorModal open onOpenChange={semAcao} onSave={semAcao} />);

    expect(screen.getByLabelText('Razão Social *').id).toBe('razao_social');
    expect(screen.getByLabelText('Nome Fantasia *').id).toBe('nome_fantasia');
    expect(screen.getByLabelText('CNPJ *').id).toBe('cnpj');
    expect(screen.getByLabelText('Tipo *').id).toBe('tipo');
    expect(screen.getByLabelText('Ramos de Atuação').id).toBe('ramos');
    expect(screen.getByLabelText('Tipo de Produto *').id).toBe('vendeProduto');
    expect(screen.getByLabelText('E-mail *').id).toBe('email');
    expect(screen.getByLabelText('Telefone').id).toBe('telefone');
    expect(screen.getByLabelText('WhatsApp *').id).toBe('whatsapp');
  });

  it('nenhum rotulo do cadastro de fornecedor sobra sem destino', () => {
    render(<FornecedorModal open onOpenChange={semAcao} onSave={semAcao} />);

    const rotulos = Array.from(document.querySelectorAll('label[for]'));
    expect(rotulos).toHaveLength(9);
    for (const r of rotulos) {
      expect(document.getElementById(r.getAttribute('for') as string)).not.toBeNull();
    }
  });

  it('o botao so-icone de remover ramo tem nome com o ramo em questao', () => {
    render(<FornecedorModal open onOpenChange={semAcao} fornecedor={FORNECEDOR} onSave={semAcao} />);

    const remover = screen.getByRole('button', { name: 'Remover ramo Bolsas' });
    expect(remover).toHaveAttribute('aria-label', 'Remover ramo Bolsas');
    fireEvent.click(remover);

    expect(screen.getByRole('button', { name: 'Remover ramo Canetas' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Remover ramo Bolsas' })).toBeNull();
  });
});

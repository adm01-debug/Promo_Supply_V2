import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CotacaoManualModal } from '../CotacaoManualModal';
import { Step1Identification, Step2Specifications, Step3Values } from '../solicitacao/SolicitacaoFormSteps';

/**
 * Etapa 237 (UX-06 parte 1/3) - os <Label> eram irmaos dos campos dentro de um
 * div de espacamento, sem htmlFor/id: o campo obrigatorio era anunciado so com
 * o placeholder. Aqui a prova e a associacao real (getByLabelText so resolve se
 * o vinculo existir) e o vinculo do erro de validacao com o campo
 * (aria-describedby / role=alert / aria-invalid).
 */

vi.mock('@/hooks/useProdutos', () => ({
  useProdutos: () => ({ produtos: [], categorias: [] }),
}));
vi.mock('@/features/solicitacoes', () => ({
  useSolicitacoes: () => ({ costCenters: [], loadingCostCenters: false }),
}));

const FORNECEDORES = [{ id: 'forn-1', nomeFantasia: 'Alfa Insumos' }] as any;

const ROTULOS_DO_MODAL = [
  'Fornecedor *',
  'Valor Unitário (R$) *',
  'Quantidade Disponível *',
  'Prazo Entrega (dias) *',
  'Valor Frete (R$)',
  'Condição de Pagamento *',
  'Validade da Cotação',
  'Observações',
];

const formBase = (extra: Record<string, unknown> = {}) => ({
  empresa: 'Alfa',
  vendedor: '',
  prioridade: 'normal',
  categoriaId: '',
  produto: '',
  quantidade: 1,
  prazoEntrega: '',
  valorEstimado: 0,
  costCenterId: '',
  centroCusto: '',
  tipo: 'PE_LISO',
  observacoes: '',
  anexos: [],
  ...extra,
}) as any;

const semErro = () => ({} as any);
const semAcao = () => {};

describe('Campos de formulario com nome acessivel (etapa 237)', () => {
  it('o modal de cotacao manual associa cada rotulo ao seu campo', () => {
    render(<CotacaoManualModal open onOpenChange={semAcao} onSave={semAcao} fornecedores={FORNECEDORES} />);

    for (const rotulo of ROTULOS_DO_MODAL) {
      expect(screen.getByLabelText(rotulo)).toBeTruthy();
    }
  });

  it('nenhum rotulo do modal sobra sem destino', () => {
    render(<CotacaoManualModal open onOpenChange={semAcao} onSave={semAcao} fornecedores={FORNECEDORES} />);

    const rotulos = Array.from(document.querySelectorAll('label[for]'));
    expect(rotulos).toHaveLength(ROTULOS_DO_MODAL.length);
    for (const r of rotulos) {
      expect(document.getElementById(r.getAttribute('for') as string)).not.toBeNull();
    }
    expect(document.querySelectorAll('label:not([for])')).toHaveLength(0);
  });

  it('a etapa 1 nomeia os campos, o combobox de produto e o grupo de prioridade', () => {
    render(
      <Step1Identification
        formData={formBase()}
        errors={semErro()}
        updateField={semAcao}
        empresas={[{ id: 'e1', nome: 'Alfa' } as any]}
        pessoas={[]}
      />,
    );

    expect(screen.getByLabelText(/Entidade Solicitante/).id).toBe('empresa');
    expect(screen.getByLabelText(/Gestor Responsável/).id).toBe('vendedor');
    expect(screen.getByRole('group', { name: 'Nível de Prioridade Neural' })).toBeTruthy();
  });

  it('o erro de validacao da etapa 1 aponta para o campo e o campo aponta de volta', () => {
    render(
      <Step1Identification
        formData={formBase()}
        errors={{ empresa: 'Selecione a empresa', vendedor: 'Selecione o gestor' }}
        updateField={semAcao}
        empresas={[]}
        pessoas={[]}
      />,
    );

    expect(screen.getAllByRole('alert').map((a) => a.id)).toEqual(['empresa-erro', 'vendedor-erro']);

    const empresa = screen.getByLabelText(/Entidade Solicitante/);
    expect(empresa.getAttribute('aria-describedby')).toBe('empresa-erro');
    expect(empresa.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByLabelText(/Gestor Responsável/).getAttribute('aria-describedby')).toBe('vendedor-erro');
  });

  it('o erro de validacao da etapa 2 aponta para o campo e o campo aponta de volta', () => {
    render(
      <Step2Specifications
        formData={formBase()}
        errors={{ categoriaId: 'Selecione a categoria', produto: 'Selecione o item' }}
        updateField={semAcao}
      />,
    );

    expect(screen.getAllByRole('alert').map((a) => a.id)).toEqual(['categoriaId-erro', 'produto-erro']);

    const categoria = screen.getByLabelText(/Categoria Inteligente/);
    expect(categoria.id).toBe('categoria');
    expect(categoria.getAttribute('aria-describedby')).toBe('categoriaId-erro');
    expect(categoria.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByLabelText(/Item ou Serviço/).getAttribute('aria-describedby')).toBe('produto-erro');
  });

  it('sem erro nenhum o campo nao anuncia descricao nem invalidez', () => {
    render(
      <Step1Identification
        formData={formBase()}
        errors={semErro()}
        updateField={semAcao}
        empresas={[]}
        pessoas={[]}
      />,
    );

    const empresa = screen.getByLabelText(/Entidade Solicitante/);
    expect(empresa.getAttribute('aria-describedby')).toBeNull();
    expect(empresa.getAttribute('aria-invalid')).toBe('false');
  });

  it('os campos de valores recebem rotulo, vinculo de erro e o anexo aponta para o input de arquivo', () => {
    render(
      <Step3Values
        formData={formBase({ valorEstimado: 10 })}
        errors={{ valorEstimado: 'Informe o valor', costCenterId: 'Informe o centro de custo' }}
        updateField={semAcao}
        budgetCheck={null}
        isCheckingBudget={false}
        checkBudget={async () => {}}
        isCompressing={false}
        handleFileUpload={semAcao}
        removeFile={semAcao}
      />,
    );

    const valor = screen.getByLabelText(/Valor Estimado/);
    expect(valor.id).toBe('valorEstimado');
    expect(valor.getAttribute('aria-describedby')).toBe('valorEstimado-erro');
    expect(screen.getByLabelText('Centro de Custo *').id).toBe('costCenterId');
    expect(screen.getByLabelText(/Observações/).id).toBe('observacoes');
    expect(screen.getByLabelText(/Anexos/).id).toBe('file-upload');
    expect(document.querySelectorAll('label[for="file-upload"]')).toHaveLength(2);
    expect(screen.getAllByRole('alert').map((a) => a.id)).toEqual(['valorEstimado-erro', 'costCenterId-erro']);
  });
});

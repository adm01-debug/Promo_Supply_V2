import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { montarPessoas, montarEmpresas, nomeDaPessoa } from '../pessoasDaEmpresa';

describe('montarPessoas', () => {
  it('usa o user_id como id, que e o valor de aprovador_id', () => {
    const [pessoa] = montarPessoas([{ user_id: 'u-1', full_name: 'Ana Costa', email: 'ana@x.com' }]);
    expect(pessoa).toEqual({ id: 'u-1', nome: 'Ana Costa', email: 'ana@x.com' });
  });

  it('cai para display_name e depois e-mail quando nao ha nome completo', () => {
    expect(nomeDaPessoa({ full_name: '   ', display_name: 'Bia', email: 'b@x.com' })).toBe('Bia');
    expect(nomeDaPessoa({ full_name: null, display_name: null, email: 'c@x.com' })).toBe('c@x.com');
    expect(nomeDaPessoa({})).toBe('Sem nome');
  });

  it('descarta linha sem user_id: sem id nao ha o que gravar', () => {
    const pessoas = montarPessoas([
      { user_id: null, full_name: 'Sem id' },
      { user_id: '   ', full_name: 'Espaco' },
      { user_id: 'u-2', full_name: 'Com id' },
    ]);
    expect(pessoas.map((p) => p.id)).toEqual(['u-2']);
  });

  it('nao repete a mesma pessoa e ordena por nome em pt-BR', () => {
    const pessoas = montarPessoas([
      { user_id: 'u-2', full_name: 'Zelia' },
      { user_id: 'u-1', full_name: 'ana' },
      { user_id: 'u-2', full_name: 'Zelia repetida' },
      { user_id: 'u-3', full_name: 'Bruno' },
    ]);
    expect(pessoas.map((p) => p.id)).toEqual(['u-1', 'u-3', 'u-2']);
    expect(pessoas[2].nome).toBe('Zelia');
  });

  it('lista vazia devolve vazio', () => {
    expect(montarPessoas([])).toEqual([]);
  });
});

describe('montarEmpresas', () => {
  it('mapeia nome e cnpj e mantem o id real', () => {
    const [empresa] = montarEmpresas([{ id: 't-1', name: 'Promo Supply', cnpj: '12.345.678/0001-90' }]);
    expect(empresa).toEqual({ id: 't-1', nome: 'Promo Supply', cnpj: '12.345.678/0001-90' });
  });

  it('cnpj vazio vira null e empresa sem nome e descartada', () => {
    const empresas = montarEmpresas([
      { id: 't-1', name: 'Promo Supply', cnpj: '' },
      { id: 't-2', name: '   ' },
      { id: null, name: 'Sem id' },
    ]);
    expect(empresas).toEqual([{ id: 't-1', nome: 'Promo Supply', cnpj: null }]);
  });

  it('nao repete a mesma empresa e ordena por nome', () => {
    const empresas = montarEmpresas([
      { id: 't-2', name: 'Zeta' },
      { id: 't-1', name: 'Alfa' },
      { id: 't-2', name: 'Zeta de novo' },
    ]);
    expect(empresas.map((e) => e.id)).toEqual(['t-1', 't-2']);
  });
});

describe('as telas nao voltam para as listas ficticias', () => {
  const ler = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf-8');

  it('o formulario de solicitacao nao tem nomes de empresa nem de pessoa inventados', () => {
    const fonte = ler('src/components/compras/solicitacao/SolicitacaoFormSteps.tsx');
    expect(fonte).not.toContain('empresasMock');
    expect(fonte).not.toContain('vendedoresMock');
    expect(fonte).not.toContain('João Silva');
    expect(fonte).not.toContain('Score: 9.8');
    expect(fonte).toContain('empresas: EmpresaOpcao[]');
    expect(fonte).toContain('pessoas: PessoaDaEmpresa[]');
    expect(fonte).toContain('value={p.id}');
  });

  it('o modal grava o aprovador real e nao inventa descricao', () => {
    const fonte = ler('src/components/compras/NovaSolicitacaoModal.tsx');
    expect(fonte).toContain('aprovador_id: formData.vendedor || null');
    expect(fonte).not.toContain('Empresa: ${formData.empresa}');
    expect(fonte).toContain('usePessoasDaEmpresa(empresaSelecionada?.id ?? null)');
  });

  it('o filtro avancado lista as empresas do usuario', () => {
    const fonte = ler('src/components/compras/FiltrosAvancados.tsx');
    expect(fonte).not.toContain("'Promo Supply'");
    expect(fonte).not.toContain('João Silva');
    expect(fonte).not.toContain('ABC Ltda');
    expect(fonte).toContain('montarEmpresas(availableEmpresas)');
    expect(fonte).not.toContain('vendedoresOptions');
    expect(fonte).not.toContain('fornecedoresOptions');
  });
});

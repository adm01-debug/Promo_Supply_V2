import { describe, expect, it } from 'vitest';
import {
  MENSAGEM_CHAVE_DUPLICADA,
  mensagemCnpjJaCadastrado,
  mensagemCodigoCentroCustoJaCadastrado,
  mensagemDuplicidadeCentroCusto,
  mensagemDuplicidadeFornecedor,
  somenteDigitos,
} from '../unicidadeCadastro';

function erro23505(constraint: string) {
  return {
    code: '23505',
    message: `duplicate key value violates unique constraint "${constraint}"`,
    details: 'Key already exists.',
  };
}

describe('unicidadeCadastro (VAL-09)', () => {
  it('normaliza CNPJ mascarado para digitos', () => {
    expect(somenteDigitos('12.345.678/0001-90')).toBe('12345678000190');
    expect(somenteDigitos(' 12345678000190 ')).toBe('12345678000190');
    expect(somenteDigitos(null)).toBe('');
  });

  it('cita o fornecedor dono do CNPJ quando o nome e conhecido', () => {
    expect(mensagemCnpjJaCadastrado('Alfa Ltda')).toContain('Alfa Ltda');
    expect(mensagemCnpjJaCadastrado('')).not.toContain('""');
    expect(mensagemCnpjJaCadastrado(null)).toContain('outro fornecedor');
  });

  it('explica o codigo de centro de custo com e sem o nome do dono', () => {
    expect(mensagemCodigoCentroCustoJaCadastrado('CC-001', 'Marketing')).toContain('Marketing');
    expect(mensagemCodigoCentroCustoJaCadastrado('CC-001', null)).toContain('outro centro de custo');
  });

  it('traduz 23505 de CNPJ e de codigo de fornecedor sem vazar o texto do Postgres', () => {
    const cnpj = mensagemDuplicidadeFornecedor(erro23505('fornecedores_cnpj_key'));
    expect(cnpj).toBe(mensagemCnpjJaCadastrado());
    expect(cnpj).not.toContain('duplicate key');
    const codigo = mensagemDuplicidadeFornecedor(erro23505('fornecedores_codigo_key'));
    expect(codigo).toContain('código único');
    expect(codigo).not.toContain('duplicate key');
  });

  it('cai na mensagem generica em 23505 de constraint desconhecida', () => {
    expect(mensagemDuplicidadeFornecedor(erro23505('outra_key'))).toBe(MENSAGEM_CHAVE_DUPLICADA);
    expect(mensagemDuplicidadeCentroCusto(erro23505('outra_key'), 'CC-001')).toBe(MENSAGEM_CHAVE_DUPLICADA);
  });

  it('nao intercepta erro que nao e de unicidade', () => {
    expect(mensagemDuplicidadeFornecedor({ code: '42501', message: 'permission denied' })).toBeNull();
    expect(mensagemDuplicidadeFornecedor(new Error('rede caiu'))).toBeNull();
    expect(mensagemDuplicidadeCentroCusto({ code: '22P02' }, 'CC-001')).toBeNull();
    expect(mensagemDuplicidadeFornecedor(null)).toBeNull();
  });

  it('traduz 23505 de cost_centers_code_key com o codigo informado', () => {
    const msg = mensagemDuplicidadeCentroCusto(erro23505('cost_centers_code_key'), 'CC-001');
    expect(msg).toContain('CC-001');
    expect(msg).not.toContain('duplicate key');
  });
});
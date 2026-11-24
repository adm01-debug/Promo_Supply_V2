// `fornecedores.cnpj`, `fornecedores.codigo` e `cost_centers.code` sao UNIQUE
// globais no banco - nao incluem a empresa (tenant). Quando a segunda empresa usa
// o mesmo valor, o Postgres devolve 23505 citando um registro que a RLS esconde
// dela, entao o erro cru nao diz nada ao usuario. Aqui ficam (a) a normalizacao
// usada na pre-checagem e (b) a traducao do 23505 em frase de negocio.

export function somenteDigitos(valor: string | null | undefined): string {
  return (valor ?? '').replace(/\D/g, '');
}

interface ErroBanco {
  code?: string;
  message?: string;
  details?: string;
}

function lerErro(error: unknown): ErroBanco {
  if (error instanceof Error) return { message: error.message };
  if (error && typeof error === 'object') {
    const e = error as ErroBanco;
    return { code: e.code, message: e.message, details: e.details };
  }
  return {};
}

function textoDoErro(error: unknown): string {
  const e = lerErro(error);
  return `${e.message ?? ''} ${e.details ?? ''}`;
}

export const MENSAGEM_CHAVE_DUPLICADA =
  'Este valor já existe em outro registro do sistema. Cada valor só pode ser cadastrado uma vez: informe outro.';

export function mensagemCnpjJaCadastrado(razaoSocial?: string | null): string {
  const nome = (razaoSocial ?? '').trim();
  return nome
    ? `O CNPJ informado já está no fornecedor "${nome}". Cada CNPJ só pode existir uma vez no sistema.`
    : 'O CNPJ informado já está cadastrado em outro fornecedor. Cada CNPJ só pode existir uma vez no sistema.';
}

export function mensagemCodigoFornecedorJaCadastrado(): string {
  return 'Não foi possível gerar um código único para o fornecedor: o código gerado já existe. Tente cadastrar novamente.';
}

export function mensagemCodigoCentroCustoJaCadastrado(codigo: string, nome?: string | null): string {
  const nomeLimpo = (nome ?? '').trim();
  return nomeLimpo
    ? `O código "${codigo}" já é usado pelo centro de custo "${nomeLimpo}". O código só pode existir uma vez no sistema: escolha outro.`
    : `O código "${codigo}" já é usado por outro centro de custo. O código só pode existir uma vez no sistema: escolha outro.`;
}

export function mensagemDuplicidadeFornecedor(error: unknown): string | null {
  if (lerErro(error).code !== '23505') return null;
  const texto = textoDoErro(error);
  if (texto.includes('fornecedores_cnpj_key') || texto.includes('(cnpj)')) {
    return mensagemCnpjJaCadastrado();
  }
  if (texto.includes('fornecedores_codigo_key') || texto.includes('(codigo)')) {
    return mensagemCodigoFornecedorJaCadastrado();
  }
  return MENSAGEM_CHAVE_DUPLICADA;
}

export function mensagemDuplicidadeCentroCusto(error: unknown, codigo: string): string | null {
  if (lerErro(error).code !== '23505') return null;
  const texto = textoDoErro(error);
  if (texto.includes('cost_centers_code_key') || texto.includes('(code)')) {
    return mensagemCodigoCentroCustoJaCadastrado(codigo);
  }
  return MENSAGEM_CHAVE_DUPLICADA;
}
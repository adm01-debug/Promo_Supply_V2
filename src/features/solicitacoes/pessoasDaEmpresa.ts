/**
 * Opcoes de "Entidade Solicitante" e "Gestor Responsavel" do formulario de
 * solicitacao, montadas a partir do que existe no banco.
 *
 * Antes destas funcoes o formulario oferecia listas fixas ("Promo Supply",
 * "Joao Silva", ...) e gravava o nome escolhido no lugar do vinculo real.
 */

export interface PessoaDaEmpresa {
  /** `profiles.user_id` - e este id que vai para `solicitacoes.aprovador_id`. */
  id: string;
  nome: string;
  email: string | null;
}

export interface ProfileRow {
  user_id?: string | null;
  full_name?: string | null;
  display_name?: string | null;
  email?: string | null;
  tenant_id?: string | null;
}

export interface EmpresaOpcao {
  id: string;
  nome: string;
  cnpj: string | null;
}

export interface EmpresaRow {
  id?: string | null;
  name?: string | null;
  cnpj?: string | null;
}

/** Nome de exibicao de uma pessoa: nome completo, depois display_name, depois e-mail. */
export const nomeDaPessoa = (row: ProfileRow): string =>
  (row.full_name ?? '').trim() || (row.display_name ?? '').trim() || (row.email ?? '').trim() || 'Sem nome';

/**
 * Uma linha por pessoa (o mesmo usuario pode repetir em `profiles` por empresa),
 * ordenada por nome em pt-BR. Linha sem `user_id` e descartada - sem id nao ha
 * o que gravar em `aprovador_id`.
 */
export const montarPessoas = (rows: ProfileRow[]): PessoaDaEmpresa[] => {
  const porId = new Map<string, PessoaDaEmpresa>();
  for (const row of rows) {
    const id = (row.user_id ?? '').trim();
    if (!id || porId.has(id)) continue;
    porId.set(id, { id, nome: nomeDaPessoa(row), email: (row.email ?? '').trim() || null });
  }
  return [...porId.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
};

/** Empresas do grupo do usuario, sem repeticao, ordenadas por nome. */
export const montarEmpresas = (rows: EmpresaRow[]): EmpresaOpcao[] => {
  const porId = new Map<string, EmpresaOpcao>();
  for (const row of rows) {
    const id = (row.id ?? '').trim();
    const nome = (row.name ?? '').trim();
    if (!id || !nome || porId.has(id)) continue;
    porId.set(id, { id, nome, cnpj: (row.cnpj ?? '').trim() || null });
  }
  return [...porId.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
};

/**
 * Regra de conciliacao de NF-e com pedido.
 *
 * O valor total sozinho nao identifica um pedido: dois fornecedores diferentes
 * podem emitir notas do mesmo valor. Por isso o vinculo automatico exige
 * fornecedor igual e candidato unico; qualquer ambiguidade fica sem vinculo,
 * com o motivo gravado para o financeiro decidir na mao.
 */

export const TOLERANCIA_VALOR_CONCILIACAO = 0.01;

export interface PedidoConciliacao {
  id: string;
  numero: string;
  valor_total: number | string | null;
  fornecedor_id?: string | null;
}

export interface NotaConciliacao {
  valor_total: number | string | null;
  fornecedor_id?: string | null;
}

export type MotivoConciliacao =
  | "vinculo-unico"
  | "sem-candidato"
  | "valor-em-outro-fornecedor"
  | "ambiguo"
  | "fornecedor-desconhecido";

export interface ResultadoConciliacao {
  status: "matched" | "unmatched";
  pedido: PedidoConciliacao | null;
  motivoCodigo: MotivoConciliacao;
  motivo: string;
  candidatosMesmoValor: PedidoConciliacao[];
}

const valorNumerico = (valor: number | string | null | undefined): number | null => {
  if (valor === null || valor === undefined || valor === "") return null;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
};

/** Somente os digitos do CNPJ, para comparar o emitente do XML com o cadastro. */
export const normalizarCnpj = (valor: string | null | undefined): string =>
  (valor ?? "").replace(/\D/g, "");

/** Resolve o fornecedor cadastrado a partir do CNPJ do emitente da nota. */
export const resolverFornecedorPorCnpj = (
  fornecedores: Array<{ id: string; cnpj: string | null }> | null | undefined,
  cnpj: string | null | undefined,
): string | null => {
  const alvo = normalizarCnpj(cnpj);
  if (!alvo) return null;
  const encontrado = (fornecedores ?? []).find(
    (fornecedor) => normalizarCnpj(fornecedor.cnpj) === alvo,
  );
  return encontrado?.id ?? null;
};

export const conciliarNotaComPedido = (
  nota: NotaConciliacao,
  pedidos: PedidoConciliacao[] | null | undefined,
): ResultadoConciliacao => {
  const notaValor = valorNumerico(nota.valor_total);
  const lista = pedidos ?? [];

  const candidatosMesmoValor = lista.filter((pedido) => {
    const pedidoValor = valorNumerico(pedido.valor_total);
    return (
      notaValor !== null &&
      pedidoValor !== null &&
      Math.abs(pedidoValor - notaValor) < TOLERANCIA_VALOR_CONCILIACAO
    );
  });

  const fornecedorId = nota.fornecedor_id ?? null;

  if (!fornecedorId) {
    return {
      status: "unmatched",
      pedido: null,
      motivoCodigo: "fornecedor-desconhecido",
      motivo:
        candidatosMesmoValor.length > 0
          ? `Fornecedor da nota nao identificado: ${candidatosMesmoValor.length} pedido(s) com o mesmo valor ficaram sem vinculo. Importe o XML ou vincule manualmente.`
          : "Fornecedor da nota nao identificado: sem vinculo automatico. Importe o XML ou vincule manualmente.",
      candidatosMesmoValor,
    };
  }

  const doFornecedor = candidatosMesmoValor.filter(
    (pedido) => pedido.fornecedor_id === fornecedorId,
  );

  if (doFornecedor.length === 1) {
    return {
      status: "matched",
      pedido: doFornecedor[0],
      motivoCodigo: "vinculo-unico",
      motivo: `Conciliado com pedido ${doFornecedor[0].numero}`,
      candidatosMesmoValor,
    };
  }

  if (doFornecedor.length === 0) {
    return {
      status: "unmatched",
      pedido: null,
      motivoCodigo:
        candidatosMesmoValor.length > 0 ? "valor-em-outro-fornecedor" : "sem-candidato",
      motivo:
        candidatosMesmoValor.length > 0
          ? `Valor igual a ${candidatosMesmoValor.length} pedido(s) de outro fornecedor: nenhum vinculo gravado.`
          : "Nenhum pedido do mesmo fornecedor com este valor.",
      candidatosMesmoValor,
    };
  }

  return {
    status: "unmatched",
    pedido: null,
    motivoCodigo: "ambiguo",
    motivo: `${doFornecedor.length} pedidos do mesmo fornecedor com este valor (${doFornecedor
      .map((pedido) => pedido.numero)
      .join(", ")}): escolha manual necessaria.`,
    candidatosMesmoValor,
  };
};

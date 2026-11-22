/**
 * Monta a abordagem ao fornecedor a partir da estrategia sugerida pela IA.
 * Logica pura (sem DOM) para ser testavel e reaproveitada por WhatsApp e e-mail.
 */

export interface SugestaoNegociacao {
  fornecedor: string;
  estrategia: string;
  valor_contraproposta?: number;
  valor_ponto_recuo?: number;
  argumentos: string[];
  risco?: "baixo" | "medio" | "alto";
  confianca_negociacao?: number;
  tipo_negociacao?: string;
}

export interface ContextoNegociacao {
  numeroSolicitacao?: string | null;
  tituloSolicitacao?: string | null;
  fornecedorEmail?: string | null;
  fornecedorTelefone?: string | null;
}

const formatarBRL = (valor?: number): string | null => {
  if (valor === undefined || valor === null || Number.isNaN(Number(valor))) return null;
  return `R$ ${Number(valor).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const identificacaoDemanda = (ctx: ContextoNegociacao): string => {
  const partes = [ctx.numeroSolicitacao, ctx.tituloSolicitacao].filter(Boolean);
  return partes.length > 0 ? partes.join(" - ") : "a demanda em negociacao";
};

export const normalizarTelefone = (raw?: string | null): string | null => {
  const digitos = (raw ?? "").replace(/\D/g, "");
  if (digitos.length < 10) return null;
  const semPais = digitos.startsWith("55") && digitos.length > 11 ? digitos.slice(2) : digitos;
  if (semPais.length < 10 || semPais.length > 11) return null;
  return `55${semPais}`;
};

export const buildWhatsAppText = (s: SugestaoNegociacao, ctx: ContextoNegociacao = {}): string => {
  const linhas = [
    `Ola, ${s.fornecedor}!`,
    "",
    `Estamos revisando ${identificacaoDemanda(ctx)} e gostariamos de alinhar a proposta.`,
  ];

  const meta = formatarBRL(s.valor_contraproposta);
  if (meta) linhas.push(`Nosso cenario alvo de fechamento e ${meta}.`);

  if (s.argumentos.length > 0) {
    linhas.push("", "Pontos que sustentam a proposta:");
    s.argumentos.forEach((a) => linhas.push(`- ${a}`));
  }

  linhas.push("", "Consegue avaliar e responder com a melhor condicao?");
  return linhas.join("\n");
};

export const buildEmailAssunto = (s: SugestaoNegociacao, ctx: ContextoNegociacao = {}): string =>
  `Revisao de proposta - ${identificacaoDemanda(ctx)}`;

export const buildEmailCorpo = (s: SugestaoNegociacao, ctx: ContextoNegociacao = {}): string => {
  const linhas = [
    `Prezados ${s.fornecedor},`,
    "",
    `Estamos revisando ${identificacaoDemanda(ctx)}.`,
    "",
    s.estrategia,
  ];

  const meta = formatarBRL(s.valor_contraproposta);
  const recuo = formatarBRL(s.valor_ponto_recuo);
  if (meta || recuo) {
    linhas.push("");
    if (meta) linhas.push(`Meta de fechamento: ${meta}`);
    if (recuo) linhas.push(`Limite maximo de recuo: ${recuo}`);
  }

  if (s.argumentos.length > 0) {
    linhas.push("", "Fundamentos:");
    s.argumentos.forEach((a) => linhas.push(`- ${a}`));
  }

  linhas.push("", "Aguardo retorno com a proposta revisada.", "", "Atenciosamente,", "Equipe de Compras");
  return linhas.join("\n");
};

export const buildWhatsAppUrl = (telefone: string | null | undefined, texto: string): string | null => {
  const numero = normalizarTelefone(telefone);
  if (!numero) return null;
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
};

export const buildMailtoUrl = (email: string | null | undefined, assunto: string, corpo: string): string | null => {
  const destino = (email ?? "").trim();
  if (!destino.includes("@")) return null;
  return `mailto:${destino}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
};
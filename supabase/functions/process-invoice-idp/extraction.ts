/**
 * Extração de dados de nota fiscal a partir de PDF/imagem.
 *
 * Regra de ouro: nunca inventar valor. Quando o modelo não devolve um campo,
 * o campo sai `null` e `campos_ausentes` lista o que faltou — o front grava o
 * documento como `pendente_revisao` em vez de `validada`.
 */

export interface ExtractedInvoice {
  numero_nf: string | null;
  chave_acesso: string | null;
  data_emissao: string | null;
  valor_total: number | null;
  valor_produtos: number | null;
  valor_frete: number | null;
  cnpj_emitente: string | null;
  campos_ausentes: string[];
  fonte: "ia" | "indisponivel";
}

export const SYSTEM_PROMPT = `Você é um extrator de dados de notas fiscais brasileiras (NF-e, NFS-e, CT-e).
Devolva SOMENTE um JSON válido, sem comentários e sem markdown, com as chaves:
numero_nf (string, só dígitos), chave_acesso (44 dígitos ou null), data_emissao (YYYY-MM-DD ou null),
valor_total (number ou null), valor_produtos (number ou null), valor_frete (number ou null),
cnpj_emitente (14 dígitos ou null).
Se um campo não estiver legível no documento, use null. Nunca invente, nunca estime, nunca complete com exemplo.`;

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const normalizado = value.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
  const parsed = Number(normalizado);
  return Number.isFinite(parsed) ? parsed : null;
}

function toDigits(value: unknown, length?: number): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return null;
  if (length !== undefined && digits.length !== length) return null;
  return digits;
}

function toIsoDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const br = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return br ? `${br[3]}-${br[2]}-${br[1]}` : null;
}

/** Converte a resposta crua do modelo no contrato tipado, marcando o que faltou. */
export function normalizeExtraction(raw: unknown): ExtractedInvoice {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  const invoice: Omit<ExtractedInvoice, "campos_ausentes"> = {
    numero_nf: toDigits(obj["numero_nf"]),
    chave_acesso: toDigits(obj["chave_acesso"], 44),
    data_emissao: toIsoDate(obj["data_emissao"]),
    valor_total: toNumber(obj["valor_total"]),
    valor_produtos: toNumber(obj["valor_produtos"]),
    valor_frete: toNumber(obj["valor_frete"]),
    cnpj_emitente: toDigits(obj["cnpj_emitente"], 14),
    fonte: "ia",
  };

  const campos_ausentes = (Object.keys(invoice) as (keyof typeof invoice)[])
    .filter((campo) => campo !== "fonte" && invoice[campo] === null)
    .map(String);

  return { ...invoice, campos_ausentes };
}

/** Campos sem os quais o documento não pode ser dado como conciliável. */
export function faltamCamposObrigatorios(invoice: ExtractedInvoice): string[] {
  return ["numero_nf", "valor_total"].filter((campo) =>
    invoice[campo as "numero_nf" | "valor_total"] === null
  );
}

/** Extrai o JSON da resposta do gateway, tolerando cercas de markdown. */
export function parseGatewayContent(content: string): unknown {
  const semCerca = content.replace(/```(?:json)?/gi, "").trim();
  const inicio = semCerca.indexOf("{");
  const fim = semCerca.lastIndexOf("}");
  if (inicio === -1 || fim <= inicio) throw new Error("resposta_sem_json");
  return JSON.parse(semCerca.slice(inicio, fim + 1));
}

export function extractionUnavailable(): ExtractedInvoice {
  return {
    numero_nf: null,
    chave_acesso: null,
    data_emissao: null,
    valor_total: null,
    valor_produtos: null,
    valor_frete: null,
    cnpj_emitente: null,
    campos_ausentes: ["numero_nf", "valor_total"],
    fonte: "indisponivel",
  };
}

/**
 * Traducao do evento de fechamento de OS (Promo Design) para uma linha de
 * `solicitacoes` (Promo Supply).
 *
 * Fica em modulo proprio, sem Supabase e sem rede, porque e a parte que mais
 * muda quando o contrato da origem muda — assim da para testar sem banco.
 *
 * Regras de negocio que este arquivo garante:
 *  - `tipo` = 'material'. A tabela so aceita material|servico|equipamento|
 *    urgente|contrato; item personalizado e material que sera fabricado.
 *  - `status` = 'pendente'. E o unico valor que o trigger
 *    a0_guard_solicitacao_escrita aceita na criacao.
 *  - `prioridade` = 'alta' para OS ja fechada: o material tem prazo de entrega
 *    com o cliente, entao entra na frente do pedido de reposicao comum.
 *  - `external_ref` = os_id. Chave de idempotencia: reenvio do dispatcher nao
 *    pode gerar uma segunda solicitacao de compra para a mesma OS.
 */

export interface OsPayload {
  os_id?: unknown;
  os_number?: unknown;
  produto?: unknown;
  produto_sku?: unknown;
  quantidade?: unknown;
  unidade?: unknown;
  tecnica?: unknown;
  material?: unknown;
  empresa?: unknown;
  prazo_entrega?: unknown;
  observacoes?: unknown;
  source?: unknown;
  tenant_id?: unknown;
  solicitante_email?: unknown;
}

export interface OsEventBody {
  event?: unknown;
  correlation_key?: unknown;
  payload?: unknown;
}

/**
 * De onde veio a demanda de compra. O Promo Design manda a OS fechada; o
 * Promo Champions manda o pedido aprovado (orcamento que virou pedido) e, nesse
 * caso, os_id carrega o id do item do pedido.
 */
type Origem = "promo_design" | "promo_champions";

function origemDe(source: unknown): Origem {
  return text(source, 60) === "promo_champions" ? "promo_champions" : "promo_design";
}

const ROTULO_ORIGEM: Record<Origem, string> = {
  promo_design: "Promo Design",
  promo_champions: "Promo Champions",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function text(value: unknown, max = 500): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

function quantidade(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.max(1, Math.round(n));
}

function isoDate(value: unknown): string | null {
  const raw = text(value, 40);
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

export interface SolicitacaoDraft {
  numero: string;
  titulo: string;
  descricao: string;
  tipo: "material";
  status: "pendente";
  prioridade: "alta";
  quantidade: number;
  unidade: string;
  data_necessidade: string | null;
  observacoes: string;
  tenant_id: string;
  external_ref: string;
}

export class OsPayloadError extends Error {
  constructor(public readonly field: string, message: string) {
    super(message);
    this.name = "OsPayloadError";
  }
}

/**
 * Valida o payload e devolve o que falta. Separado do build porque o handler
 * responde 422 (payload do chamador) e nao 500 (defeito nosso).
 */
export function validateOsPayload(payload: OsPayload): { osId: string; quantidade: number } {
  const osId = text(payload.os_id, 64);
  if (!osId || !UUID_RE.test(osId)) {
    throw new OsPayloadError("os_id", "os_id ausente ou nao e UUID");
  }
  if (!text(payload.os_number, 120)) {
    throw new OsPayloadError("os_number", "os_number ausente");
  }
  if (!text(payload.produto, 500)) {
    throw new OsPayloadError("produto", "produto ausente");
  }
  const qtd = quantidade(payload.quantidade);
  if (!qtd) {
    throw new OsPayloadError("quantidade", "quantidade ausente ou nao positiva");
  }
  return { osId, quantidade: qtd };
}

export function buildSolicitacaoDraft(
  payload: OsPayload,
  opts: { numero: string; tenantId: string },
): SolicitacaoDraft {
  const { osId, quantidade: qtd } = validateOsPayload(payload);
  const osNumber = text(payload.os_number, 120)!;
  const produto = text(payload.produto, 500)!;

  const tecnica = text(payload.tecnica, 200);
  const material = text(payload.material, 200);
  const sku = text(payload.produto_sku, 120);
  const empresa = text(payload.empresa, 200);
  const obsOrigem = text(payload.observacoes, 2000);

  const origem = origemDe(payload.source);
  const rotuloOrigem = ROTULO_ORIGEM[origem];
  const documento = origem === "promo_champions" ? "pedido" : "OS";

  const descricaoPartes = [
    `Solicitacao gerada pelo ${documento} ${osNumber} no ${rotuloOrigem}.`,
    `Produto: ${produto}.`,
    sku ? `SKU: ${sku}.` : null,
    tecnica ? `Tecnica: ${tecnica}.` : null,
    material ? `Material: ${material}.` : null,
    `Quantidade: ${qtd}.`,
    empresa ? `Cliente: ${empresa}.` : null,
    obsOrigem ? `Observacoes da OS: ${obsOrigem}` : null,
  ].filter(Boolean);

  const observacoesPartes = [
    `Origem: ${rotuloOrigem} (${documento} ${osNumber})`,
    osId ? `os_id: ${osId}` : null,
    empresa ? `Cliente: ${empresa}` : null,
  ].filter(Boolean);

  return {
    numero: opts.numero,
    titulo: `Compra p/ ${documento} ${osNumber} — ${produto}`.slice(0, 200),
    descricao: descricaoPartes.join("\n").slice(0, 4000),
    tipo: "material",
    status: "pendente",
    prioridade: "alta",
    quantidade: qtd,
    unidade: text(payload.unidade, 20) ?? "un",
    data_necessidade: isoDate(payload.prazo_entrega),
    observacoes: observacoesPartes.join(" | ").slice(0, 2000),
    tenant_id: opts.tenantId,
    external_ref: osId,
  };
}
/** Linha pronta para `.insert()`; o Record evita cast no handler. */
export function toInsertRow(draft: SolicitacaoDraft): Record<string, unknown> {
  return { ...draft };
}
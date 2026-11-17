// Monta a solicitação a partir do carrinho PunchOut.
//
// Regressão corrigida: o handler inseria em `solicitacoes` as colunas
// `requester_id` e `items`, que NÃO existem na tabela, com
// `status: "rascunho"`, que viola `solicitacoes_status_check`
// (pendente|em_cotacao|aprovada|rejeitada|em_andamento|concluida|cancelada),
// e sem `numero`/`titulo`, ambos NOT NULL sem default. Todo carrinho
// recebido falhava no insert. O contrato real da tabela é o mesmo usado por
// src/features/solicitacoes/hooks/useSolicitacoes.ts.
//
// O modelo de dados tem uma linha por solicitação (titulo/quantidade/unidade/
// valor_estimado) e `punchout_sessions.created_solicitacao_id` é singular, então
// o carrinho vira UMA solicitação agregada. Os itens originais continuam
// preservados em `punchout_sessions.cart_payload` (jsonb), sem perda de dado.

export interface CartItem {
  name: string;
  quantity: number;
  price: number;
  currency: string;
  supplier_part_id?: string;
  unit?: string;
}

export interface SolicitacaoInsert {
  numero: string;
  titulo: string;
  descricao: string;
  tipo: string;
  status: string;
  prioridade: string;
  quantidade: number;
  unidade: string | null;
  valor_estimado: number | null;
  observacoes: string;
  solicitante_id: string;
  tenant_id: string;
  organization_id: string | null;
}

const MAX_TITULO = 200;
const MAX_DESCRICAO = 2000;

function truncate(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}

function formatMoney(value: number, currency: string): string {
  return `${currency} ${value.toFixed(2)}`;
}

export function buildCartDescription(items: CartItem[]): string {
  const linhas = items.map((item) => {
    const total = item.quantity * item.price;
    const parte = item.supplier_part_id ? ` [${item.supplier_part_id}]` : "";
    const unidade = item.unit ? ` ${item.unit}` : "";
    return `- ${item.quantity}${unidade} x ${item.name}${parte} — ${formatMoney(item.price, item.currency)} (subtotal ${formatMoney(total, item.currency)})`;
  });
  return truncate(["Itens recebidos via PunchOut:", ...linhas].join("\n"), MAX_DESCRICAO);
}

export function buildCartTitle(items: CartItem[]): string {
  if (items.length === 1) return truncate(items[0].name, MAX_TITULO);
  return `Carrinho PunchOut — ${items.length} itens`;
}

// `organization_id` tem FK para `organizations(id)` e NÃO é o `tenant_id`
// (tabelas distintas). O valor correto é `profiles.current_organization_id` do
// solicitante — a mesma origem usada por get_user_grupo_id() e pela UI. Quando o
// perfil não tem organização, a coluna fica nula (é nullable).
export function buildSolicitacaoFromCart(
  items: CartItem[],
  session: { tenant_id: string; user_id: string },
  numero: string,
  organizationId: string | null = null,
): SolicitacaoInsert {
  if (items.length === 0) throw new Error("PunchOut cart has no items");

  const quantidade = items.reduce((acc, item) => acc + item.quantity, 0);
  const valor = items.reduce((acc, item) => acc + item.quantity * item.price, 0);
  const unidades = new Set(items.map((item) => item.unit).filter((u): u is string => !!u));

  return {
    numero,
    titulo: buildCartTitle(items),
    descricao: buildCartDescription(items),
    tipo: "material",
    // `pendente` é o único status aceito na criação pelo CHECK da tabela e pelo
    // trigger a0_guard_solicitacao_escrita.
    status: "pendente",
    prioridade: "media",
    quantidade: Math.max(1, Math.round(quantidade)),
    unidade: unidades.size === 1 ? [...unidades][0] : null,
    valor_estimado: valor > 0 ? Number(valor.toFixed(2)) : null,
    observacoes: "Importado via PunchOut",
    solicitante_id: session.user_id,
    tenant_id: session.tenant_id,
    organization_id: organizationId,
  };
}
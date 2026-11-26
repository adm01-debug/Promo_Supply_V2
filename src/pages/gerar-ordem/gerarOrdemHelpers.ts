import { formatCurrency } from "@/lib/utils";

export const getTipoLabel = (tipo: string) => {
  const map: Record<string, string> = {
    'produto': 'Produto', 'servico': 'Serviço', 'material': 'Material',
    'pe_liso': 'P.E. Liso', 'fabricacao_liso': 'Fab. Liso', 'fabricacao_personalizado': 'Fab. Personalizado',
    'PE_LISO': 'P.E. Liso', 'FAB_LISO': 'Fab. Liso', 'FAB_PERSONALIZADO': 'Fab. Personalizado',
  };
  return map[tipo] || tipo;
};

interface OrderData {
  produto: string;
  quantidadeReal: number;
  valorUnitario: number;
  prazoEntrega: string;
  tipo: string;
}

interface SupplierData {
  nome_fantasia: string;
  razao_social: string;
}

export function buildWhatsAppMessage(
  fornecedor: SupplierData,
  solicitacao: OrderData,
  ordemNumero: string,
  total: number,
  frete: number,
  desconto: number,
  observacoes: string,
): string {
  return `Olá ${fornecedor.nome_fantasia || fornecedor.razao_social}!

Gostaríamos de confirmar o pedido abaixo:

*ORDEM DE COMPRA: ${ordemNumero}*

📦 *Produto:* ${solicitacao.produto}
📊 *Quantidade:* ${solicitacao.quantidadeReal} unidades
💰 *Valor Unitário:* ${formatCurrency(solicitacao.valorUnitario)}
${frete > 0 ? `🚚 *Frete:* ${formatCurrency(frete)}` : '🚚 *Frete:* Grátis'}
${desconto > 0 ? `🎁 *Desconto:* ${formatCurrency(desconto)}` : ''}
💵 *TOTAL:* ${formatCurrency(total)}

📅 *Prazo de Entrega:* ${new Date(solicitacao.prazoEntrega).toLocaleDateString('pt-BR')}
💳 *Condição:* À vista via PIX
${observacoes ? `\n📝 *Observações:* ${observacoes}` : ''}
Por favor, confirme o recebimento e disponibilidade.

Atenciosamente,
Equipe de Compras - Promo Supply`;
}

export interface DadosEntrega {
  /** Nome da empresa emitente da ordem (nome fantasia, razao social ou name). */
  empresa?: string | null;
  /** Endereco ja formatado da empresa. Sem ele o bloco e omitido. */
  endereco?: string | null;
}

const CAMPOS_ENDERECO: readonly (readonly string[])[] = [
  ["logradouro", "rua", "endereco", "street"],
  ["numero", "n", "number"],
  ["complemento", "complement"],
  ["bairro", "neighborhood"],
  ["cidade", "municipio", "city"],
  ["uf", "estado", "state"],
  ["cep", "zip", "zipcode", "postal_code"],
];

/**
 * Normaliza `tenants.endereco_fiscal` (jsonb livre) em uma linha legivel.
 * Devolve `null` quando nao ha nenhum campo reconhecido - e o sinal para o
 * e-mail omitir o bloco de entrega em vez de imprimir um placeholder.
 */
export function formatarEnderecoEntrega(endereco: unknown): string | null {
  if (typeof endereco === "string") return endereco.trim() || null;
  if (!endereco || typeof endereco !== "object" || Array.isArray(endereco)) return null;

  const dados = endereco as Record<string, unknown>;
  const texto = (chaves: readonly string[]): string | null => {
    for (const chave of chaves) {
      const valor = dados[chave];
      if (typeof valor === "string" && valor.trim()) return valor.trim();
      if (typeof valor === "number" && Number.isFinite(valor)) return String(valor);
    }
    return null;
  };

  const [rua, numero, complemento, bairro, cidade, uf, cep] = CAMPOS_ENDERECO.map(texto);
  const via = rua ? (numero ? `${rua}, ${numero}` : rua) : numero;
  const local = [cidade, uf].filter(Boolean).join("/");
  const partes = [
    [via, complemento].filter(Boolean).join(" - "),
    [bairro, local].filter(Boolean).join(" - "),
    cep ? `CEP ${cep}` : null,
  ].filter((parte) => Boolean(parte));

  return partes.length > 0 ? partes.join(" - ") : null;
}

export function buildEmailMessage(
  solicitacao: OrderData,
  ordemNumero: string,
  subtotal: number,
  total: number,
  frete: number,
  desconto: number,
  observacoes: string,
  entrega?: DadosEntrega | null,
): { assunto: string; corpo: string } {
  const nomeEntrega = entrega?.empresa?.trim() || "Promo Supply";
  const enderecoEntrega = entrega?.endereco?.trim() || null;
  const blocoEntrega = enderecoEntrega
    ? `\nDADOS PARA ENTREGA:\n${nomeEntrega}\n${enderecoEntrega}`
    : "";
  const assunto = `Ordem de Compra ${ordemNumero} - ${solicitacao.produto}`;
  const corpo = `Prezados,

Segue abaixo os detalhes da Ordem de Compra para confirmação:

═══════════════════════════════════════════
ORDEM DE COMPRA: ${ordemNumero}
═══════════════════════════════════════════

DADOS DO PEDIDO:
• Produto: ${solicitacao.produto}
• Quantidade: ${solicitacao.quantidadeReal} unidades
• Tipo: ${getTipoLabel(solicitacao.tipo)}

VALORES:
• Valor Unitário: ${formatCurrency(solicitacao.valorUnitario)}
• Subtotal: ${formatCurrency(subtotal)}
• Frete: ${frete > 0 ? formatCurrency(frete) : 'Grátis'}
${desconto > 0 ? `• Desconto: ${formatCurrency(desconto)}` : ''}
• Total: ${formatCurrency(total)}

CONDIÇÕES:
• Pagamento: À vista via PIX
• Prazo de Entrega: ${new Date(solicitacao.prazoEntrega).toLocaleDateString('pt-BR')}
${observacoes ? `\nOBSERVAÇÕES:\n${observacoes}` : ''}${blocoEntrega}

═══════════════════════════════════════════

Por favor, confirme o recebimento desta ordem e a disponibilidade do prazo informado.

Atenciosamente,
Equipe de Compras
Promo Supply
compras@promosupply.com.br`;

  return { assunto, corpo };
}

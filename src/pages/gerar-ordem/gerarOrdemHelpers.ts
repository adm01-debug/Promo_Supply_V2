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
💰 *Valor Unitário:* R$ ${(solicitacao.valorUnitario || 12).toFixed(2)}
${frete > 0 ? `🚚 *Frete:* R$ ${frete.toFixed(2)}` : '🚚 *Frete:* Grátis'}
${desconto > 0 ? `🎁 *Desconto:* R$ ${desconto.toFixed(2)}` : ''}
💵 *TOTAL:* ${formatCurrency(total)}

📅 *Prazo de Entrega:* ${new Date(solicitacao.prazoEntrega).toLocaleDateString('pt-BR')}
💳 *Condição:* À vista via PIX
${observacoes ? `\n📝 *Observações:* ${observacoes}` : ''}
Por favor, confirme o recebimento e disponibilidade.

Atenciosamente,
Equipe de Compras - Promo Supply`;
}

export function buildEmailMessage(
  solicitacao: OrderData,
  ordemNumero: string,
  subtotal: number,
  total: number,
  frete: number,
  desconto: number,
  observacoes: string,
): { assunto: string; corpo: string } {
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
• Valor Unitário: R$ ${(solicitacao.valorUnitario || 12).toFixed(2)}
• Subtotal: ${formatCurrency(subtotal)}
• Frete: ${frete > 0 ? `R$ ${frete.toFixed(2)}` : 'Grátis'}
${desconto > 0 ? `• Desconto: R$ ${desconto.toFixed(2)}` : ''}
• Total: ${formatCurrency(total)}

CONDIÇÕES:
• Pagamento: À vista via PIX
• Prazo de Entrega: ${new Date(solicitacao.prazoEntrega).toLocaleDateString('pt-BR')}
${observacoes ? `\nOBSERVAÇÕES:\n${observacoes}` : ''}
DADOS PARA ENTREGA:
Promo Supply
[Endereço da empresa]

═══════════════════════════════════════════

Por favor, confirme o recebimento desta ordem e a disponibilidade do prazo informado.

Atenciosamente,
Equipe de Compras
Promo Supply
compras@promosupply.com.br`;

  return { assunto, corpo };
}

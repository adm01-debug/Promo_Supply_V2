import type { Solicitacao } from "@/features/solicitacoes";
import type { Solicitacao as MockSolicitacao } from "@/types/legacyTypes";
import { nullishStr, nullishNum } from "@/lib/dbMapping";

// Map DB status to legacy status for UI compatibility
export const mapDbStatusToLegacy = (status: Solicitacao['status']): MockSolicitacao['status'] => {
  const mapping: Record<Solicitacao['status'], MockSolicitacao['status']> = {
    'pendente': 'AGUARDANDO_COTACAO',
    'em_cotacao': 'EM_COTACAO',
    'aprovada': 'FORNECEDOR_SELECIONADO',
    'em_andamento': 'AGUARDANDO_PAGAMENTO',
    'concluida': 'ENTREGUE',
    'rejeitada': 'REJEITADA',
    'cancelada': 'CANCELADA',
  };
  return mapping[status] || 'AGUARDANDO_COTACAO';
};

export const mapLegacyStatusToDb = (legacyStatus: string): Solicitacao['status'] => {
  const mapping: Record<string, Solicitacao['status']> = {
    'AGUARDANDO_COTACAO': 'pendente',
    'EM_COTACAO': 'em_cotacao',
    'FORNECEDOR_SELECIONADO': 'aprovada',
    'AGUARDANDO_PAGAMENTO': 'em_andamento',
    'PAGO': 'concluida',
    'EM_TRANSITO': 'concluida',
    'ENTREGUE': 'concluida',
    'PEDIDO_GERADO': 'em_andamento',
    'REJEITADA': 'rejeitada',
    'CANCELADA': 'cancelada',
  };
  return mapping[legacyStatus] || 'pendente';
};

/** Rotulo do card quando a solicitacao nao tem gestor gravado (dado legado). */
export const SEM_GESTOR = 'Sem gestor';

/** Rotulo do card quando ha gestor gravado mas o nome do perfil nao carregou. */
export const GESTOR_SEM_NOME = 'Gestor nao identificado';

/**
 * Nome do gestor responsavel da solicitacao.
 *
 * `aprovador_id` guarda `profiles.user_id` - e o que `NovaSolicitacaoModal`
 * grava ao criar a solicitacao. Nao existe FK de `solicitacoes.aprovador_id`
 * para `profiles`, entao o join do PostgREST nao resolve o nome: a lista
 * entrega o mapa `id -> nome`. Antes daqui o card lia `observacoes` (coluna que
 * esta tela nunca escreve) e mostrava o literal "BY: Vendedor".
 *
 * Os dois rotulos sao distintos de proposito: `Sem gestor` quando a coluna esta
 * vazia, `Gestor nao identificado` quando o id existe mas o perfil nao veio -
 * assim a tela nao inventa que a solicitacao nao tem gestor.
 */
export const nomeDoGestor = (
  sol: Pick<Solicitacao, 'aprovador_id'>,
  nomesDeGestor?: ReadonlyMap<string, string> | null,
): string => {
  const id = (sol.aprovador_id ?? '').trim();
  if (!id) return SEM_GESTOR;
  const nome = (nomesDeGestor?.get(id) ?? '').trim();
  return nome || GESTOR_SEM_NOME;
};

// Adapt DB solicitacao to legacy format for components.
// Nullable DB columns (`departamento`, `data_necessidade`, `valor_estimado`)
// are funnelled through `nullishStr` / `nullishNum` so `null` cleanly becomes
// the legacy default without collapsing legitimate `0` / `''` values the way
// `||` would.
export const adaptToLegacyFormat = (
  sol: Solicitacao,
  nomesDeGestor?: ReadonlyMap<string, string> | null,
): MockSolicitacao & { organizationName?: string } => ({
  id: sol.id,
  itemNumber: sol.numero || sol.id.slice(0, 8),
  empresa: nullishStr(sol.departamento, 'Empresa'),
  produto: sol.titulo,
  quantidade: sol.quantidade,
  quantidadeReal: Math.ceil(sol.quantidade * 1.02),
  tipo: sol.tipo === 'material' ? 'PE_LISO' : sol.tipo === 'servico' ? 'FAB_LISO' : 'FAB_PERSONALIZADO',
  status: mapDbStatusToLegacy(sol.status),
  vendedor: nomeDoGestor(sol, nomesDeGestor),
  prazoEntrega: nullishStr(sol.data_necessidade, sol.created_at),
  valorTotal: nullishNum(sol.valor_estimado),
  createdAt: sol.created_at,
  organizationName: sol.organization?.name,
  costCenterName: sol.cost_center?.name,
  costCenterCode: sol.cost_center?.code,
});

export interface PontoMatriz {
  id: string;
  /** Posicao no eixo X (impacto financeiro), em %. */
  esquerda: number;
  /** Posicao no eixo Y (urgencia pelo prazo), em %. */
  base: number;
  valor: number;
  diasRestantes: number | null;
}

/** Janela de urgencia: ate 90 dias de folga cai de 100% para 0% do eixo. */
const DIAS_DE_FOLGA_TOTAL = 90;
const URGENCIA_SEM_PRAZO = 0.35;

/**
 * Coordenadas reais dos pontos da "Matriz de Prioridade" (QA 103, UI-06).
 *
 * O eixo X era `(i * 7) + 10` - a posicao vinha do indice da linha, entao a
 * ordem alfabetica/da query desenhava o "impacto financeiro". O eixo Y era
 * `valorTotal / 10000`, que estourava a area acima de 100 mil e nao tinha
 * relacao com urgencia. Agora X e a razao entre o valor do item e o maior valor
 * da lista, e Y e o tempo que falta ate `prazoEntrega` (atrasado no topo, 90
 * dias ou mais no rodape). Item sem prazo fica numa faixa neutra, no meio.
 */
export const posicoesDaMatriz = (
  solicitacoes: (Pick<MockSolicitacao, 'id' | 'valorTotal'> & { prazoEntrega?: string | null })[],
  agora: Date = new Date(),
): PontoMatriz[] => {
  const maiorValor = solicitacoes.reduce((maior, s) => Math.max(maior, s.valorTotal || 0), 0);

  return solicitacoes.map((s) => {
    const valor = s.valorTotal || 0;
    const prazo = s.prazoEntrega ? new Date(s.prazoEntrega).getTime() : Number.NaN;
    const diasRestantes = Number.isFinite(prazo) ? Math.ceil((prazo - agora.getTime()) / 86_400_000) : null;
    const urgencia = diasRestantes === null
      ? URGENCIA_SEM_PRAZO
      : Math.min(1, Math.max(0, 1 - diasRestantes / DIAS_DE_FOLGA_TOTAL));

    return {
      id: s.id,
      valor,
      diasRestantes,
      esquerda: Number((5 + (maiorValor > 0 ? (valor / maiorValor) * 90 : 45)).toFixed(1)),
      base: Number((5 + urgencia * 90).toFixed(1)),
    };
  });
};

export const statusConfig: Record<string, { label: string; color: string; indicatorStatus: "pending" | "processing" | "approved" | "completed" | "warning" | "info" | "error" }> = {
  AGUARDANDO_COTACAO: { label: 'Aguardando Cotação', color: 'bg-emerald-500', indicatorStatus: 'pending' },
  EM_COTACAO: { label: 'Em Cotação', color: 'bg-warning', indicatorStatus: 'warning' },
  FORNECEDOR_SELECIONADO: { label: 'Aprovada', color: 'bg-info', indicatorStatus: 'info' },
  AGUARDANDO_PAGAMENTO: { label: 'Em Andamento', color: 'bg-warning', indicatorStatus: 'processing' },
  ENTREGUE: { label: 'Finalizada', color: 'bg-success', indicatorStatus: 'completed' },
  REJEITADA: { label: 'Rejeitada', color: 'bg-destructive', indicatorStatus: 'error' },
  CANCELADA: { label: 'Cancelada', color: 'bg-muted', indicatorStatus: 'info' },
};

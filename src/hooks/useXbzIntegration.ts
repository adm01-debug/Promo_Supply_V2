import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/feedbackToast';
import { normalizeBusca, type XbzPermissions } from '@/pages/catalogo-xbz/xbzHelpers';

/**
 * Tempo máximo (ms) que o cliente espera pelo `xbz-proxy`. O portal da XBZ é
 * lento e instável em picos; sem esse teto o spinner ficaria preso para sempre.
 */
const XBZ_CLIENT_TIMEOUT_MS = 45_000;


/** Resposta padronizada do proxy `xbz-proxy`. */
interface XbzEnvelope<T> {
  data: T;
  stockConflict?: boolean;
  warning?: string | null;
  error?: string;
  /** `true` quando a resposta veio do espelho local (XBZ indisponível). */
  stale?: boolean;
  source?: string;
  /** ISO da última sincronização do espelho local, quando `stale`. */
  syncedAt?: string | null;
}

/** Resultado da busca de catálogo com indicação de origem dos dados. */
export interface XbzCatalogoResult {
  produtos: XbzProdutoRaw[];
  stale: boolean;
  syncedAt: string | null;
}



export interface XbzLoginInfo {
  pessoaId: number;
  razaoSocial: string | null;
  nomeFantasia?: string | null;
  bloqueado: boolean;
  bloqueioMotivo?: string | null;
  permissions: XbzPermissions;
}

export interface XbzCredentialStatus {
  pessoa_id: number | null;
  cnpj: string | null;
  razao_social: string | null;
  label: string | null;
  permissions: XbzPermissions;
  is_active: boolean;
  last_login_at: string | null;
  last_login_ok: boolean | null;
  last_error: string | null;
}

export interface XbzDashboard {
  mensagem?: string;
  qtdAguardandoAprovacao?: number;
  qtdEmitidos?: number;
  qtdAguardandoPagamento?: number;
  qtdProducao?: number;
  qtdProntoParaRetirada?: number;
}

export interface XbzPedidoRaw {
  pedidoNumero?: string;
  numero?: string;
  ordemDeCompra?: string;
  dataEmissao?: string;
  idStatus?: number;
  statusLogistico?: string;
  idLoteDebitoStatus?: number;
  loteDebitoStatusCliente?: string;
  pedidoValorTotal?: number;
  produtoNome?: string;
  quantidade?: number;
  [key: string]: unknown;
}

export interface XbzProdutoRaw {
  ProdutoId?: number;
  Id?: number;
  Sku?: string;
  Nome?: string;
  NomeCor?: string;
  Preco?: number;
  Quantidade?: number;
  Disponivel?: string;
  VendaMinima?: number;
  Multiplos?: number;
  LinkImagem?: string;
  [key: string]: unknown;
}

export interface XbzCarrinhoResumo {
  itensNoCarrinhoQtd?: number;
  itensNoCarrinhoValor?: number;
  itensSelecionadosValorTotal?: number;
  pessoaRazaoSocial?: string;
  [key: string]: unknown;
}

export interface XbzCarrinhoItem {
  id?: number;
  produtoId?: number;
  produtoNome?: string;
  quantidade?: number;
  valorTotal?: number;
  [key: string]: unknown;
}

export interface XbzPedidosFilters {
  periodo?: number;
  statusFinanceiro?: number;
  numeroPedido?: string;
}

/** Erro da integração XBZ com o status HTTP preservado para tratamento na UI. */
export class XbzRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'XbzRequestError';
    this.status = status;
  }
}

/** Chama o proxy e normaliza erros/avisos (inclui o HTTP 425 de conflito de estoque). */
async function callXbz<T>(action: string, params: Record<string, unknown> = {}): Promise<XbzEnvelope<T>> {
  const { data, error } = await supabase.functions.invoke<XbzEnvelope<T>>('xbz-proxy', {
    body: { action, ...params },
  });

  if (error) {
    let details = error.message;
    let status = 0;
    const context = (error as { context?: { status?: number; text?: () => Promise<string> } }).context;
    if (typeof context?.status === 'number') status = context.status;
    if (context?.text) {
      try {
        const body = await context.text();
        const parsed = JSON.parse(body) as { error?: string; retry_after_seconds?: number };
        if (parsed?.error === 'rate_limited') {
          const retry = parsed.retry_after_seconds ?? 0;
          details = retry > 0
            ? `Muitas tentativas seguidas. Tente novamente em ${retry}s.`
            : 'Muitas tentativas seguidas. Aguarde alguns instantes.';
        } else if (parsed?.error) {
          details = parsed.error;
        }
      } catch {
        /* mantém a mensagem original */
      }
    }
    throw new XbzRequestError(details || 'Falha na comunicação com a XBZ', status);
  }

  if (!data) throw new XbzRequestError('Resposta vazia da integração XBZ', 0);
  if (data.error) throw new XbzRequestError(data.error, 0);
  return data;
}


export function useXbzIntegration() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(0);

  const runEnvelope = useCallback(async <T,>(
    action: string,
    params: Record<string, unknown> = {},
    options: { silent?: boolean } = {},
  ): Promise<XbzEnvelope<T> | null> => {
    inFlight.current += 1;
    setLoading(true);
    setError(null);
    try {
      const envelope = await callXbz<T>(action, params);
      if (envelope.warning) toast.warning(envelope.warning);
      return envelope;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido na XBZ';
      const status = err instanceof XbzRequestError ? err.status : 0;
      setError(message);
      if (!options.silent) {
        // 409 (duplicidade) e 429 (excesso de tentativas) não são falhas de
        // sistema: são avisos de fluxo e merecem tom diferente do erro vermelho.
        if (status === 409 || status === 429) toast.warning(message);
        else toast.error(`XBZ: ${message}`);
      }
      return null;

    } finally {
      inFlight.current -= 1;
      if (inFlight.current <= 0) {
        inFlight.current = 0;
        setLoading(false);
      }
    }
  }, []);

  const run = useCallback(async <T,>(
    action: string,
    params: Record<string, unknown> = {},
    options: { silent?: boolean } = {},
  ): Promise<T | null> => {
    const envelope = await runEnvelope<T>(action, params, options);
    return envelope ? envelope.data : null;
  }, [runEnvelope]);


  // ---------------------------------------------------------------- estado
  const getCredentialStatus = useCallback(
    () => run<XbzCredentialStatus | null>('credentialsStatus', {}, { silent: true }),
    [run],
  );

  const saveCredentials = useCallback(
    (portalUser: string, portalPassword: string, cnpj?: string, label?: string) =>
      run<XbzLoginInfo>('saveCredentials', { portalUser, portalPassword, cnpj, label }),
    [run],
  );

  const testConnection = useCallback(
    () => run<XbzLoginInfo>('testConnection'),
    [run],
  );

  const login = useCallback(() => run<XbzLoginInfo>('login', {}, { silent: true }), [run]);

  const getDashboard = useCallback(() => run<XbzDashboard>('dashboard'), [run]);

  const getPessoaToken = useCallback(
    () => run<{ token?: string; vencimentoData?: string; valido?: boolean }>('pessoaToken'),
    [run],
  );

  const getVendedor = useCallback(
    () => run<{ nomeExibicao?: string; telefone?: string; whatsapp?: string; email?: string }>('vendedor'),
    [run],
  );

  // --------------------------------------------------------------- pedidos
  const getPedidos = useCallback(
    (filters: XbzPedidosFilters = {}) => run<XbzPedidoRaw[]>('pedidos', {
      periodo: filters.periodo ?? 1,
      statusFinanceiro: filters.statusFinanceiro ?? 0,
      numeroPedido: filters.numeroPedido ?? '',
    }),
    [run],
  );

  const cancelarPedido = useCallback(
    (numeroPedido: string) => run<unknown>('cancelarPedido', { numeroPedido }),
    [run],
  );

  // -------------------------------------------------------------- catálogo
  const buscarProdutos = useCallback(
    (busca: string, extras: Record<string, unknown> = {}) =>
      run<XbzProdutoRaw[]>('catalogo', { busca: normalizeBusca(busca), ...extras }),
    [run],
  );

  /**
   * Igual a `buscarProdutos`, mas informa se os dados vieram do espelho local
   * (`stale: true`) porque a XBZ estava indisponível.
   */
  const buscarProdutosDetalhado = useCallback(
    async (busca: string, extras: Record<string, unknown> = {}): Promise<XbzCatalogoResult | null> => {
      const envelope = await runEnvelope<XbzProdutoRaw[]>('catalogo', {
        busca: normalizeBusca(busca),
        ...extras,
      });
      if (!envelope) return null;
      return {
        produtos: Array.isArray(envelope.data) ? envelope.data : [],
        stale: envelope.stale === true,
        syncedAt: typeof envelope.syncedAt === 'string' ? envelope.syncedAt : null,
      };

    },
    [runEnvelope],
  );


  const getCores = useCallback(
    () => run<Array<{ Id: number; NomeCor: string; SiglaCor: string }>>('cores'),
    [run],
  );

  const getFiscal = useCallback(
    (produtoId: number) => run<Record<string, unknown>>('fiscalSt', { produtoId }),
    [run],
  );

  // -------------------------------------------------------------- carrinho
  const getCarrinhoResumo = useCallback(() => run<XbzCarrinhoResumo>('carrinhoResumo'), [run]);
  const getCarrinhoItens = useCallback(() => run<XbzCarrinhoItem[]>('carrinhoListar'), [run]);

  const adicionarItem = useCallback(
    async (produtoId: number, quantidade: number) => {
      const result = await run<unknown>('itemLancar', { produtoId, quantidade });
      if (result !== null) toast.success('Produto adicionado ao carrinho XBZ');
      return result;
    },
    [run],
  );

  const alterarQuantidade = useCallback(
    (item: Record<string, unknown>) => run<unknown>('itemAlterarQuantidade', { item }),
    [run],
  );

  const removerItem = useCallback(
    async (itemId: number) => {
      const result = await run<unknown>('itemRemover', { itemId });
      if (result !== null) toast.success('Item removido do carrinho XBZ');
      return result;
    },
    [run],
  );

  const getEntregaTipos = useCallback(
    () => run<Array<{ id: number; nome: string }>>('entregaTipos'),
    [run],
  );

  const getPagamentoTipos = useCallback(
    () => run<Array<{ id: number; nome: string }>>('pagamentoTipos'),
    [run],
  );

  /** ⚠️ Emite pedidos reais na XBZ — exige confirmação explícita. */
  const gerarPedidos = useCallback(
    async () => {
      const result = await run<unknown>('gerarPedidos', { confirm: true });
      if (result !== null) toast.success('Pedidos gerados na XBZ');
      return result;
    },
    [run],
  );

  return {
    loading,
    error,
    getCredentialStatus,
    saveCredentials,
    testConnection,
    login,
    getDashboard,
    getPessoaToken,
    getVendedor,
    getPedidos,
    cancelarPedido,
    buscarProdutos,
    buscarProdutosDetalhado,

    getCores,
    getFiscal,
    getCarrinhoResumo,
    getCarrinhoItens,
    adicionarItem,
    alterarQuantidade,
    removerItem,
    getEntregaTipos,
    getPagamentoTipos,
    gerarPedidos,
  };
}

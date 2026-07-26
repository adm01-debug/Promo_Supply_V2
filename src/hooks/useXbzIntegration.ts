import { useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/feedbackToast';
import { normalizeBusca, type XbzPermissions } from '@/pages/catalogo-xbz/xbzHelpers';

/** Resposta padronizada do proxy `xbz-proxy`. */
interface XbzEnvelope<T> {
  data: T;
  stockConflict?: boolean;
  warning?: string | null;
  error?: string;
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

/** Chama o proxy e normaliza erros/avisos (inclui o HTTP 425 de conflito de estoque). */
async function callXbz<T>(action: string, params: Record<string, unknown> = {}): Promise<XbzEnvelope<T>> {
  const { data, error } = await supabase.functions.invoke<XbzEnvelope<T>>('xbz-proxy', {
    body: { action, ...params },
  });

  if (error) {
    let details = error.message;
    const context = (error as { context?: { text?: () => Promise<string> } }).context;
    if (context?.text) {
      try {
        const body = await context.text();
        const parsed = JSON.parse(body) as { error?: string };
        if (parsed?.error) details = parsed.error;
      } catch {
        /* mantém a mensagem original */
      }
    }
    throw new Error(details || 'Falha na comunicação com a XBZ');
  }

  if (!data) throw new Error('Resposta vazia da integração XBZ');
  if (data.error) throw new Error(data.error);
  return data;
}

export function useXbzIntegration() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(0);

  const run = useCallback(async <T,>(
    action: string,
    params: Record<string, unknown> = {},
    options: { silent?: boolean } = {},
  ): Promise<T | null> => {
    inFlight.current += 1;
    setLoading(true);
    setError(null);
    try {
      const envelope = await callXbz<T>(action, params);
      if (envelope.warning) toast.warning(envelope.warning);
      return envelope.data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido na XBZ';
      setError(message);
      if (!options.silent) toast.error(`XBZ: ${message}`);
      return null;
    } finally {
      inFlight.current -= 1;
      if (inFlight.current <= 0) {
        inFlight.current = 0;
        setLoading(false);
      }
    }
  }, []);

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

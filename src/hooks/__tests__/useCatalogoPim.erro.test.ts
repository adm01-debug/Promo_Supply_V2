import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { buscarProdutoPorIdEstrito, useCatalogoPim } from '../useCatalogoPim';

// Etapa QA 169 (INT-07): consulta ao PIM indisponivel precisa ser visivel.
// `buscarProdutoPorId` devolve null tanto para "PIM fora do ar" quanto para
// "produto sem dado fiscal" -- quem congela NCM/IPI/codigo do fornecedor na OC
// usa `buscarProdutoPorIdEstrito`, que propaga o erro da bridge.

type Chamada = { nome: string; body: Record<string, unknown> };
let chamadas: Chamada[] = [];
let resposta: { data: unknown; error: unknown } = { data: null, error: null };

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: async (nome: string, opts: { body: Record<string, unknown> }) => {
        chamadas.push({ nome, body: opts.body });
        return resposta;
      },
    },
  },
}));

const produto = {
  pim_product_id: 'pim-1',
  pim_variant_id: null,
  sku: 'SKU-1',
  supplier_reference: 'REF-1',
  ncm_code: '95059000',
  ipi_rate: 5,
};

const envelope = (data: unknown[]) => ({
  data,
  count: data.length,
  meta: { durationMs: 1, status: 200, recordCount: data.length },
});

describe('buscarProdutoPorIdEstrito (etapa 169)', () => {
  beforeEach(() => {
    chamadas = [];
    resposta = { data: null, error: null };
  });

  it('propaga o erro da bridge em vez de devolver null', async () => {
    resposta = { data: null, error: new Error('Edge Function returned a non-2xx status code') };

    await expect(buscarProdutoPorIdEstrito('pim-1')).rejects.toThrow(
      'Edge Function returned a non-2xx status code',
    );
    expect(chamadas).toHaveLength(1);
    expect(chamadas[0].nome).toBe('external-db-bridge');
  });

  it('devolve o produto e consulta a view de catalogo filtrada por pim_product_id', async () => {
    resposta = { data: envelope([produto]), error: null };

    await expect(buscarProdutoPorIdEstrito('pim-1')).resolves.toMatchObject({
      ncm_code: '95059000',
      ipi_rate: 5,
      supplier_reference: 'REF-1',
    });
    expect(chamadas[0].body).toMatchObject({
      table: 'v_compras_catalogo',
      filters: { pim_product_id: 'pim-1' },
    });
  });

  it('devolve null quando o produto nao existe na view, sem erro', async () => {
    resposta = { data: envelope([]), error: null };

    await expect(buscarProdutoPorIdEstrito('pim-999')).resolves.toBeNull();
  });

  it('mantem o contrato antigo: buscarProdutoPorId engole o erro e devolve null', async () => {
    resposta = { data: null, error: new Error('boom') };
    const { result } = renderHook(() => useCatalogoPim());

    let devolvido: unknown = 'pendente';
    await act(async () => {
      devolvido = await result.current.buscarProdutoPorId('pim-1');
    });

    expect(devolvido).toBeNull();
    await waitFor(() => expect(result.current.error).toBe('boom'));
  });
});
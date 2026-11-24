/**
 * Paridade entre as matrizes de transicao do front e os triggers do banco.
 *
 * Defeito da etapa 124: src/lib/creditoFornecedor.ts mantinha copia propria da
 * matriz de pagamentos e ela ficou defasada quando o banco mudou (migration
 * 20261125170000): o abatimento por credito recusava aplicar 'parcial' num
 * pagamento aprovado/agendado/atrasado, que o banco ja aceita.
 *
 * O teste le a ULTIMA migration que define cada funcao de trigger, remonta a
 * matriz de transicoes dela e compara com as constantes de
 * src/lib/statusTransitionsBanco.ts e com o comportamento de
 * statusAbatimentoAlcancavel, que e quem decide se o credito e debitado.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  TRANSICOES_PAGAMENTO_BANCO,
  TRANSICOES_PEDIDO_BANCO,
  transicaoPermitidaNaTela,
} from '@/lib/statusTransitionsBanco';
import { statusAbatimentoAlcancavel } from '@/lib/creditoFornecedor';

const MIGRATIONS_DIR = resolve(process.cwd(), 'supabase/migrations');

/** Corpo da ultima definicao da funcao na ordem de aplicacao das migrations. */
function corpoDaUltimaDefinicao(nomeFuncao: string): string {
  const marcador = `CREATE OR REPLACE FUNCTION public.${nomeFuncao}()`;
  const arquivos = readdirSync(MIGRATIONS_DIR)
    .filter((nome) => nome.endsWith('.sql'))
    .sort();
  for (let i = arquivos.length - 1; i >= 0; i--) {
    const sql = readFileSync(join(MIGRATIONS_DIR, arquivos[i]), 'utf8');
    const inicio = sql.indexOf(marcador);
    if (inicio < 0) continue;
    const corpoInicio = sql.indexOf('AS $function$', inicio);
    const fim = sql.indexOf('$function$;', corpoInicio);
    if (corpoInicio < 0 || fim < 0) {
      throw new Error(`${arquivos[i]}: corpo de ${nomeFuncao} sem delimitador $function$`);
    }
    return sql.slice(corpoInicio + 'AS $function$'.length, fim);
  }
  throw new Error(`nenhuma migration define public.${nomeFuncao}()`);
}

/** CASE do trigger: status -> alvos. Status sem WHEN cai no ELSE (recusa tudo). */
function matrizDoTrigger(nomeFuncao: string): Record<string, string[]> {
  const corpo = corpoDaUltimaDefinicao(nomeFuncao);
  const matriz: Record<string, string[]> = {};
  const caso = /WHEN\s+'([a-z_]+)'\s+THEN\s+valid_targets\s*:=\s*ARRAY\[([^\]]*)\]/g;
  for (const achado of corpo.matchAll(caso)) {
    matriz[achado[1]] = achado[2]
      .split(',')
      .map((alvo) => alvo.trim().replace(/'/g, ''))
      .filter(Boolean);
  }
  if (Object.keys(matriz).length === 0) {
    throw new Error(`nao achei nenhum WHEN em ${nomeFuncao}`);
  }
  return matriz;
}

const PAGAMENTO_DO_TRIGGER = matrizDoTrigger('validate_pagamento_status_transition');
const PEDIDO_DO_TRIGGER = matrizDoTrigger('validate_pedido_status_transition');

const STATUS_PAGAMENTO = [
  'pendente',
  'aprovado',
  'agendado',
  'pago',
  'parcial',
  'cancelado',
  'atrasado',
];

function conferirParidade(constante: Record<string, string[]>, doTrigger: Record<string, string[]>) {
  expect(Object.keys(constante).sort()).toEqual(Object.keys(doTrigger).sort());
  for (const status of Object.keys(doTrigger)) {
    expect(constante[status], `alvos de ${status}`).toEqual(doTrigger[status]);
  }
}

describe('matriz de pagamentos (src/lib/statusTransitionsBanco.ts)', () => {
  it('bate com a ultima migration que define o trigger', () => {
    conferirParidade(TRANSICOES_PAGAMENTO_BANCO, PAGAMENTO_DO_TRIGGER);
  });

  it('cobre os caminhos de pagamento parcial que o banco passou a aceitar', () => {
    for (const status of ['aprovado', 'agendado', 'atrasado']) {
      expect(TRANSICOES_PAGAMENTO_BANCO[status]).toContain('parcial');
    }
    expect(TRANSICOES_PAGAMENTO_BANCO.parcial).toContain('cancelado');
  });
});

describe('matriz de pedidos (src/lib/statusTransitionsBanco.ts)', () => {
  it('bate com a ultima migration que define o trigger', () => {
    conferirParidade(TRANSICOES_PEDIDO_BANCO, PEDIDO_DO_TRIGGER);
  });

  it('mantem cancelado como estado terminal', () => {
    expect(TRANSICOES_PEDIDO_BANCO.cancelado).toEqual([]);
    expect(PEDIDO_DO_TRIGGER.cancelado).toEqual([]);
  });
});

describe('statusAbatimentoAlcancavel x trigger', () => {
  it('concorda com o banco em toda combinacao de status de pagamento', () => {
    for (const status of STATUS_PAGAMENTO) {
      const aceitaParcial = status === 'parcial' || PAGAMENTO_DO_TRIGGER[status].includes('parcial');
      const aceitaPago = status === 'pago' || PAGAMENTO_DO_TRIGGER[status].includes('pago');
      expect(statusAbatimentoAlcancavel(status, 10, 100), `parcial a partir de ${status}`).toBe(
        aceitaParcial ? 'parcial' : null,
      );
      expect(statusAbatimentoAlcancavel(status, 100, 100), `pago a partir de ${status}`).toBe(
        aceitaPago ? 'pago' : null,
      );
    }
  });
});

describe('transicaoPermitidaNaTela', () => {
  it('aceita a mesma transicao, que o trigger devolve sem validar', () => {
    expect(transicaoPermitidaNaTela(TRANSICOES_PAGAMENTO_BANCO, 'pago', 'pago')).toBe(true);
    expect(transicaoPermitidaNaTela(TRANSICOES_PAGAMENTO_BANCO, 'parcial', 'parcial')).toBe(true);
  });

  it('recusa as transicoes que o trigger recusa', () => {
    expect(transicaoPermitidaNaTela(TRANSICOES_PAGAMENTO_BANCO, 'pendente', 'agendado')).toBe(false);
    expect(transicaoPermitidaNaTela(TRANSICOES_PAGAMENTO_BANCO, 'cancelado', 'pendente')).toBe(false);
    expect(transicaoPermitidaNaTela(TRANSICOES_PEDIDO_BANCO, 'cancelado', 'pendente')).toBe(false);
  });

  it('aceita a auto-transicao de todo status dos dois vocabularios', () => {
    for (const matriz of [PAGAMENTO_DO_TRIGGER, PEDIDO_DO_TRIGGER]) {
      for (const status of Object.keys(matriz)) {
        expect(transicaoPermitidaNaTela(matriz, status, status), status).toBe(true);
      }
    }
  });

  it('deixa status desconhecido para o banco decidir', () => {
    expect(transicaoPermitidaNaTela(TRANSICOES_PAGAMENTO_BANCO, 'status-novo', 'pago')).toBe(true);
    expect(transicaoPermitidaNaTela(TRANSICOES_PAGAMENTO_BANCO, null, 'pago')).toBe(true);
  });
});

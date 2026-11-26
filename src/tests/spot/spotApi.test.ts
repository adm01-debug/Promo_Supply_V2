import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  SPOT_QUOTA_RESERVE,
  buildInternalReference,
  chunk,
  decodeServiceCode,
  describeSpotError,
  evaluateQuota,
  extractPriceTiers,
  parseCatalogs,
  parseSpotDecimal,
  priceForQuantity,
  readOrdersDetails,
  resolveCategoryName,
  splitTypeCodes,
  spotProductImageUrl,
} from '../../../supabase/functions/_shared/spot_api';

describe('parseSpotDecimal', () => {
  it('converte vírgula decimal (HandlingCosts "2,5")', () => {
    expect(parseSpotDecimal('2,5')).toBe(2.5);
  });
  it('aceita número e string com espaços', () => {
    expect(parseSpotDecimal(0.342)).toBe(0.342);
    expect(parseSpotDecimal(' 1 234,75 ')).toBeCloseTo(1234.75);
  });
  it('devolve null para vazio ou inválido', () => {
    expect(parseSpotDecimal('')).toBeNull();
    expect(parseSpotDecimal(null)).toBeNull();
    expect(parseSpotDecimal('abc')).toBeNull();
    expect(parseSpotDecimal(Number.NaN)).toBeNull();
  });
});

describe('decodeServiceCode', () => {
  it('decodifica o formato padrão de 4 partes', () => {
    expect(decodeServiceCode('11103.18.23.SCR1-01-01')).toEqual({
      productReference: '11103',
      componentId: '18',
      locationId: '23',
      tableCodeOption: 'SCR1-01-01',
    });
  });
  it('junta partes 4+5 quando o split dá 5 elementos', () => {
    expect(decodeServiceCode('11103.18.23.SCR1-01.F')?.tableCodeOption).toBe('SCR1-01.F');
  });
  it('rejeita códigos incompletos', () => {
    expect(decodeServiceCode('11103.18.23')).toBeNull();
    expect(decodeServiceCode('')).toBeNull();
  });
});

describe('describeSpotError', () => {
  it('trata ausência de erro como sucesso', () => {
    expect(describeSpotError(null)).toBeNull();
    expect(describeSpotError(undefined)).toBeNull();
  });
  it('marca 13 como reautenticável e w2 como retryable', () => {
    expect(describeSpotError('13')?.reauth).toBe(true);
    expect(describeSpotError('w2')?.retryable).toBe(true);
    expect(describeSpotError('w2')?.reauth).toBe(false);
  });
  it('erro 14 e 70 não são retentáveis', () => {
    expect(describeSpotError('14')?.retryable).toBe(false);
    expect(describeSpotError('70')?.message).toMatch(/duplicada/i);
  });
  it('usa fallback para códigos desconhecidos', () => {
    const info = describeSpotError('999', 'boom');
    expect(info?.code).toBe('999');
    expect(info?.message).toBe('boom');
  });
});

describe('evaluateQuota', () => {
  it('permite endpoints ilimitados', () => {
    expect(evaluateQuota('OrderV1', 5_000).allowed).toBe(true);
  });
  it('bloqueia Stocks acima de 96 menos a reserva', () => {
    expect(evaluateQuota('Stocks', 90).allowed).toBe(true);
    expect(evaluateQuota('Stocks', 96 - SPOT_QUOTA_RESERVE).allowed).toBe(false);
  });
  it('bloqueia catálogo acima de 22 menos a reserva', () => {
    expect(evaluateQuota('products', 19).allowed).toBe(true);
    expect(evaluateQuota('products', 20).allowed).toBe(false);
    expect(evaluateQuota('products', 20).reason).toMatch(/Limite diário/);
  });
});

describe('parseCatalogs e TypeCodes', () => {
  it('divide catálogos multi-valor sem duplicar', () => {
    expect(parseCatalogs('SPOT, Novidades ,SPOT')).toEqual(['SPOT', 'Novidades']);
    expect(parseCatalogs('')).toEqual([]);
  });
  it('separa TypeCode legado do novo', () => {
    expect(splitTypeCodes('10', '0035')).toEqual({ legacy: '10', modern: '0035' });
    expect(splitTypeCodes('0028')).toEqual({ legacy: null, modern: '0028' });
  });
  it('resolve categoria por qualquer um dos dois códigos', () => {
    expect(resolveCategoryName('10', null)).toBe('Squeezes & Copos');
    expect(resolveCategoryName(null, '0034')).toBe('Esporte & Ar Livre');
    expect(resolveCategoryName('999', null)).toBeNull();
  });
});

describe('faixas de preço', () => {
  const optional = { MinQt1: 1, Price1: 1.5, MinQt2: 100, Price2: '1,2', MinQt3: 0, Price3: 9 };
  it('extrai e ordena faixas válidas', () => {
    expect(extractPriceTiers(optional)).toEqual([
      { minQty: 1, price: 1.5 },
      { minQty: 100, price: 1.2 },
    ]);
  });
  it('escolhe o preço da maior faixa atingida', () => {
    const tiers = extractPriceTiers(optional);
    expect(priceForQuantity(tiers, 50)).toBe(1.5);
    expect(priceForQuantity(tiers, 100)).toBe(1.2);
    expect(priceForQuantity([], 10)).toBeNull();
  });
});

describe('readOrdersDetails', () => {
  it('lê a chave OrdersDetails (com S)', () => {
    expect(readOrdersDetails({ OrdersDetails: [{ OrderStamp: 'ws1' }] })).toHaveLength(1);
  });
  it('aceita a grafia legada e payloads inválidos', () => {
    expect(readOrdersDetails({ OrderDetails: [{}] })).toHaveLength(1);
    expect(readOrdersDetails(null)).toEqual([]);
  });
});

describe('utilitários', () => {
  it('gera referências internas únicas', () => {
    const a = buildInternalReference();
    const b = buildInternalReference();
    expect(a).not.toBe(b);
    expect(a.startsWith('PS-')).toBe(true);
  });
  it('monta URL de imagem a partir do SKU', () => {
    expect(spotProductImageUrl('93269-103')).toBe('https://ws.spotgifts.com.br/Products/93269_103.jpg');
    expect(spotProductImageUrl('')).toBeNull();
  });
  it('divide arrays grandes em lotes', () => {
    const items = Array.from({ length: 1001 }, (_, i) => i);
    const batches = chunk(items, 500);
    expect(batches).toHaveLength(3);
    expect(batches[2]).toHaveLength(1);
    expect(() => chunk(items, 0)).toThrow();
  });
});


describe('spot-api: acoes do cron', () => {
  const fonte = readFileSync(resolve(process.cwd(), 'supabase/functions/spot-api/index.ts'), 'utf8');

  const extraiSet = (nome: string): string[] => {
    const re = new RegExp('const ' + nome + '[^=]*= new Set<Action>\\(\\[([\\s\\S]*?)\\]\\)');
    const m = fonte.match(re);
    if (!m) throw new Error('nao achei ' + nome);
    const acoes: string[] = [];
    const re2 = /"([A-Za-z]+)"/g;
    let x;
    while ((x = re2.exec(m[1])) !== null) acoes.push(x[1]);
    return acoes;
  };

  it('permite getOrders no cron — sem isso spot_pedidos fica vazio', () => {
    expect(extraiSet('CRON_ACTIONS')).toContain('getOrders');
  });

  it('permite os tres syncs no cron', () => {
    const cron = extraiSet('CRON_ACTIONS');
    for (const a of ['syncCatalog', 'syncCustomization', 'syncStock']) expect(cron).toContain(a);
  });

  it('mantem createOrder fora do cron — cria compromisso financeiro', () => {
    expect(extraiSet('CRON_ACTIONS')).not.toContain('createOrder');
  });

  it('getOrders envia o parametro Status - a API SPOT responde ErrorCode 2 sem ele', () => {
    const bloco = fonte.match(/callSpot<Record<string, unknown>>\(db, logger, "OrdersV1"[\s\S]{0,200}?\);/);
    expect(bloco?.[0] ?? '').toMatch(/Status/);
  });

  it('readOrdersDetails desembrulha OrderV1Result do OrderV1', () => {
    // OrderV1 devolve { OrderV1Result: { OrderDetails: [...] } }; o leitor plano
    // lia [] e createOrder nunca gravava o pedido criado.
    const envelopado = { OrderV1Result: { OrderDetails: [{ OrderStamp: 'ABC123' }] } };
    expect(readOrdersDetails(envelopado)).toHaveLength(1);
    expect(readOrdersDetails(envelopado)[0].OrderStamp).toBe('ABC123');
  });

  it('readOrdersDetails continua lendo a resposta plana do OrdersV1', () => {
    const plano = { OrdersDetails: [{ OrderStamp: 'X1' }, { OrderStamp: 'X2' }] };
    expect(readOrdersDetails(plano)).toHaveLength(2);
  });

  it('readOrdersDetails aceita OrderDetails singular', () => {
    expect(readOrdersDetails({ OrderDetails: [{ OrderStamp: 'S1' }] })).toHaveLength(1);
  });

  it('readOrdersDetails devolve [] para payload sem detalhes', () => {
    expect(readOrdersDetails({ ErrorCode: 2 })).toEqual([]);
    expect(readOrdersDetails(null)).toEqual([]);
  });
  it('toda acao do cron existe em VALID_ACTIONS (senao 400 antes do 403)', () => {
    const validas = extraiSet('VALID_ACTIONS');
    for (const a of extraiSet('CRON_ACTIONS')) expect(validas).toContain(a);
  });
});

describe('spot-api: cota contada por requisicao HTTP', () => {
  const fonte = readFileSync(resolve(process.cwd(), 'supabase/functions/spot-api/index.ts'), 'utf8');

  const bloco = (assinatura: string, fim = '\n}'): string => {
    const inicio = fonte.indexOf(assinatura);
    if (inicio < 0) throw new Error('nao achei ' + assinatura);
    const termino = fonte.indexOf(fim, inicio);
    if (termino < 0) throw new Error('nao achei o fim de ' + assinatura);
    return fonte.slice(inicio, termino);
  };

  it('usedToday ignora a recusa por quota — ela nao chega ao fornecedor', () => {
    expect(bloco('async function usedToday(')).toContain('.neq("status", "quota_blocked")');
  });

  it('cada tentativa HTTP abre a propria linha de log, antes do fetch', () => {
    const exec = bloco('const execute = async (', '\n  };');
    expect(exec).toContain('openAttempt(db, endpoint, action)');
    expect(exec.indexOf('openAttempt')).toBeLessThan(exec.indexOf('await fetch('));
  });

  it('a resposta fecha a linha da tentativa com sucesso ou erro', () => {
    const exec = bloco('const execute = async (', '\n  };');
    expect(exec).toContain('closeAttempt(db, attemptId, { status: "success"');
    expect(exec).toContain('status: "error"');
  });

  it('nao grava linha extra por chamada logica — contaria a cota duas vezes', () => {
    const chamada = bloco('async function callSpot<');
    expect(chamada.match(/logCall\(/g) ?? []).toHaveLength(1);
    expect(chamada).toContain('status: "quota_blocked"');
  });
});
#!/usr/bin/env node
// EDGE-01: `getTenantId(client, user, preferredTenantId?)` espera um UUID de tenant no
// terceiro argumento. Durante a migracao M-02 (que trocou o header `x-tenant-id` pela
// resolucao via `user_tenants`) duas edges continuaram passando o proprio `Request`:
// `workflow-engine` e `fiscal-orchestrator`. Como um `Request` e truthy e nunca pertence
// ao Set de memberships, a funcao lancava
// "Security error: preferredTenantId does not match user's memberships" em TODA chamada,
// derrubando o fluxo de aprovacao e a orquestracao fiscal inteiros sem erro de tipo que
// o CI pegasse. Este guard impede a reintroducao.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const RAIZ = join(fileURLToPath(import.meta.url), '../../..');
const BASE_EDGES = join(RAIZ, 'supabase', 'functions');

/** Lista recursivamente os `.ts` sob supabase/functions/. */
export function listarFontesEdge(base = BASE_EDGES) {
  const saida = [];
  const visitar = (abs, rel) => {
    for (const nome of readdirSync(abs).sort()) {
      const filhoAbs = join(abs, nome);
      const filhoRel = rel ? `${rel}/${nome}` : nome;
      const st = statSync(filhoAbs, { throwIfNoEntry: false });
      if (!st) continue;
      if (st.isDirectory()) visitar(filhoAbs, filhoRel);
      else if (st.isFile() && nome.endsWith('.ts')) saida.push([filhoRel, filhoAbs]);
    }
  };
  visitar(base, '');
  return saida;
}

/**
 * Devolve os argumentos de cada chamada a `getTenantId(...)` no codigo, equilibrando
 * parenteses para nao quebrar em argumentos aninhados tipo `(data as any).tenantId`.
 */
export function chamadasGetTenantId(codigo) {
  const chamadas = [];
  const alvo = 'getTenantId(';
  let i = 0;
  while ((i = codigo.indexOf(alvo, i)) !== -1) {
    // Ignora a definicao/exportacao da propria helper.
    const antes = codigo.slice(Math.max(0, i - 40), i);
    if (/\b(export\s+const|const|function)\s*$/.test(antes) || /\b(export\s+const|const)\s+$/.test(antes)) {
      i += alvo.length;
      continue;
    }
    let p = i + alvo.length;
    let profundidade = 1;
    let inicio = p;
    const args = [];
    for (; p < codigo.length && profundidade > 0; p++) {
      const ch = codigo[p];
      if (ch === '(' || ch === '[' || ch === '{') profundidade++;
      else if (ch === ')' || ch === ']' || ch === '}') {
        profundidade--;
        if (profundidade === 0) { args.push(codigo.slice(inicio, p).trim()); break; }
      } else if (ch === ',' && profundidade === 1) {
        args.push(codigo.slice(inicio, p).trim());
        inicio = p + 1;
      }
    }
    chamadas.push(args.filter((a) => a !== ''));
    i = p;
  }
  return chamadas;
}

/** Terceiro argumento que claramente nao e um id de tenant. */
const TERCEIRO_PROIBIDO = /^(req|request|_req)$/;

test('edges (EDGE-01): getTenantId nunca recebe o Request como preferredTenantId', () => {
  const infratores = [];
  for (const [rel, abs] of listarFontesEdge()) {
    if (rel.endsWith('_shared/security.ts')) continue;
    for (const args of chamadasGetTenantId(readFileSync(abs, 'utf8'))) {
      if (args.length >= 3 && TERCEIRO_PROIBIDO.test(args[2])) {
        infratores.push(`supabase/functions/${rel}: getTenantId(..., ..., ${args[2]})`);
      }
    }
  }
  assert.deepEqual(
    infratores,
    [],
    'getTenantId espera um UUID de tenant no 3o argumento; passar o Request faz a chamada ' +
      'lancar "preferredTenantId does not match user\'s memberships" sempre. Use ' +
      'getTenantId(client, user) ou passe o tenantId vindo do body validado.\n' +
      infratores.join('\n'),
  );
});

test('edges (EDGE-01): o parser reconhece as formas reais de chamada', () => {
  const amostra = `
    const a = await getTenantId(client, user);
    const b = await getTenantId(authClient, user, (data as any).tenantId);
    const c = await getTenantId(supabase, user, req);
    export const getTenantId = async (supabase, user, preferredTenantId) => {};
  `;
  const chamadas = chamadasGetTenantId(amostra);
  assert.deepEqual(chamadas, [
    ['client', 'user'],
    ['authClient', 'user', '(data as any).tenantId'],
    ['supabase', 'user', 'req'],
  ]);
  const ruins = chamadas.filter((args) => args.length >= 3 && TERCEIRO_PROIBIDO.test(args[2]));
  assert.equal(ruins.length, 1, 'so a forma com `req` deve ser sinalizada');
});

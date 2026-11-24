/**
 * QA 064 (EDGA-11): `verifyCronSecret` compara o segredo com `!==` em vez de
 * comparacao de tempo constante, e `spot-api` comparava a service role key do
 * mesmo jeito - quem pode medir o tempo de resposta podia descobrir o segredo
 * byte a byte. O teste cobre a helper e o gate real de cron (10 edges dependem
 * dele), nao apenas a funcao pura.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { timingSafeEqualStr, verifyCronSecret } from './security.ts';

Deno.test('timingSafeEqualStr: iguais, diferentes e comprimentos distintos', () => {
  assertEquals(timingSafeEqualStr('abc', 'abc'), true);
  assertEquals(timingSafeEqualStr('abc', 'abd'), false);
  assertEquals(timingSafeEqualStr('abc', 'abcd'), false);
  assertEquals(timingSafeEqualStr('', ''), true);
  assertEquals(timingSafeEqualStr('', 'a'), false);
  assertEquals(timingSafeEqualStr('a'.repeat(200), 'a'.repeat(200)), true);
  assertEquals(timingSafeEqualStr('a'.repeat(200), 'a'.repeat(199) + 'b'), false);
});

Deno.test('verifyCronSecret aceita so o CRON_SECRET exato', () => {
  const antes = Deno.env.get('CRON_SECRET');
  try {
    Deno.env.set('CRON_SECRET', 'segredo-de-teste');
    const ok = verifyCronSecret(new Request('https://x/cron', { headers: { Authorization: 'Bearer segredo-de-teste' } }));
    assertEquals(ok, null);

    const errado = verifyCronSecret(new Request('https://x/cron', { headers: { Authorization: 'Bearer segredo-de-teste2' } }));
    assertEquals(errado?.status, 401);

    const vazio = verifyCronSecret(new Request('https://x/cron'));
    assertEquals(vazio?.status, 401);
  } finally {
    if (antes === undefined) Deno.env.delete('CRON_SECRET');
    else Deno.env.set('CRON_SECRET', antes);
  }
});

Deno.test('verifyCronSecret sem CRON_SECRET aceita a service role key exata', () => {
  const cron = Deno.env.get('CRON_SECRET');
  const svc = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  try {
    Deno.env.delete('CRON_SECRET');
    Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'service-role-de-teste');

    const ok = verifyCronSecret(new Request('https://x/cron', { headers: { Authorization: 'Bearer service-role-de-teste' } }));
    assertEquals(ok, null);

    const errado = verifyCronSecret(new Request('https://x/cron', { headers: { Authorization: 'Bearer service-role-de-teste-x' } }));
    assertEquals(errado?.status, 401);

    const anon = verifyCronSecret(new Request('https://x/cron', { headers: { Authorization: 'Bearer anon-key' } }));
    assertEquals(anon?.status, 401);
  } finally {
    if (cron !== undefined) Deno.env.set('CRON_SECRET', cron);
    if (svc === undefined) Deno.env.delete('SUPABASE_SERVICE_ROLE_KEY');
    else Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', svc);
  }
});

Deno.test('verifyCronSecret sem nenhum segredo configurado e fail-closed', () => {
  const cron = Deno.env.get('CRON_SECRET');
  const svc = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  try {
    Deno.env.delete('CRON_SECRET');
    Deno.env.delete('SUPABASE_SERVICE_ROLE_KEY');
    const r = verifyCronSecret(new Request('https://x/cron', { headers: { Authorization: 'Bearer qualquer' } }));
    assertEquals(r?.status, 401);
  } finally {
    if (cron !== undefined) Deno.env.set('CRON_SECRET', cron);
    if (svc !== undefined) Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', svc);
  }
});

Deno.test('spot-api nao usa mais comparacao direta de segredo', async () => {
  const fonte = await Deno.readTextFile(new URL('../spot-api/index.ts', import.meta.url));
  assert(!fonte.includes('token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")'));
  assert(fonte.includes('timingSafeEqualStr(token, serviceKey)'));
  assert(fonte.includes('timingSafeEqualStr(cronKey, expectedCronKey)'));
});

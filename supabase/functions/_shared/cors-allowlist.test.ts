/**
 * Allowlist de CORS (QA 045): cobre o furo do comparador de curinga e o
 * comportamento de buildCorsHeaders com e sem ALLOWED_ORIGINS.
 * Rodar: deno test supabase/functions/_shared/cors-allowlist.test.ts
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { buildCorsHeaders } from './security.ts';

const ORIGEM = 'https://app.exemplo.com';

const comEnv = (valor: string | undefined, fn: () => void) => {
  const antes = Deno.env.get('ALLOWED_ORIGINS');
  if (valor === undefined) Deno.env.delete('ALLOWED_ORIGINS');
  else Deno.env.set('ALLOWED_ORIGINS', valor);
  try { fn(); } finally {
    if (antes === undefined) Deno.env.delete('ALLOWED_ORIGINS');
    else Deno.env.set('ALLOWED_ORIGINS', antes);
  }
};

const originDe = (origin: string) =>
  buildCorsHeaders(new Request('https://x/funcao', { headers: { Origin: origin } }))['Access-Control-Allow-Origin'];

Deno.test('sem ALLOWED_ORIGINS (dev/preview) libera qualquer origem', () => {
  comEnv(undefined, () => assertEquals(originDe(ORIGEM), '*'));
});

Deno.test('ALLOWED_ORIGINS exata: origem da lista passa, outra e bloqueada', () => {
  comEnv(ORIGEM, () => {
    assertEquals(originDe(ORIGEM), ORIGEM);
    assertEquals(originDe('https://outro.com'), undefined);
  });
});

Deno.test('curinga *.dominio casa subdominio e NAO casa sufixo sem o ponto', () => {
  comEnv('*.lovable.app', () => {
    assertEquals(originDe('https://app.lovable.app'), 'https://app.lovable.app');
    assertEquals(originDe('https://a.b.lovable.app'), 'https://a.b.lovable.app');
    assertEquals(originDe('https://evil-lovable.app'), undefined);
    assertEquals(originDe('https://notlovable.app'), undefined);
  });
});

Deno.test('curinga nao casa o dominio raiz nem origem invalida', () => {
  comEnv('*.lovable.app', () => {
    assertEquals(originDe('https://lovable.app'), undefined);
    assertEquals(originDe('not-a-url'), undefined);
  });
});


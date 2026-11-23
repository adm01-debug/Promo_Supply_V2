/**
 * QA 046 (EDGA-06): nenhuma edge function pode responder CORS por conta propria.
 *
 * Antes desta etapa, 37 handlers usavam a constante `corsHeaders` de
 * `_shared/security.ts`, que devolve `Access-Control-Allow-Origin: *` e por
 * isso ignora a allowlist `ALLOWED_ORIGINS`. Um `access-control-allow-origin: *`
 * fixo significa que qualquer site pode chamar a funcao em nome do usuario.
 *
 * Este teste falha se algum `index.ts` voltar a importar a constante. A unica
 * forma correta e `buildCorsHeaders(req)`, que ecoa a origem apenas quando ela
 * esta na allowlist.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

const RAIZ = new URL('../', import.meta.url);
const CONSTANTE = /\bcorsHeaders\b/;

const arquivos = (): string[] => {
  const saida: string[] = [];
  for (const entrada of Deno.readDirSync(RAIZ)) {
    if (!entrada.isDirectory || entrada.name.startsWith('_')) continue;
    try {
      Deno.statSync(new URL(`./${entrada.name}/index.ts`, RAIZ));
    } catch {
      continue;
    }
    saida.push(entrada.name);
  }
  return saida.sort();
};

Deno.test('nenhuma edge importa a constante corsHeaders', () => {
  const infratores: string[] = [];
  for (const dir of arquivos()) {
    const src = Deno.readTextFileSync(new URL(`./${dir}/index.ts`, RAIZ));
    // Comentarios sao permitidos: citam o problema historico.
    const codigo = src
      .split('\n')
      .filter((l) => !l.trimStart().startsWith('//') && !l.trimStart().startsWith('*'))
      .join('\n');
    if (CONSTANTE.test(codigo)) infratores.push(dir);
  }
  assertEquals(infratores, [], `edges com CORS fixo: ${infratores.join(', ')}`);
});

Deno.test('as edges que respondem OPTIONS derivam o cors da requisicao', () => {
  const semDerivacao: string[] = [];
  for (const dir of arquivos()) {
    const src = Deno.readTextFileSync(new URL(`./${dir}/index.ts`, RAIZ));
    if (!/["']OPTIONS["']/.test(src)) continue;
    if (!/buildCorsHeaders\s*\(/.test(src)) semDerivacao.push(dir);
  }
  assertEquals(semDerivacao, [], `edges sem buildCorsHeaders: ${semDerivacao.join(', ')}`);
});

Deno.test('o teste cobre o diretorio de functions de verdade', () => {
  // Guarda contra o teste passar por nao encontrar nada.
  assert(arquivos().length > 25, `so ${arquivos().length} edges encontradas`);
});
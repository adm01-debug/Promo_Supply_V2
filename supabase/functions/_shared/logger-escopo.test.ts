/**
 * QA 069 (CI-01) / QA 070 (EDG-01): o `EdgeLogger` precisa nascer fora do `try`.
 *
 * Nas edges abaixo o `logger` era declarado dentro do bloco `try` e usado no
 * `catch`. Como `const` e de escopo de bloco, o nome simplesmente nao existe no
 * `catch`: o `typeof logger !== 'undefined'` que deveria proteger o log estourava
 * `ReferenceError: logger is not defined` no exato momento de registrar a falha.
 * Resultado: nenhum erro chegava em `telemetry_logs` e a resposta saia sem log.
 *
 * O teste le o `index.ts` (o modulo chama `Deno.serve` na carga, entao nao pode
 * ser importado) e compara a posicao da declaracao com a abertura do `try`.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

const EDGES = [
  'check-approval-escalations',
  'check-sla-alerts',
  'weekly-summary-report',
];

for (const edge of EDGES) {
  Deno.test(`QA 069 ${edge} declara o logger antes do try`, () => {
    const src = Deno.readTextFileSync(new URL(`../${edge}/index.ts`, import.meta.url));
    const decl = src.indexOf('const logger = new EdgeLogger(');
    const tryIdx = src.indexOf('\n  try {');

    assert(decl > -1, `${edge}: logger nao e declarado via EdgeLogger`);
    assert(tryIdx > -1, `${edge}: handler sem bloco try no corpo`);
    assert(
      decl < tryIdx,
      `${edge}: logger declarado depois do try (linha ${src.slice(0, decl).split('\n').length}) e invisivel no catch`,
    );
  });

  Deno.test(`QA 069 ${edge} nao esconde o logger atras de typeof`, () => {
    const src = Deno.readTextFileSync(new URL(`../${edge}/index.ts`, import.meta.url));
    assertEquals(
      src.includes("typeof logger !== 'undefined'"),
      false,
      `${edge}: o guard de typeof mascarava o escopo errado do logger`,
    );
  });
}
/**
 * QA 126 (DB-01): a edge check-approval-escalations escrevia o vocabulario de
 * status em portugues em colunas que o banco so aceita em ingles.
 *
 * As tres colunas sao fixadas por CHECK constraint lido em producao:
 *   approval_steps_status_check    CHECK (status = ANY (ARRAY['pending','approved','rejected','skipped']))
 *   approval_workflows_status_check CHECK (status = ANY (ARRAY['pending','approved','rejected','escalated','cancelled']))
 *   approval_history_acao_check    CHECK (acao = ANY (ARRAY['created','approved','rejected','escalated','delegated','reminder_sent','cancelled']))
 *
 * `.eq('status', 'pendente')` nao da erro: devolve zero linha para sempre, entao
 * o laco nunca rodava. Os writes morriam com 23514 e so um console.error
 * aparecia. Este teste trava o vocabulario na fonte: qualquer literal fora
 * dessas listas, ou o retorno do `pendente`/`escalado`/`expirado`, falha aqui.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

const FONTE = new URL('./index.ts', import.meta.url);

const PASSOS = ['pending', 'approved', 'rejected', 'skipped'];
const WORKFLOWS = ['pending', 'approved', 'rejected', 'escalated', 'cancelled'];
const HISTORICO = ['created', 'approved', 'rejected', 'escalated', 'delegated', 'reminder_sent', 'cancelled'];

/** Codigo sem as linhas de comentario: eles citam os valores errados de proposito. */
const codigo = (): string =>
  Deno.readTextFileSync(FONTE)
    .split('\n')
    .filter((l) => {
      const t = l.trimStart();
      return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
    })
    .join('\n');

const capturar = (src: string, re: RegExp): string[] => {
  const out: string[] = [];
  for (const m of src.matchAll(re)) out.push(m[1]);
  return out;
};

Deno.test('nenhum status em portugues e usado como filtro ou como valor gravado', () => {
  const src = codigo();
  for (const literal of ["'pendente'", "'em_andamento'", "'expirado'", "'escalado_automatico'"]) {
    assert(!src.includes(literal), `literal ${literal} ainda aparece na edge`);
  }
  // 'escalado' so pode aparecer como coluna (escalado_em/escalado_para), nunca como valor.
  assert(!/status:\s*'escalado'/.test(src), "status: 'escalado' ainda e gravado");
});

Deno.test('o filtro de passos vencidos usa pending', () => {
  const src = codigo();
  const filtros = capturar(src, /\.eq\('status',\s*'([a-z_]+)'\)/g);
  assertEquals(filtros.length, 2, 'a edge filtra status em 2 consultas (vencidos e proximos do prazo)');
  for (const f of filtros) assertEquals(f, 'pending');
});

Deno.test('o guarda do workflow usa pending', () => {
  const src = codigo();
  assert(/workflow\.status\s*!==\s*'pending'/.test(src), "o guarda deve comparar com 'pending'");
});

Deno.test('todo status gravado pertence aos CHECK de approval_steps/approval_workflows', () => {
  const src = codigo();
  const gravados = capturar(src, /status:\s*'([a-z_]+)'/g);
  assert(gravados.length >= 2, 'a edge grava status de workflow e de passo');
  for (const s of gravados) {
    assert(
      PASSOS.includes(s) || WORKFLOWS.includes(s),
      `status '${s}' nao existe em approval_steps_status_check nem em approval_workflows_status_check`,
    );
  }
  assert(gravados.includes('escalated'), 'o workflow escalado precisa gravar escalated');
  assert(gravados.includes('skipped'), 'o passo abandonado por prazo precisa gravar skipped');
});

Deno.test('toda acao do historico pertence ao CHECK de approval_history', () => {
  const src = codigo();
  const acoes = capturar(src, /acao:\s*'([a-z_]+)'/g);
  assert(acoes.length >= 1, 'a edge grava o historico da escalada');
  for (const a of acoes) {
    assert(
      HISTORICO.includes(a),
      `acao '${a}' nao existe em approval_history_acao_check`,
    );
  }
  assert(acoes.includes('escalated'), 'a escalada automatica precisa gravar acao escalated');
});
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assertBlocking, conditionOf, jobOf, onlyStep, permission, shellCode, stepsOf } from './workflow-test-support.mjs';
import { avaliarSla, nivel, relatorio } from './sla-code-scanning.mjs';

const AGORA = Date.parse('2026-10-15T12:00:00Z');
const diasAtras = (d) => new Date(AGORA - d * 86_400_000).toISOString();
const alerta = (number, rule, dias) => ({ number, rule, created_at: diasAtras(dias), most_recent_instance: { location: { path: 'src/x.ts' } } });

test('nível vem de security_severity_level; sem ele, error conta como alto (o defeito de rule.severity)', () => {
  assert.equal(nivel({ rule: { security_severity_level: 'high', severity: 'warning' } }), 'high');
  assert.equal(nivel({ rule: { security_severity_level: 'Critical' } }), 'critical');
  assert.equal(nivel({ rule: { severity: 'error' } }), 'high');
  assert.equal(nivel({ rule: { severity: 'warning' } }), 'low');
  assert.equal(nivel({}), 'low');
});

test('high vence com 15 dias; medium só depois de 30', () => {
  const r = avaliarSla([
    alerta(1, { id: 'js/a', security_severity_level: 'high' }, 15),
    alerta(2, { id: 'js/b', security_severity_level: 'high' }, 14),
    alerta(3, { id: 'js/c', security_severity_level: 'medium' }, 29),
    alerta(4, { id: 'js/d', security_severity_level: 'medium' }, 31),
  ], AGORA);
  assert.equal(r.total, 4);
  assert.deepEqual(r.violacoes, [
    'HIGH (15d > 14d) — #1: js/a em src/x.ts',
    'MEDIUM (31d > 30d) — #4: js/d em src/x.ts',
  ]);
});

test('relatório: sem violação diz isso; com violação lista em bloco', () => {
  assert.match(relatorio({ total: 0, violacoes: [] }), /Alertas abertos: 0[\s\S]*Nenhuma violação/);
  assert.match(relatorio({ total: 1, violacoes: ['HIGH x'] }), /Violações de SLA[\s\S]*HIGH x/);
});

const SCRIPT = new URL('./sla-code-scanning.mjs', import.meta.url).pathname;
const cli = (entrada, script = SCRIPT) => spawnSync(process.execPath, [script], { encoding: 'utf8', input: entrada });

test('CLI: lê o JSON do stdin, sai 1 com violação e 0 sem', () => {
  const r1 = cli(JSON.stringify([{ number: 9, rule: { id: 'js/z', security_severity_level: 'high' }, created_at: '2020-01-01T00:00:00Z' }]));
  assert.equal(r1.status, 1);
  assert.match(r1.stdout, /#9: js\/z/);
  assert.match(r1.stderr, /::error::SLA de code scanning/);
  const r0 = cli('[]');
  assert.equal(r0.status, 0);
  assert.match(r0.stdout, /Nenhuma violação/);
});

test('CLI: resposta que não é lista (erro de permissão) ou JSON inválido avisa e não bloqueia', () => {
  for (const entrada of [JSON.stringify({ message: 'Resource not accessible by integration' }), 'não é json', '']) {
    const r = cli(entrada);
    assert.equal(r.status, 0, entrada);
    assert.match(r.stderr, /::warning::a API de code scanning/);
  }
});

test('o workflow passa os alertas pelo stdin e não tem mais Node inline', () => {
  const wf = readFileSync(new URL('../../.github/workflows/branch-hygiene-audit.yml', import.meta.url), 'utf8');
  const job = jobOf(wf, 'audit');
  const step = onlyStep(stepsOf(job), (s) => /^\s*node scripts\/ci\/sla-code-scanning\.mjs\b/m.test(shellCode(s)), 'SLA de code scanning');
  const code = shellCode(step);
  assert.equal(permission(job, 'security-events'), 'read');
  assert.equal(conditionOf(step), 'success()');
  assertBlocking(job, 4);
  assertBlocking(step);
  assert.match(code, /node scripts\/ci\/sla-code-scanning\.mjs < "\$ARQUIVO"/);
  assert.match(code, /gh api --paginate --slurp[^\n]*code-scanning\/alerts[^\n]*\| jq 'add'/);
  assert.doesNotMatch(code, /\|\|\s*true|NODE_EOF|node --input-type=module/);
});

// --- auditoria 09/11/2026: defeitos reproduzidos contra fixtures antes da correcao ---

test('alerta ja fechado (dismissed/fixed) nao viola SLA nem entra em "Alertas abertos"', () => {
  const alto = { id: 'js/a', security_severity_level: 'high' };
  const r = avaliarSla([
    { ...alerta(1, alto, 400), state: 'dismissed' },
    { ...alerta(2, alto, 400), state: 'fixed' },
    { ...alerta(3, alto, 400), state: 'open' },
    alerta(4, alto, 400),
  ], AGORA);
  assert.equal(r.total, 2, 'antes: 4');
  assert.deepEqual(r.violacoes, [
    'HIGH (400d > 14d) — #3: js/a em src/x.ts',
    'HIGH (400d > 14d) — #4: js/a em src/x.ts',
  ], 'sem `state` o alerta continua sendo cobrado');
  const saida = cli(JSON.stringify([{ number: 1, state: 'fixed', rule: alto, created_at: '2020-01-01T00:00:00Z' }]));
  assert.equal(saida.status, 0, 'antes: exit 1 por alerta ja corrigido');
  assert.match(saida.stdout, /Alertas abertos: 0[\s\S]*Nenhuma violação/);
});

test('created_at nulo é "ausente", não 20 mil dias; item nulo na lista não derruba o script', () => {
  const alto = { id: 'js/a', security_severity_level: 'high' };
  const r = avaliarSla([{ ...alerta(1, alto, 0), created_at: null }, null], AGORA);
  assert.deepEqual(r.violacoes, [
    'HIGH (created_at ausente ou invalido: nao avaliado) — #1: js/a em src/x.ts',
    'LOW (created_at ausente ou invalido: nao avaliado) — #undefined: ? em ?',
  ]);
  const saida = cli('[null]');
  assert.equal(saida.status, 1, 'continua fechado: item ilegível é violação, não silêncio');
  assert.doesNotMatch(saida.stderr, /TypeError/, 'antes: stack trace de TypeError');
  assert.match(saida.stderr, /::error::SLA de code scanning — LOW \(created_at ausente/);
});

test('bordas do prazo: dia cheio conta; relógio do runner alguns segundos atrasado não é violação', () => {
  const alto = { id: 'js/a', security_severity_level: 'high' };
  const baixo = { id: 'js/b', security_severity_level: 'low' };
  const r = avaliarSla([
    alerta(1, alto, 14.99),
    alerta(2, alto, 15),
    alerta(3, baixo, 30.99),
    alerta(4, baixo, 31),
    alerta(5, alto, -1 / 86_400),
    alerta(6, alto, -1),
  ], AGORA);
  assert.deepEqual(r.violacoes, [
    'HIGH (15d > 14d) — #2: js/a em src/x.ts',
    'LOW (31d > 30d) — #4: js/b em src/x.ts',
    'HIGH (created_at ausente ou invalido: nao avaliado) — #6: js/a em src/x.ts',
  ], 'antes: o #5 (criado 1 s "no futuro") também saía como created_at inválido');
});

test('CLI: lê o stdin mesmo chamado por symlink e com espaço no caminho (antes saía 0 sem avaliar nada)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'w83 com espaço '));
  try {
    mkdirSync(join(dir, 'real'));
    cpSync(SCRIPT, join(dir, 'real', 'sla-code-scanning.mjs'));
    symlinkSync(join(dir, 'real'), join(dir, 'atalho'));
    const vencido = JSON.stringify([{ number: 9, rule: { id: 'js/z', security_severity_level: 'high' }, created_at: '2020-01-01T00:00:00Z' }]);
    for (const script of [join(dir, 'real', 'sla-code-scanning.mjs'), join(dir, 'atalho', 'sla-code-scanning.mjs')]) {
      const r = cli(vencido, script);
      assert.equal(r.status, 1, `${script}: alerta vencido tem de sair 1`);
      assert.match(r.stdout, /#9: js\/z/);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

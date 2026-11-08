// Baseline das instrucoes para agentes: frases que outra sessao nao pode apagar sem decidir apagar.
// Roda com `npm run test:scripts` (node --test scripts/ci/*.unit.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ler = (rel) => readFileSync(path.join(root, rel), 'utf8');

test('CLAUDE.md e apenas o import de AGENTS.md', () => {
  assert.equal(ler('CLAUDE.md').trim(), '@AGENTS.md');
});

test('AGENTS.md tem as secoes que o guard de integridade exige', () => {
  const conteudo = ler('AGENTS.md');
  for (const secao of [
    '## Postura',
    '## Bugs e funcionalidades',
    '## Comunicação',
    '## Fluxo Git',
    '## Banco',
    '## Serviços',
    '## Stack e comandos',
    '## Contexto gerado',
  ]) {
    assert.ok(conteudo.includes(secao), `secao ausente em AGENTS.md: ${secao}`);
  }
});

test('AGENTS.md aponta o projeto Supabase oficial e nao reintroduz os refs errados', () => {
  const conteudo = ler('AGENTS.md') + ler('docs/agentes/banco.md');
  assert.match(conteudo, /lmypcdfsrgfftzhxawao/, 'ref oficial do Supabase ausente');
  // Os dois refs abaixo sao historicos (apontavam para projetos que nao sao deste repo); podem ser
  // citados como "nao usar", mas nunca como destino. O guard aqui so garante que continuam
  // marcados como proibidos no texto.
  for (const ref of ['trwgmplubeqxrxpncdgf', 'nnmwsszvhpuhiquwxkgr']) {
    if (conteudo.includes(ref)) {
      assert.match(
        conteudo,
        new RegExp(`${ref}[^\\n]*(NÃO|não|proibid|errad|antig)`),
        `${ref} citado sem a marca de proibido`,
      );
    }
  }
});

test('docs/agentes/ cobre banco, GitHub/CI, deploy, mapa do repo e contexto', () => {
  for (const doc of [
    'docs/agentes/banco.md',
    'docs/agentes/github-ci.md',
    'docs/agentes/deploy.md',
    'docs/agentes/mapa-repo.md',
    'docs/agentes/contexto-ia.md',
  ]) {
    assert.ok(existsSync(path.join(root, doc)), `doc ausente: ${doc}`);
  }
});

test('guard de integridade das instrucoes passa no estado atual', () => {
  const saida = execFileSync('node', ['scripts/ci/check-agents-md-integrity.mjs'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.match(saida, /AGENTS\.md OK/);
});

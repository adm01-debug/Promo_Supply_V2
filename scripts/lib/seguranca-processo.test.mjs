import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

import {
  RAIZ_REPO,
  RAIZES_PERMITIDAS,
  estaDentro,
  resolverCaminhoPermitido,
  resolverExecutavel,
} from './seguranca-processo.mjs';

test('resolverExecutavel devolve caminho absoluto existente igual ao do shell', () => {
  const resolvido = resolverExecutavel('node');
  assert.equal(path.isAbsolute(resolvido), true, 'caminho resolvido nao e absoluto: ' + resolvido);
  assert.equal(fs.existsSync(resolvido), true, 'binario nao existe: ' + resolvido);

  // `which` resolvido pelo mesmo helper: o que se compara aqui e o que cada um
  // acha para `node`, nao a busca em si — `which` faz a propria busca no PATH.
  const which = spawnSync(resolverExecutavel('which'), ['node'], { encoding: 'utf8' });
  assert.equal(which.status, 0, which.stderr);
  const doShell = which.stdout.trim();
  // E o MESMO binario que o shell resolveria: nao pode pegar outro shim do PATH.
  assert.equal(resolvido, doShell);
});

test('resolverExecutavel lanca para comando inexistente', () => {
  assert.throws(
    () => resolverExecutavel('comando-que-nao-existe-xyz'),
    /comando nao encontrado no PATH: comando-que-nao-existe-xyz/,
  );
});

// Roda `fn` com o PATH trocado e devolve o PATH original em qualquer desfecho.
function comPath(valor, fn) {
  const original = process.env.PATH;
  process.env.PATH = valor;
  try {
    return fn();
  } finally {
    process.env.PATH = original;
  }
}

function criarExecutavel(arquivo) {
  fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  fs.writeFileSync(arquivo, '#!/bin/sh\nexit 0\n');
  fs.chmodSync(arquivo, 0o755);
  return arquivo;
}

test('resolverExecutavel pula diretorio homonimo e arquivo sem permissao de execucao, como o shell', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'seguranca-processo-path-'));
  try {
    const primeiro = path.join(base, 'a');
    const segundo = path.join(base, 'b');
    // `a/ferramenta` e um DIRETORIO (passa em X_OK) e `a/semx` nao e executavel.
    fs.mkdirSync(path.join(primeiro, 'ferramenta'), { recursive: true });
    fs.writeFileSync(path.join(primeiro, 'semx'), '');
    fs.chmodSync(path.join(primeiro, 'semx'), 0o644);
    const real = criarExecutavel(path.join(segundo, 'ferramenta'));
    const realSemx = criarExecutavel(path.join(segundo, 'semx'));
    const caminho = [primeiro, segundo].join(path.delimiter);
    assert.equal(comPath(caminho, () => resolverExecutavel('ferramenta')), real);
    assert.equal(comPath(caminho, () => resolverExecutavel('semx')), realSemx);
    // So o diretorio homonimo no PATH: nao ha binario, entao lanca em vez de devolver a pasta.
    assert.throws(() => comPath(primeiro, () => resolverExecutavel('ferramenta')), /comando nao encontrado no PATH/);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('resolverExecutavel devolve caminho absoluto mesmo com entrada relativa no PATH', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'seguranca-processo-path-'));
  const cwdOriginal = process.cwd();
  try {
    const real = criarExecutavel(path.join(base, 'bin', 'ferramenta'));
    process.chdir(base);
    const resolvido = comPath('bin', () => resolverExecutavel('ferramenta'));
    assert.equal(path.isAbsolute(resolvido), true, 'caminho resolvido nao e absoluto: ' + resolvido);
    assert.equal(fs.realpathSync(resolvido), fs.realpathSync(real));
  } finally {
    process.chdir(cwdOriginal);
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('resolverExecutavel lanca com PATH vazio e recusa nome vazio ou com separador de caminho', () => {
  assert.throws(() => comPath('', () => resolverExecutavel('node')), /comando nao encontrado no PATH: node/);
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'seguranca-processo-path-'));
  try {
    criarExecutavel(path.join(base, 'b', 'ferramenta'));
    fs.mkdirSync(path.join(base, 'a'));
    // `../b/ferramenta` juntado a `a` cairia num binario FORA do diretorio do PATH.
    assert.throws(() => comPath(path.join(base, 'a'), () => resolverExecutavel('../b/ferramenta')), /nome de comando invalido/);
    assert.throws(() => comPath(path.join(base, 'a'), () => resolverExecutavel('')), /nome de comando invalido/);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('estaDentro aceita a raiz e subpastas', () => {
  assert.equal(estaDentro('/a/b', '/a/b'), true, 'a propria raiz conta como dentro');
  assert.equal(estaDentro('/a/b', '/a/b/sub'), true);
  assert.equal(estaDentro('/a/b', '/a/b/sub/deep'), true);
});

test('estaDentro recusa ".." puro, irmao com prefixo igual e caminho fora', () => {
  // '..' puro relativo a raiz nao esta dentro dela.
  assert.equal(estaDentro('/a/b', path.join('/a/b', '..')), false);
  // Erro classico do prefixo de string: '/a/bc' NAO e subpasta de '/a/b'.
  assert.equal(estaDentro('/a/b', '/a/bc/x'), false);
  assert.equal(estaDentro('/a/b', '/etc/passwd'), false);
});

test('resolverCaminhoPermitido aceita caminho do repositorio e do tmpdir', () => {
  const doRepo = path.join(RAIZ_REPO, 'package.json');
  assert.equal(resolverCaminhoPermitido(doRepo, 'recurso'), doRepo);

  const doTmp = path.join(os.tmpdir(), 'seguranca-processo-teste.json');
  assert.equal(resolverCaminhoPermitido(doTmp, 'recurso'), doTmp);
});

test('resolverCaminhoPermitido recusa ".." relativo, absoluto fora e escape do repo', () => {
  assert.throws(
    () => resolverCaminhoPermitido('../../etc/passwd', 'entrada'),
    /fora das raizes permitidas/,
  );
  assert.throws(
    () => resolverCaminhoPermitido('/etc/passwd', 'entrada'),
    /fora das raizes permitidas/,
  );
  assert.throws(
    () => resolverCaminhoPermitido(path.join(RAIZ_REPO, '..', 'fora.json'), 'entrada'),
    /fora das raizes permitidas/,
  );
});

test('resolverCaminhoPermitido respeita o array de raizes explicito do chamador', () => {
  const sub = path.join(RAIZ_REPO, 'scripts');
  const dentro = path.join(sub, 'lib', 'seguranca-processo.mjs');
  assert.equal(resolverCaminhoPermitido(dentro, 'entrada', [sub]), dentro);
  // Um caminho valido do repo, mas FORA da raiz explicita, tem de ser recusado.
  assert.throws(
    () => resolverCaminhoPermitido(path.join(RAIZ_REPO, 'package.json'), 'entrada', [sub]),
    /fora das raizes permitidas/,
  );
});

test('resolverCaminhoPermitido recusa arquivo existente acessado por symlink que escapa da raiz', () => {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'seguranca-processo-raiz-'));
  const fora = fs.mkdtempSync(path.join(os.tmpdir(), 'seguranca-processo-fora-'));
  try {
    const arquivoFora = path.join(fora, 'segredo.json');
    fs.writeFileSync(arquivoFora, '{}');
    fs.symlinkSync(fora, path.join(raiz, 'escape'));
    assert.throws(
      () => resolverCaminhoPermitido(path.join(raiz, 'escape', 'segredo.json'), 'entrada', [raiz]),
      /fora das raizes permitidas/,
    );
  } finally {
    fs.rmSync(raiz, { recursive: true, force: true });
    fs.rmSync(fora, { recursive: true, force: true });
  }
});

test('resolverCaminhoPermitido recusa alvo inexistente sob diretorio symlink que escapa da raiz', () => {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'seguranca-processo-raiz-'));
  const fora = fs.mkdtempSync(path.join(os.tmpdir(), 'seguranca-processo-fora-'));
  try {
    fs.symlinkSync(fora, path.join(raiz, 'escape'));
    assert.throws(
      () => resolverCaminhoPermitido(path.join(raiz, 'escape', 'novo.json'), 'saida', [raiz]),
      /fora das raizes permitidas/,
    );
  } finally {
    fs.rmSync(raiz, { recursive: true, force: true });
    fs.rmSync(fora, { recursive: true, force: true });
  }
});

// Link pendurado: o link existe dentro da raiz, o alvo (fora dela) ainda nao. `existsSync`
// segue o link e diz "nao existe"; a guarda aceitava o caminho e a escrita seguinte criava
// o arquivo FORA da raiz.
test('resolverCaminhoPermitido recusa link simbolico pendurado que aponta para fora da raiz', () => {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'seguranca-processo-raiz-'));
  const fora = fs.mkdtempSync(path.join(os.tmpdir(), 'seguranca-processo-fora-'));
  try {
    fs.symlinkSync(path.join(fora, 'ainda-nao-existe.json'), path.join(raiz, 'pendurado'));
    fs.symlinkSync(path.join(fora, 'pasta-inexistente'), path.join(raiz, 'pendurado-dir'));
    fs.symlinkSync(path.join('..', path.basename(fora), 'relativo.json'), path.join(raiz, 'pendurado-rel'));
    for (const alvo of ['pendurado', path.join('pendurado-dir', 'novo.json'), 'pendurado-rel']) {
      assert.throws(
        () => resolverCaminhoPermitido(path.join(raiz, alvo), 'saida', [raiz]),
        /fora das raizes permitidas/,
        `${alvo} deveria ser recusado`,
      );
    }
    // Link pendurado que aponta para DENTRO da raiz continua aceito, ja resolvido para o alvo.
    fs.symlinkSync(path.join(raiz, 'novo-dentro.json'), path.join(raiz, 'pendurado-dentro'));
    assert.equal(
      resolverCaminhoPermitido(path.join(raiz, 'pendurado-dentro'), 'saida', [raiz]),
      path.join(fs.realpathSync(raiz), 'novo-dentro.json'),
    );
  } finally {
    fs.rmSync(raiz, { recursive: true, force: true });
    fs.rmSync(fora, { recursive: true, force: true });
  }
});

test('resolverCaminhoPermitido lanca (nao trava) com links simbolicos em ciclo', () => {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'seguranca-processo-raiz-'));
  try {
    fs.symlinkSync(path.join(raiz, 'b'), path.join(raiz, 'a'));
    fs.symlinkSync(path.join(raiz, 'a'), path.join(raiz, 'b'));
    assert.throws(() => resolverCaminhoPermitido(path.join(raiz, 'a'), 'saida', [raiz]), /links simbolicos em ciclo/);
  } finally {
    fs.rmSync(raiz, { recursive: true, force: true });
  }
});

test('RAIZ_REPO aponta para o pacote deste repositorio e esta entre as raizes permitidas', () => {
  const pacote = JSON.parse(fs.readFileSync(path.join(RAIZ_REPO, 'package.json'), 'utf8'));
  // Nome do pacote deste repo, medido: o package.json ainda carrega o nome do template
  // Lovable ('vite_react_shadcn_ts'), nao 'promo-supply-v2'. A asserção existe para provar
  // que RAIZ_REPO resolveu para a raiz CERTA, entao ela usa o nome real, nao o desejado.
  assert.equal(pacote.name, 'vite_react_shadcn_ts');
  assert.equal(RAIZES_PERMITIDAS.includes(RAIZ_REPO), true);
});

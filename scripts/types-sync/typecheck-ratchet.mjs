// scripts/types-sync/typecheck-ratchet.mjs
//   node scripts/types-sync/typecheck-ratchet.mjs <baseline.ts> <candidato.ts>
//
// Gate 1 do types-sync: o types.ts candidato nao pode PIORAR o TypeScript.
//
// Portado de Zapp_Web_V2/scripts/ci/typecheck-ratchet.mjs em espirito, nao em
// implementacao: la o teto de erros vem de um baseline versionado
// (typecheck-baseline.json). Aqui esse arquivo nao existe, entao o teto e
// medido na hora — roda `tsc` DUAS vezes, uma com o types.ts commitado e uma
// com o candidato, e compara. Consequencia deliberada: erros de TypeScript que
// a main ja tem nunca reprovam o sync; apenas erro NOVO reprova. Sem isso o
// gate ficaria vermelho para sempre num repositorio que ja nao typechecka
// limpo, e o sync pararia de propor PR.
//
// Saida:
//   exit 0 — nao piorou (o candidato fica aplicado em disco)
//   exit 1 — piorou; lista os erros novos
//   exit 2 — uso invalido ou tsc indisponivel
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ALVO = path.join(RAIZ, 'src', 'integrations', 'supabase', 'types.ts');
const PROJETO = process.env.TYPES_SYNC_TSCONFIG || 'tsconfig.app.json';
const TSC = path.join(RAIZ, 'node_modules', 'typescript', 'bin', 'tsc');
// tsconfig.app.json usa incremental + tsBuildInfoFile: apagado entre as duas
// rodadas para que a segunda nao reaproveite estado da primeira.
const BUILDINFO = path.join(RAIZ, 'node_modules', '.cache', 'tsbuildinfo', 'app.tsbuildinfo');

const [baseline, candidato] = process.argv.slice(2);
if (!baseline || !candidato) {
  console.error('uso: typecheck-ratchet.mjs <baseline.ts> <candidato.ts>');
  process.exit(2);
}
for (const arquivo of [baseline, candidato]) {
  if (!fs.existsSync(arquivo)) {
    console.error(`ERRO: arquivo ausente: ${arquivo}`);
    process.exit(2);
  }
}
if (!fs.existsSync(TSC)) {
  console.error('ERRO: typescript nao instalado (node_modules/typescript/bin/tsc ausente). Rode bun install antes.');
  process.exit(2);
}

/** Erros do tsc, sem linha/coluna: linha deslocada nao vira "erro novo". */
function rodarTsc(rotulo) {
  fs.rmSync(BUILDINFO, { force: true });
  const resultado = spawnSync(process.execPath, [TSC, '--noEmit', '-p', PROJETO], {
    cwd: RAIZ,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  const saida = `${resultado.stdout || ''}${resultado.stderr || ''}`;
  const erros = saida
    .split('\n')
    .filter((linha) => /error TS\d+/.test(linha))
    .map((linha) => linha.replace(/\((\d+),(\d+)\)/, '').trim());
  console.log(`[${rotulo}] tsc: ${erros.length} erro(s)`);
  return erros;
}

const original = fs.readFileSync(ALVO);
try {
  fs.copyFileSync(baseline, ALVO);
  const antes = rodarTsc('antes (types.ts commitado)');

  fs.copyFileSync(candidato, ALVO);
  const depois = rodarTsc('depois (types.ts candidato)');

  const contagemAntes = new Map();
  for (const erro of antes) contagemAntes.set(erro, (contagemAntes.get(erro) || 0) + 1);
  const novos = [];
  for (const erro of depois) {
    const restante = contagemAntes.get(erro) || 0;
    if (restante > 0) contagemAntes.set(erro, restante - 1);
    else novos.push(erro);
  }

  if (novos.length === 0 && depois.length <= antes.length) {
    console.log(`OK: TypeScript nao piorou (${antes.length} -> ${depois.length} erro(s)).`);
    process.exit(0);
  }

  console.error(`ERRO: o types.ts candidato introduz ${novos.length} erro(s) de TypeScript (${antes.length} -> ${depois.length}).`);
  for (const erro of novos.slice(0, 40)) console.error('  ' + erro);
  if (novos.length > 40) console.error(`  ... e ${novos.length - 40} outro(s).`);
  process.exit(1);
} catch (erro) {
  // Falha de infraestrutura: devolve o arquivo original e sinaliza uso/ambiente.
  fs.writeFileSync(ALVO, original);
  console.error('ERRO: ' + (erro?.message || String(erro)));
  process.exit(2);
}

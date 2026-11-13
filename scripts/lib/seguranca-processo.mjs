/**
 * Utilidades compartilhadas pelos scripts de auditoria/CI.
 *
 * Existe para nao repetir, em cada ponto de uso, dois trechos que o Sonar
 * cobra de forma independente:
 *
 *  - `resolverExecutavel`: entrega o caminho ABSOLUTO do binario antes de criar
 *    processo filho. A regra `javascript:S4036` e puramente sintatica: dispara
 *    quando o PRIMEIRO argumento da chamada e um literal de string que nao
 *    comeca com prefixo de caminho (`/`, `./`, `..`), e NUNCA olha o `env`.
 *    Por isso passar `env: { PATH: '<fixo>' }` nao silencia o achado -- e, pior,
 *    troca o binario resolvido (aqui isso pularia o shim de guarda do ambiente,
 *    fazendo `git init` passar onde ele deve ser bloqueado).
 *
 *  - `resolverCaminhoPermitido`: recusa caminho vindo de argv/env que escape das
 *    raizes legitimas (`jssecurity:S8707`, path traversal). Fail-closed: lanca.
 *
 * Este arquivo vive em `scripts/lib/`, entao `RAIZ_REPO` e calculado a partir
 * dele mesmo (duas pastas acima).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Raiz do repositorio, derivada da posicao deste arquivo. */
export const RAIZ_REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * Raizes onde os scripts legitimamente leem/escrevem: o repositorio (snapshots
 * commitados) e os diretorios temporarios (saida fresca do psql, diretorio do
 * proxy local). Qualquer outra origem e recusada.
 */
export const RAIZES_PERMITIDAS = [RAIZ_REPO, path.resolve(os.tmpdir()), path.resolve('/tmp')];

/**
 * Caminho absoluto de `comando`, resolvido pelo PATH de quem chamou.
 *
 * Preserva exatamente o binario que o shell resolveria -- inclusive shims de
 * guarda no PATH. Lanca se nao existir: melhor falhar alto do que rodar outro
 * binario silenciosamente.
 */
export function resolverExecutavel(comando) {
  // Nome com separador de caminho nao passa pela busca no PATH (o shell tambem nao a faz):
  // juntar `../x` a cada diretorio devolvia um binario FORA dos diretorios do PATH.
  if (typeof comando !== 'string' || comando === '' || comando.includes('/') || comando.includes(path.sep)) {
    throw new Error('nome de comando invalido para busca no PATH: ' + JSON.stringify(comando));
  }
  const diretorios = (process.env.PATH || '').split(path.delimiter).filter(Boolean);
  for (const diretorio of diretorios) {
    // `resolve`, nao `join`: entrada relativa no PATH (`bin`, `.`) devolvia caminho relativo,
    // e o contrato daqui e caminho ABSOLUTO (o filho pode rodar com outro `cwd`).
    const candidato = path.resolve(diretorio, comando);
    try {
      fs.accessSync(candidato, fs.constants.X_OK);
      // Diretorio tambem passa em X_OK. O shell so executa arquivo e segue a busca; sem
      // este teste um diretorio homonimo mais cedo no PATH era devolvido como "binario".
      if (fs.statSync(candidato).isFile()) return candidato;
    } catch {
      // Nao esta neste diretorio: segue a busca, igual ao shell.
    }
  }
  throw new Error('comando nao encontrado no PATH: ' + comando);
}

/** Verdadeiro quando `candidato` esta dentro de `raiz` (a propria raiz conta). */
export function estaDentro(raiz, candidato) {
  const relativo = path.relative(raiz, candidato);
  return relativo === ''
    || (!path.isAbsolute(relativo) && relativo !== '..' && !relativo.startsWith('..' + path.sep));
}

// Mesmo teto do kernel Linux para resolucao de links (ELOOP): acima disso e ciclo.
const LIMITE_DE_LINKS = 40;

/** Alvo de `caminho` quando ele e um link simbolico; `null` quando nao e link (ou nao existe). */
function alvoDeLinkPendurado(caminho) {
  try {
    return fs.lstatSync(caminho).isSymbolicLink() ? fs.readlinkSync(caminho) : null;
  } catch {
    return null;
  }
}

/**
 * Resolve links simbolicos mesmo quando o alvo final ainda nao existe.
 *
 * `realpathSync` exige que o caminho inteiro exista, mas varios chamadores usam
 * esta guarda antes de criar um arquivo. Nesse caso subimos ate o ancestral
 * existente mais proximo, resolvemos os links dele e recolocamos os segmentos
 * inexistentes. Assim `tmp/link-para-fora/novo.json` nao passa apenas porque
 * `novo.json` ainda nao foi criado. Link pendurado (o proprio link existe, o alvo
 * ainda nao) e seguido ate o alvo pelo mesmo motivo.
 */
function caminhoRealMesmoSeAusente(caminho) {
  let existente = caminho;
  const ausentes = [];
  let saltos = 0;

  while (!fs.existsSync(existente)) {
    // Link pendurado: `existsSync` segue o link e responde "nao existe", mas o link existe
    // e aponta para algum lugar. Sem seguir o alvo, `raiz/link -> /fora/novo.json` era
    // aceito como "dentro da raiz" e a escrita seguinte criava o arquivo fora dela.
    const alvo = alvoDeLinkPendurado(existente);
    if (alvo !== null) {
      saltos += 1;
      if (saltos > LIMITE_DE_LINKS) throw new Error('links simbolicos em ciclo ou em cadeia longa demais: ' + caminho);
      existente = path.resolve(fs.realpathSync.native(path.dirname(existente)), alvo);
      continue;
    }
    const pai = path.dirname(existente);
    if (pai === existente) break;
    ausentes.unshift(path.basename(existente));
    existente = pai;
  }

  const baseReal = fs.realpathSync.native(existente);
  return path.resolve(baseReal, ...ausentes);
}

/**
 * Resolve o caminho recebido do chamador e exige que fique dentro de uma raiz
 * permitida. Lanca (fail-closed) quando escapa -- quem chama converte em erro
 * legivel + `process.exit` com o codigo de entrada invalida do proprio script.
 */
export function resolverCaminhoPermitido(valor, rotulo, raizes = RAIZES_PERMITIDAS) {
  const resolvido = caminhoRealMesmoSeAusente(path.resolve(valor));
  const raizesReais = raizes.map((raiz) => caminhoRealMesmoSeAusente(path.resolve(raiz)));
  if (!raizesReais.some((raiz) => estaDentro(raiz, resolvido))) {
    throw new Error('caminho de ' + rotulo + ' fora das raizes permitidas (repositorio ou diretorio temporario): ' + valor);
  }
  return resolvido;
}

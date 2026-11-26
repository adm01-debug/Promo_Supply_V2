// Detector de estrutura de workflow do GitHub Actions, em node puro (sem parser YAML).
//
// Por que existe: o commit 908b045 desindentou 11 linhas de um `python3 -c '...'` dentro de um `run: |`
// do contexto.yml. O YAML deixou de ser válido, o GitHub não iniciou mais nenhum job e o `npm run guards`
// continuou verde — nenhum guard lia o workflow como YAML. Isto não substitui um parser: pega a classe de
// erro que de fato aconteceu (linha de bloco escalar fora do recuo) e a que o YAML proíbe sempre (tab no
// recuo). Conservador: só reprova o que tem certeza; nunca "adivinha" estrutura.
//
// Importar não executa nada.

const CHAVE_DE_BLOCO = /^(\s*)(?:-\s+)?(?:"[^"]+"|'[^']+'|[A-Za-z_][\w.\- ]*?)\s*:\s*[|>][+-]?[1-9]?\s*(?:#.*)?$/;

/** Linha que o YAML aceita FORA de um bloco escalar: comentário, `chave:`, item de lista ou documento. */
const LINHA_ESTRUTURAL = /^\s*(?:#.*|-(?:\s.*)?|---.*|\.\.\..*|(?:"[^"]*"|'[^']*'|[^\s:#][^:#]*?)\s*:(?:\s.*)?|[\]}].*)$/;

const recuo = (linha) => linha.length - linha.trimStart().length;
const vazia = (linha) => linha.trim() === '';

/**
 * @param {string} texto conteúdo do workflow
 * @returns {{linha: number, motivo: string}[]} problemas (vazio = nada suspeito)
 */
export function problemasDeEstrutura(texto) {
  const linhas = String(texto).split(/\r?\n/);
  const problemas = [];

  linhas.forEach((l, i) => {
    if (/^\s*\t/.test(l) || /^ *\t/.test(l)) {
      problemas.push({ linha: i + 1, motivo: 'tab no recuo (YAML só aceita espaços)' });
    }
  });

  for (let i = 0; i < linhas.length; i++) {
    const m = CHAVE_DE_BLOCO.exec(linhas[i]);
    if (!m) continue;
    const recuoDaChave = m[1].length + (/^\s*-\s+/.test(linhas[i]) ? linhas[i].match(/^\s*-\s+/)[0].length - m[1].length : 0);

    // Recuo do bloco = recuo da primeira linha não vazia que o segue.
    let j = i + 1;
    while (j < linhas.length && vazia(linhas[j])) j++;
    if (j >= linhas.length) break;
    const recuoDoBloco = recuo(linhas[j]);
    if (recuoDoBloco <= recuoDaChave) continue; // bloco vazio ou chave sem corpo: não é este defeito

    for (; j < linhas.length; j++) {
      const l = linhas[j];
      if (vazia(l)) continue;
      if (recuo(l) >= recuoDoBloco) continue; // ainda dentro do bloco
      if (recuo(l) > recuoDaChave) {
        problemas.push({ linha: j + 1, motivo: `linha com recuo menor que o do bloco "${linhas[i].trim()}" (linha ${i + 1}) e maior que o da chave` });
        continue;
      }
      // Saiu do bloco: o que vem agora precisa ser estrutura YAML válida.
      if (!LINHA_ESTRUTURAL.test(l)) {
        problemas.push({ linha: j + 1, motivo: `texto solto depois do bloco "${linhas[i].trim()}" (linha ${i + 1}): provável linha desindentada de dentro do bloco` });
      }
      break;
    }
  }

  return problemas.sort((a, b) => a.linha - b.linha);
}

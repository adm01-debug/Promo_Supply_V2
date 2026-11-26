#!/usr/bin/env node
// W83 — SLA dos alertas abertos de Code Scanning (usado pelo branch-hygiene-audit.yml).
// high/critical → 14 dias; medium/low → 30 dias. Violação → exit 1.
//
// Saiu do YAML em 15/10/2026: inline no workflow, o heredoc do Node estava menos
// indentado que o `run: |` e o arquivo inteiro virou YAML inválido (o GitHub
// recusava o workflow em todo push). Mesmo corrigida a indentação, o passo tinha
// dois defeitos: `echo $ALERTAS | node - <<EOF` entregava o heredoc no stdin e o
// JSON se perdia; e a severidade vinha de `rule.severity` (error/warning/note),
// que nunca vale "high" — nenhum alerta recebia o SLA de 14 dias.
//
// Uso: node scripts/ci/sla-code-scanning.mjs < alertas.json  (markdown no stdout)

import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const SLA_DIAS = { alto: 14, baixo: 30 };
// Folga para relogio do runner atrasado em relacao ao do GitHub: alerta criado segundos
// "no futuro" e' alerta de agora, nao created_at invalido.
const TOLERANCIA_RELOGIO_MS = 5 * 60_000;

// security_severity_level (low/medium/high/critical) e o campo de severidade de
// seguranca; regras sem ele (qualidade) usam rule.severity: error conta como alto.
export function nivel(alerta) {
  const seg = alerta?.rule?.security_severity_level;
  if (seg) return String(seg).toLowerCase();
  return alerta?.rule?.severity === 'error' ? 'high' : 'low';
}

export function avaliarSla(alertas, agoraMs = Date.now()) {
  const violacoes = [];
  // O workflow pede `state=open`, mas o SLA e' de alerta ABERTO: um alerta ja corrigido ou
  // dispensado que chegasse na lista virava violacao (e job vermelho) por algo ja resolvido.
  // Sem `state` (fixture antiga, campo ausente) o alerta continua contando: na duvida, cobra.
  const abertos = alertas.filter((a) => !a?.state || a.state === 'open');
  for (const a of abertos) {
    const sev = nivel(a);
    const prazo = sev === 'high' || sev === 'critical' ? SLA_DIAS.alto : SLA_DIAS.baixo;
    // `Date.parse`, nao `new Date()`: `new Date(null)` e' 1970, e created_at nulo saia como
    // "20766d > 14d" em vez de "created_at ausente". O `a?.` cobre item nulo na lista, que
    // derrubava o script com TypeError.
    let idadeMs = agoraMs - Date.parse(a?.created_at ?? '');
    if (idadeMs < 0 && idadeMs >= -TOLERANCIA_RELOGIO_MS) idadeMs = 0;
    const dias = Math.floor(idadeMs / 86_400_000);
    // created_at ausente, ilegível ou no futuro dava NaN/negativo: `NaN > prazo` é false e o
    // alerta entrava na contagem como se estivesse no prazo, escapando do SLA para sempre.
    if (!Number.isFinite(dias) || dias < 0) {
      const local = a?.most_recent_instance?.location?.path ?? '?';
      violacoes.push(`${sev.toUpperCase()} (created_at ausente ou invalido: nao avaliado) — #${a?.number}: ${a?.rule?.id ?? '?'} em ${local}`);
      continue;
    }
    if (dias > prazo) {
      const local = a.most_recent_instance?.location?.path ?? '?';
      violacoes.push(`${sev.toUpperCase()} (${dias}d > ${prazo}d) — #${a.number}: ${a.rule?.id ?? '?'} em ${local}`);
    }
  }
  return { total: abertos.length, violacoes };
}

export function relatorio({ total, violacoes }) {
  const linhas = [
    '',
    '### 🔒 Code Scanning — SLA',
    '',
    `SLA: high/critical → ${SLA_DIAS.alto}d · medium/low → ${SLA_DIAS.baixo}d`,
    '',
    `Alertas abertos: ${total}`,
    '',
  ];
  if (violacoes.length) linhas.push('⚠️ **Violações de SLA:**', '```', ...violacoes, '```');
  else linhas.push('✅ Nenhuma violação de SLA.');
  return `${linhas.join('\n')}\n`;
}

// Lê o JSON do stdin (`node sla-code-scanning.mjs < alertas.json`): o script não
// recebe caminho nenhum, então não há caminho a validar.
function main() {
  let alertas;
  try {
    alertas = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    alertas = null;
  }
  if (!Array.isArray(alertas)) {
    console.error('::warning::a API de code scanning não devolveu uma lista de alertas');
    process.stdout.write('\n### ⚠️ Code Scanning — SLA\n\nNão foi possível consultar os alertas (code scanning desligado, permissão ou API).\n');
    return;
  }
  const r = avaliarSla(alertas);
  process.stdout.write(relatorio(r));
  if (r.violacoes.length) {
    for (const v of r.violacoes) console.error(`::error::SLA de code scanning — ${v}`);
    process.exitCode = 1;
  }
}

// `process.argv[1]` e' o caminho como foi digitado; o do modulo vem com symlink resolvido.
// Comparar os dois crus fazia o script sair 0 sem ler nada quando chamado por symlink --
// alerta vencido passava como "nada a declarar".
function executadoDireto() {
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (executadoDireto()) main();

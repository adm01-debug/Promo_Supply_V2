/**
 * Lógica pura de detecção de falhas consecutivas em integrações.
 * Extraída para permitir teste unitário sem disparar o Deno.serve da edge.
 */

export interface FailureRow {
  status: string;
  created_at: string;
}

export interface ConsecutiveFailure {
  key: string;
  count: number;
  lastAt: string;
}

/**
 * Conta quantas falhas consecutivas (status != 'success') existem no início
 * de uma lista de registros ordenada do mais recente para o mais antigo.
 * A primeira ocorrência de sucesso interrompe a contagem.
 */
export function countConsecutiveFailures(rows: FailureRow[]): number {
  let count = 0;
  for (const row of rows) {
    if (row.status !== "success") count++;
    else break;
  }
  return count;
}

/**
 * Agrupa registros por chave (endpoint/entidade) preservando a ordem
 * mais recente primeiro, e retorna as falhas que atingem o limiar.
 */
export function detectConsecutiveFailures(
  rows: Array<FailureRow & { key: string }>,
  threshold: number,
  lookbackMs: number,
  nowMs: number,
): ConsecutiveFailure[] {
  const groups = new Map<string, FailureRow[]>();
  for (const row of rows) {
    const arr = groups.get(row.key) ?? [];
    arr.push(row);
    groups.set(row.key, arr);
  }

  const result: ConsecutiveFailure[] = [];
  for (const [key, group] of groups) {
    const count = countConsecutiveFailures(group);
    if (count < threshold) continue;
    const lastTs = Date.parse(group[0].created_at);
    if (!lastTs || nowMs - lastTs > lookbackMs) continue; // falha antiga, não é a atual
    result.push({ key, count, lastAt: group[0].created_at });
  }
  return result;
}

import { describe, it, expect, vi, afterEach } from 'vitest';
import { exportToCSV } from '../exportData';

// Regressão: número sem formatter ia cru para o CSV ("67.46268656716418") e o Excel pt-BR
// lia a célula como texto. Agora sai com vírgula decimal e no máximo 2 casas.
async function gerarCSV(rows: Record<string, unknown>[], columns: Parameters<typeof exportToCSV>[1]): Promise<string[]> {
  let blob: Blob | undefined;
  const createObjectURL = vi.fn((b: Blob) => {
    blob = b;
    return 'blob:teste';
  });
  const revokeObjectURL = vi.fn();
  Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true, writable: true });
  Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true, writable: true });
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

  exportToCSV(rows, columns, 'teste');

  expect(click).toHaveBeenCalledTimes(1);
  expect(blob).toBeDefined();
  const texto = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob as Blob);
  });
  return texto.replace(/^\uFEFF/, '').split('\r\n');
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('exportToCSV — números sem formatter', () => {
  const col = [{ key: 'v', label: 'Valor' }];

  it('inteiro sai sem casas decimais', async () => {
    const [, linha] = await gerarCSV([{ v: 42 }], col);
    expect(linha).toBe('42');
  });

  it('inteiro grande usa separador de milhar pt-BR', async () => {
    const [, linha] = await gerarCSV([{ v: 1234567 }], col);
    expect(linha).toBe('1.234.567');
  });

  it('decimal sai com vírgula e no máximo 2 casas (caso real 67.46268656716418)', async () => {
    const [, linha] = await gerarCSV([{ v: 67.46268656716418 }], col);
    // Vírgula força aspas no escapeCSV; o Excel continua lendo a célula como número.
    expect(linha).toBe('"67,46"');
    expect(linha).not.toContain('.');
  });

  it('negativo sai com vírgula e continua neutralizado contra fórmula (prefixo de tab)', async () => {
    const [, linha] = await gerarCSV([{ v: -12.5 }], col);
    expect(linha).toBe('"\t-12,5"');
  });

  it('null e undefined viram célula vazia', async () => {
    const linhas = await gerarCSV([{ v: null }, { v: undefined }], col);
    expect(linhas.slice(1)).toEqual(['', '']);
  });

  it('string que começa com "=" continua neutralizada', async () => {
    const [, linha] = await gerarCSV([{ v: '=HYPERLINK("http://x")' }], col);
    expect(linha).toBe('"\t=HYPERLINK(""http://x"")"');
  });

  it('formatter explícito tem precedência sobre a formatação numérica', async () => {
    const [, linha] = await gerarCSV(
      [{ v: 67.46268656716418 }],
      [{ key: 'v', label: 'Valor', formatter: (x) => `X${String(x)}` }],
    );
    expect(linha).toBe('X67.46268656716418');
  });

  it('cabeçalho e separador ";" preservados', async () => {
    const [cab, linha] = await gerarCSV(
      [{ a: 1.5, b: 'texto' }],
      [{ key: 'a', label: 'A' }, { key: 'b', label: 'B' }],
    );
    expect(cab).toBe('A;B');
    expect(linha).toBe('"1,5";texto');
  });
});

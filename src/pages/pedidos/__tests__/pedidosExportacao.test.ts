import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pedidoColumns } from '@/lib/exportData';

// QA 104: o clique em "exportar" gerava um CSV so com o cabecalho em branco
// porque a lista de colunas ia vazia, e mesmo assim anunciava sucesso.
const FONTE = join(process.cwd(), 'src/pages/pedidos/Pedidos.tsx');

async function fonte() {
  return readFile(FONTE, 'utf8');
}

describe('exportacao de pedidos', () => {
  it('usa o conjunto canonico de colunas em vez de lista vazia', async () => {
    const src = await fonte();
    expect(src).toContain("exportToCSV(exportData, pedidoColumns, 'pedidos')");
    expect(src).not.toMatch(/exportToCSV\(exportData,\s*\[/);
  });

  it('o objeto exportado declara todas as chaves de pedidoColumns', async () => {
    const src = await fonte();
    const bloco = src.match(/const exportData = filteredPedidos\.map\(p => \(\{([\s\S]*?)\}\)\);/);
    expect(bloco).not.toBeNull();
    const corpo = bloco ? bloco[1] : '';
    const faltando = pedidoColumns.filter(c => !corpo.includes(`${c.key}:`)).map(c => c.key);
    expect(faltando).toEqual([]);
  });

  it('nao anuncia sucesso quando nao ha pedido para exportar', async () => {
    const src = await fonte();
    const bloco = src.match(/const handleExportPDF[\s\S]*?\n {2}\};/);
    expect(bloco).not.toBeNull();
    const corpo = bloco ? bloco[0] : '';
    expect(corpo).toMatch(/filteredPedidos\.length === 0/);
    expect(corpo).toContain('return;');
  });
});

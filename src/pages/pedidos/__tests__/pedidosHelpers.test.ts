import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { prazoConsumido, saudeDoPrazo } from '../pedidosHelpers';

const emDias = (dias: number) => {
  const data = new Date();
  data.setDate(data.getDate() + dias);
  return data.toISOString();
};

describe('prazoConsumido', () => {
  it('mede o quanto da janela emissao -> previsao ja passou', () => {
    const agora = new Date('2026-06-10T12:00:00Z');
    expect(prazoConsumido('2026-06-05T12:00:00Z', '2026-06-15T12:00:00Z', agora)).toBe(50);
  });

  it('devolve o piso de 5% quando o prazo acabou de comecar', () => {
    expect(prazoConsumido('2026-06-10T12:00:00Z', '2026-06-20T12:00:00Z', new Date('2026-06-10T12:00:00Z'))).toBe(5);
  });

  it('nao mede nada sem as duas datas ou com janela invalida', () => {
    expect(prazoConsumido(null, '2026-06-15T12:00:00Z')).toBe(0);
    expect(prazoConsumido('2026-06-05T12:00:00Z', null)).toBe(0);
    expect(prazoConsumido('2026-06-15T12:00:00Z', '2026-06-05T12:00:00Z')).toBe(0);
    expect(prazoConsumido('nao-e-data', '2026-06-05T12:00:00Z')).toBe(0);
  });
});

describe('saudeDoPrazo', () => {
  it('pedido entregue fica cheio e verde', () => {
    const saude = saudeDoPrazo({ status: 'entregue', data_previsao: emDias(-30) });
    expect(saude).toMatchObject({ status: 'entregue', rotulo: 'ENTREGUE', largura: 100 });
    expect(saude.barra).toBe('bg-emerald-500');
  });

  it('sem previsao nao inventa percentual', () => {
    const saude = saudeDoPrazo({ status: 'pendente' });
    expect(saude).toMatchObject({ status: 'sem_prazo', rotulo: 'SEM PRAZO', largura: 0 });
  });

  it('prazo estourado mostra ATRASADO com a barra cheia e o detalhe real', () => {
    const saude = saudeDoPrazo({ status: 'pendente', data_emissao: emDias(-20), data_previsao: emDias(-5) });
    expect(saude.status).toBe('atrasado');
    expect(saude.rotulo).toBe('ATRASADO');
    expect(saude.largura).toBe(100);
    expect(saude.detalhe).toContain('atrasado');
  });

  it('vence hoje e amanha sao criticos', () => {
    expect(saudeDoPrazo({ status: 'aprovado', data_previsao: emDias(0) }).status).toBe('critico');
    expect(saudeDoPrazo({ status: 'aprovado', data_previsao: emDias(1) }).status).toBe('critico');
  });

  it('ate 3 dias e atencao, acima disso e no prazo', () => {
    expect(saudeDoPrazo({ status: 'aprovado', data_previsao: emDias(3) }).status).toBe('atencao');
    expect(saudeDoPrazo({ status: 'aprovado', data_previsao: emDias(15) }).status).toBe('no_prazo');
  });

  it('a barra reflete o prazo consumido, nao o indice da linha', () => {
    const saude = saudeDoPrazo({ status: 'pendente', data_emissao: emDias(-5), data_previsao: emDias(15) });
    expect(saude.status).toBe('no_prazo');
    expect(saude.largura).toBe(25);
  });
});

describe('Pedidos.tsx nao volta a desenhar SLA pelo indice', () => {
  const fonte = readFileSync(join(process.cwd(), 'src/pages/pedidos/Pedidos.tsx'), 'utf-8');

  it('usa saudeDoPrazo e nao a posicao na lista', () => {
    expect(fonte).toContain('saudeDoPrazo(pedido)');
    expect(fonte).toContain('sla.largura');
    expect(fonte).toContain('sla.rotulo');
    expect(fonte).not.toContain('index % 3');
    expect(fonte).not.toContain('ATEN');
  });
});

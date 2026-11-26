import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import pt from '@/locales/pt/translation.json';
import en from '@/locales/en/translation.json';
import es from '@/locales/es/translation.json';
import { TrendAnalysisCharts } from '../TrendAnalysisCharts';

// Regressão: o dashboard de compras filtra por período (1m/3m/6m/1y), mas o gráfico
// dizia "(6 meses)" fixo e o card de volume dizia "Volume do Mês" / "Total faturado"
// — o número é a soma dos pedidos emitidos no período escolhido, não do mês nem faturamento.

// recharts ResponsiveContainer usa ResizeObserver, ausente no jsdom
vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });

const vazio = { monthlyTrends: [], cotacaoStatus: [], topCategories: [] };

describe('TrendAnalysisCharts — título acompanha o período', () => {
  it('usa o rótulo do período recebido', () => {
    render(<TrendAnalysisCharts {...vazio} periodLabel="último mês" />);
    expect(screen.getByText('Tendência de Volume (último mês)')).toBeTruthy();
    expect(screen.queryByText(/6 meses/)).toBeNull();
  });

  it('sem período: "no Período", nunca "(6 meses)" fixo', () => {
    render(<TrendAnalysisCharts {...vazio} />);
    expect(screen.getByText('Tendência de Volume no Período')).toBeTruthy();
    expect(screen.queryByText(/6 meses/)).toBeNull();
  });
});

describe('Card de volume — textos batem com o período', () => {
  it.each([
    ['pt', pt, 'Volume no Período', 'Pedidos emitidos no período'],
    ['en', en, 'Volume in Period', 'Orders issued in the period'],
    ['es', es, 'Volumen en el Período', 'Pedidos emitidos en el período'],
  ])('%s', (_lang, t, titulo, subtitulo) => {
    expect(t.dashboard.kpis.total_spend).toBe(titulo);
    expect(t.dashboard.kpis.subtitles.volume).toBe(subtitulo);
  });
});

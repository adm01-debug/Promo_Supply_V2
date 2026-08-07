// Mock data for RelatorioNegociacoes

export const historicoMensal = [
  { mes: "Jul", economia: 5200, volume: 42000, percentual: 12.4, cotacoes: 28 },
  { mes: "Ago", economia: 6800, volume: 48000, percentual: 14.2, cotacoes: 35 },
  { mes: "Set", economia: 4500, volume: 38000, percentual: 11.8, cotacoes: 22 },
  { mes: "Out", economia: 7200, volume: 52000, percentual: 13.8, cotacoes: 41 },
  { mes: "Nov", economia: 8100, volume: 58000, percentual: 14.0, cotacoes: 48 },
  { mes: "Dez", economia: 8750, volume: 71200, percentual: 12.3, cotacoes: 45 },
];

export const comparativoCompradores = [
  {
    nome: "Ana Silva",
    economia: 8750,
    percentual: 12.3,
    cotacoes: 45,
    melhorPreco: 87,
    tendencia: "up",
    avatar: "AS",
  },
  {
    nome: "Carlos Souza",
    economia: 6200,
    percentual: 10.5,
    cotacoes: 38,
    melhorPreco: 82,
    tendencia: "up",
    avatar: "CS",
  },
  {
    nome: "Maria Santos",
    economia: 5800,
    percentual: 9.8,
    cotacoes: 42,
    melhorPreco: 79,
    tendencia: "down",
    avatar: "MS",
  },
  {
    nome: "Pedro Lima",
    economia: 4500,
    percentual: 8.2,
    cotacoes: 30,
    melhorPreco: 75,
    tendencia: "up",
    avatar: "PL",
  },
];

export const economiaPorCategoria = [
  { categoria: "Mochilas", economia: 3200, percentual: 15.2 },
  { categoria: "Canetas", economia: 2100, percentual: 12.8 },
  { categoria: "Cadernos", economia: 1800, percentual: 10.5 },
  { categoria: "Squeezes", economia: 1400, percentual: 11.2 },
  { categoria: "Outros", economia: 1050, percentual: 8.9 },
];

export const economiaPorFornecedor = [
  { fornecedor: "XBZ Brindes", economia: 3500, negociacoes: 18 },
  { fornecedor: "Asia Import", economia: 2200, negociacoes: 12 },
  { fornecedor: "Stricker", economia: 1800, negociacoes: 10 },
  { fornecedor: "Só Marcas", economia: 1250, negociacoes: 8 },
];

export const COLORS = [
  'hsl(var(--primary))',
  'hsl(142, 76%, 36%)',
  'hsl(221, 83%, 53%)',
  'hsl(262, 83%, 58%)',
  'hsl(24, 95%, 53%)',
];

export type CompradorType = typeof comparativoCompradores[number];

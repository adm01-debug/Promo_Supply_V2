export const getTipoLabel = (tipo: string) => {
  const map: Record<string, string> = {
    'produto': 'Produto', 'servico': 'Serviço', 'material': 'Material',
    'pe_liso': 'P.E. Liso', 'fabricacao_liso': 'Fab. Liso', 'fabricacao_personalizado': 'Fab. Personalizado',
  };
  return map[tipo] || tipo;
};

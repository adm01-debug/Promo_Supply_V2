import type { Fornecedor } from "@/hooks/useFornecedores";
import { nullishStr } from "@/lib/dbMapping";

export interface LegacyFornecedor {
  id: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  tipo: "IMPORTADORA" | "FABRICANTE" | "DISTRIBUIDORA";
  ramos: string[];
  vendeProduto: "LISO" | "PERSONALIZADO" | "AMBOS";
  email: string;
  telefone: string;
  whatsapp: string;
  apiIntegrada: boolean;
  rating: number;
  totalMes: number;
  ultimaCompra: string;
}

// `Fornecedor` (DB row) uses `field: T | null`; `LegacyFornecedor` (UI) uses
// non-nullable fields with empty-string sentinels. The conversion is funnelled
// through `nullishStr` (NOT `||`) so legitimate empty strings round-trip and
// `null` becomes `''` only when truly absent. `nome_fantasia` falls back to
// `razao_social` because the UI always wants a display name.
export const adaptToLegacy = (f: Fornecedor): LegacyFornecedor => ({
  id: f.id,
  razaoSocial: f.razao_social,
  nomeFantasia: nullishStr(f.nome_fantasia, f.razao_social),
  cnpj: nullishStr(f.cnpj),
  tipo: f.tipo === 'internacional' ? 'IMPORTADORA' : f.tipo === 'local' ? 'DISTRIBUIDORA' : 'FABRICANTE',
  ramos: f.segmento ? [f.segmento] : [],
  vendeProduto: 'AMBOS',
  email: nullishStr(f.email),
  telefone: nullishStr(f.telefone),
  whatsapp: nullishStr(f.telefone),
  apiIntegrada: !!f.integrado_api,
  rating: Math.round(f.avaliacao || 0),
  totalMes: 0,
  ultimaCompra: '-',
});

export const getTipoLabel = (tipo: LegacyFornecedor["tipo"]) => {
  const labels = { IMPORTADORA: "Importadora", FABRICANTE: "Fabricante", DISTRIBUIDORA: "Distribuidora" };
  return labels[tipo];
};

export const getTipoBadgeColor = (tipo: LegacyFornecedor["tipo"]) => {
  const colors = { 
    IMPORTADORA: "bg-info/20 text-info border-blue-500/30",
    FABRICANTE: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    DISTRIBUIDORA: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
  };
  return colors[tipo];
};

export const getProdutoLabel = (produto: LegacyFornecedor["vendeProduto"]) => {
  const labels = { LISO: "Liso", PERSONALIZADO: "Personalizado", AMBOS: "Liso + Personalizado" };
  return labels[produto];
};

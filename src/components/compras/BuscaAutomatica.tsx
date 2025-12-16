import { Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResultadoBusca {
  id: string;
  fornecedor: string;
  status: 'encontrado' | 'nao_encontrado' | 'buscando';
  valorUnitario?: number;
  quantidadeDisponivel?: number;
}

interface BuscaAutomaticaProps {
  status: 'idle' | 'searching' | 'done';
  resultados: ResultadoBusca[];
}

const fornecedoresAPI = [
  { nome: 'XBZ Brindes', produtos: '10.172 produtos' },
  { nome: 'Stricker / Spot Gifts', produtos: '1.249 produtos' },
  { nome: 'Asia Import', produtos: '393 produtos' },
  { nome: 'Só Marcas', produtos: '1.139 produtos' },
];

export const BuscaAutomatica = ({ status, resultados }: BuscaAutomaticaProps) => {
  if (status === 'idle') {
    return (
      <div className="border border-dashed border-border rounded-lg p-6 text-center">
        <p className="text-muted-foreground">
          Clique em "Buscar Cotações" para consultar automaticamente {fornecedoresAPI.length} fornecedores integrados
        </p>
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {fornecedoresAPI.map(f => (
            <span key={f.nome} className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              {f.nome} ({f.produtos})
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground mb-3">
        {status === 'searching' ? 'Buscando em 4 fornecedores...' : 'Busca concluída'}
      </p>
      
      {status === 'searching' ? (
        // Loading state
        fornecedoresAPI.map((f, index) => (
          <div
            key={f.nome}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg border border-border bg-card transition-all",
              index < 2 && "border-green-500/30 bg-green-500/5"
            )}
          >
            {index < 2 ? (
              <Check className="w-5 h-5 text-green-500" />
            ) : index === 2 ? (
              <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
            )}
            <span className="flex-1 text-sm font-medium text-foreground">{f.nome}</span>
            {index < 2 && (
              <span className="text-xs text-green-600">Encontrado</span>
            )}
            {index === 2 && (
              <span className="text-xs text-muted-foreground">Buscando...</span>
            )}
          </div>
        ))
      ) : (
        // Results state
        resultados.map(r => (
          <div
            key={r.id}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg border transition-all",
              r.status === 'encontrado' 
                ? "border-green-500/30 bg-green-500/5" 
                : "border-red-500/30 bg-red-500/5"
            )}
          >
            {r.status === 'encontrado' ? (
              <Check className="w-5 h-5 text-green-500" />
            ) : (
              <X className="w-5 h-5 text-red-500" />
            )}
            <span className="flex-1 text-sm font-medium text-foreground">{r.fornecedor}</span>
            {r.status === 'encontrado' ? (
              <div className="flex items-center gap-4 text-xs">
                <span className="text-green-600 font-semibold">
                  R$ {r.valorUnitario?.toFixed(2)}
                </span>
                <span className="text-muted-foreground">
                  {r.quantidadeDisponivel} disponíveis
                </span>
              </div>
            ) : (
              <span className="text-xs text-red-500">Não encontrado</span>
            )}
          </div>
        ))
      )}
    </div>
  );
};

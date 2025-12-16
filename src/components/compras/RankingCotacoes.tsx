import { Trophy, Check, AlertTriangle, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Cotacao {
  id: string;
  fornecedor: string;
  valorUnitario: number;
  quantidadeDisponivel: number;
  prazoEntrega: number;
  frete: number;
  freteInfo: string;
  condicaoPagamento: string;
  total: number;
  alerta?: string;
}

interface RankingCotacoesProps {
  cotacoes: Cotacao[];
  quantidade: number;
  onSelecionar: (id: string) => void;
  selecionado: string | null;
}

const medalColors = [
  { bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', text: 'text-yellow-600', icon: '🥇' },
  { bg: 'bg-gray-300/20', border: 'border-gray-400/50', text: 'text-gray-500', icon: '🥈' },
  { bg: 'bg-orange-400/20', border: 'border-orange-400/50', text: 'text-orange-600', icon: '🥉' },
];

export const RankingCotacoes = ({ cotacoes, quantidade, onSelecionar, selecionado }: RankingCotacoesProps) => {
  // Ordena por total
  const cotacoesOrdenadas = [...cotacoes].sort((a, b) => a.total - b.total);

  return (
    <div className="space-y-3">
      {cotacoesOrdenadas.map((cotacao, index) => {
        const medal = medalColors[index] || { bg: 'bg-muted', border: 'border-border', text: 'text-muted-foreground', icon: `#${index + 1}` };
        const isSelected = selecionado === cotacao.id;
        const estoqueOk = cotacao.quantidadeDisponivel >= quantidade;

        return (
          <div
            key={cotacao.id}
            className={cn(
              "p-4 rounded-lg border-2 transition-all",
              isSelected 
                ? "border-primary bg-primary/5 ring-2 ring-primary/20" 
                : medal.border,
              medal.bg
            )}
          >
            <div className="flex items-start gap-4">
              {/* Posição */}
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shrink-0",
                medal.bg, medal.text
              )}>
                {medal.icon}
              </div>

              {/* Info Principal */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold text-foreground">{cotacao.fornecedor}</h4>
                  {isSelected && (
                    <span className="px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">
                      Selecionado
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Valor Unit.</p>
                    <p className="font-semibold text-foreground">R$ {cotacao.valorUnitario.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="font-bold text-primary">R$ {cotacao.total.toLocaleString('pt-BR')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Prazo</p>
                    <p className="font-semibold text-foreground">{cotacao.prazoEntrega} dias</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Estoque</p>
                    <div className="flex items-center gap-1">
                      {estoqueOk ? (
                        <>
                          <Check className="w-4 h-4 text-green-500" />
                          <span className="font-semibold text-green-600">{cotacao.quantidadeDisponivel}</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-4 h-4 text-yellow-500" />
                          <span className="font-semibold text-yellow-600">
                            {cotacao.quantidadeDisponivel}
                            {cotacao.alerta && <span className="text-xs ml-1">({cotacao.alerta})</span>}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Truck className="w-3 h-3" />
                    Frete: {cotacao.freteInfo}
                  </span>
                  <span>|</span>
                  <span>Pagamento: {cotacao.condicaoPagamento}</span>
                </div>
              </div>

              {/* Ação */}
              <Button
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => onSelecionar(cotacao.id)}
                className="shrink-0"
              >
                {isSelected ? (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    Selecionado
                  </>
                ) : (
                  'Selecionar'
                )}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

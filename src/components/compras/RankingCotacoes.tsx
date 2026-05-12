import { useState } from "react";
import { Trophy, Check, AlertTriangle, Truck, Settings2, Sparkles, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

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
  score_preco?: number;
  score_prazo?: number;
  score_qualidade?: number;
  score_total?: number;
}

interface RankingCotacoesProps {
  cotacoes: Cotacao[];
  quantidade: number;
  onSelecionar: (id: string) => void;
  selecionado: string | null;
}

interface ScoreWeights {
  preco: number;
  prazo: number;
  estoque: number;
}

const medalColors = [
  { bg: 'bg-warning/20', border: 'border-yellow-500/50', text: 'text-warning', icon: '🥇' },
  { bg: 'bg-gray-300/20', border: 'border-gray-400/50', text: 'text-muted-foreground', icon: '🥈' },
  { bg: 'bg-orange-400/20', border: 'border-orange-400/50', text: 'text-warning', icon: '🥉' },
];

export const RankingCotacoes = ({ cotacoes, quantidade, onSelecionar, selecionado }: RankingCotacoesProps) => {
  const [weights, setWeights] = useState<ScoreWeights>({
    preco: 60,
    prazo: 20,
    estoque: 20
  });

  const calculateScore = (cotacao: Cotacao) => {
    // Encontrar min/max para normalização
    const minTotal = Math.min(...cotacoes.map(c => c.total));
    const maxTotal = Math.max(...cotacoes.map(c => c.total));
    const minPrazo = Math.min(...cotacoes.map(c => c.prazoEntrega));
    const maxPrazo = Math.max(...cotacoes.map(c => c.prazoEntrega));
    
    // Normalização (0 a 100)
    // Para preço e prazo, quanto menor, melhor (por isso 1 - normalized)
    const normalizedPreco = maxTotal === minTotal ? 100 : (1 - (cotacao.total - minTotal) / (maxTotal - minTotal)) * 100;
    const normalizedPrazo = maxPrazo === minPrazo ? 100 : (1 - (cotacao.prazoEntrega - minPrazo) / (maxPrazo - minPrazo)) * 100;
    
    // Para estoque, quanto mais próximo do necessário, melhor
    const normalizedEstoque = cotacao.quantidadeDisponivel >= quantidade ? 100 : (cotacao.quantidadeDisponivel / quantidade) * 100;

    const finalScore = (
      (normalizedPreco * (weights.preco / 100)) +
      (normalizedPrazo * (weights.prazo / 100)) +
      (normalizedEstoque * (weights.estoque / 100))
    );

    return Math.round(finalScore);
  };

  const cotacoesComScore = cotacoes.map(c => ({
    ...c,
    score: calculateScore(c)
  }));

  // Ordena por score decrescente
  const cotacoesOrdenadas = [...cotacoesComScore].sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted-foreground italic">
          Ranking calculado com base em: Preço ({weights.preco}%), Prazo ({weights.prazo}%), Estoque ({weights.estoque}%)
        </p>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-2">
              <Settings2 className="w-4 h-4" />
              Ajustar Pesos
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="grid gap-4">
              <div className="space-y-2">
                <h4 className="font-medium leading-none text-foreground">Pesos do Scorecard</h4>
                <p className="text-sm text-muted-foreground">
                  Ajuste a importância de cada critério para o ranking.
                </p>
              </div>
              <div className="grid gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="preco">Preço ({weights.preco}%)</Label>
                  </div>
                  <Slider
                    id="preco"
                    max={100}
                    step={5}
                    value={[weights.preco]}
                    onValueChange={([val]) => setWeights(prev => ({ ...prev, preco: val }))}
                  />
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="prazo">Prazo ({weights.prazo}%)</Label>
                  </div>
                  <Slider
                    id="prazo"
                    max={100}
                    step={5}
                    value={[weights.prazo]}
                    onValueChange={([val]) => setWeights(prev => ({ ...prev, prazo: val }))}
                  />
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="estoque">Estoque ({weights.estoque}%)</Label>
                  </div>
                  <Slider
                    id="estoque"
                    max={100}
                    step={5}
                    value={[weights.estoque]}
                    onValueChange={([val]) => setWeights(prev => ({ ...prev, estoque: val }))}
                  />
                </div>
                <div className="pt-2 border-t border-border">
                  <p className="text-[10px] text-muted-foreground text-center">
                    Total: {weights.preco + weights.prazo + weights.estoque}%
                  </p>
                  {(weights.preco + weights.prazo + weights.estoque) !== 100 && (
                    <p className="text-[10px] text-destructive text-center font-semibold">
                      A soma deve ser 100% para um cálculo preciso.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {cotacoesOrdenadas.map((cotacao, index) => {
        const medal = medalColors[index] || { bg: 'bg-muted', border: 'border-border', text: 'text-muted-foreground', icon: `#${index + 1}` };
        const isSelected = selecionado === cotacao.id;
        const estoqueOk = cotacao.quantidadeDisponivel >= quantidade;

        // Determine which score to show
        const displayScore = cotacao.score_total || cotacao.score;

        return (
          <div
            key={cotacao.id}
            className={cn(
              "p-4 rounded-lg border-2 transition-all relative overflow-hidden",
              isSelected 
                ? "border-primary bg-primary/5 ring-2 ring-primary/20" 
                : medal.border,
              medal.bg
            )}
          >
            {/* Score Badge */}
            <div className="absolute top-0 right-0 flex">
              <Popover>
                <PopoverTrigger asChild>
                  <div className={cn(
                    "px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-bl-lg cursor-help flex items-center gap-1.5",
                    displayScore >= 80 ? "bg-success text-white" : 
                    displayScore >= 60 ? "bg-warning text-warning-foreground" : 
                    "bg-destructive text-white"
                  )}>
                    <Trophy className="w-3 h-3" />
                    Score: {displayScore}/100
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3 bg-background/95 backdrop-blur-md border-border shadow-2xl">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-border/50 pb-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <h4 className="text-xs font-bold uppercase tracking-tight">Análise de IA & Scorecard</h4>
                    </div>
                    
                    <div className="space-y-2.5">
                      <div>
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className="text-muted-foreground font-medium uppercase">Indicador de Preço</span>
                          <span className="font-bold">{cotacao.score_preco || cotacao.score}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-1000" 
                            style={{ width: `${cotacao.score_preco || cotacao.score}%` }} 
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className="text-muted-foreground font-medium uppercase">Indicador de Prazo</span>
                          <span className="font-bold">{cotacao.score_prazo || cotacao.score}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-chart-2 transition-all duration-1000" 
                            style={{ width: `${cotacao.score_prazo || cotacao.score}%` }} 
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className="text-muted-foreground font-medium uppercase">Qualidade & Riscos</span>
                          <span className="font-bold">{cotacao.score_qualidade || 80}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-success transition-all duration-1000" 
                            style={{ width: `${cotacao.score_qualidade || 80}%` }} 
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border/50">
                      <p className="text-[10px] leading-relaxed text-muted-foreground italic">
                        Esta cotação foi avaliada considerando o histórico do fornecedor, 
                        o valor unitário comparado ao mercado e o prazo logístico projetado.
                      </p>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

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
                          <Check className="w-4 h-4 text-success" />
                          <span className="font-semibold text-success">{cotacao.quantidadeDisponivel}</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-4 h-4 text-warning" />
                          <span className="font-semibold text-warning">
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
              <div className="flex flex-col items-end gap-2 shrink-0">
                <Button
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => onSelecionar(cotacao.id)}
                  className="w-24"
                >
                  {isSelected ? (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      Ok
                    </>
                  ) : (
                    'Selecionar'
                  )}
                </Button>
                {index === 0 && !isSelected && (
                  <Badge variant="outline" className="text-[10px] text-success border-success/30 bg-success/10 py-0">
                    Melhor Escolha
                  </Badge>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
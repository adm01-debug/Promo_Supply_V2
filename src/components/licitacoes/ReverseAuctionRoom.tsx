import { useState, useEffect, useMemo } from 'react';
import { Gavel, Clock, Trophy, TrendingDown, Users, AlertCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { useLicitacaoLances, Licitacao } from '@/hooks/useLicitacoes';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

interface ReverseAuctionRoomProps {
  licitacao: Licitacao;
  userFornecedorId?: string; // If the logged user is a supplier
}

export function ReverseAuctionRoom({ licitacao, userFornecedorId }: ReverseAuctionRoomProps) {
  const { lances, placeBid, subscribeToBids } = useLicitacaoLances(licitacao.id);
  const [bidValue, setBidValue] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const unsubscribe = subscribeToBids();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [subscribeToBids]);

  useEffect(() => {
    if (!licitacao.data_encerramento) return;
    
    const interval = setInterval(() => {
      const end = new Date(licitacao.data_encerramento!);
      const now = new Date();
      if (now > end) {
        setTimeLeft('Encerrado');
        clearInterval(interval);
      } else {
        setTimeLeft(formatDistanceToNow(end, { locale: ptBR, addSuffix: true }));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [licitacao.data_encerramento]);

  const bestBid = licitacao.current_best_bid || licitacao.valor_estimado || 0;
  const nextMinBid = bestBid - (licitacao.lance_minimo_decremento || 0.01);

  const handlePlaceBid = async () => {
    const val = parseFloat(bidValue);
    if (isNaN(val) || val >= bestBid) {
      return;
    }
    if (userFornecedorId) {
      await placeBid(val, userFornecedorId);
      setBidValue('');
    }
  };

  const lancesAgrupados = useMemo(() => {
    const map = new Map();
    lances.forEach(l => {
      if (!map.has(l.fornecedor_id) || map.get(l.fornecedor_id).valor_lance > l.valor_lance) {
        map.set(l.fornecedor_id, l);
      }
    });
    return Array.from(map.values()).sort((a, b) => a.valor_lance - b.valor_lance);
  }, [lances]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      {/* Principal: Info e Lance */}
      <div className="lg:col-span-2 space-y-6">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="font-mono">{licitacao.numero}</Badge>
              <Badge className="bg-destructive animate-pulse flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-white mr-1" /> AO VIVO
              </Badge>
            </div>
            <CardTitle className="text-2xl mt-2">{licitacao.titulo}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Valor Estimado</p>
                <p className="text-lg font-bold">{formatCurrency(licitacao.valor_estimado || 0)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Melhor Lance Atual</p>
                <p className="text-2xl font-black text-primary">{formatCurrency(bestBid)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Tempo Restante</p>
                <div className="flex items-center gap-1 text-lg font-bold text-destructive">
                  <Clock className="w-4 h-4" />
                  {timeLeft}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Participantes</p>
                <div className="flex items-center gap-1 text-lg font-bold">
                  <Users className="w-4 h-4" />
                  {lancesAgrupados.length}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-primary/10">
              <div className="bg-card p-6 rounded-xl border-2 border-primary/20 shadow-lg">
                <div className="flex flex-col md:flex-row items-center gap-4">
                  <div className="flex-1 w-full space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-primary" />
                      Seu novo lance (Deve ser menor que {formatCurrency(bestBid)})
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">R$</span>
                      <Input 
                        type="number" 
                        value={bidValue}
                        onChange={(e) => setBidValue(e.target.value)}
                        placeholder={nextMinBid.toFixed(2)}
                        className="pl-10 h-12 text-lg font-bold"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <Button 
                    size="lg" 
                    className="w-full md:w-auto h-12 px-8 bg-primary hover:bg-primary/90"
                    onClick={handlePlaceBid}
                    disabled={!bidValue || parseFloat(bidValue) >= bestBid || !userFornecedorId}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Enviar Lance
                  </Button>
                </div>
                {!userFornecedorId && (
                  <p className="text-xs text-warning mt-3 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Apenas fornecedores habilitados podem enviar lances.
                  </p>
                )}
                {parseFloat(bidValue) >= bestBid && (
                  <p className="text-xs text-destructive mt-2 font-semibold">
                    Seu lance deve ser inferior ao melhor lance atual.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Histórico de Lances Real-time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-muted-foreground" />
              Feed de Lances em Tempo Real
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-3">
                {lances.map((lance, idx) => (
                  <div 
                    key={lance.id} 
                    className={`flex items-center justify-between p-3 rounded-lg border-l-4 transition-all ${
                      idx === 0 ? 'bg-primary/5 border-primary animate-in slide-in-from-top-2 duration-300' : 'border-muted bg-muted/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${idx === 0 ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        <Gavel className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">
                          {idx === 0 ? 'NOVO MELHOR LANCE!' : 'Lance Recebido'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Fornecedor: {(lance as any).fornecedor?.razao_social || 'Anônimo'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-black ${idx === 0 ? 'text-primary text-lg' : 'text-foreground'}`}>
                        {formatCurrency(lance.valor_lance)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {lance.created_at ? new Date(lance.created_at).toLocaleTimeString() : '--:--'}
                      </p>
                    </div>
                  </div>
                ))}
                {lances.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <TrendingDown className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p>Aguardando o primeiro lance...</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar: Ranking e Regras */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="w-5 h-5 text-warning" />
              Ranking de Menores Preços
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lancesAgrupados.map((l, i) => (
                <div key={l.id} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      i === 0 ? 'bg-warning text-warning-foreground' : 'bg-muted text-muted-foreground'
                    }`}>
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium">{(l as any).fornecedor?.razao_social || 'Participante'}</span>
                  </div>
                  <span className={`text-sm font-bold ${i === 0 ? 'text-primary' : ''}`}>
                    {formatCurrency(l.valor_lance)}
                  </span>
                </div>
              ))}
              {lancesAgrupados.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4 italic">Sem ofertas até o momento.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
              Regras do Leilão
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-3">
            <div className="flex justify-between">
              <span>Tipo:</span>
              <span className="font-bold">Leilão Reverso (Pregão)</span>
            </div>
            <div className="flex justify-between">
              <span>Decremento Mínimo:</span>
              <span className="font-bold">{formatCurrency(licitacao.lance_minimo_decremento || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Início:</span>
              <span className="font-bold">{new Date(licitacao.data_abertura!).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Término:</span>
              <span className="font-bold">{new Date(licitacao.data_encerramento!).toLocaleString()}</span>
            </div>
            <div className="pt-2">
              <p className="text-[10px] leading-relaxed italic text-muted-foreground">
                * O vencedor será aquele que apresentar o menor valor unitário até o encerramento do cronômetro.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
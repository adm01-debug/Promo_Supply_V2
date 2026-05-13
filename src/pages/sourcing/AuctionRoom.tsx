import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/compras/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Gavel, 
  TrendingDown, 
  Clock, 
  Users,
  AlertTriangle,
  Trophy
} from "lucide-react";
import { useSourcingEventDetails, useLicitacaoLances } from "@/hooks/useLicitacoes";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as ChartTooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { format } from "date-fns";

const AuctionRoom = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { event, loadingEvent } = useSourcingEventDetails(id || null);
  const { lances, subscribeToBids } = useLicitacaoLances(id || null);
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const cleanup = subscribeToBids();
    return cleanup;
  }, [subscribeToBids]);

  useEffect(() => {
    if (!event?.closes_at) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(event.closes_at).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft("ENCERRADO");
        clearInterval(timer);
        return;
      }

      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${h}h ${m}m ${s}s`);
    }, 1000);

    return () => clearInterval(timer);
  }, [event?.closes_at]);

  const chartData = useMemo(() => {
    return [...lances].reverse().map(l => ({
      time: format(new Date(l.created_at || new Date()), 'HH:mm:ss'),
      value: l.valor_lance,
      supplier: l.fornecedor?.razao_social
    }));
  }, [lances]);

  const bestBid = useMemo(() => {
    if (lances.length === 0) return event?.budget_estimate || 0;
    return Math.min(...lances.map(l => l.valor_lance));
  }, [lances, event?.budget_estimate]);

  if (loadingEvent) return <MainLayout><Skeleton className="h-96 w-full" /></MainLayout>;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/sourcing/${id}`)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-red-500 hover:bg-red-600 animate-pulse">AO VIVO</Badge>
                <span className="text-sm font-mono text-muted-foreground">{event?.numero}</span>
              </div>
              <h1 className="text-2xl font-bold">{event?.title}</h1>
            </div>
          </div>
          
          <div className="text-right">
            <div className="flex items-center gap-2 text-muted-foreground mb-1 justify-end">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium uppercase tracking-wider">Tempo Restante</span>
            </div>
            <div className="text-3xl font-mono font-bold text-red-600 tracking-tighter">
              {timeLeft}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Dashboard */}
          <div className="lg:col-span-3 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4 bg-primary/5 border-primary/20">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingDown className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Melhor Lance</span>
                </div>
                <div className="text-2xl font-bold text-emerald-600">
                  {bestBid.toLocaleString('pt-BR', { style: 'currency', currency: event?.currency || 'BRL' })}
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  Saving de {event?.budget_estimate ? (((event.budget_estimate - bestBid) / event.budget_estimate) * 100).toFixed(1) : 0}% vs Budget
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Participantes Ativos</span>
                </div>
                <div className="text-2xl font-bold">
                  {new Set(lances.map(l => l.fornecedor_id)).size}
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  De {event?.invitations?.length || 0} convidados
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Gavel className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Total de Lances</span>
                </div>
                <div className="text-2xl font-bold">
                  {lances.length}
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {lances.length > 0 ? `Último há ${Math.round((new Date().getTime() - new Date(lances[0].created_at || new Date()).getTime()) / 1000)}s` : 'Aguardando lances'}
                </div>
              </Card>
            </div>

            <Card className="p-6">
              <h3 className="font-semibold mb-6">Curva de Lances (Real-time)</h3>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="time" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(value) => `R$ ${value/1000}k`}
                    />
                    <ChartTooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      formatter={(value: any) => [value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 'Lance']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#10b981" 
                      fillOpacity={1} 
                      fill="url(#colorValue)" 
                      strokeWidth={3}
                      animationDuration={300}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Sidebar - Log of Bids */}
          <div className="space-y-6">
            <Card className="p-4 h-[550px] flex flex-col">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Ranking e Lances
              </h3>
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                {lances.length > 0 ? (
                  lances.map((l, i) => (
                    <div key={l.id} className={`p-3 rounded-lg border flex items-center justify-between transition-all ${i === 0 ? 'bg-emerald-50 border-emerald-200 animate-in fade-in slide-in-from-top-2' : 'bg-muted/30'}`}>
                      <div>
                        <div className="flex items-center gap-2">
                          {l.valor_lance === bestBid && <Trophy className="w-3 h-3 text-emerald-600" />}
                          <span className="text-xs font-bold truncate max-w-[100px]">{l.fornecedor?.razao_social}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground block">{format(new Date(l.created_at), 'HH:mm:ss')}</span>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-bold ${l.valor_lance === bestBid ? 'text-emerald-600' : ''}`}>
                          {l.valor_lance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                        {i < lances.length - 1 && (
                          <span className="text-[9px] text-muted-foreground block">
                            -{(((lances[i+1].valor_lance - l.valor_lance) / lances[i+1].valor_lance) * 100).toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-50 p-6">
                    <Gavel className="w-8 h-8 mb-2" />
                    <p className="text-xs">Aguardando o primeiro lance dos fornecedores...</p>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-4 bg-amber-50 border-amber-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-amber-800">Anti-Sniping Ativo</h4>
                  <p className="text-[10px] text-amber-700 leading-tight mt-1">
                    Lances nos últimos 60 segundos estenderão o leilão em mais 1 minuto automaticamente.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default AuctionRoom;
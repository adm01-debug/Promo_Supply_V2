import { 
  Dialog, DialogContent, DialogHeader, DialogTitle 
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingDown, Calendar, Building2,
  ArrowUpRight, ArrowDownRight, CheckCircle2, Clock
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import type { TooltipProps } from 'recharts';
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';
import type { BuyerData } from "@/hooks/useBuyerPerformanceData";

interface LegacyComprador {
  nome: string;
  economia: number;
  percentual: number;
  cotacoes: number;
  melhorPreco: number;
  tendencia: string;
  avatar: string;
}

interface BuyerDrilldownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buyer?: BuyerData | null;
  comprador?: LegacyComprador | null;
}

function legacyToBuyer(c: LegacyComprador): BuyerData {
  return {
    id: c.nome, nome: c.nome, avatar: c.avatar, cargo: '', departamento: '', dataAdmissao: '',
    performance: { economiaMes: c.economia, economiaAno: c.economia, descontoMedio: c.percentual, melhorPrecoRate: c.melhorPreco, cotacoesRealizadas: c.cotacoes, tempoMedioNegociacao: 0, taxaSucesso: 0, fornecedoresAtivos: 0 },
    historico: [], categorias: [], fornecedores: [], ultimasNegociacoes: [], radar: [],
  };
}

export const BuyerDrilldownModal = ({ open, onOpenChange, buyer: buyerProp, comprador }: BuyerDrilldownModalProps) => {
  const buyer = buyerProp || (comprador ? legacyToBuyer(comprador) : null);
  if (!buyer) return null;

  const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
          <p className="font-medium text-foreground">{label}</p>
          {payload.map((entry, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.dataKey === 'economia' 
                ? `R$ ${Number(entry.value).toLocaleString('pt-BR')}` 
                : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="dialog-desc" className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
              {buyer.avatar}
            </div>
            <div>
              <span className="text-xl">{buyer.nome}</span>
              <p className="text-sm font-normal text-muted-foreground">
                Detalhes de Performance e Negociações • Dados reais
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <Card className="p-3 border-emerald-500/20">
            <div className="text-xs text-muted-foreground mb-1">Economia Total</div>
            <div className="text-lg font-bold text-success">
              R$ {buyer.performance.economiaAno.toLocaleString('pt-BR')}
            </div>
          </Card>
          <Card className="p-3 border-blue-500/20">
            <div className="text-xs text-muted-foreground mb-1">Desconto Médio</div>
            <div className="text-lg font-bold text-info">{buyer.performance.descontoMedio}%</div>
          </Card>
          <Card className="p-3 border-purple-500/20">
            <div className="text-xs text-muted-foreground mb-1">Cotações</div>
            <div className="text-lg font-bold text-purple-600">{buyer.performance.cotacoesRealizadas}</div>
          </Card>
          <Card className="p-3 border-amber-500/20">
            <div className="text-xs text-muted-foreground mb-1">Taxa Melhor Preço</div>
            <div className="text-lg font-bold text-warning">{buyer.performance.melhorPrecoRate}%</div>
          </Card>
        </div>

        <Tabs defaultValue="negociacoes" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="negociacoes">Negociações</TabsTrigger>
            <TabsTrigger value="historico">Histórico Mensal</TabsTrigger>
            <TabsTrigger value="fornecedores">Fornecedores</TabsTrigger>
          </TabsList>

          {/* Negociações Tab */}
          <TabsContent value="negociacoes" className="mt-4">
            {buyer.ultimasNegociacoes.length > 0 ? (
              <div className="space-y-3">
                {buyer.ultimasNegociacoes.map((neg, index) => (
                  <Card key={index} className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground truncate">{neg.produto}</h4>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(neg.data).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="mt-1">
                          <span className="text-lg font-bold text-success">
                            R$ {neg.economia.toLocaleString('pt-BR')}
                          </span>
                          <span className="text-xs text-success ml-2">
                            ({neg.percentual}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Nenhuma negociação com economia registrada
              </div>
            )}
          </TabsContent>

          {/* Histórico Tab */}
          <TabsContent value="historico" className="mt-4">
            <Card className="p-4">
              <h3 className="text-sm font-medium text-foreground mb-4">Economia Mensal</h3>
              {buyer.historico.some(h => h.economia > 0) ? (
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={buyer.historico}>
                    <defs>
                      <linearGradient id="colorEconomiaDrill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="mes" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={(v) => `R$${v}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="economia" stroke="hsl(142, 76%, 36%)" fill="url(#colorEconomiaDrill)" strokeWidth={2} name="Economia" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">Sem dados no período</div>
              )}
            </Card>
            <div className="grid grid-cols-3 gap-3 mt-4">
              {buyer.historico.slice(-3).map((mes, index) => (
                <Card key={index} className="p-3">
                  <div className="text-xs text-muted-foreground">{mes.mes}</div>
                  <div className="text-lg font-bold text-success">
                    R$ {mes.economia.toLocaleString('pt-BR')}
                  </div>
                  <div className="text-xs text-muted-foreground">{mes.cotacoes} cotações</div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Fornecedores Tab */}
          <TabsContent value="fornecedores" className="mt-4">
            {buyer.fornecedores.length > 0 ? (
              <div className="space-y-3">
                {buyer.fornecedores.map((fornecedor, index) => {
                  const maxPedidos = Math.max(...buyer.fornecedores.map(f => f.pedidos));
                  const progressValue = maxPedidos > 0 ? (fornecedor.pedidos / maxPedidos) * 100 : 0;
                  return (
                    <Card key={index} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium text-foreground">{fornecedor.nome}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">{fornecedor.pedidos} pedidos</span>
                          {fornecedor.desconto > 0 && (
                            <span className="font-bold text-success">{fornecedor.desconto}%</span>
                          )}
                        </div>
                      </div>
                      <Progress value={progressValue} className="h-2" />
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Nenhum fornecedor registrado
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

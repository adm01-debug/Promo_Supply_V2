import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingDown, 
  Calendar, 
  Package, 
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Clock
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Comprador {
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
  comprador: Comprador | null;
}

// Mock detailed data for buyer
const getMockBuyerDetails = (compradorNome: string) => ({
  historicoMensal: [
    { mes: "Jul", economia: 850, cotacoes: 6 },
    { mes: "Ago", economia: 1200, cotacoes: 8 },
    { mes: "Set", economia: 980, cotacoes: 5 },
    { mes: "Out", economia: 1450, cotacoes: 9 },
    { mes: "Nov", economia: 1620, cotacoes: 10 },
    { mes: "Dez", economia: 1750, cotacoes: 7 },
  ],
  cotacoesRecentes: [
    { 
      id: "COT-2024-089", 
      produto: "Mochila Executiva Premium",
      fornecedor: "XBZ Brindes",
      precoOriginal: 45.90,
      precoNegociado: 38.50,
      economia: 740,
      percentual: 16.1,
      data: "15/12/2024",
      status: "aprovada"
    },
    { 
      id: "COT-2024-087", 
      produto: "Kit Escolar Personalizado",
      fornecedor: "Asia Import",
      precoOriginal: 28.00,
      precoNegociado: 24.50,
      economia: 525,
      percentual: 12.5,
      data: "14/12/2024",
      status: "aprovada"
    },
    { 
      id: "COT-2024-085", 
      produto: "Caneta Metal Premium",
      fornecedor: "Stricker",
      precoOriginal: 8.90,
      precoNegociado: 7.80,
      economia: 330,
      percentual: 12.4,
      data: "13/12/2024",
      status: "aprovada"
    },
    { 
      id: "COT-2024-082", 
      produto: "Squeeze Térmico 500ml",
      fornecedor: "Só Marcas",
      precoOriginal: 32.00,
      precoNegociado: 29.50,
      economia: 250,
      percentual: 7.8,
      data: "12/12/2024",
      status: "aprovada"
    },
    { 
      id: "COT-2024-078", 
      produto: "Caderno Corporativo A5",
      fornecedor: "XBZ Brindes",
      precoOriginal: 15.50,
      precoNegociado: 13.90,
      economia: 192,
      percentual: 10.3,
      data: "11/12/2024",
      status: "pendente"
    },
  ],
  fornecedoresFrequentes: [
    { nome: "XBZ Brindes", cotacoes: 18, economia: 2100 },
    { nome: "Asia Import", cotacoes: 12, economia: 1450 },
    { nome: "Stricker", cotacoes: 8, economia: 980 },
    { nome: "Só Marcas", cotacoes: 7, economia: 720 },
  ],
});

export const BuyerDrilldownModal = ({ open, onOpenChange, comprador }: BuyerDrilldownModalProps) => {
  if (!comprador) return null;

  const details = getMockBuyerDetails(comprador.nome);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
          <p className="font-medium text-foreground">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.dataKey === 'economia' 
                ? `R$ ${entry.value.toLocaleString('pt-BR')}` 
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
              {comprador.avatar}
            </div>
            <div>
              <span className="text-xl">{comprador.nome}</span>
              <p className="text-sm font-normal text-muted-foreground">
                Detalhes de Performance e Negociações
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <Card className="p-3 border-emerald-500/20">
            <div className="text-xs text-muted-foreground mb-1">Economia Total</div>
            <div className="text-lg font-bold text-emerald-600">
              R$ {comprador.economia.toLocaleString('pt-BR')}
            </div>
          </Card>
          <Card className="p-3 border-blue-500/20">
            <div className="text-xs text-muted-foreground mb-1">Desconto Médio</div>
            <div className="text-lg font-bold text-blue-600">{comprador.percentual}%</div>
          </Card>
          <Card className="p-3 border-purple-500/20">
            <div className="text-xs text-muted-foreground mb-1">Cotações</div>
            <div className="text-lg font-bold text-purple-600">{comprador.cotacoes}</div>
          </Card>
          <Card className="p-3 border-amber-500/20">
            <div className="text-xs text-muted-foreground mb-1">Taxa Melhor Preço</div>
            <div className="text-lg font-bold text-amber-600">{comprador.melhorPreco}%</div>
          </Card>
        </div>

        <Tabs defaultValue="cotacoes" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="cotacoes">Cotações Recentes</TabsTrigger>
            <TabsTrigger value="historico">Histórico Mensal</TabsTrigger>
            <TabsTrigger value="fornecedores">Fornecedores</TabsTrigger>
          </TabsList>

          {/* Cotações Tab */}
          <TabsContent value="cotacoes" className="mt-4">
            <div className="space-y-3">
              {details.cotacoesRecentes.map((cotacao, index) => (
                <Card key={index} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-muted-foreground">{cotacao.id}</span>
                        <Badge 
                          variant={cotacao.status === 'aprovada' ? 'default' : 'secondary'}
                          className="text-[10px]"
                        >
                          {cotacao.status === 'aprovada' ? (
                            <><CheckCircle2 className="w-3 h-3 mr-1" /> Aprovada</>
                          ) : (
                            <><Clock className="w-3 h-3 mr-1" /> Pendente</>
                          )}
                        </Badge>
                      </div>
                      <h4 className="font-medium text-foreground">{cotacao.produto}</h4>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {cotacao.fornecedor}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {cotacao.data}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="line-through">R$ {cotacao.precoOriginal.toFixed(2)}</span>
                        <ArrowDownRight className="w-3 h-3 text-emerald-500" />
                        <span className="text-foreground font-medium">R$ {cotacao.precoNegociado.toFixed(2)}</span>
                      </div>
                      <div className="mt-1">
                        <span className="text-lg font-bold text-emerald-600">
                          R$ {cotacao.economia.toLocaleString('pt-BR')}
                        </span>
                        <span className="text-xs text-emerald-600 ml-2">
                          ({cotacao.percentual}%)
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Histórico Tab */}
          <TabsContent value="historico" className="mt-4">
            <Card className="p-4">
              <h3 className="text-sm font-medium text-foreground mb-4">Economia Mensal</h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={details.historicoMensal}>
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
                  <Area 
                    type="monotone" 
                    dataKey="economia" 
                    stroke="hsl(142, 76%, 36%)" 
                    fill="url(#colorEconomiaDrill)"
                    strokeWidth={2}
                    name="Economia"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            <div className="grid grid-cols-3 gap-3 mt-4">
              {details.historicoMensal.slice(-3).map((mes, index) => (
                <Card key={index} className="p-3">
                  <div className="text-xs text-muted-foreground">{mes.mes}</div>
                  <div className="text-lg font-bold text-emerald-600">
                    R$ {mes.economia.toLocaleString('pt-BR')}
                  </div>
                  <div className="text-xs text-muted-foreground">{mes.cotacoes} cotações</div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Fornecedores Tab */}
          <TabsContent value="fornecedores" className="mt-4">
            <div className="space-y-3">
              {details.fornecedoresFrequentes.map((fornecedor, index) => {
                const maxEconomia = Math.max(...details.fornecedoresFrequentes.map(f => f.economia));
                const progressValue = (fornecedor.economia / maxEconomia) * 100;
                
                return (
                  <Card key={index} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">{fornecedor.nome}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">{fornecedor.cotacoes} cotações</span>
                        <span className="font-bold text-emerald-600">
                          R$ {fornecedor.economia.toLocaleString('pt-BR')}
                        </span>
                      </div>
                    </div>
                    <Progress value={progressValue} className="h-2" />
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

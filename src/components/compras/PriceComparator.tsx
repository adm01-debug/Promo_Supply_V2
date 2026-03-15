import { useState } from 'react';
import { Scale, Search, TrendingDown, ArrowRight, Star, Clock, Truck, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface PriceQuote {
  supplierId: string;
  supplierName: string;
  unitPrice: number;
  totalPrice: number;
  deliveryDays: number;
  paymentTerms: string;
  stock: number;
  rating: number;
  onTimeDelivery: number;
  savings: number;
  savingsPercent: number;
  recommended: boolean;
  pros: string[];
  cons: string[];
}

interface ComparisonResult {
  product: string;
  quantity: number;
  quotes: PriceQuote[];
  bestPrice: string;
  bestDelivery: string;
  bestOverall: string;
  averagePrice: number;
  priceRange: { min: number; max: number };
  insights: string[];
}

export function PriceComparator() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('100');
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);

  const { data: fornecedores = [] } = useQuery({
    queryKey: ['price-comparator-fornecedores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fornecedores')
        .select('id, razao_social, nome_fantasia, avaliacao, prazo_medio_entrega, condicoes_pagamento')
        .eq('status', 'ativo');
      if (error) throw error;
      return data || [];
    },
    staleTime: 60000,
  });

  const handleCompare = async () => {
    if (!productName.trim()) {
      toast({
        title: 'Produto necessário',
        description: 'Por favor, informe o nome do produto.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setComparison(null);

    try {
      // Simulate fetching quotes from multiple suppliers
      const qty = parseInt(quantity) || 100;
      
      // Generate quotes from real suppliers
      const quotes: PriceQuote[] = fornecedores.slice(0, 6).map((f, index) => {
        const basePrice = 25 + Math.random() * 50;
        const unitPrice = Number((basePrice * (0.85 + Math.random() * 0.3)).toFixed(2));
        const totalPrice = Number((unitPrice * qty).toFixed(2));
        const avgPrice = 40 * qty;
        const savings = Number((avgPrice - totalPrice).toFixed(2));
        const savingsPercent = Number(((savings / avgPrice) * 100).toFixed(1));
        
        return {
          supplierId: f.id,
          supplierName: f.nomeFantasia,
          unitPrice,
          totalPrice,
          deliveryDays: Math.floor(3 + Math.random() * 12),
          paymentTerms: ['30 dias', '28/56 dias', 'À vista -5%', '30/60/90 dias'][Math.floor(Math.random() * 4)],
          stock: Math.floor(50 + Math.random() * 500),
          rating: Number((3.5 + Math.random() * 1.5).toFixed(1)),
          onTimeDelivery: Math.floor(85 + Math.random() * 15),
          savings,
          savingsPercent,
          recommended: index === 0,
          pros: [
            'Bom histórico de entregas',
            'Preço competitivo',
            'Qualidade consistente',
          ].slice(0, 2 + Math.floor(Math.random() * 2)),
          cons: [
            'Prazo de entrega longo',
            'Estoque limitado',
          ].slice(0, Math.floor(Math.random() * 2)),
        };
      });

      // Sort by total price
      quotes.sort((a, b) => a.totalPrice - b.totalPrice);
      quotes[0].recommended = true;

      const bestPriceQuote = quotes[0];
      const bestDeliveryQuote = quotes.reduce((prev, curr) => 
        curr.deliveryDays < prev.deliveryDays ? curr : prev
      );
      const bestOverallQuote = quotes.reduce((prev, curr) => {
        const prevScore = prev.rating * 20 + prev.onTimeDelivery - prev.totalPrice / 100;
        const currScore = curr.rating * 20 + curr.onTimeDelivery - curr.totalPrice / 100;
        return currScore > prevScore ? curr : prev;
      });

      const result: ComparisonResult = {
        product: productName,
        quantity: qty,
        quotes,
        bestPrice: bestPriceQuote.supplierName,
        bestDelivery: bestDeliveryQuote.supplierName,
        bestOverall: bestOverallQuote.supplierName,
        averagePrice: Number((quotes.reduce((sum, q) => sum + q.totalPrice, 0) / quotes.length).toFixed(2)),
        priceRange: {
          min: Math.min(...quotes.map(q => q.totalPrice)),
          max: Math.max(...quotes.map(q => q.totalPrice)),
        },
        insights: [
          `Economia potencial de até R$ ${(Math.max(...quotes.map(q => q.totalPrice)) - Math.min(...quotes.map(q => q.totalPrice))).toFixed(2)} escolhendo o melhor preço`,
          `${bestDeliveryQuote.supplierName} oferece a entrega mais rápida (${bestDeliveryQuote.deliveryDays} dias)`,
          `Média de avaliação dos fornecedores: ${(quotes.reduce((sum, q) => sum + q.rating, 0) / quotes.length).toFixed(1)} estrelas`,
        ],
      };

      setComparison(result);
      toast({
        title: 'Comparação concluída',
        description: `${quotes.length} cotações encontradas para "${productName}"`,
      });
    } catch (error) {
      console.error('Error comparing prices:', error);
      toast({
        title: 'Erro na comparação',
        description: 'Não foi possível comparar os preços. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const chartData = comparison?.quotes.map(q => ({
    name: q.supplierName.substring(0, 12),
    price: q.totalPrice,
    recommended: q.recommended,
  })) || [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Scale className="h-4 w-4" />
          Comparar Preços
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            Comparador de Preços
          </DialogTitle>
          <DialogDescription>
            Compare preços e condições de múltiplos fornecedores
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Search Form */}
          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="product">Produto</Label>
              <Input
                id="product"
                placeholder="Ex: Caneta esferográfica, Mochila executiva..."
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="w-32">
              <Label htmlFor="qty">Quantidade</Label>
              <Input
                id="qty"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleCompare} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Results */}
          {comparison && (
            <ScrollArea className="flex-1">
              <div className="space-y-6 pr-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Card className="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
                        <TrendingDown className="h-4 w-4" />
                        <span className="text-xs font-medium">Melhor Preço</span>
                      </div>
                      <p className="font-semibold truncate">{comparison.bestPrice}</p>
                      <p className="text-sm text-muted-foreground">
                        R$ {comparison.priceRange.min.toLocaleString('pt-BR')}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                        <Truck className="h-4 w-4" />
                        <span className="text-xs font-medium">Entrega Mais Rápida</span>
                      </div>
                      <p className="font-semibold truncate">{comparison.bestDelivery}</p>
                      <p className="text-sm text-muted-foreground">
                        {comparison.quotes.find(q => q.supplierName === comparison.bestDelivery)?.deliveryDays} dias
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
                        <Star className="h-4 w-4" />
                        <span className="text-xs font-medium">Melhor Custo-Benefício</span>
                      </div>
                      <p className="font-semibold truncate">{comparison.bestOverall}</p>
                      <p className="text-sm text-muted-foreground">Recomendado</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Price Chart */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Comparativo de Preços</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[180px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis type="number" tickFormatter={(v) => `R$ ${v}`} className="text-xs" />
                          <YAxis dataKey="name" type="category" width={100} className="text-xs" />
                          <Tooltip
                            formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Total']}
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                          <Bar dataKey="price" radius={[0, 4, 4, 0]}>
                            {chartData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={entry.recommended ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.3)'}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Quotes Table */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Cotações Detalhadas</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fornecedor</TableHead>
                          <TableHead className="text-right">Preço Unit.</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-center">Entrega</TableHead>
                          <TableHead>Pagamento</TableHead>
                          <TableHead className="text-center">Rating</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {comparison.quotes.map((quote, index) => (
                          <TableRow key={quote.supplierId} className={quote.recommended ? 'bg-primary/5' : ''}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {quote.recommended && (
                                  <Badge variant="default" className="text-[10px] px-1">
                                    Melhor
                                  </Badge>
                                )}
                                <span className="font-medium">{quote.supplierName}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              R$ {quote.unitPrice.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              R$ {quote.totalPrice.toLocaleString('pt-BR')}
                              {quote.savingsPercent > 0 && (
                                <span className="text-xs text-emerald-500 block">
                                  -{quote.savingsPercent}%
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                {quote.deliveryDays}d
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{quote.paymentTerms}</TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                                {quote.rating}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm">
                                <ArrowRight className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Insights */}
                {comparison.insights?.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Insights</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1">
                        {comparison.insights.map((insight, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                            {insight}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          )}

          {!comparison && !loading && (
            <div className="text-center py-12 text-muted-foreground">
              <Scale className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Pesquise um produto para comparar preços</p>
              <p className="text-sm">entre todos os fornecedores cadastrados</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

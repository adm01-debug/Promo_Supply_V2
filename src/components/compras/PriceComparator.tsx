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

import { type PriceQuote, type ComparisonResult, generateQuotesFromSuppliers } from './price-comparator/priceComparatorHelpers';
import { StrategicQuoteTable } from './StrategicQuoteTable';

export function PriceComparator() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [productName, setProductName] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('100');
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [selectedQuotes, setSelectedQuotes] = useState<string[]>([]);

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

  // Fetch available products for selection
  const { data: products = [] } = useQuery({
    queryKey: ['price-comparator-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('produtos')
        .select('id, nome, categoria_id')
        .limit(100);
      if (error) throw error;
      return (data as any[]) || [];
    },
    staleTime: 60000,
  });

  const handleCompare = async () => {
    if (!productName.trim() && !selectedProductId) {
      toast({
        title: 'Produto necessário',
        description: 'Por favor, selecione ou informe o nome do produto.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setComparison(null);

    try {
      let linkedData: any[] = [];
      
      // If a product is selected, fetch its linked suppliers and prices
      if (selectedProductId) {
        const { data, error } = await supabase
          .from('produto_fornecedores')
          .select('*')
          .eq('produto_id', selectedProductId);
        
        if (!error && data) {
          linkedData = data;
        }
      }

      const qty = parseInt(quantity) || 100;
      const displayProductName = selectedProductId 
        ? products.find(p => p.id === selectedProductId)?.nome || productName 
        : productName;

      const result = generateQuotesFromSuppliers(fornecedores, displayProductName, qty, linkedData);
      setComparison(result);
      toast({
        title: 'Comparação concluída',
        description: `${result.quotes.length} cotações processadas para "${displayProductName}"`,
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

  const strategicData = comparison ? comparison.quotes.map(q => ({
    fornecedor: q.supplierName,
    total: q.totalPrice,
    lead_time: q.deliveryDays,
    rating: q.rating
  })) : [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Scale className="h-4 w-4" />
          Comparar Preços
        </Button>
      </DialogTrigger>
      <DialogContent aria-describedby="dialog-desc" className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
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
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-5">
              <Label htmlFor="product">Produto Base</Label>
              <Select 
                value={selectedProductId || ""} 
                onValueChange={(v) => {
                  setSelectedProductId(v);
                  const p = products.find(prod => prod.id === v);
                  if (p) setProductName(p.nome);
                }}
              >
                <SelectTrigger id="product" className="mt-1">
                  <SelectValue placeholder="Selecione um produto cadastrado..." />
                </SelectTrigger>
                <SelectContent>
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3">
              <Label htmlFor="manual-product">Ou busca manual</Label>
              <Input
                id="manual-product"
                placeholder="Nome do produto..."
                value={productName}
                onChange={(e) => {
                  setProductName(e.target.value);
                  if (selectedProductId) setSelectedProductId(null);
                }}
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
                {/* Strategic Cards Integration */}
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em] ml-1">Análise Estratégica de Aquisição</Label>
                  <StrategicQuoteTable cotacoes={strategicData} quantidade={parseInt(quantity) || 100} />
                </div>

                <Separator className="bg-white/5" />

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Card className="bg-success/5 dark:bg-success/15 border-success/20 dark:border-success/30">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 text-success dark:text-success mb-1">
                        <TrendingDown className="h-4 w-4" />
                        <span className="text-xs font-medium">Melhor Preço</span>
                      </div>
                      <p className="font-semibold truncate">{comparison.bestPrice}</p>
                      <p className="text-sm text-muted-foreground">
                        R$ {comparison.priceRange.min.toLocaleString('pt-BR')}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-info/5 dark:bg-blue-900/20 border-info/20 dark:border-info/30">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 text-info dark:text-info mb-1">
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
                    <Table aria-label="Tabela de dados">
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
                                <span className="text-xs text-success block">
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
                                <Star className="h-3 w-3 text-warning fill-amber-500" />
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

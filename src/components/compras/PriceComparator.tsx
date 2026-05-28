import { useState } from 'react';
import { Scale, Search, TrendingDown, ArrowRight, Star, Clock, Truck, CheckCircle2, Loader2, Send, ListChecks, Brain } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { motion, AnimatePresence } from 'framer-motion';
import { toast as sonnerToast } from 'sonner';
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
    setSelectedQuotes([]);

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

      const qty = parseInt(quantity, 10) || 100;
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
                {/* Strategic Planning Console */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <Label className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em]">Análise Estratégica de Aquisição</Label>
                    <Badge variant="outline" className="text-[8px] font-black uppercase border-violet-500/30 text-violet-400 gap-1.5 px-3 py-1 bg-violet-500/5">
                      <Brain className="w-3 h-3" /> IA Advisor Ativo
                    </Badge>
                  </div>
                  <StrategicQuoteTable cotacoes={strategicData} quantidade={parseInt(quantity, 10) || 100} />
                </div>

                {selectedQuotes.length >= 2 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 rounded-[2rem] bg-gradient-to-br from-violet-600/20 via-violet-600/5 to-transparent border border-violet-500/20 backdrop-blur-3xl shadow-2xl relative overflow-hidden group"
                  >
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.1] transition-opacity">
                      <ListChecks className="w-32 h-32 text-violet-400" />
                    </div>
                    
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center shadow-lg">
                          <Brain className="w-7 h-7 text-violet-400" />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-white uppercase tracking-tighter">Planejamento de Aquisição em Lote</h3>
                          <p className="text-[10px] text-zinc-400 font-bold mt-1 uppercase leading-tight tracking-widest">
                            Consolidando {selectedQuotes.length} fornecedores para otimização de custos e prazos
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Média do Lote</p>
                          <p className="text-xl font-black text-white tracking-tight">
                            R$ {(comparison.quotes.filter(q => selectedQuotes.includes(q.supplierId)).reduce((sum, q) => sum + q.totalPrice, 0) / selectedQuotes.length).toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <Separator orientation="vertical" className="h-10 bg-white/10" />
                        <Button 
                          className="h-12 px-6 rounded-xl bg-white text-black hover:bg-zinc-200 font-black text-[10px] uppercase tracking-widest gap-2 shadow-xl shadow-white/10"
                          onClick={() => {
                            sonnerToast.success("Plano de Compra Gerado", {
                              description: "A IA está consolidando os dados para a diretoria.",
                            });
                          }}
                        >
                          Gerar Plano Final
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}

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
                <Card className="border-white/5 bg-white/[0.02]">
                  <CardHeader className="pb-4 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm">Cotações Detalhadas</CardTitle>
                      <CardDescription className="text-[10px] uppercase font-bold tracking-widest mt-1">
                        Selecione fornecedores para disparar cotações em massa via IA
                      </CardDescription>
                    </div>
                    {selectedQuotes.length > 0 && (
                      <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                        <Button 
                          size="sm" 
                          variant="secondary" 
                          className="h-8 rounded-lg bg-violet-600 text-white hover:bg-violet-500 font-bold text-[10px] uppercase tracking-widest gap-2"
                          onClick={() => {
                            toast({
                              title: "RFQs Iniciadas",
                              description: `Disparando cotações automáticas para ${selectedQuotes.length} fornecedores.`,
                            });
                          }}
                        >
                          <Send className="h-3.5 w-3.5" />
                          Disparar RFQ ({selectedQuotes.length})
                        </Button>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table aria-label="Tabela de dados">
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-white/5">
                          <TableHead className="w-[50px]">
                            <Checkbox 
                              checked={selectedQuotes.length === comparison.quotes.length}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedQuotes(comparison.quotes.map(q => q.supplierId));
                                } else {
                                  setSelectedQuotes([]);
                                }
                              }}
                            />
                          </TableHead>
                          <TableHead>Fornecedor</TableHead>
                          <TableHead className="text-right">Preço Unit.</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-center">Entrega</TableHead>
                          <TableHead>Pagamento</TableHead>
                          <TableHead className="text-center">Rating</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {comparison.quotes.map((quote, index) => (
                          <TableRow key={quote.supplierId} className={cn(quote.recommended ? 'bg-primary/5' : '', "border-white/5 hover:bg-white/[0.03]")}>
                            <TableCell>
                              <Checkbox 
                                checked={selectedQuotes.includes(quote.supplierId)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedQuotes(prev => [...prev, quote.supplierId]);
                                  } else {
                                    setSelectedQuotes(prev => prev.filter(id => id !== quote.supplierId));
                                  }
                                }}
                              />
                            </TableCell>
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

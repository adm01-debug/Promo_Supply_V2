import { useHistoricoPrecos } from '@/hooks/useHistoricoPrecos';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Search, 
  History,
  Award,
  AlertTriangle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface HistoricoPrecosCardProps {
  className?: string;
  descricaoInicial?: string;
  onPrecoVerificado?: (resultado: ReturnType<ReturnType<typeof useHistoricoPrecos>['verificarPreco']>) => void;
}

export function HistoricoPrecosCard({
  className,
  descricaoInicial = '',
  onPrecoVerificado,
}: HistoricoPrecosCardProps) {
  const [descricao, setDescricao] = useState(descricaoInicial);
  const [descricaoBusca, setDescricaoBusca] = useState(descricaoInicial);
  const [precoParaVerificar, setPrecoParaVerificar] = useState('');

  const { 
    historico, 
    estatisticas, 
    precosPorFornecedor,
    loading, 
    error,
    verificarPreco,
  } = useHistoricoPrecos(descricaoBusca);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
    });
  };

  const handleBuscar = () => {
    if (descricao.length >= 3) {
      setDescricaoBusca(descricao);
    }
  };

  const handleVerificarPreco = () => {
    const valor = parseFloat(precoParaVerificar.replace(',', '.'));
    if (!isNaN(valor) && valor > 0) {
      const resultado = verificarPreco(valor);
      onPrecoVerificado?.(resultado);
    }
  };

  const resultadoVerificacao = precoParaVerificar 
    ? verificarPreco(parseFloat(precoParaVerificar.replace(',', '.')))
    : null;

  const getTendenciaIcon = () => {
    if (!estatisticas) return <Minus className="h-4 w-4" />;
    if (estatisticas.tendencia === 'alta') return <TrendingUp className="h-4 w-4 text-red-500" />;
    if (estatisticas.tendencia === 'baixa') return <TrendingDown className="h-4 w-4 text-green-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'bom': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'aceitavel': return <Info className="h-4 w-4 text-blue-500" />;
      case 'alto': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'muito_alto': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'bom': return 'bg-green-100 text-green-800 border-green-300';
      case 'aceitavel': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'alto': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'muito_alto': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Preparar dados para o gráfico
  const dadosGrafico = precosPorFornecedor.slice(0, 5).flatMap(f => 
    f.precos.map(p => ({
      data: formatDate(p.data),
      [f.fornecedor_nome]: p.valor,
    }))
  );

  // Agrupar por data
  const dadosAgrupados = dadosGrafico.reduce((acc, curr) => {
    const existing = acc.find(a => a.data === curr.data);
    if (existing) {
      Object.assign(existing, curr);
    } else {
      acc.push(curr);
    }
    return acc;
  }, [] as any[]).slice(0, 20).reverse();

  const cores = ['#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#9333ea'];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Histórico de Preços
        </CardTitle>
        <CardDescription>
          Pesquise o histórico de preços por produto/descrição
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Barra de busca */}
        <div className="flex gap-2">
          <Input
            placeholder="Digite a descrição do produto..."
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
            className="flex-1"
          />
          <Button onClick={handleBuscar} disabled={descricao.length < 3 || loading}>
            <Search className="h-4 w-4 mr-2" />
            Buscar
          </Button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-destructive/10 rounded-lg text-destructive">
            {error}
          </div>
        )}

        {!loading && estatisticas && (
          <>
            {/* Cards de estatísticas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Preço Médio</p>
                <p className="text-lg font-bold">{formatCurrency(estatisticas.precoMedio)}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Mínimo / Máximo</p>
                <p className="text-sm font-medium">
                  {formatCurrency(estatisticas.precoMinimo)} - {formatCurrency(estatisticas.precoMaximo)}
                </p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Tendência</p>
                <div className="flex items-center gap-1">
                  {getTendenciaIcon()}
                  <span className="text-sm font-medium capitalize">{estatisticas.tendencia}</span>
                </div>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Total Cotações</p>
                <p className="text-lg font-bold">{estatisticas.totalCotacoes}</p>
              </div>
            </div>

            {/* Melhor fornecedor */}
            {estatisticas.melhorFornecedor && (
              <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                      Melhor Fornecedor: {estatisticas.melhorFornecedor.nome}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400">
                      Preço médio: {formatCurrency(estatisticas.melhorFornecedor.precoMedio)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Verificador de preço */}
            <div className="p-4 border rounded-lg space-y-3">
              <p className="font-medium">Verificar Preço</p>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Digite o valor para verificar"
                  value={precoParaVerificar}
                  onChange={(e) => setPrecoParaVerificar(e.target.value)}
                  className="flex-1"
                />
                <Button variant="outline" onClick={handleVerificarPreco}>
                  Verificar
                </Button>
              </div>
              
              {resultadoVerificacao && resultadoVerificacao.status !== 'sem_historico' && (
                <div className={cn(
                  "p-3 rounded-lg border flex items-start gap-2",
                  getStatusColor(resultadoVerificacao.status)
                )}>
                  {getStatusIcon(resultadoVerificacao.status)}
                  <div>
                    <p className="font-medium text-sm">{resultadoVerificacao.mensagem}</p>
                    {resultadoVerificacao.percentualVsMedia !== null && (
                      <p className="text-xs mt-1">
                        Comparado à média de {formatCurrency(estatisticas.precoMedio)}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Gráfico de evolução */}
            {dadosAgrupados.length > 1 && (
              <div>
                <p className="font-medium mb-2">Evolução de Preços por Fornecedor</p>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dadosAgrupados}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="data" 
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis 
                        tickFormatter={(v) => `R$${v}`}
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      {precosPorFornecedor.slice(0, 5).map((f, i) => (
                        <Line
                          key={f.fornecedor_id}
                          type="monotone"
                          dataKey={f.fornecedor_nome}
                          stroke={cores[i]}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          connectNulls
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Lista de fornecedores */}
            <div>
              <p className="font-medium mb-2">Ranking de Fornecedores</p>
              <div className="space-y-2">
                {precosPorFornecedor.slice(0, 5).map((f, index) => (
                  <div 
                    key={f.fornecedor_id}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded"
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                        index === 0 ? "bg-yellow-500 text-yellow-950" :
                        index === 1 ? "bg-gray-300 text-gray-700" :
                        index === 2 ? "bg-amber-600 text-amber-50" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {index + 1}
                      </span>
                      <span className="text-sm">{f.fornecedor_nome}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(f.precoMedio)}</p>
                      <p className="text-xs text-muted-foreground">
                        {f.totalCotacoes} cotação(ões)
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {!loading && !error && !estatisticas && descricaoBusca && (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum histórico encontrado para "{descricaoBusca}"</p>
            <p className="text-sm">Tente usar palavras-chave mais genéricas</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Componente compacto para uso inline
export function PrecoReferenciaTag({ 
  descricao, 
  valorAtual,
  className 
}: { 
  descricao: string; 
  valorAtual: number;
  className?: string;
}) {
  const { estatisticas, loading } = useHistoricoPrecos(descricao);

  if (loading || !estatisticas) return null;

  const percentual = ((valorAtual - estatisticas.precoMedio) / estatisticas.precoMedio) * 100;

  if (Math.abs(percentual) <= 5) return null;

  const isBom = percentual < -5;

  return (
    <Badge 
      variant={isBom ? "default" : "destructive"}
      className={cn("text-xs", className)}
    >
      {isBom ? '↓' : '↑'} {Math.abs(percentual).toFixed(0)}% vs média
    </Badge>
  );
}

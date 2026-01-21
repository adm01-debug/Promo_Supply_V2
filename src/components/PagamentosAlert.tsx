import { usePagamentosMonitorados, PagamentoMonitorado } from '@/hooks/usePagamentosMonitorados';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Clock, 
  AlertCircle, 
  CheckCircle2,
  RefreshCw,
  DollarSign,
  CreditCard,
  Calendar,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface PagamentosAlertProps {
  className?: string;
  maxItems?: number;
  showActions?: boolean;
}

export function PagamentosAlert({
  className,
  maxItems = 5,
  showActions = true,
}: PagamentosAlertProps) {
  const { 
    pagamentos, 
    stats, 
    loading, 
    refetch, 
    marcarAtrasadosEmLote,
    marcarComoPago 
  } = usePagamentosMonitorados();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [pagamentoParaPagar, setPagamentoParaPagar] = useState<PagamentoMonitorado | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const getUrgenciaConfig = (urgencia: PagamentoMonitorado['urgencia']) => {
    switch (urgencia) {
      case 'atrasado':
        return {
          icon: AlertCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/30',
          badgeVariant: 'destructive' as const,
          label: 'Atrasado',
        };
      case 'critico':
        return {
          icon: AlertTriangle,
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/30',
          badgeVariant: 'destructive' as const,
          label: 'Crítico',
        };
      case 'alerta':
        return {
          icon: Clock,
          color: 'text-orange-500',
          bgColor: 'bg-orange-500/10',
          borderColor: 'border-orange-500/30',
          badgeVariant: 'secondary' as const,
          label: 'Alerta',
        };
      case 'atencao':
        return {
          icon: Calendar,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/30',
          badgeVariant: 'outline' as const,
          label: 'Atenção',
        };
      default:
        return {
          icon: CheckCircle2,
          color: 'text-green-500',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/30',
          badgeVariant: 'outline' as const,
          label: 'Normal',
        };
    }
  };

  const getFormaPagementoIcon = (forma: string | null) => {
    switch (forma) {
      case 'pix':
        return '⚡';
      case 'boleto':
        return '📄';
      case 'transferencia':
        return '🏦';
      case 'cartao':
        return '💳';
      default:
        return '💰';
    }
  };

  const handleMarcarAtrasados = async () => {
    setIsProcessing(true);
    await marcarAtrasadosEmLote();
    setIsProcessing(false);
  };

  const handlePagar = async (pagamentoId: string) => {
    setIsProcessing(true);
    await marcarComoPago(pagamentoId);
    setPagamentoParaPagar(null);
    setIsProcessing(false);
  };

  if (loading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardHeader>
          <div className="h-5 bg-muted rounded w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Se não houver pagamentos pendentes
  if (stats.total === 0) {
    return (
      <Card className={cn("border-green-500/30 bg-green-500/5", className)}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
            <div>
              <p className="font-medium">Todos os pagamentos em dia</p>
              <p className="text-sm text-muted-foreground">
                Nenhum pagamento próximo do vencimento
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={cn(
        stats.atrasados > 0 ? "border-red-500/30" : 
        stats.criticos > 0 ? "border-red-400/30" : 
        stats.alertas > 0 ? "border-orange-500/30" : 
        "border-yellow-500/30",
        className
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className={cn(
                "h-5 w-5",
                stats.atrasados > 0 ? "text-red-600" : 
                stats.criticos > 0 ? "text-red-500" : 
                stats.alertas > 0 ? "text-orange-500" : 
                "text-yellow-500"
              )} />
              <CardTitle className="text-lg">Pagamentos</CardTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            {stats.total} pagamento(s) requerem atenção
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Resumo de valores */}
          <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-muted/50 rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground">Valor em atraso</p>
              <p className={cn(
                "text-lg font-bold",
                stats.valorAtrasado > 0 ? "text-red-600" : "text-muted-foreground"
              )}>
                {formatCurrency(stats.valorAtrasado)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">A vencer (7 dias)</p>
              <p className="text-lg font-bold text-orange-500">
                {formatCurrency(stats.valorAVencer)}
              </p>
            </div>
          </div>

          {/* Stats por urgência */}
          <div className="flex flex-wrap gap-3 mb-4 text-sm">
            {stats.atrasados > 0 && (
              <div className="flex items-center gap-1 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span className="font-bold">{stats.atrasados}</span>
                <span>atrasado(s)</span>
              </div>
            )}
            {stats.criticos > 0 && (
              <div className="flex items-center gap-1 text-red-500">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-bold">{stats.criticos}</span>
                <span>crítico(s)</span>
              </div>
            )}
            {stats.alertas > 0 && (
              <div className="flex items-center gap-1 text-orange-500">
                <Clock className="h-4 w-4" />
                <span className="font-bold">{stats.alertas}</span>
                <span>alerta(s)</span>
              </div>
            )}
            {stats.atencao > 0 && (
              <div className="flex items-center gap-1 text-yellow-500">
                <Calendar className="h-4 w-4" />
                <span className="font-bold">{stats.atencao}</span>
                <span>atenção</span>
              </div>
            )}
          </div>

          {/* Lista de pagamentos */}
          <div className="space-y-3">
            {pagamentos.slice(0, maxItems).map((pagamento) => {
              const config = getUrgenciaConfig(pagamento.urgencia);
              const Icon = config.icon;
              const valorPendente = pagamento.valor - pagamento.valor_pago;

              return (
                <div
                  key={pagamento.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border",
                    config.bgColor,
                    config.borderColor
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={cn("h-5 w-5", config.color)} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{pagamento.numero}</span>
                        <Badge variant={config.badgeVariant} className="text-xs">
                          {pagamento.urgencia === 'atrasado' 
                            ? `${Math.abs(pagamento.dias_para_vencimento)} dias atraso`
                            : pagamento.dias_para_vencimento === 0
                              ? 'Vence hoje'
                              : pagamento.dias_para_vencimento === 1
                                ? 'Vence amanhã'
                                : `${pagamento.dias_para_vencimento} dias`
                          }
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {pagamento.fornecedor?.razao_social || 'Fornecedor não informado'}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <span>{getFormaPagementoIcon(pagamento.forma_pagamento)}</span>
                        <span>{pagamento.forma_pagamento || 'Não definido'}</span>
                        {pagamento.numero_nf && <span>• NF: {pagamento.numero_nf}</span>}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(valorPendente)}</p>
                      <p className="text-xs text-muted-foreground">
                        Venc: {formatDate(pagamento.data_vencimento)}
                      </p>
                    </div>
                    
                    {showActions && (
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
                        onClick={() => setPagamentoParaPagar(pagamento)}
                        title="Marcar como pago"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Ação em lote */}
          {showActions && stats.atrasados > 0 && (
            <div className="mt-4 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarcarAtrasados}
                disabled={isProcessing}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                {isProcessing ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <AlertCircle className="h-4 w-4 mr-2" />
                )}
                Atualizar status de atrasados
              </Button>
            </div>
          )}

          {/* Ver mais */}
          {pagamentos.length > maxItems && (
            <div className="mt-3 pt-3 border-t text-center">
              <Button variant="link" size="sm">
                Ver todos os {pagamentos.length} pagamentos
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de confirmação de pagamento */}
      <Dialog open={!!pagamentoParaPagar} onOpenChange={() => setPagamentoParaPagar(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar pagamento?</DialogTitle>
            <DialogDescription>
              <div className="space-y-2 mt-2">
                <p><strong>Pagamento:</strong> {pagamentoParaPagar?.numero}</p>
                <p><strong>Fornecedor:</strong> {pagamentoParaPagar?.fornecedor?.razao_social}</p>
                <p><strong>Valor:</strong> {pagamentoParaPagar && formatCurrency(pagamentoParaPagar.valor - pagamentoParaPagar.valor_pago)}</p>
              </div>
              <p className="mt-4 text-sm">
                Ao confirmar, o pagamento será marcado como PAGO com a data de hoje.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPagamentoParaPagar(null)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => pagamentoParaPagar && handlePagar(pagamentoParaPagar.id)}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? 'Processando...' : 'Confirmar Pagamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Componente compacto para cards menores
export function PagamentosAlertBadge({ className }: { className?: string }) {
  const { stats, loading } = usePagamentosMonitorados();

  if (loading || stats.total === 0) return null;

  const hasUrgent = stats.atrasados > 0 || stats.criticos > 0;

  return (
    <Badge 
      variant={hasUrgent ? "destructive" : "secondary"}
      className={cn("cursor-pointer", className)}
    >
      <DollarSign className="h-3 w-3 mr-1" />
      {stats.total} pagamento(s)
      {stats.atrasados > 0 && ` (${stats.atrasados} atrasado${stats.atrasados > 1 ? 's' : ''})`}
    </Badge>
  );
}

// Card compacto com valores
export function PagamentosResumoCard({ className }: { className?: string }) {
  const { stats, loading } = usePagamentosMonitorados();

  if (loading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardContent className="pt-6">
          <div className="h-8 bg-muted rounded w-1/2"></div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className={cn(
      stats.atrasados > 0 
        ? "bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20" 
        : "bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20",
      className
    )}>
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Pagamentos Pendentes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {formatCurrency(stats.valorAtrasado + stats.valorAVencer)}
        </div>
        <div className="flex gap-2 mt-1 text-xs">
          {stats.atrasados > 0 && (
            <span className="text-red-600">{stats.atrasados} atrasado(s)</span>
          )}
          {stats.criticos > 0 && (
            <span className="text-red-500">{stats.criticos} crítico(s)</span>
          )}
          {stats.alertas > 0 && (
            <span className="text-orange-500">{stats.alertas} em alerta</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

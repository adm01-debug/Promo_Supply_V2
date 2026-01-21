import { useCotacoesExpirando, CotacaoExpirando } from '@/hooks/useCotacoesExpirando';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Clock, 
  AlertCircle, 
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Trash2
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

interface CotacoesExpirandoAlertProps {
  className?: string;
  maxItems?: number;
  showActions?: boolean;
}

export function CotacoesExpirandoAlert({
  className,
  maxItems = 5,
  showActions = true,
}: CotacoesExpirandoAlertProps) {
  const { cotacoes, stats, loading, refetch, marcarComoExpirada, marcarExpiradas } = useCotacoesExpirando();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedCotacao, setSelectedCotacao] = useState<CotacaoExpirando | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const getUrgenciaConfig = (urgencia: CotacaoExpirando['urgencia']) => {
    switch (urgencia) {
      case 'critico':
        return {
          icon: AlertCircle,
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/30',
          badgeVariant: 'destructive' as const,
          label: 'Crítico',
        };
      case 'alerta':
        return {
          icon: AlertTriangle,
          color: 'text-orange-500',
          bgColor: 'bg-orange-500/10',
          borderColor: 'border-orange-500/30',
          badgeVariant: 'secondary' as const,
          label: 'Alerta',
        };
      case 'atencao':
        return {
          icon: Clock,
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

  const handleMarcarExpiradas = async () => {
    setIsProcessing(true);
    await marcarExpiradas();
    setIsProcessing(false);
  };

  const handleMarcarExpirada = async (cotacaoId: string) => {
    setIsProcessing(true);
    await marcarComoExpirada(cotacaoId);
    setSelectedCotacao(null);
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

  // Se não houver cotações expirando, mostrar card positivo
  if (stats.total === 0) {
    return (
      <Card className={cn("border-green-500/30 bg-green-500/5", className)}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
            <div>
              <p className="font-medium">Nenhuma cotação expirando</p>
              <p className="text-sm text-muted-foreground">
                Todas as cotações estão com prazo adequado
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
        stats.criticas > 0 ? "border-red-500/30" : 
        stats.alertas > 0 ? "border-orange-500/30" : 
        "border-yellow-500/30",
        className
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className={cn(
                "h-5 w-5",
                stats.criticas > 0 ? "text-red-500" : 
                stats.alertas > 0 ? "text-orange-500" : 
                "text-yellow-500"
              )} />
              <CardTitle className="text-lg">Cotações Expirando</CardTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            {stats.total} cotação(ões) precisam de atenção
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Stats resumidos */}
          <div className="flex gap-4 mb-4 text-sm">
            {stats.criticas > 0 && (
              <div className="flex items-center gap-1 text-red-500">
                <span className="font-bold">{stats.criticas}</span>
                <span>crítica(s)</span>
              </div>
            )}
            {stats.alertas > 0 && (
              <div className="flex items-center gap-1 text-orange-500">
                <span className="font-bold">{stats.alertas}</span>
                <span>alerta(s)</span>
              </div>
            )}
            {stats.atencao > 0 && (
              <div className="flex items-center gap-1 text-yellow-500">
                <span className="font-bold">{stats.atencao}</span>
                <span>atenção</span>
              </div>
            )}
            {stats.expiradas > 0 && (
              <div className="flex items-center gap-1 text-gray-500">
                <span className="font-bold">{stats.expiradas}</span>
                <span>expirada(s)</span>
              </div>
            )}
          </div>

          {/* Lista de cotações */}
          <div className="space-y-3">
            {cotacoes.slice(0, maxItems).map((cotacao) => {
              const config = getUrgenciaConfig(cotacao.urgencia);
              const Icon = config.icon;

              return (
                <div
                  key={cotacao.id}
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
                        <span className="font-medium">{cotacao.numero}</span>
                        <Badge variant={config.badgeVariant} className="text-xs">
                          {cotacao.dias_restantes <= 0 
                            ? 'Expirada' 
                            : cotacao.dias_restantes === 1 
                              ? 'Vence amanhã'
                              : `${cotacao.dias_restantes} dias`
                          }
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {cotacao.fornecedor?.razao_social || 'Fornecedor não informado'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {cotacao.solicitacao?.titulo || 'Sem solicitação'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(cotacao.valor_total)}</p>
                      <p className="text-xs text-muted-foreground">
                        Válida até {formatDate(cotacao.validade_proposta)}
                      </p>
                    </div>
                    
                    {showActions && (
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            // Abrir cotação em nova aba
                            window.open(`/cotacao?id=${cotacao.solicitacao?.id}`, '_blank');
                          }}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        {cotacao.dias_restantes <= 0 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-600"
                            onClick={() => setSelectedCotacao(cotacao)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Botões de ação */}
          {showActions && stats.expiradas > 0 && (
            <div className="mt-4 pt-4 border-t">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleMarcarExpiradas}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Marcar {stats.expiradas} como expirada(s)
              </Button>
            </div>
          )}

          {/* Ver mais */}
          {cotacoes.length > maxItems && (
            <div className="mt-3 pt-3 border-t text-center">
              <Button variant="link" size="sm">
                Ver todas as {cotacoes.length} cotações
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de confirmação */}
      <Dialog open={!!selectedCotacao} onOpenChange={() => setSelectedCotacao(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar cotação como expirada?</DialogTitle>
            <DialogDescription>
              A cotação <strong>{selectedCotacao?.numero}</strong> será marcada como expirada.
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedCotacao(null)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => selectedCotacao && handleMarcarExpirada(selectedCotacao.id)}
              disabled={isProcessing}
            >
              {isProcessing ? 'Processando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Componente compacto para barra de alertas
export function CotacoesExpirandoBadge({ className }: { className?: string }) {
  const { stats, loading } = useCotacoesExpirando();

  if (loading || stats.total === 0) return null;

  return (
    <Badge 
      variant={stats.criticas > 0 ? "destructive" : "secondary"}
      className={cn("cursor-pointer", className)}
    >
      <AlertTriangle className="h-3 w-3 mr-1" />
      {stats.total} cotação(ões) expirando
    </Badge>
  );
}

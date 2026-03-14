import { useMemo, forwardRef } from 'react';
import { AlertTriangle, AlertCircle, X, ChevronRight } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { solicitacoesMock, Solicitacao } from '@/data/mockData';
import { useSLASettings } from '@/stores/slaSettingsStore';
import { useState } from 'react';

const parsePrazoToDays = (prazo: string): number => {
  const match = prazo.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 14;
};

const calculateSLAStatus = (
  solicitacao: Solicitacao,
  criticalDays: number
): 'critical' | 'overdue' | null => {
  const activeStatuses = ['AGUARDANDO_COTACAO', 'EM_COTACAO', 'FORNECEDOR_SELECIONADO', 'PEDIDO_GERADO', 'AGUARDANDO_PAGAMENTO', 'EM_TRANSITO'];
  if (!activeStatuses.includes(solicitacao.status)) {
    return null;
  }

  const prazoDays = parsePrazoToDays(solicitacao.prazoEntrega);
  const createdDate = new Date(solicitacao.createdAt);
  const deadline = new Date(createdDate);
  deadline.setDate(deadline.getDate() + prazoDays);
  
  const now = new Date();
  const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilDeadline < 0) return 'overdue';
  if (daysUntilDeadline <= criticalDays) return 'critical';
  return null;
};

export const CriticalAlertsBar = () => {
  const { settings } = useSLASettings();
  const [dismissed, setDismissed] = useState(false);

  const alerts = useMemo(() => {
    let criticalCount = 0;
    let overdueCount = 0;
    const criticalItems: string[] = [];
    const overdueItems: string[] = [];

    solicitacoesMock.forEach((sol) => {
      const status = calculateSLAStatus(sol, settings.criticalThresholdDays);
      if (status === 'critical') {
        criticalCount++;
        if (criticalItems.length < 3) criticalItems.push(sol.itemNumber);
      } else if (status === 'overdue') {
        overdueCount++;
        if (overdueItems.length < 3) overdueItems.push(sol.itemNumber);
      }
    });

    return { criticalCount, overdueCount, criticalItems, overdueItems };
  }, [settings.criticalThresholdDays]);

  const hasAlerts = alerts.criticalCount > 0 || alerts.overdueCount > 0;

  if (!hasAlerts || dismissed) return null;

  return (
    <Alert 
      variant="destructive" 
      className="relative border-destructive/50 bg-destructive/10 animate-pulse-slow"
    >
      <div className="flex items-start gap-3">
        {alerts.overdueCount > 0 ? (
          <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
        )}
        
        <div className="flex-1">
          <AlertTitle className="text-destructive font-semibold mb-1">
            Atenção: Pedidos Precisam de Ação Imediata
          </AlertTitle>
          <AlertDescription className="text-destructive/90">
            <div className="flex flex-wrap items-center gap-3">
              {alerts.overdueCount > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {alerts.overdueCount} Atrasado{alerts.overdueCount > 1 ? 's' : ''}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    ({alerts.overdueItems.join(', ')}{alerts.overdueCount > 3 ? '...' : ''})
                  </span>
                </div>
              )}
              
              {alerts.criticalCount > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="gap-1 border-destructive text-destructive">
                    <AlertTriangle className="h-3 w-3" />
                    {alerts.criticalCount} Crítico{alerts.criticalCount > 1 ? 's' : ''}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    ({alerts.criticalItems.join(', ')}{alerts.criticalCount > 3 ? '...' : ''})
                  </span>
                </div>
              )}
            </div>
          </AlertDescription>
        </div>

        <div className="flex items-center gap-2">
          <Button
            asChild
            size="sm"
            variant="destructive"
            className="h-8 gap-1"
          >
            <Link to="/solicitacoes">
              Ver Pedidos
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/20"
            onClick={() => setDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Alert>
  );
};

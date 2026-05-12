import { useMemo, forwardRef, useState } from 'react';
import { AlertTriangle, AlertCircle, X, ChevronRight } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSLASettings } from '@/stores/slaSettingsStore';
import { motion, AnimatePresence } from 'framer-motion';


export const CriticalAlertsBar = forwardRef<HTMLDivElement>((_props, ref) => {
  const { settings } = useSLASettings();
  const [dismissed, setDismissed] = useState(false);

  const { data: solicitacoes } = useQuery({
    queryKey: ['critical-alerts-solicitacoes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('solicitacoes')
        .select('id, numero, status, data_necessidade, created_at')
        .not('status', 'in', '(concluida,cancelada)');
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  const { data: pedidos } = useQuery({
    queryKey: ['critical-alerts-pedidos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pedidos')
        .select('id, numero, status, data_previsao')
        .not('status', 'in', '(entregue,cancelado)');
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  const alerts = useMemo(() => {
    let criticalCount = 0;
    let overdueCount = 0;
    const criticalItems: string[] = [];
    const overdueItems: string[] = [];
    const now = new Date();
    const nowDate = now.toISOString().split('T')[0];

    // Check solicitacoes near deadline
    (solicitacoes || []).forEach((sol) => {
      if (!sol.data_necessidade) return;
      const daysUntil = Math.ceil(
        (new Date(sol.data_necessidade).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntil < 0) {
        overdueCount++;
        if (overdueItems.length < 3) overdueItems.push(sol.numero || sol.id);
      } else if (daysUntil <= settings.criticalThresholdDays) {
        criticalCount++;
        if (criticalItems.length < 3) criticalItems.push(sol.numero || sol.id);
      }
    });

    // Check overdue pedidos
    (pedidos || []).forEach((ped) => {
      if (ped.data_previsao && ped.data_previsao < nowDate) {
        overdueCount++;
        if (overdueItems.length < 3) overdueItems.push(ped.numero);
      }
    });

    return { criticalCount, overdueCount, criticalItems, overdueItems };
  }, [solicitacoes, pedidos, settings.criticalThresholdDays]);

  const hasAlerts = alerts.criticalCount > 0 || alerts.overdueCount > 0;

  if (!hasAlerts || dismissed) return null;

  return (
    <Alert 
      ref={ref}
      variant="destructive" 
      className="relative border-destructive/50 bg-destructive/10 animate-pulse-slow shadow-lg p-6 rounded-2xl border-2"
    >
      <div className="flex items-start gap-3">
        {alerts.overdueCount > 0 ? (
          <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
        )}
        
        <div className="flex-1">
          <AlertTitle className="text-destructive font-black uppercase tracking-widest text-sm mb-2 flex items-center gap-2">
            <span className="animate-pulse">Ação Imediata Necessária</span>
            <Badge variant="outline" className="border-destructive text-destructive text-[10px] h-4 font-black">SLA CRÍTICO</Badge>
          </AlertTitle>
          <AlertDescription className="text-destructive/90">
            <div className="flex flex-wrap items-center gap-3">
              {alerts.overdueCount > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="gap-1 font-black text-[10px] uppercase">
                    <AlertCircle className="h-3 w-3" />
                    {alerts.overdueCount} Excedido{alerts.overdueCount > 1 ? 's' : ''}
                  </Badge>
                  <span className="text-[10px] font-medium text-muted-foreground bg-destructive/5 px-1.5 py-0.5 rounded border border-destructive/10">
                    {alerts.overdueItems.join(', ')}{alerts.overdueCount > 3 ? '...' : ''}
                  </span>
                </div>
              )}
              
              {alerts.criticalCount > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="gap-1 border-destructive text-destructive font-black text-[10px] uppercase">
                    <AlertTriangle className="h-3 w-3" />
                    {alerts.criticalCount} Próximo{alerts.criticalCount > 1 ? 's' : ''}
                  </Badge>
                  <span className="text-[10px] font-medium text-muted-foreground bg-destructive/5 px-1.5 py-0.5 rounded border border-destructive/10">
                    {alerts.criticalItems.join(', ')}{alerts.criticalCount > 3 ? '...' : ''}
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
            className="h-8 gap-1 font-black uppercase text-[10px] tracking-widest"
          >
            <Link to="/solicitacoes">
              Resolver Agora
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
});
CriticalAlertsBar.displayName = 'CriticalAlertsBar';
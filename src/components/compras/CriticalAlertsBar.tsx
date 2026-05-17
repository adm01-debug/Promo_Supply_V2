import { useMemo, forwardRef, useState } from 'react';
import { AlertTriangle, AlertCircle, X, ChevronRight, ShieldCheck, Zap } from 'lucide-react';
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
        .select('id, numero, status, data_previsao, solicitacao_id')
        .not('status', 'in', '(entregue,cancelado)');
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  const { data: workflows } = useQuery({
    queryKey: ['critical-alerts-approvals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('approval_workflows')
        .select('id, status, created_at')
        .eq('status', 'pending');
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  const alerts = useMemo(() => {
    let criticalCount = 0;
    let overdueCount = 0;
    let prodAuditCount = 0;
    const pendingApprovals = workflows?.length || 0;
    
    const criticalItems: string[] = [];
    const overdueItems: string[] = [];
    const prodAuditItems: string[] = [];
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

    // Check overdue pedidos and production audits
    (pedidos || []).forEach((ped) => {
      if (ped.data_previsao && ped.data_previsao < nowDate) {
        overdueCount++;
        if (overdueItems.length < 3) overdueItems.push(ped.numero);
      }
      
      // Check for first piece audit status
      if ((ped as any).status_producao === 'primeira_peca') {
        prodAuditCount++;
        if (prodAuditItems.length < 3) prodAuditItems.push(ped.numero);
      }
    });

    return { criticalCount, overdueCount, prodAuditCount, criticalItems, overdueItems, prodAuditItems, pendingApprovals };
  }, [solicitacoes, pedidos, workflows, settings.criticalThresholdDays]);

  const hasAlerts = alerts.criticalCount > 0 || alerts.overdueCount > 0 || alerts.pendingApprovals > 0 || alerts.prodAuditCount > 0;

  if (!hasAlerts || dismissed) return null;

  return (
    <AnimatePresence>
      {!dismissed && hasAlerts && (
        <motion.div
          initial={{ opacity: 0, height: 0, y: -20 }}
          animate={{ opacity: 1, height: "auto", y: 0 }}
          exit={{ opacity: 0, height: 0, y: -20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="mb-6"
        >
          <Alert 
            ref={ref}
            variant="destructive" 
            className="relative border-destructive/50 bg-gradient-to-r from-destructive/10 via-destructive/5 to-transparent shadow-lg p-5 rounded-2xl border-2 overflow-hidden group"
          >
            {/* Background pattern */}
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
              <AlertCircle className="w-24 h-24 rotate-12" />
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 relative z-10">
              <div className="flex-1 flex gap-4 items-start">
                <div className="p-3 rounded-full bg-destructive/20 text-destructive animate-pulse shrink-0">
                  {alerts.overdueCount > 0 ? (
                    <AlertCircle className="h-6 w-6" />
                  ) : (
                    <AlertTriangle className="h-6 w-6" />
                  )}
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <AlertTitle className="text-destructive font-black uppercase tracking-tight text-sm mb-0">
                      Ação Imediata Necessária
                    </AlertTitle>
                    <Badge variant="outline" className="border-destructive text-destructive text-[9px] h-4 font-black uppercase tracking-wider">SLA CRÍTICO</Badge>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    {alerts.overdueCount > 0 && (
                      <span className="flex items-center gap-1.5 text-destructive font-bold">
                        {alerts.overdueCount} Excedido{alerts.overdueCount > 1 ? 's' : ''}: 
                        <span className="text-xs font-mono opacity-80">{alerts.overdueItems.join(', ')}{alerts.overdueCount > 3 ? '...' : ''}</span>
                      </span>
                    )}

                    {alerts.prodAuditCount > 0 && (
                      <span className="flex items-center gap-1.5 text-fuchsia-600 dark:text-fuchsia-400 font-black">
                        <Zap className="h-4 w-4 animate-pulse" />
                        {alerts.prodAuditCount} Auditorias de 1ª Peça Pendentes
                      </span>
                    )}

                    {alerts.pendingApprovals > 0 && (
                      <span className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400 font-bold">
                        <ShieldCheck className="h-4 w-4" />
                        {alerts.pendingApprovals} Aprovações Pendentes
                      </span>
                    )}
                    
                    {alerts.criticalCount > 0 && (
                      <span className="flex items-center gap-1.5 text-destructive/80 font-semibold">
                        {alerts.criticalCount} Próximo{alerts.criticalCount > 1 ? 's' : ''}:
                        <span className="text-xs font-mono opacity-80">{alerts.criticalItems.join(', ')}{alerts.criticalCount > 3 ? '...' : ''}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 mt-2 sm:mt-0">
                <Button
                  asChild
                  size="sm"
                  variant="destructive"
                  className="flex-1 sm:flex-none h-9 gap-1 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-destructive/20"
                >
                  <Link to="/solicitacoes">
                    Resolver Agora
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-destructive/60 hover:text-destructive hover:bg-destructive/10 rounded-full"
                  onClick={() => setDismissed(true)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Alert>
        </motion.div>
      )}
    </AnimatePresence>
  );

});
CriticalAlertsBar.displayName = 'CriticalAlertsBar';

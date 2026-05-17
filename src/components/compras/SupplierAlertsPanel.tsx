import { useState, useMemo, useCallback } from 'react';
import { Building2, AlertTriangle, AlertCircle, RefreshCw, TrendingUp, TrendingDown, CreditCard, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useSLASettings } from '@/stores/slaSettingsStore';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from "framer-motion";

interface SupplierSLA {
  id: string;
  name: string;
  slaCompliance: number;
  totalDeliveries: number;
  onTime: number;
}

export const SupplierAlertsPanel = () => {
  const { settings } = useSLASettings();
  const [activeTab, setActiveTab] = useState('status');

  const { data: fornecedores, isLoading: loadingForn } = useQuery({
    queryKey: ['supplier-alerts-fornecedores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fornecedores')
        .select('id, razao_social, status, limite_credito, saldo_comprometido')
        .eq('status', 'ativo');
      if (error) throw error;
      return data || [];
    },
    staleTime: 60000,
  });

  const { data: pedidos, isLoading: loadingPed } = useQuery({
    queryKey: ['supplier-alerts-pedidos'],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 90);
      const { data, error } = await supabase
        .from('pedidos')
        .select('id, fornecedor_id, status, data_previsao, data_entrega')
        .gte('data_emissao', since.toISOString().split('T')[0]);
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  const supplierData = useMemo<SupplierSLA[]>(() => {
    const forn = fornecedores || [];
    const peds = pedidos || [];
    return forn.map(f => {
      const supplierPeds = peds.filter(p => p.fornecedor_id === f.id);
      const delivered = supplierPeds.filter(p => p.status === 'entregue');
      const onTime = delivered.filter(p => p.data_entrega && p.data_previsao && p.data_entrega <= p.data_previsao).length;
      const slaCompliance = delivered.length > 0 ? Math.round((onTime / delivered.length) * 100) : 100;
      return { id: f.id, name: f.razao_social, slaCompliance, totalDeliveries: delivered.length, onTime };
    }).sort((a, b) => a.slaCompliance - b.slaCompliance);
  }, [fornecedores, pedidos]);

  const underperformingSuppliers = supplierData.filter((s) => s.slaCompliance < settings.supplierSLAThreshold);

  const creditAlerts = useMemo(() => {
    const forn = fornecedores || [];
    return forn
      .filter(f => f.limite_credito && f.saldo_comprometido && f.saldo_comprometido >= f.limite_credito * 0.8)
      .map(f => {
        const pct = f.limite_credito ? Math.round((f.saldo_comprometido! / f.limite_credito) * 100) : 0;
        const exceeded = pct >= 100;
        return {
          id: `credit-${f.id}`,
          supplierName: f.razao_social,
          type: exceeded ? 'critical' as const : 'warning' as const,
          category: 'credit',
          message: exceeded ? `CREDIT LIMIT EXCEEDED: ${pct}% Usage` : `CREDIT LIMIT NEAR CAP: ${pct}% Usage`,
          detail: `Used: R$ ${f.saldo_comprometido?.toLocaleString('pt-BR')} / Cap: R$ ${f.limite_credito?.toLocaleString('pt-BR')}`,
          slaCompliance: 100 - pct,
        };
      });
  }, [fornecedores]);

  const alerts = useMemo(() => {
    const slaAlerts = underperformingSuppliers.map(s => ({
      id: s.id,
      supplierName: s.name,
      type: s.slaCompliance < 70 ? 'critical' as const : 'warning' as const,
      category: 'sla',
      message: `SLA COMPLIANCE DROP: ${s.slaCompliance}%`,
      detail: `${s.totalDeliveries - s.onTime} deliveries failed to meet lead time constraints`,
      slaCompliance: s.slaCompliance,
    }));
    return [...creditAlerts, ...slaAlerts];
  }, [underperformingSuppliers, creditAlerts]);

  if (!settings.enableSupplierAlerts) return null;
  const isLoading = loadingForn || loadingPed;

  if (isLoading) {
    return (
      <Card className="bg-white/[0.02] border-white/5 rounded-[2.5rem]">
        <CardHeader><Skeleton className="h-6 w-48 bg-white/5" /></CardHeader>
        <CardContent><Skeleton className="h-48 bg-white/5 rounded-2xl" /></CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/[0.02] border-white/5 rounded-[2.5rem] backdrop-blur-3xl overflow-hidden shadow-2xl">
      <CardHeader className="pb-8">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-3">
            <ShieldAlert className="h-4 w-4 text-rose-400" />
            Active Surveillance
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-white/10 text-zinc-400">
              Threshold: {settings.supplierSLAThreshold}%
            </Badge>
            {underperformingSuppliers.length > 0 && (
              <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-rose-500/30 text-rose-400 bg-rose-500/10">
                {underperformingSuppliers.length} Breaches
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
            <p className="text-2xl font-black text-white">{supplierData.length}</p>
            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mt-1">Monitored</p>
          </div>
          <div className="p-4 rounded-2xl bg-emerald-500/[0.05] border border-emerald-500/20 text-center">
            <p className="text-2xl font-black text-emerald-400">
              {supplierData.filter(s => s.slaCompliance >= settings.supplierSLAThreshold).length}
            </p>
            <p className="text-[9px] font-black text-emerald-500/60 uppercase tracking-widest mt-1">Compliant</p>
          </div>
          <div className="p-4 rounded-2xl bg-rose-500/[0.05] border border-rose-500/20 text-center">
            <p className="text-2xl font-black text-rose-400">
              {underperformingSuppliers.length}
            </p>
            <p className="text-[9px] font-black text-rose-500/60 uppercase tracking-widest mt-1">Failing</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white/[0.03] border border-white/5 h-11 p-1 rounded-xl">
            <TabsTrigger value="status" className="text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white/[0.05]">
              Alert Stream ({alerts.length})
            </TabsTrigger>
            <TabsTrigger value="compare" className="text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white/[0.05]">
              Network Matrix
            </TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="mt-6">
            <ScrollArea className="h-[250px] pr-4">
              <AnimatePresence>
                {alerts.length === 0 ? (
                  <div className="p-12 text-center text-zinc-600 font-black uppercase tracking-[0.2em] text-xs">
                    <Building2 className="h-8 w-8 mx-auto mb-4 opacity-20" />
                    No active surveillance alerts
                  </div>
                ) : (
                  <div className="space-y-3">
                    {alerts.map((alert) => (
                      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key={alert.id} className={cn(
                        "p-5 rounded-2xl border transition-all",
                        alert.type === 'critical' ? 'bg-rose-500/[0.03] border-rose-500/20' : 'bg-amber-500/[0.02] border-amber-500/20'
                      )}>
                        <div className="flex items-start gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center",
                            alert.type === 'critical' ? 'bg-rose-500/10' : 'bg-amber-500/10'
                          )}>
                            {alert.category === 'credit' ? <CreditCard className={cn("h-5 w-5", alert.type === 'critical' ? 'text-rose-400' : 'text-amber-400')} /> : <AlertTriangle className={cn("h-5 w-5", alert.type === 'critical' ? 'text-rose-400' : 'text-amber-400')} />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-4 mb-1.5">
                              <span className="font-black text-xs text-white uppercase tracking-tight">{alert.supplierName}</span>
                              <Badge variant="outline" className={cn("text-[9px] font-black uppercase border-none px-2", alert.type === 'critical' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400')}>
                                {alert.slaCompliance}% Index
                              </Badge>
                            </div>
                            <p className={cn("text-[10px] font-black uppercase tracking-widest mb-1", alert.type === 'critical' ? 'text-rose-400' : 'text-amber-400')}>{alert.message}</p>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tight">{alert.detail}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="compare" className="mt-6">
            <div className="h-[250px] bg-white/[0.01] border border-white/5 rounded-2xl p-6">
              {supplierData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-zinc-600 font-black uppercase tracking-widest text-[10px]">
                  Initializing Network Visualization...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={supplierData
                      .map(s => ({
                        name: s.name.split(' ')[0],
                        fullName: s.name,
                        sla: s.slaCompliance,
                      }))
                      .sort((a, b) => b.sla - a.sla)}
                    margin={{ top: 10, right: 10, bottom: 20, left: 10 }}
                  >
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#71717a', fontWeight: 900 }} angle={-45} textAnchor="end" height={50} />
                    <YAxis domain={[60, 100]} tick={{ fontSize: 9, fill: '#71717a', fontWeight: 900 }} width={30} />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                      contentStyle={{
                        backgroundColor: '#0a0a0f',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        fontSize: '10px',
                        fontWeight: 900,
                        color: '#fff',
                        textTransform: 'uppercase'
                      }}
                      formatter={(value: number) => [`${value}% SLA Index`, 'Surveillance']}
                      labelFormatter={(_, payload) => payload[0]?.payload?.fullName || ''}
                    />
                    <ReferenceLine 
                      y={settings.supplierSLAThreshold} 
                      stroke="#fb7185" 
                      strokeDasharray="4 4"
                    />
                    <Bar dataKey="sla" radius={[6, 6, 0, 0]}>
                      {supplierData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.slaCompliance < settings.supplierSLAThreshold 
                            ? '#f43f5e' 
                            : '#10b981'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
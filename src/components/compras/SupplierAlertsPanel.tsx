import { useState, useMemo, useCallback } from 'react';
import { Building2, AlertTriangle, AlertCircle, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
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
        .select('id, razao_social, status')
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
      const onTime = delivered.filter(p => 
        p.data_entrega && p.data_previsao && p.data_entrega <= p.data_previsao
      ).length;
      const slaCompliance = delivered.length > 0 
        ? Math.round((onTime / delivered.length) * 100)
        : 100;

      return {
        id: f.id,
        name: f.razao_social,
        slaCompliance,
        totalDeliveries: delivered.length,
        onTime,
      };
    }).sort((a, b) => a.slaCompliance - b.slaCompliance);
  }, [fornecedores, pedidos]);

  const underperformingSuppliers = supplierData.filter(
    (s) => s.slaCompliance < settings.supplierSLAThreshold
  );

  const alerts = useMemo(() => {
    return underperformingSuppliers.map(s => ({
      id: s.id,
      supplierName: s.name,
      type: s.slaCompliance < 70 ? 'critical' as const : 'warning' as const,
      message: `SLA em ${s.slaCompliance}% — ${s.totalDeliveries - s.onTime} entregas fora do prazo`,
      slaCompliance: s.slaCompliance,
    }));
  }, [underperformingSuppliers]);

  if (!settings.enableSupplierAlerts) return null;

  const isLoading = loadingForn || loadingPed;

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent><Skeleton className="h-48" /></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Alertas de Fornecedores
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              Threshold: {settings.supplierSLAThreshold}%
            </Badge>
            {underperformingSuppliers.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {underperformingSuppliers.length} abaixo
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold">{supplierData.length}</p>
            <p className="text-xs text-muted-foreground">Monitorados</p>
          </div>
          <div className="p-2 rounded-lg bg-success/10">
            <p className="text-2xl font-bold text-success">
              {supplierData.filter(s => s.slaCompliance >= settings.supplierSLAThreshold).length}
            </p>
            <p className="text-xs text-muted-foreground">OK</p>
          </div>
          <div className="p-2 rounded-lg bg-destructive/10">
            <p className="text-2xl font-bold text-destructive">
              {underperformingSuppliers.length}
            </p>
            <p className="text-xs text-muted-foreground">Abaixo</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="status" className="text-xs">
              Alertas ({alerts.length})
            </TabsTrigger>
            <TabsTrigger value="compare" className="text-xs">
              Comparativo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="mt-3">
            <ScrollArea className="h-[200px] border border-border rounded-lg">
              {alerts.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhum alerta de fornecedor</p>
                  <p className="text-xs mt-1">
                    Todos os fornecedores acima de {settings.supplierSLAThreshold}%
                  </p>
                </div>
              ) : (
                alerts.map((alert) => (
                  <div key={alert.id} className={cn(
                    "p-3 border-b border-border last:border-b-0",
                    alert.type === 'critical' ? 'bg-destructive/5' : 'bg-warning/5'
                  )}>
                    <div className="flex items-start gap-3">
                      {alert.type === 'critical' 
                        ? <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                        : <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                      }
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{alert.supplierName}</span>
                          <Badge variant={alert.type === 'critical' ? 'destructive' : 'outline'} className="text-xs">
                            {alert.slaCompliance}% SLA
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="compare" className="mt-3">
            <div className="h-[200px] border border-border rounded-lg p-2">
              {supplierData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <p className="text-sm">Aguardando dados</p>
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
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={40} />
                    <YAxis domain={[60, 100]} tick={{ fontSize: 10 }} width={30} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                        fontSize: '12px',
                      }}
                      formatter={(value: number) => [`${value}%`, 'SLA']}
                      labelFormatter={(_, payload) => payload[0]?.payload?.fullName || ''}
                    />
                    <ReferenceLine 
                      y={settings.supplierSLAThreshold} 
                      stroke="hsl(var(--destructive))" 
                      strokeDasharray="3 3"
                    />
                    <Bar dataKey="sla" radius={[4, 4, 0, 0]}>
                      {supplierData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.slaCompliance < settings.supplierSLAThreshold 
                            ? 'hsl(var(--destructive))' 
                            : 'hsl(var(--primary))'}
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

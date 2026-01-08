import { useState, useMemo, useCallback } from 'react';
import { Building2, AlertTriangle, AlertCircle, RefreshCw, TrendingUp, TrendingDown, TestTube, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSLASettings } from '@/stores/slaSettingsStore';
import { formatDistanceToNow, subDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell } from 'recharts';

// Local interface for SupplierAlert
interface SupplierAlert {
  id: string;
  supplierId: string;
  supplierName: string;
  type: 'warning' | 'critical';
  message: string;
  slaCompliance: number;
  createdAt: Date;
}

interface SupplierData {
  id: string;
  name: string;
  slaCompliance: number;
  deliveries: number;
  onTime: number;
}

// Mock supplier data
const mockSupplierData: SupplierData[] = [
  { id: '1', name: 'ABC Ltda', slaCompliance: 92, deliveries: 45, onTime: 41 },
  { id: '2', name: 'XYZ Corp', slaCompliance: 78, deliveries: 32, onTime: 25 },
  { id: '3', name: 'Distribuidora 123', slaCompliance: 85, deliveries: 28, onTime: 24 },
  { id: '4', name: 'Fornecedor Premium', slaCompliance: 96, deliveries: 50, onTime: 48 },
  { id: '5', name: 'Quick Supply', slaCompliance: 72, deliveries: 20, onTime: 14 },
];

const mockAlerts: SupplierAlert[] = [
  { id: '1', supplierId: '2', supplierName: 'XYZ Corp', type: 'warning', message: 'SLA abaixo do threshold', slaCompliance: 78, createdAt: new Date() },
  { id: '2', supplierId: '5', supplierName: 'Quick Supply', type: 'critical', message: 'SLA crítico - ação urgente necessária', slaCompliance: 72, createdAt: subDays(new Date(), 1) },
];

// Generate mock historical trend data
const generateTrendData = (supplierId: string, days: number = 7) => {
  const data = [];
  const baseCompliance = 75 + Math.random() * 20;
  
  for (let i = days - 1; i >= 0; i--) {
    const date = subDays(new Date(), i);
    const variation = (Math.random() - 0.5) * 10;
    const compliance = Math.min(100, Math.max(60, baseCompliance + variation + (Math.random() > 0.7 ? -5 : 2)));
    
    data.push({
      date: format(date, 'dd/MM'),
      fullDate: format(date, 'dd/MM/yyyy'),
      compliance: Math.round(compliance * 10) / 10,
    });
  }
  return data;
};

const AlertItem = ({ alert }: { alert: SupplierAlert }) => {
  const Icon = alert.type === 'critical' ? AlertCircle : AlertTriangle;
  const colorClass = alert.type === 'critical' ? 'text-destructive' : 'text-warning';

  return (
    <div className={cn(
      "p-3 border-b border-border last:border-b-0",
      alert.type === 'critical' ? 'bg-destructive/5' : 'bg-warning/5'
    )}>
      <div className="flex items-start gap-3">
        <Icon className={cn("h-5 w-5 mt-0.5", colorClass)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{alert.supplierName}</span>
            <Badge 
              variant={alert.type === 'critical' ? 'destructive' : 'outline'}
              className="text-xs"
            >
              {alert.slaCompliance}% SLA
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {alert.message}
          </p>
          <span className="text-xs text-muted-foreground mt-1 block">
            {formatDistanceToNow(alert.createdAt, { addSuffix: true, locale: ptBR })}
          </span>
        </div>
      </div>
    </div>
  );
};

// Supplier trend mini-chart component
const SupplierTrendChart = ({ 
  supplierName, 
  supplierId,
  currentSLA,
  threshold 
}: { 
  supplierName: string; 
  supplierId: string;
  currentSLA: number;
  threshold: number;
}) => {
  const trendData = useMemo(() => generateTrendData(supplierId), [supplierId]);
  
  const trend = trendData.length >= 2 
    ? trendData[trendData.length - 1].compliance - trendData[0].compliance 
    : 0;
  
  const isPositive = trend >= 0;
  const isBelowThreshold = currentSLA < threshold;

  return (
    <div className={cn(
      "p-3 rounded-lg border",
      isBelowThreshold ? "border-destructive/30 bg-destructive/5" : "border-border bg-muted/30"
    )}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium truncate">{supplierName}</span>
        <div className="flex items-center gap-2">
          <Badge variant={isBelowThreshold ? "destructive" : "secondary"} className="text-xs">
            {currentSLA}%
          </Badge>
          <div className={cn(
            "flex items-center text-xs",
            isPositive ? "text-success" : "text-destructive"
          )}>
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span className="ml-0.5">{Math.abs(trend).toFixed(1)}%</span>
          </div>
        </div>
      </div>
      <div className="h-[60px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trendData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
            <XAxis dataKey="date" hide />
            <YAxis domain={[60, 100]} hide />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                fontSize: '12px',
              }}
              formatter={(value: number) => [`${value}%`, 'SLA']}
              labelFormatter={(label) => `Data: ${label}`}
            />
            <ReferenceLine 
              y={threshold} 
              stroke="hsl(var(--destructive))" 
              strokeDasharray="3 3" 
              strokeOpacity={0.5}
            />
            <Line
              type="monotone"
              dataKey="compliance"
              stroke={isBelowThreshold ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export const SupplierAlertsPanel = () => {
  const { settings } = useSLASettings();
  const [activeTab, setActiveTab] = useState('status');
  const [supplierAlerts, setSupplierAlerts] = useState<SupplierAlert[]>(mockAlerts);
  const [supplierData] = useState<SupplierData[]>(mockSupplierData);

  const checkSupplierSLA = useCallback(() => {
    // Simulate checking SLA - silent operation
  }, []);

  const triggerTestSupplierAlert = useCallback(() => {
    const newAlert: SupplierAlert = {
      id: Date.now().toString(),
      supplierId: 'test',
      supplierName: 'Fornecedor Teste',
      type: 'warning',
      message: 'Alerta de teste gerado',
      slaCompliance: 75,
      createdAt: new Date(),
    };
    setSupplierAlerts(prev => [newAlert, ...prev]);
  }, []);

  const clearSupplierAlerts = useCallback(() => {
    setSupplierAlerts([]);
  }, []);

  if (!settings.enableSupplierAlerts) {
    return null;
  }

  const underperformingSuppliers = supplierData.filter(
    (s) => s.slaCompliance < settings.supplierSLAThreshold
  );

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
        {/* Current Status Summary */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold">{supplierData.length}</p>
            <p className="text-xs text-muted-foreground">Monitorados</p>
          </div>
          <div className="p-2 rounded-lg bg-success/10">
            <p className="text-2xl font-bold text-success">
              {supplierData.filter((s) => s.slaCompliance >= settings.supplierSLAThreshold).length}
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

        {/* Tabs for Alerts, Trends and Comparison */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="status" className="text-xs">
              Alertas ({supplierAlerts.length})
            </TabsTrigger>
            <TabsTrigger value="compare" className="text-xs">
              Comparativo
            </TabsTrigger>
            <TabsTrigger value="trends" className="text-xs">
              Tendências
            </TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="mt-3">
            <ScrollArea className="h-[200px] border border-border rounded-lg">
              {supplierAlerts.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhum alerta de fornecedor</p>
                  <p className="text-xs mt-1">
                    Alertas aparecem quando SLA cai abaixo de {settings.supplierSLAThreshold}%
                  </p>
                </div>
              ) : (
                supplierAlerts.slice(0, 10).map((alert) => (
                  <AlertItem key={alert.id} alert={alert} />
                ))
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="compare" className="mt-3">
            <div className="h-[200px] border border-border rounded-lg p-2">
              {supplierData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Aguardando dados de fornecedores</p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={supplierData
                      .map((s) => ({
                        name: s.name.split(' ')[0],
                        fullName: s.name,
                        sla: s.slaCompliance,
                        belowThreshold: s.slaCompliance < settings.supplierSLAThreshold,
                      }))
                      .sort((a, b) => b.sla - a.sla)}
                    margin={{ top: 10, right: 10, bottom: 20, left: 10 }}
                  >
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 10 }}
                      angle={-45}
                      textAnchor="end"
                      height={40}
                    />
                    <YAxis 
                      domain={[60, 100]} 
                      tick={{ fontSize: 10 }}
                      width={30}
                    />
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
                      label={{ 
                        value: `${settings.supplierSLAThreshold}%`, 
                        position: 'right',
                        fontSize: 10,
                        fill: 'hsl(var(--destructive))'
                      }}
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

          <TabsContent value="trends" className="mt-3">
            <ScrollArea className="h-[200px]">
              <div className="space-y-3 pr-3">
                {supplierData.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">
                    <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Aguardando dados de fornecedores</p>
                  </div>
                ) : (
                  supplierData.map((supplier) => (
                    <SupplierTrendChart
                      key={supplier.id}
                      supplierId={supplier.id}
                      supplierName={supplier.name}
                      currentSLA={supplier.slaCompliance}
                      threshold={settings.supplierSLAThreshold}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={checkSupplierSLA}
            className="flex-1 gap-1"
          >
            <RefreshCw className="h-3 w-3" />
            Verificar Agora
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={triggerTestSupplierAlert}
            className="gap-1"
          >
            <TestTube className="h-3 w-3" />
            Testar
          </Button>
          {supplierAlerts.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSupplierAlerts}
              className="gap-1"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
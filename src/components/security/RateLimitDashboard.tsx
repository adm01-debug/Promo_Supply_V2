import { useState, useEffect } from 'react';
import { Activity, TrendingUp, AlertTriangle, Ban, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useSecurityLogs } from '@/hooks/useSecurityLogs';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RealtimeAlert {
  id: string;
  ip_address: string;
  endpoint: string;
  request_count: number;
  blocked: boolean;
  created_at: string;
}

export const RateLimitDashboard = () => {
  const { rateLimitLogs, isLoading } = useSecurityLogs();
  const [realtimeAlerts, setRealtimeAlerts] = useState<RealtimeAlert[]>([]);

  // Subscribe to realtime rate limit alerts
  useEffect(() => {
    const channel = supabase
      .channel('rate-limit-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'rate_limit_logs',
        },
        (payload) => {
          if (payload.new.blocked) {
            setRealtimeAlerts(prev => [payload.new as RealtimeAlert, ...prev].slice(0, 10));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Process data for chart
  const chartData = rateLimitLogs?.reduce((acc, log) => {
    const hour = format(new Date(log.created_at), 'HH:00');
    const existing = acc.find(d => d.hour === hour);
    
    if (existing) {
      existing.requests += log.request_count;
      if (log.blocked) existing.blocked += 1;
    } else {
      acc.push({
        hour,
        requests: log.request_count,
        blocked: log.blocked ? 1 : 0,
      });
    }
    
    return acc;
  }, [] as { hour: string; requests: number; blocked: number }[]) || [];

  // Get unique IPs with most requests
  const topIPs = rateLimitLogs?.reduce((acc, log) => {
    const existing = acc.find(d => d.ip === log.ip_address);
    if (existing) {
      existing.requests += log.request_count;
      if (log.blocked) existing.blocked = true;
    } else {
      acc.push({
        ip: log.ip_address,
        requests: log.request_count,
        blocked: log.blocked,
        lastSeen: log.created_at,
      });
    }
    return acc;
  }, [] as { ip: string; requests: number; blocked: boolean; lastSeen: string }[])
    .sort((a, b) => b.requests - a.requests)
    .slice(0, 10) || [];

  const totalRequests = rateLimitLogs?.reduce((sum, l) => sum + l.request_count, 0) ?? 0;
  const blockedCount = rateLimitLogs?.filter(l => l.blocked).length ?? 0;
  const uniqueIPs = new Set(rateLimitLogs?.map(l => l.ip_address)).size;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Realtime Alerts */}
      {realtimeAlerts.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
              Alertas em Tempo Real
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {realtimeAlerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 rounded-lg bg-background border">
                  <div className="flex items-center gap-3">
                    <Ban className="w-4 h-4 text-destructive" />
                    <span className="font-mono text-sm">{alert.ip_address}</span>
                    <Badge variant="outline">{alert.endpoint}</Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(alert.created_at), 'HH:mm:ss')}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalRequests.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Requisições</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <Ban className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{blockedCount}</p>
                <p className="text-sm text-muted-foreground">Bloqueados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-info/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{uniqueIPs}</p>
                <p className="text-sm text-muted-foreground">IPs Únicos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {blockedCount > 0 ? ((blockedCount / (rateLimitLogs?.length || 1)) * 100).toFixed(1) : 0}%
                </p>
                <p className="text-sm text-muted-foreground">Taxa de Bloqueio</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Tráfego por Hora</CardTitle>
          <CardDescription>Requisições e bloqueios nas últimas horas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="hour" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="requests"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary) / 0.2)"
                  name="Requisições"
                />
                <Area
                  type="monotone"
                  dataKey="blocked"
                  stroke="hsl(var(--destructive))"
                  fill="hsl(var(--destructive) / 0.2)"
                  name="Bloqueados"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top IPs */}
      <Card>
        <CardHeader>
          <CardTitle>IPs com Mais Requisições</CardTitle>
          <CardDescription>Top 10 endereços por volume de tráfego</CardDescription>
        </CardHeader>
        <CardContent>
          {topIPs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Nenhum dado de rate limit disponível</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>IP</TableHead>
                  <TableHead>Requisições</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Última Atividade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topIPs.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono">{item.ip}</TableCell>
                    <TableCell className="font-bold">{item.requests.toLocaleString()}</TableCell>
                    <TableCell>
                      {item.blocked ? (
                        <Badge variant="destructive">Bloqueado</Badge>
                      ) : (
                        <Badge variant="outline">Normal</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(item.lastSeen), "dd/MM HH:mm", { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

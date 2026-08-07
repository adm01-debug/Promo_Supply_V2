import { useState } from 'react';
import { MapPin, Loader2, Shield, ShieldX, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth';
import { format } from "date-fns/format";
import { ptBR } from "date-fns/locale/pt-BR";

interface GeoAccessLog {
  id: string;
  ip_address: string;
  country_code: string | null;
  country_name: string | null;
  blocked: boolean;
  endpoint: string | null;
  user_agent: string | null;
  created_at: string;
}

export const GeoAccessLogsPanel = () => {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'all' | 'blocked' | 'allowed'>('all');

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ['geo-access-logs', filter],
    queryFn: async () => {
      let query = supabase
        .from('geo_access_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (filter === 'blocked') query = query.eq('blocked', true);
      if (filter === 'allowed') query = query.eq('blocked', false);

      const { data, error } = await query;
      if (error) throw error;
      return data as GeoAccessLog[];
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const blockedCount = logs.filter(l => l.blocked).length;
  const allowedCount = logs.filter(l => !l.blocked).length;
  const uniqueCountries = new Set(logs.map(l => l.country_code).filter(Boolean)).size;

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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Logs de Acesso Geográfico
          </CardTitle>
          <CardDescription>
            {logs.length} registros | {uniqueCountries} países | {blockedCount} bloqueados | {allowedCount} permitidos
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="blocked">Bloqueados</SelectItem>
              <SelectItem value="allowed">Permitidos</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>Nenhum log de acesso geográfico</p>
          </div>
        ) : (
          <div className="max-h-[500px] overflow-auto">
            <Table aria-label="Logs de acesso geográfico">
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>País</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {log.blocked ? (
                        <Badge variant="destructive" className="gap-1">
                          <ShieldX className="w-3 h-3" />
                          Bloqueado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 text-kpi-success border-kpi-success/30">
                          <Shield className="w-3 h-3" />
                          Permitido
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">{log.country_name || 'Desconhecido'}</span>
                        {log.country_code && (
                          <Badge variant="outline" className="text-[10px]">{log.country_code}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{log.ip_address}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                      {log.endpoint || '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

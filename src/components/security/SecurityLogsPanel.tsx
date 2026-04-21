import { useState } from 'react';
import { FileText, Search, Filter, AlertTriangle, Info, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSecurityLogs } from '@/hooks/useSecurityLogs';
import { format } from "date-fns/format";
import { ptBR } from "date-fns/locale/pt-BR";

const severityConfig = {
  info: { label: 'Info', icon: Info, color: 'bg-info/10 text-info border-info/20' },
  warn: { label: 'Aviso', icon: AlertTriangle, color: 'bg-warning/10 text-warning border-warning/20' },
  error: { label: 'Erro', icon: AlertCircle, color: 'bg-destructive/10 text-destructive border-destructive/20' },
  critical: { label: 'Crítico', icon: AlertCircle, color: 'bg-destructive text-destructive-foreground' },
};

const eventTypeLabels: Record<string, string> = {
  login_success: 'Login bem-sucedido',
  login_failed: 'Falha no login',
  logout: 'Logout',
  password_change: 'Alteração de senha',
  mfa_enabled: 'MFA ativado',
  mfa_disabled: 'MFA desativado',
  ip_blocked: 'IP bloqueado',
  ip_unblocked: 'IP desbloqueado',
  session_terminated: 'Sessão encerrada',
  permission_change: 'Alteração de permissão',
  role_change: 'Alteração de role',
  suspicious_activity: 'Atividade suspeita',
};

export const SecurityLogsPanel = () => {
  const { securityLogs, isLoading } = useSecurityLogs();
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [eventFilter, setEventFilter] = useState<string>('all');

  const filteredLogs = securityLogs?.filter(log => {
    const matchesSearch = search === '' ||
      log.event_type.toLowerCase().includes(search.toLowerCase()) ||
      log.event_description?.toLowerCase().includes(search.toLowerCase()) ||
      log.ip_address?.includes(search);

    const matchesSeverity = severityFilter === 'all' || log.severity === severityFilter;
    const matchesEvent = eventFilter === 'all' || log.event_type === eventFilter;

    return matchesSearch && matchesSeverity && matchesEvent;
  });

  const uniqueEventTypes = [...new Set(securityLogs?.map(l => l.event_type) || [])];

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
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Logs de Segurança
        </CardTitle>
        <CardDescription>
          Histórico de eventos de segurança do sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar eventos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[150px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Severidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warn">Aviso</SelectItem>
              <SelectItem value="error">Erro</SelectItem>
              <SelectItem value="critical">Crítico</SelectItem>
            </SelectContent>
          </Select>
          <Select value={eventFilter} onValueChange={setEventFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Tipo de evento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os eventos</SelectItem>
              {uniqueEventTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {eventTypeLabels[type] || type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Logs Table */}
        {!filteredLogs || filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>Nenhum log encontrado</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table aria-label="Tabela de dados">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Severidade</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Data/Hora</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.slice(0, 100).map((log) => {
                  const severity = severityConfig[log.severity as keyof typeof severityConfig] || severityConfig.info;
                  const SeverityIcon = severity.icon;

                  return (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge variant="outline" className={severity.color}>
                          <SeverityIcon className="w-3 h-3 mr-1" />
                          {severity.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {eventTypeLabels[log.event_type] || log.event_type}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[300px] truncate">
                        {log.event_description || '-'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {log.ip_address || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {filteredLogs && filteredLogs.length > 100 && (
          <p className="text-sm text-muted-foreground text-center mt-4">
            Mostrando 100 de {filteredLogs.length} logs
          </p>
        )}
      </CardContent>
    </Card>
  );
};

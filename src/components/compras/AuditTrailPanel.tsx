import { useState, useEffect } from 'react';
import { History, Search, Filter, RefreshCw, ChevronDown, ChevronRight, User, Calendar, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  fetchAuditLogs, 
  AuditLog, 
  AuditActionType, 
  AuditEntityType,
  actionTypeLabels,
  entityTypeLabels,
  actionTypeColors
} from '@/services/auditService';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface AuditLogItemProps {
  log: AuditLog;
  isExpanded: boolean;
  onToggle: () => void;
}

const AuditLogItem = ({ log, isExpanded, onToggle }: AuditLogItemProps) => {
  return (
    <div 
      className="p-3 border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors cursor-pointer"
      onClick={onToggle}
    >
      <div className="flex items-start gap-3">
        <div className="mt-1">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge 
              variant="outline" 
              className={cn("text-xs", actionTypeColors[log.action_type])}
            >
              {actionTypeLabels[log.action_type]}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {entityTypeLabels[log.entity_type]}
            </Badge>
            {log.entity_id && (
              <span className="text-xs text-muted-foreground font-mono">
                #{log.entity_id}
              </span>
            )}
          </div>
          
          <p className="text-sm font-medium truncate">
            {log.entity_description || 'Ação do sistema'}
          </p>
          
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {log.user_name || log.user_email || 'Sistema'}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ptBR })}
            </span>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3 ml-7 space-y-2 text-xs">
          <div className="p-2 rounded bg-muted/50 space-y-1">
            <p><strong>Data/Hora:</strong> {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}</p>
            <p><strong>Usuário:</strong> {log.user_name || 'N/A'} ({log.user_email || 'N/A'})</p>
            {log.user_agent && (
              <p className="truncate"><strong>Navegador:</strong> {log.user_agent.substring(0, 80)}...</p>
            )}
          </div>
          
          {log.old_values && Object.keys(log.old_values).length > 0 && (
            <div className="p-2 rounded bg-destructive/5 border border-destructive/20">
              <p className="font-medium mb-1 text-destructive">Valores Anteriores:</p>
              <pre className="text-xs overflow-auto max-h-20">
                {JSON.stringify(log.old_values, null, 2)}
              </pre>
            </div>
          )}
          
          {log.new_values && Object.keys(log.new_values).length > 0 && (
            <div className="p-2 rounded bg-success/5 border border-success/20">
              <p className="font-medium mb-1 text-success">Novos Valores:</p>
              <pre className="text-xs overflow-auto max-h-20">
                {JSON.stringify(log.new_values, null, 2)}
              </pre>
            </div>
          )}

          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <div className="p-2 rounded bg-primary/5 border border-primary/20">
              <p className="font-medium mb-1 text-primary">Metadados:</p>
              <pre className="text-xs overflow-auto max-h-20">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const AuditTrailPanel = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState<AuditEntityType | 'all'>('all');
  const [actionFilter, setActionFilter] = useState<AuditActionType | 'all'>('all');
  const [totalCount, setTotalCount] = useState(0);

  const loadLogs = async () => {
    setLoading(true);
    const { data, count } = await fetchAuditLogs({
      limit: 50,
      entity_type: entityFilter !== 'all' ? entityFilter : undefined,
      action_type: actionFilter !== 'all' ? actionFilter : undefined,
      search: search || undefined,
    });
    setLogs(data);
    setTotalCount(count);
    setLoading(false);
  };

  useEffect(() => {
    loadLogs();
  }, [entityFilter, actionFilter]);

  const handleSearch = () => {
    loadLogs();
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Trilha de Auditoria
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {totalCount} registros
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-8 h-9"
            />
          </div>
          
          <Select value={entityFilter} onValueChange={(v) => setEntityFilter(v as AuditEntityType | 'all')}>
            <SelectTrigger className="h-9 w-[130px]">
              <FileText className="h-3 w-3 mr-1" />
              <SelectValue placeholder="Entidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {Object.entries(entityTypeLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={actionFilter} onValueChange={(v) => setActionFilter(v as AuditActionType | 'all')}>
            <SelectTrigger className="h-9 w-[130px]">
              <Filter className="h-3 w-3 mr-1" />
              <SelectValue placeholder="Ação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {Object.entries(actionTypeLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={loadLogs} className="h-9">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Logs List */}
        <ScrollArea className="h-[400px] border border-border rounded-lg">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-48" />
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <History className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Nenhum registro encontrado</p>
              <p className="text-sm mt-1">
                As ações do sistema serão registradas aqui
              </p>
            </div>
          ) : (
            logs.map((log) => (
              <AuditLogItem
                key={log.id}
                log={log}
                isExpanded={expandedId === log.id}
                onToggle={() => setExpandedId(expandedId === log.id ? null : log.id)}
              />
            ))
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

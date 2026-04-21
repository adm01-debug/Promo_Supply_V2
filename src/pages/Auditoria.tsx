import { useState, useEffect } from 'react';
import { IllustratedEmptyState } from "@/components/ui/illustrated-empty-state";
import { History, Download, Filter, Search, RefreshCw, ChevronDown, ChevronRight, User, FileText, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { MainLayout } from '@/components/compras/MainLayout';
import { 
  fetchAuditLogs, 
  AuditLog, 
  AuditActionType, 
  AuditEntityType,
  actionTypeLabels,
  entityTypeLabels,
  actionTypeColors,
  auditHelpers
} from '@/services/auditService';
import { format } from "date-fns/format";
import { ptBR } from "date-fns/locale/pt-BR";
import { cn } from '@/lib/utils';
import { toast } from "@/lib/feedbackToast";

const Auditoria = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState<AuditEntityType | 'all'>('all');
  const [actionFilter, setActionFilter] = useState<AuditActionType | 'all'>('all');
  const [totalCount, setTotalCount] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const loadLogs = async () => {
    setLoading(true);
    const { data, count } = await fetchAuditLogs({
      limit: pageSize,
      offset: page * pageSize,
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
  }, [entityFilter, actionFilter, page]);

  // Log page view for demonstration
  useEffect(() => {
    auditHelpers.logView('relatorio', 'auditoria', 'Visualização da página de Auditoria');
  }, []);

  const handleSearch = () => {
    setPage(0);
    loadLogs();
  };

  const handleExport = () => {
    // Create CSV content
    const headers = ['Data/Hora', 'Usuário', 'Email', 'Ação', 'Entidade', 'ID', 'Descrição'];
    const rows = logs.map(log => [
      format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss"),
      log.user_name || 'Sistema',
      log.user_email || 'N/A',
      actionTypeLabels[log.action_type],
      entityTypeLabels[log.entity_type],
      log.entity_id || 'N/A',
      log.entity_description || 'N/A',
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `auditoria_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Log export action
    auditHelpers.logExport('relatorio', 'Exportação de logs de auditoria', { 
      total_records: logs.length,
      filters: { entityFilter, actionFilter, search }
    });

    toast.success('Relatório exportado com sucesso');
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  // Stats
  const actionStats = logs.reduce((acc, log) => {
    acc[log.action_type] = (acc[log.action_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <History className="h-6 w-6 text-primary" />
              Trilha de Auditoria
            </h1>
            <p className="text-sm text-muted-foreground">
              Histórico completo de ações realizadas no sistema
            </p>
          </div>
          <Button onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalCount}</p>
                  <p className="text-xs text-muted-foreground">Total de Registros</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <User className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{actionStats.create || 0}</p>
                  <p className="text-xs text-muted-foreground">Criações</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-info/10">
                  <RefreshCw className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{actionStats.update || 0}</p>
                  <p className="text-xs text-muted-foreground">Atualizações</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <Clock className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{actionStats.delete || 0}</p>
                  <p className="text-xs text-muted-foreground">Exclusões</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por descrição, usuário..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-9"
                />
              </div>
              
              <Select value={entityFilter} onValueChange={(v) => { setEntityFilter(v as AuditEntityType | 'all'); setPage(0); }}>
                <SelectTrigger className="w-[160px]">
                  <FileText className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Entidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Entidades</SelectItem>
                  {Object.entries(entityTypeLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v as AuditActionType | 'all'); setPage(0); }}>
                <SelectTrigger className="w-[160px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Ação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Ações</SelectItem>
                  {Object.entries(actionTypeLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={handleSearch}>
                <Search className="h-4 w-4 mr-2" />
                Buscar
              </Button>

              <Button variant="ghost" onClick={loadLogs}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table aria-label="Tabela de dados">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Entidade</TableHead>
                  <TableHead>Descrição</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    </TableRow>
                  ))
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-4">
                      <IllustratedEmptyState
                        type="analytics"
                        title="Nenhum registro de auditoria"
                        description={search ? "Tente ajustar os termos de busca ou remover filtros." : "Os registros de auditoria aparecerão aqui conforme as ações forem realizadas no sistema."}
                        size="sm"
                        action={search ? { label: "Limpar busca", onClick: () => { setSearch(''); setEntityFilter('all'); setActionFilter('all'); }, variant: "outline" } : undefined}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <>
                      <TableRow 
                        key={log.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                      >
                        <TableCell>
                          {expandedId === log.id ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {format(new Date(log.created_at), "dd/MM/yy HH:mm")}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm">{log.user_name || 'Sistema'}</span>
                            <span className="text-xs text-muted-foreground">{log.user_email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs", actionTypeColors[log.action_type])}
                          >
                            {actionTypeLabels[log.action_type]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {entityTypeLabels[log.entity_type]}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate">
                          {log.entity_description || '-'}
                        </TableCell>
                      </TableRow>
                      {expandedId === log.id && (
                        <TableRow>
                          <TableCell colSpan={6} className="bg-muted/30 p-4">
                            <div className="space-y-3 text-sm">
                              {log.entity_id && (
                                <p><strong>ID da Entidade:</strong> {log.entity_id}</p>
                              )}
                              {log.user_agent && (
                                <p className="text-xs text-muted-foreground truncate">
                                  <strong>Navegador:</strong> {log.user_agent}
                                </p>
                              )}
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {log.old_values && Object.keys(log.old_values).length > 0 && (
                                  <div className="p-3 rounded bg-destructive/5 border border-destructive/20">
                                    <p className="font-medium mb-2 text-destructive text-xs">Valores Anteriores:</p>
                                    <pre className="text-xs overflow-auto max-h-32 whitespace-pre-wrap">
                                      {JSON.stringify(log.old_values, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                
                                {log.new_values && Object.keys(log.new_values).length > 0 && (
                                  <div className="p-3 rounded bg-success/5 border border-success/20">
                                    <p className="font-medium mb-2 text-success text-xs">Novos Valores:</p>
                                    <pre className="text-xs overflow-auto max-h-32 whitespace-pre-wrap">
                                      {JSON.stringify(log.new_values, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>

                              {log.metadata && Object.keys(log.metadata).length > 0 && (
                                <div className="p-3 rounded bg-primary/5 border border-primary/20">
                                  <p className="font-medium mb-2 text-primary text-xs">Metadados:</p>
                                  <pre className="text-xs overflow-auto max-h-32 whitespace-pre-wrap">
                                    {JSON.stringify(log.metadata, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Mostrando {page * pageSize + 1} - {Math.min((page + 1) * pageSize, totalCount)} de {totalCount}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
              >
                Próximo
              </Button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Auditoria;

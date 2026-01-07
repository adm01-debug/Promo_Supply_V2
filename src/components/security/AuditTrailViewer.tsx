import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Download, Filter, Search, Calendar, User, 
  Activity, ChevronDown, ChevronRight, Clock, MapPin,
  Monitor, Eye, EyeOff
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface AuditEntry {
  id: string;
  action_type: string;
  entity_type: string;
  entity_id?: string;
  entity_description?: string;
  user_id?: string;
  user_email?: string;
  user_name?: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

interface AuditTrailViewerProps {
  entries: AuditEntry[];
  isLoading?: boolean;
  onExport?: (format: 'csv' | 'json') => void;
  onFilter?: (filters: AuditFilters) => void;
}

interface AuditFilters {
  search?: string;
  dateRange?: { from: Date; to: Date };
  actionTypes?: string[];
  entityTypes?: string[];
  userId?: string;
}

const actionTypeConfig: Record<string, { label: string; color: string }> = {
  create: { label: 'Criação', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  update: { label: 'Atualização', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  delete: { label: 'Exclusão', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  view: { label: 'Visualização', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400' },
  export: { label: 'Exportação', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  login: { label: 'Login', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
  logout: { label: 'Logout', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400' },
  approve: { label: 'Aprovação', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  reject: { label: 'Rejeição', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  cancel: { label: 'Cancelamento', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
};

const entityTypeLabels: Record<string, string> = {
  solicitacao: 'Solicitação',
  cotacao: 'Cotação',
  pedido: 'Pedido',
  pagamento: 'Pagamento',
  fornecedor: 'Fornecedor',
  usuario: 'Usuário',
  configuracao: 'Configuração',
  relatorio: 'Relatório',
};

export function AuditTrailViewer({ 
  entries, 
  isLoading, 
  onExport,
  onFilter 
}: AuditTrailViewerProps) {
  const [search, setSearch] = React.useState('');
  const [dateRange, setDateRange] = React.useState<{ from: Date; to: Date } | undefined>();
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const filteredEntries = entries.filter(entry => {
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        entry.entity_description?.toLowerCase().includes(searchLower) ||
        entry.user_email?.toLowerCase().includes(searchLower) ||
        entry.user_name?.toLowerCase().includes(searchLower) ||
        entry.action_type.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Trilha de Auditoria
            </CardTitle>
            <CardDescription>
              Histórico completo de ações no sistema
            </CardDescription>
          </div>
          {onExport && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onExport('csv')}>
                <Download className="w-4 h-4 mr-2" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => onExport('json')}>
                <Download className="w-4 h-4 mr-2" />
                JSON
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <DateRangePicker
            value={dateRange}
            onChange={(range) => setDateRange(range as { from: Date; to: Date } | undefined)}
            placeholder="Período"
          />
        </div>

        {/* Timeline */}
        <div className="space-y-4">
          <AnimatePresence>
            {filteredEntries.map((entry, index) => (
              <AuditEntryCard
                key={entry.id}
                entry={entry}
                isExpanded={expandedIds.has(entry.id)}
                onToggle={() => toggleExpand(entry.id)}
                index={index}
              />
            ))}
          </AnimatePresence>
        </div>

        {filteredEntries.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>Nenhum registro encontrado</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface AuditEntryCardProps {
  entry: AuditEntry;
  isExpanded: boolean;
  onToggle: () => void;
  index: number;
}

function AuditEntryCard({ entry, isExpanded, onToggle, index }: AuditEntryCardProps) {
  const actionConfig = actionTypeConfig[entry.action_type] || { 
    label: entry.action_type, 
    color: 'bg-gray-100 text-gray-800' 
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.02 }}
    >
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <div className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
          <CollapsibleTrigger asChild>
            <button className="w-full text-left">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={cn("text-xs", actionConfig.color)}>
                      {actionConfig.label}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {entityTypeLabels[entry.entity_type] || entry.entity_type}
                    </Badge>
                  </div>
                  
                  <p className="font-medium truncate">
                    {entry.entity_description || `${entityTypeLabels[entry.entity_type]} #${entry.entity_id?.slice(0, 8)}`}
                  </p>
                  
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {entry.user_name || entry.user_email || 'Sistema'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(entry.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <div className="mt-4 pt-4 border-t space-y-4">
              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                {entry.ip_address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="font-mono">{entry.ip_address}</span>
                  </div>
                )}
                {entry.user_agent && (
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-muted-foreground" />
                    <span className="truncate text-muted-foreground">
                      {entry.user_agent.slice(0, 50)}...
                    </span>
                  </div>
                )}
              </div>

              {/* Changes diff */}
              {(entry.old_values || entry.new_values) && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Alterações:</h4>
                  <DiffViewer 
                    oldValues={entry.old_values} 
                    newValues={entry.new_values} 
                  />
                </div>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </motion.div>
  );
}

interface DiffViewerProps {
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
}

function DiffViewer({ oldValues, newValues }: DiffViewerProps) {
  const allKeys = new Set([
    ...Object.keys(oldValues || {}),
    ...Object.keys(newValues || {}),
  ]);

  const [showSensitive, setShowSensitive] = React.useState(false);
  const sensitiveFields = ['password', 'secret', 'token', 'key'];

  const isSensitive = (key: string) => 
    sensitiveFields.some(s => key.toLowerCase().includes(s));

  const formatValue = (value: unknown, key: string): string => {
    if (isSensitive(key) && !showSensitive) return '••••••••';
    if (value === null || value === undefined) return '-';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSensitive(!showSensitive)}
          className="text-xs"
        >
          {showSensitive ? (
            <>
              <EyeOff className="w-3 h-3 mr-1" />
              Ocultar sensíveis
            </>
          ) : (
            <>
              <Eye className="w-3 h-3 mr-1" />
              Mostrar sensíveis
            </>
          )}
        </Button>
      </div>
      
      <div className="rounded-md border overflow-hidden text-sm">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Campo</th>
              <th className="px-3 py-2 text-left font-medium">Antes</th>
              <th className="px-3 py-2 text-left font-medium">Depois</th>
            </tr>
          </thead>
          <tbody>
            {Array.from(allKeys).map(key => {
              const oldVal = oldValues?.[key];
              const newVal = newValues?.[key];
              const changed = JSON.stringify(oldVal) !== JSON.stringify(newVal);

              return (
                <tr key={key} className={changed ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}>
                  <td className="px-3 py-2 font-medium">{key}</td>
                  <td className="px-3 py-2 text-red-600 dark:text-red-400 font-mono text-xs">
                    {formatValue(oldVal, key)}
                  </td>
                  <td className="px-3 py-2 text-green-600 dark:text-green-400 font-mono text-xs">
                    {formatValue(newVal, key)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

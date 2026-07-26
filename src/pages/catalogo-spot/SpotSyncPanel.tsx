import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RefreshCw, AlertTriangle, Database, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  evaluateFreshness,
  latestSuccessByEndpoint,
  useSpotSyncStatus,
  type CacheFreshness,
} from './useSpotCatalog';

const MONITORED: ReadonlyArray<{ endpoint: string; label: string; maxAgeMinutes: number; dailyLimit: number }> = [
  { endpoint: 'products', label: 'Catálogo', maxAgeMinutes: 36 * 60, dailyLimit: 22 },
  { endpoint: 'optionals', label: 'SKUs e preços', maxAgeMinutes: 36 * 60, dailyLimit: 22 },
  { endpoint: 'customizationOptions', label: 'Personalização', maxAgeMinutes: 8 * 24 * 60, dailyLimit: 22 },
  { endpoint: 'Stocks', label: 'Estoque', maxAgeMinutes: 45, dailyLimit: 96 },
];

const FRESHNESS_LABEL: Record<CacheFreshness, string> = {
  fresh: 'Atualizado',
  stale: 'Desatualizado',
  missing: 'Sem dados',
};

const FRESHNESS_VARIANT: Record<CacheFreshness, 'default' | 'secondary' | 'destructive'> = {
  fresh: 'default',
  stale: 'secondary',
  missing: 'destructive',
};

function formatAge(iso: string | undefined): string {
  if (!iso) return '—';
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `há ${hours} h`;
  return `há ${Math.round(hours / 24)} d`;
}

/**
 * Painel de frescor do cache SPOT + consumo da quota diária da API oficial.
 * Segue o mesmo padrão visual do XbzNetworkPanel.
 */
export const SpotSyncPanel = () => {
  const { data: rows = [], isLoading, refetch, isFetching } = useSpotSyncStatus();

  const summary = useMemo(() => {
    const latest = latestSuccessByEndpoint(rows);
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    return MONITORED.map((item) => {
      const last = latest[item.endpoint];
      const usedToday = rows.filter(
        (r) => r.endpoint === item.endpoint && new Date(r.called_at) >= startOfDay,
      ).length;
      return {
        ...item,
        lastSync: last?.called_at,
        records: last?.records_processed ?? 0,
        usedToday,
        freshness: evaluateFreshness(last?.called_at, item.maxAgeMinutes),
      };
    });
  }, [rows]);

  const hasProblem = summary.some((s) => s.freshness !== 'fresh');

  return (
    <Card data-testid="spot-sync-panel">
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="w-4 h-4" aria-hidden="true" />
            Cache da API oficial SPOT
          </CardTitle>
          <CardDescription>
            Dados vêm do cache local. A API tem limite diário: catálogo 22 req/dia, estoque 96 req/dia.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          disabled={isFetching}
          aria-label="Atualizar status de sincronização SPOT"
        >
          <RefreshCw className={cn('w-4 h-4', isFetching && 'animate-spin')} aria-hidden="true" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasProblem && !isLoading && (
          <Alert variant="destructive" data-testid="spot-sync-alert">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>Cache desatualizado</AlertTitle>
            <AlertDescription>
              Um ou mais conjuntos de dados estão fora da janela esperada de sincronização.
              Verifique os agendamentos antes de emitir pedidos.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {summary.map((item) => (
            <div
              key={item.endpoint}
              className="rounded-lg border border-border bg-card/50 p-4 space-y-2"
              data-testid={`spot-sync-${item.endpoint}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">{item.label}</span>
                <Badge variant={FRESHNESS_VARIANT[item.freshness]} className="text-xs">
                  {FRESHNESS_LABEL[item.freshness]}
                </Badge>
              </div>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" aria-hidden="true" />
                {formatAge(item.lastSync)}
              </p>
              <p className="text-xs text-muted-foreground">
                Quota hoje: {item.usedToday}/{item.dailyLimit}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

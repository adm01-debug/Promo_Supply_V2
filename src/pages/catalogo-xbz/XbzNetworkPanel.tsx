import { useCallback, useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Activity, RotateCcw, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getXbzNetworkStats, resetXbzNetworkStats, type XbzNetworkStats } from '@/hooks/useXbzIntegration';
import { evaluateXbzNetworkHealth, type XbzNetworkLevel } from './xbzNetworkHealth';
import {
  evaluateXbzNetworkTrend,
  pushTrendSample,
  type XbzTrendDirection,
  type XbzTrendSample,
} from './xbzNetworkTrend';


const REFRESH_MS = 5_000;

const LEVEL_BADGE: Record<XbzNetworkLevel, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  collecting: { label: 'Coletando', variant: 'secondary' },
  below: { label: 'Crítico', variant: 'destructive' },
  warning: { label: 'Atenção', variant: 'outline' },
  healthy: { label: 'Saudável', variant: 'default' },
};

const TREND_ICON: Record<XbzTrendDirection, typeof Minus> = {
  unknown: Minus,
  stable: Minus,
  degrading: TrendingDown,
  improving: TrendingUp,
};

export interface XbzNetworkPanelProps {
  /** Injeta contadores fixos (usado pelo harness de teste E2E). */
  statsOverride?: XbzNetworkStats;
}

/** Painel de eficiência da camada de rede XBZ (cache TTL + coalescing). */
export const XbzNetworkPanel = ({ statsOverride }: XbzNetworkPanelProps) => {
  const [stats, setStats] = useState<XbzNetworkStats>(() => statsOverride ?? getXbzNetworkStats());
  const trendWindow = useRef<XbzTrendSample[]>([]);

  useEffect(() => {
    if (statsOverride) {
      setStats(statsOverride);
      return;
    }
    const id = window.setInterval(() => setStats(getXbzNetworkStats()), REFRESH_MS);
    return () => window.clearInterval(id);
  }, [statsOverride]);

  const handleReset = useCallback(() => {
    resetXbzNetworkStats();
    trendWindow.current = [];
    setStats(getXbzNetworkStats());
  }, []);

  const health = evaluateXbzNetworkHealth(stats);
  const badge = LEVEL_BADGE[health.level];

  // Amostragem da tendência durante a renderização é segura: `pushTrendSample`
  // é idempotente para leituras com o mesmo total (polling sem novas chamadas).
  trendWindow.current = pushTrendSample(trendWindow.current, {
    ratio: health.ratio,
    total: health.total,
  });
  const trend = evaluateXbzNetworkTrend(trendWindow.current);
  const TrendIcon = TREND_ICON[trend.direction];


  return (
    <Card data-testid="xbz-network-panel" data-level={health.level}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-4 text-base">
            <Activity className="h-4 w-4" aria-hidden="true" />
            Eficiência de rede XBZ
          </CardTitle>
          <CardDescription>Chamadas evitadas por cache e coalescing nesta sessão.</CardDescription>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant={badge.variant} data-testid="xbz-network-badge">{badge.label}</Badge>
          <Button variant="ghost" size="sm" onClick={handleReset} aria-label="Zerar contadores de rede XBZ">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-4">
          <span
            data-testid="xbz-network-ratio"
            className={cn(
              'text-3xl font-semibold tabular-nums',
              health.level === 'below' && 'text-destructive',
              health.level === 'healthy' && 'text-primary',
            )}
          >
            {Math.round(health.ratio * 100)}%
          </span>
          <span className="text-sm text-muted-foreground">
            {health.saved} de {health.total} chamadas evitadas
          </span>
        </div>

        <Progress value={Math.round(health.ratio * 100)} aria-label="Razão de economia de chamadas XBZ" />

        <dl className="grid grid-cols-3 gap-4 text-sm">
          {[
            ['Rede', stats.network],
            ['Cache', stats.cacheHits],
            ['Coalescidas', stats.coalesced],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-lg border border-border p-4">
              <dt className="text-xs text-muted-foreground">{String(label)}</dt>
              <dd className="text-lg font-semibold tabular-nums">{Number(value)}</dd>
            </div>
          ))}
        </dl>

        {health.level === 'below' ? (
          <Alert variant="destructive" data-testid="xbz-network-alert">
            <AlertDescription>{health.message}</AlertDescription>
          </Alert>
        ) : (
          <p className="text-xs text-muted-foreground" data-testid="xbz-network-message">{health.message}</p>
        )}

        <p
          className={cn(
            'flex items-center gap-4 text-xs text-muted-foreground',
            trend.direction === 'degrading' && 'text-destructive',
          )}
          data-testid="xbz-network-trend"
          data-trend={trend.direction}
        >
          <TrendIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
          {trend.message}
        </p>

      </CardContent>
    </Card>
  );
};

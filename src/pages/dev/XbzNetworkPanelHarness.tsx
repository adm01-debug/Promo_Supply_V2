import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { XbzNetworkPanel } from '@/pages/catalogo-xbz/XbzNetworkPanel';
import type { XbzNetworkStats } from '@/hooks/useXbzIntegration';

/**
 * Harness dev-only para testes E2E do painel de eficiência de rede XBZ.
 *
 * Permite injetar contadores determinísticos via query string
 * (`?network=4&cache=4&coalesced=4`) sem depender de credenciais reais
 * do portal XBZ nem de estado acumulado de sessão.
 *
 * Esta rota só é registrada quando `import.meta.env.DEV` é verdadeiro.
 */
const toInt = (value: string | null): number => {
  const parsed = Number.parseInt(value ?? '0', 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const XbzNetworkPanelHarness = () => {
  const [params] = useSearchParams();

  const stats = useMemo<XbzNetworkStats>(
    () => ({
      network: toInt(params.get('network')),
      cacheHits: toInt(params.get('cache')),
      coalesced: toInt(params.get('coalesced')),
    }),
    [params],
  );

  return (
    <main className="mx-auto max-w-2xl p-4">
      <h1 className="sr-only">Harness do painel de rede XBZ</h1>
      <XbzNetworkPanel statsOverride={stats} />
    </main>
  );
};

export default XbzNetworkPanelHarness;

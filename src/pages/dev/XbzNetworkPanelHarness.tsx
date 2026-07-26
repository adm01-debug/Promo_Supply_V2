import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { XbzNetworkPanel } from '@/pages/catalogo-xbz/XbzNetworkPanel';
import type { XbzNetworkStats } from '@/hooks/useXbzIntegration';

/**
 * Harness dev-only para testes E2E do painel de eficiência de rede XBZ.
 *
 * Modos:
 *  - Estático: `?network=4&cache=4&coalesced=4` injeta contadores fixos.
 *  - Série temporal: `?seq=1:9:0,2:18:0,...&stepMs=40` reproduz amostras
 *    sucessivas (Onda 147), permitindo validar a detecção de tendência
 *    (`degrading` / `improving` / `stable`) de forma determinística.
 *
 * Esta rota só é registrada quando `import.meta.env.DEV` é verdadeiro.
 */
const toInt = (value: string | null, fallback = 0): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

/** Converte "net:cache:coalesced,net:cache:coalesced" em amostras. */
const parseSequence = (raw: string | null): XbzNetworkStats[] => {
  if (!raw) return [];
  const samples: XbzNetworkStats[] = [];
  for (const chunk of raw.split(',')) {
    const parts = chunk.split(':');
    if (parts.length !== 3) continue;
    samples.push({
      network: toInt(parts[0]),
      cacheHits: toInt(parts[1]),
      coalesced: toInt(parts[2]),
    });
  }
  return samples;
};

const XbzNetworkPanelHarness = () => {
  const [params] = useSearchParams();

  const staticStats = useMemo<XbzNetworkStats>(
    () => ({
      network: toInt(params.get('network')),
      cacheHits: toInt(params.get('cache')),
      coalesced: toInt(params.get('coalesced')),
    }),
    [params],
  );

  const sequence = useMemo(() => parseSequence(params.get('seq')), [params]);
  const stepMs = Math.max(10, toInt(params.get('stepMs'), 40));
  const [index, setIndex] = useState(0);

  // Reinicia a reprodução sempre que a série (ou o intervalo) muda.
  useEffect(() => {
    setIndex(0);
  }, [sequence, stepMs]);

  useEffect(() => {
    if (sequence.length === 0) return;
    if (index >= sequence.length - 1) return;
    const id = window.setTimeout(() => setIndex((i) => i + 1), stepMs);
    return () => window.clearTimeout(id);
  }, [sequence, index, stepMs]);

  const stats = sequence.length > 0 ? sequence[Math.min(index, sequence.length - 1)] : staticStats;
  const done = sequence.length === 0 || index >= sequence.length - 1;

  return (
    <main className="mx-auto max-w-2xl p-4">
      <h1 className="sr-only">Harness do painel de rede XBZ</h1>
      <div data-testid="xbz-harness-progress" data-done={done ? 'true' : 'false'} className="sr-only">
        {sequence.length > 0 ? `${index + 1}/${sequence.length}` : 'static'}
      </div>
      <XbzNetworkPanel statsOverride={stats} />
    </main>
  );
};

export default XbzNetworkPanelHarness;

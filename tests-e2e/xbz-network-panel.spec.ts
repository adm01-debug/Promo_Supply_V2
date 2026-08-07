import { test, expect, type Page } from '@playwright/test';

/**
 * E2E — Painel de eficiência de rede XBZ (Ondas 144/145).
 *
 * Usa o harness dev-only `/__dev/xbz-network-panel`, que injeta contadores
 * determinísticos por query string. Isso evita depender de credenciais reais
 * do portal XBZ, de sessão autenticada ou de estado acumulado entre testes.
 *
 * Cenários cobertos:
 *  - amostra insuficiente  -> "Coletando"
 *  - economia < 30%        -> "Crítico" + alerta automático visível
 *  - 30% <= economia < 50% -> "Atenção" (sem alerta)
 *  - economia >= 50%       -> "Saudável" (sem alerta)
 */

interface Counters {
  network: number;
  cache: number;
  coalesced: number;
}

const openPanel = async (page: Page, { network, cache, coalesced }: Counters) => {
  await page.goto(
    `/__dev/xbz-network-panel?network=${network}&cache=${cache}&coalesced=${coalesced}`,
  );
  const panel = page.getByTestId('xbz-network-panel');
  await expect(panel).toBeVisible();
  return panel;
};

test.describe('Painel de rede XBZ', () => {
  test('amostra insuficiente mantém estado neutro de coleta', async ({ page }) => {
    const panel = await openPanel(page, { network: 1, cache: 0, coalesced: 0 });

    await expect(panel).toHaveAttribute('data-level', 'collecting');
    await expect(page.getByTestId('xbz-network-badge')).toHaveText('Coletando');
    await expect(page.getByTestId('xbz-network-alert')).toHaveCount(0);
    await expect(page.getByTestId('xbz-network-message')).toContainText('Coletando amostras');
  });

  test('economia abaixo do mínimo dispara o alerta automático', async ({ page }) => {
    // 1 economia / 20 chamadas = 5% (< 30%)
    const panel = await openPanel(page, { network: 19, cache: 1, coalesced: 0 });

    await expect(panel).toHaveAttribute('data-level', 'below');
    await expect(page.getByTestId('xbz-network-badge')).toHaveText('Crítico');
    await expect(page.getByTestId('xbz-network-ratio')).toHaveText('5%');

    const alert = page.getByTestId('xbz-network-alert');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('abaixo do mínimo');
    await expect(alert).toContainText('rate limit');
  });

  test('economia entre o mínimo e a meta exibe atenção sem alerta', async ({ page }) => {
    // 4 economia / 10 chamadas = 40% (>= 30% e < 50%)
    const panel = await openPanel(page, { network: 6, cache: 4, coalesced: 0 });

    await expect(panel).toHaveAttribute('data-level', 'warning');
    await expect(page.getByTestId('xbz-network-badge')).toHaveText('Atenção');
    await expect(page.getByTestId('xbz-network-ratio')).toHaveText('40%');
    await expect(page.getByTestId('xbz-network-alert')).toHaveCount(0);
    await expect(page.getByTestId('xbz-network-message')).toContainText('abaixo da meta');
  });

  test('economia na meta exibe estado saudável e contadores corretos', async ({ page }) => {
    // 8 economia / 12 chamadas = 67% (>= 50%)
    const panel = await openPanel(page, { network: 4, cache: 4, coalesced: 4 });

    await expect(panel).toHaveAttribute('data-level', 'healthy');
    await expect(page.getByTestId('xbz-network-badge')).toHaveText('Saudável');
    await expect(page.getByTestId('xbz-network-ratio')).toHaveText('67%');
    await expect(page.getByTestId('xbz-network-alert')).toHaveCount(0);

    await expect(panel).toContainText('8 de 12 chamadas evitadas');
    await expect(panel.getByText('Rede', { exact: true })).toBeVisible();
    await expect(panel.getByText('Coalescidas', { exact: true })).toBeVisible();
  });

  test('transição de saudável para crítico troca badge e revela o alerta', async ({ page }) => {
    await openPanel(page, { network: 4, cache: 4, coalesced: 4 });
    await expect(page.getByTestId('xbz-network-badge')).toHaveText('Saudável');

    const panel = await openPanel(page, { network: 19, cache: 1, coalesced: 0 });
    await expect(panel).toHaveAttribute('data-level', 'below');
    await expect(page.getByTestId('xbz-network-alert')).toBeVisible();
  });

  test('painel é acessível por teclado e expõe rótulos', async ({ page }) => {
    await openPanel(page, { network: 4, cache: 4, coalesced: 4 });

    await expect(
      page.getByRole('button', { name: 'Zerar contadores de rede XBZ' }),
    ).toBeVisible();
    await expect(page.getByLabel('Razão de economia de chamadas XBZ')).toBeVisible();
  });
});

/**
 * Onda 147 — cobertura E2E da detecção de tendência.
 *
 * A série é reproduzida pelo harness via `?seq=` (amostras sucessivas com
 * total monotônico), exercitando a janela deslizante de `xbzNetworkTrend`.
 */
const playSequence = async (page: Page, seq: string) => {
  await page.goto(`/__dev/xbz-network-panel?seq=${seq}&stepMs=30`);
  await expect(page.getByTestId('xbz-harness-progress')).toHaveAttribute('data-done', 'true');
  return page.getByTestId('xbz-network-trend');
};

test.describe('Tendência de eficiência XBZ', () => {
  test('série decrescente sinaliza degradação antecipada', async ({ page }) => {
    const trend = await playSequence(
      page,
      '1:9:0,2:18:0,3:27:0,20:20:0,30:20:0,40:20:0',
    );
    await expect(trend).toHaveAttribute('data-trend', 'degrading');
    await expect(trend).toContainText('caindo');
  });

  test('série crescente sinaliza melhora', async ({ page }) => {
    const trend = await playSequence(
      page,
      '8:2:0,16:4:0,24:6:0,20:20:0,20:30:0,20:40:0',
    );
    await expect(trend).toHaveAttribute('data-trend', 'improving');
  });

  test('série plana permanece estável', async ({ page }) => {
    const trend = await playSequence(
      page,
      '5:5:0,10:10:0,15:15:0,20:20:0,25:25:0,30:30:0',
    );
    await expect(trend).toHaveAttribute('data-trend', 'stable');
  });

  test('amostras insuficientes mantêm tendência indisponível', async ({ page }) => {
    const trend = await playSequence(page, '5:5:0,10:10:0');
    await expect(trend).toHaveAttribute('data-trend', 'unknown');
    await expect(trend).toContainText('Tendência indisponível');
  });
});

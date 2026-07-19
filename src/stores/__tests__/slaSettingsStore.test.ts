import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSLASettings } from '../slaSettingsStore';

vi.mock('zustand/middleware', async (importOriginal) => {
  const actual = await importOriginal<typeof import('zustand/middleware')>();
  return {
    ...actual,
    persist: (fn: (...args: unknown[]) => unknown) => fn,
  };
});

const getStore = () => useSLASettings.getState();

const DEFAULT = {
  warningThresholdDays: 3,
  criticalThresholdDays: 1,
  checkIntervalMinutes: 1,
  enableBrowserNotifications: true,
  enableEmailNotifications: true,
  emailRecipients: ['compras@promobrindes.com.br'],
  supplierSLAThreshold: 85,
  enableSupplierAlerts: true,
  supplierAlertConfigs: [],
};

beforeEach(() => {
  getStore().resetToDefaults();
  vi.clearAllMocks();
});

describe('initial state', () => {
  it('has default warningThresholdDays of 3', () => {
    expect(getStore().settings.warningThresholdDays).toBe(3);
  });

  it('has default criticalThresholdDays of 1', () => {
    expect(getStore().settings.criticalThresholdDays).toBe(1);
  });

  it('has default checkIntervalMinutes of 1', () => {
    expect(getStore().settings.checkIntervalMinutes).toBe(1);
  });

  it('has default supplierSLAThreshold of 85', () => {
    expect(getStore().settings.supplierSLAThreshold).toBe(85);
  });

  it('has default email recipient', () => {
    expect(getStore().settings.emailRecipients).toContain('compras@promobrindes.com.br');
  });

  it('starts with empty supplierAlertConfigs', () => {
    expect(getStore().settings.supplierAlertConfigs).toEqual([]);
  });
});

describe('updateSettings', () => {
  it('updates a simple field', () => {
    getStore().updateSettings({ enableBrowserNotifications: false });
    expect(getStore().settings.enableBrowserNotifications).toBe(false);
  });

  it('does not affect unrelated fields', () => {
    getStore().updateSettings({ warningThresholdDays: 5 });
    expect(getStore().settings.criticalThresholdDays).toBe(DEFAULT.criticalThresholdDays);
  });

  it('clamps warningThresholdDays to 0 when negative (then raised to match critical)', () => {
    // warningThresholdDays clamped to 0, but warning must be >= critical(1), so ends at 1
    getStore().updateSettings({ warningThresholdDays: -1 });
    expect(getStore().settings.warningThresholdDays).toBeGreaterThanOrEqual(0);
    expect(getStore().settings.warningThresholdDays).toBeGreaterThanOrEqual(
      getStore().settings.criticalThresholdDays
    );
  });

  it('clamps criticalThresholdDays to 0 when negative', () => {
    getStore().updateSettings({ criticalThresholdDays: -5 });
    expect(getStore().settings.criticalThresholdDays).toBe(0);
  });

  it('clamps checkIntervalMinutes to 1 when below 1', () => {
    getStore().updateSettings({ checkIntervalMinutes: 0 });
    expect(getStore().settings.checkIntervalMinutes).toBe(1);
  });

  it('clamps checkIntervalMinutes to 1 when negative', () => {
    getStore().updateSettings({ checkIntervalMinutes: -99 });
    expect(getStore().settings.checkIntervalMinutes).toBe(1);
  });

  it('clamps supplierSLAThreshold to 0 when negative', () => {
    getStore().updateSettings({ supplierSLAThreshold: -10 });
    expect(getStore().settings.supplierSLAThreshold).toBe(0);
  });

  it('clamps supplierSLAThreshold to 100 when above 100', () => {
    getStore().updateSettings({ supplierSLAThreshold: 150 });
    expect(getStore().settings.supplierSLAThreshold).toBe(100);
  });

  it('enforces warning >= critical: raises warning to match critical', () => {
    // Set warning < critical
    getStore().updateSettings({ warningThresholdDays: 1, criticalThresholdDays: 3 });
    const { warningThresholdDays, criticalThresholdDays } = getStore().settings;
    expect(warningThresholdDays).toBeGreaterThanOrEqual(criticalThresholdDays);
  });

  it('allows warning to be exactly equal to critical', () => {
    getStore().updateSettings({ warningThresholdDays: 2, criticalThresholdDays: 2 });
    expect(getStore().settings.warningThresholdDays).toBe(2);
  });

  it('allows warning to be greater than critical', () => {
    getStore().updateSettings({ warningThresholdDays: 5, criticalThresholdDays: 2 });
    expect(getStore().settings.warningThresholdDays).toBe(5);
  });

  it('updates emailRecipients', () => {
    getStore().updateSettings({ emailRecipients: ['a@b.com', 'c@d.com'] });
    expect(getStore().settings.emailRecipients).toEqual(['a@b.com', 'c@d.com']);
  });

  it('accepts supplierSLAThreshold at exactly 0', () => {
    getStore().updateSettings({ supplierSLAThreshold: 0 });
    expect(getStore().settings.supplierSLAThreshold).toBe(0);
  });

  it('accepts supplierSLAThreshold at exactly 100', () => {
    getStore().updateSettings({ supplierSLAThreshold: 100 });
    expect(getStore().settings.supplierSLAThreshold).toBe(100);
  });
});

describe('updateSupplierConfig', () => {
  it('adds a new supplier config when not present', () => {
    getStore().updateSupplierConfig('sup-1', { supplierName: 'Acme', enabled: true });
    expect(getStore().settings.supplierAlertConfigs).toHaveLength(1);
    expect(getStore().settings.supplierAlertConfigs[0].supplierId).toBe('sup-1');
  });

  it('uses supplierId as fallback supplierName when name not provided', () => {
    getStore().updateSupplierConfig('sup-2', { enabled: true });
    expect(getStore().settings.supplierAlertConfigs[0].supplierName).toBe('sup-2');
  });

  it('defaults enabled to true when not provided', () => {
    getStore().updateSupplierConfig('sup-3', {});
    expect(getStore().settings.supplierAlertConfigs[0].enabled).toBe(true);
  });

  it('updates an existing supplier config', () => {
    getStore().updateSupplierConfig('sup-1', { supplierName: 'Acme', enabled: true });
    getStore().updateSupplierConfig('sup-1', { enabled: false });
    const configs = getStore().settings.supplierAlertConfigs;
    expect(configs).toHaveLength(1);
    expect(configs[0].enabled).toBe(false);
  });

  it('preserves other supplier configs when updating one', () => {
    getStore().updateSupplierConfig('sup-1', { supplierName: 'Acme' });
    getStore().updateSupplierConfig('sup-2', { supplierName: 'Beta' });
    getStore().updateSupplierConfig('sup-1', { enabled: false });
    const configs = getStore().settings.supplierAlertConfigs;
    expect(configs).toHaveLength(2);
    expect(configs.find(c => c.supplierId === 'sup-2')?.supplierName).toBe('Beta');
  });

  it('stores customThreshold when provided', () => {
    getStore().updateSupplierConfig('sup-1', { customThreshold: 90 });
    expect(getStore().settings.supplierAlertConfigs[0].customThreshold).toBe(90);
  });
});

describe('resetToDefaults', () => {
  it('restores all settings to defaults after changes', () => {
    getStore().updateSettings({ warningThresholdDays: 10, supplierSLAThreshold: 50 });
    getStore().updateSupplierConfig('sup-1', { supplierName: 'Acme' });
    getStore().resetToDefaults();
    const { settings } = getStore();
    expect(settings.warningThresholdDays).toBe(DEFAULT.warningThresholdDays);
    expect(settings.supplierSLAThreshold).toBe(DEFAULT.supplierSLAThreshold);
    expect(settings.supplierAlertConfigs).toEqual([]);
  });

  it('can be called multiple times safely', () => {
    getStore().resetToDefaults();
    getStore().resetToDefaults();
    expect(getStore().settings.warningThresholdDays).toBe(DEFAULT.warningThresholdDays);
  });
});

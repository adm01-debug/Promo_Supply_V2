import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SupplierAlertConfig {
  supplierId: string;
  supplierName: string;
  enabled: boolean;
  customThreshold?: number; // Override global threshold
}

export interface SLASettings {
  warningThresholdDays: number;
  criticalThresholdDays: number;
  checkIntervalMinutes: number;
  enableBrowserNotifications: boolean;
  enableEmailNotifications: boolean;
  emailRecipients: string[];
  // Supplier-specific settings
  supplierSLAThreshold: number; // Minimum acceptable SLA %
  enableSupplierAlerts: boolean;
  supplierAlertConfigs: SupplierAlertConfig[];
}

interface SLASettingsStore {
  settings: SLASettings;
  updateSettings: (settings: Partial<SLASettings>) => void;
  updateSupplierConfig: (supplierId: string, config: Partial<SupplierAlertConfig>) => void;
  resetToDefaults: () => void;
}

const DEFAULT_SETTINGS: SLASettings = {
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

export const useSLASettings = create<SLASettingsStore>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
      updateSupplierConfig: (supplierId, config) =>
        set((state) => {
          const existingIndex = state.settings.supplierAlertConfigs.findIndex(
            (c) => c.supplierId === supplierId
          );
          const newConfigs = [...state.settings.supplierAlertConfigs];
          
          if (existingIndex >= 0) {
            newConfigs[existingIndex] = { ...newConfigs[existingIndex], ...config };
          } else {
            newConfigs.push({
              supplierId,
              supplierName: config.supplierName || supplierId,
              enabled: config.enabled ?? true,
              customThreshold: config.customThreshold,
            });
          }
          
          return {
            settings: { ...state.settings, supplierAlertConfigs: newConfigs },
          };
        }),
      resetToDefaults: () => set({ settings: DEFAULT_SETTINGS }),
    }),
    {
      name: 'sla-settings',
    }
  )
);

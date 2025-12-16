import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SLASettings {
  warningThresholdDays: number;
  criticalThresholdDays: number;
  checkIntervalMinutes: number;
  enableBrowserNotifications: boolean;
  enableEmailNotifications: boolean;
  emailRecipients: string[];
}

interface SLASettingsStore {
  settings: SLASettings;
  updateSettings: (settings: Partial<SLASettings>) => void;
  resetToDefaults: () => void;
}

const DEFAULT_SETTINGS: SLASettings = {
  warningThresholdDays: 3,
  criticalThresholdDays: 1,
  checkIntervalMinutes: 1,
  enableBrowserNotifications: true,
  enableEmailNotifications: true,
  emailRecipients: ['compras@promobrindes.com.br'],
};

export const useSLASettings = create<SLASettingsStore>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
      resetToDefaults: () => set({ settings: DEFAULT_SETTINGS }),
    }),
    {
      name: 'sla-settings',
    }
  )
);

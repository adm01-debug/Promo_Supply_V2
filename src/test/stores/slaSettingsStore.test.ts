import { describe, it, expect, beforeEach } from "vitest";
import { useSLASettings } from "@/stores/slaSettingsStore";

describe("SLASettingsStore — SLA Configuration", () => {
  beforeEach(() => {
    useSLASettings.getState().resetToDefaults();
  });

  describe("Default settings", () => {
    it("should have correct default warning threshold", () => {
      expect(useSLASettings.getState().settings.warningThresholdDays).toBe(3);
    });

    it("should have correct default critical threshold", () => {
      expect(useSLASettings.getState().settings.criticalThresholdDays).toBe(1);
    });

    it("should have browser notifications enabled", () => {
      expect(useSLASettings.getState().settings.enableBrowserNotifications).toBe(true);
    });

    it("should have default supplier SLA threshold at 85%", () => {
      expect(useSLASettings.getState().settings.supplierSLAThreshold).toBe(85);
    });

    it("should have empty supplier alert configs", () => {
      expect(useSLASettings.getState().settings.supplierAlertConfigs).toHaveLength(0);
    });
  });

  describe("updateSettings", () => {
    it("should update warning threshold", () => {
      useSLASettings.getState().updateSettings({ warningThresholdDays: 5 });
      expect(useSLASettings.getState().settings.warningThresholdDays).toBe(5);
    });

    it("should update multiple settings at once", () => {
      useSLASettings.getState().updateSettings({
        warningThresholdDays: 7,
        criticalThresholdDays: 2,
        enableBrowserNotifications: false,
      });
      const settings = useSLASettings.getState().settings;
      expect(settings.warningThresholdDays).toBe(7);
      expect(settings.criticalThresholdDays).toBe(2);
      expect(settings.enableBrowserNotifications).toBe(false);
    });

    it("should preserve unmodified settings", () => {
      useSLASettings.getState().updateSettings({ warningThresholdDays: 10 });
      expect(useSLASettings.getState().settings.criticalThresholdDays).toBe(1);
      expect(useSLASettings.getState().settings.supplierSLAThreshold).toBe(85);
    });
  });

  describe("updateSupplierConfig", () => {
    it("should add new supplier config", () => {
      useSLASettings.getState().updateSupplierConfig("supplier-1", {
        supplierName: "Test Supplier",
        enabled: true,
        customThreshold: 90,
      });
      const configs = useSLASettings.getState().settings.supplierAlertConfigs;
      expect(configs).toHaveLength(1);
      expect(configs[0].supplierName).toBe("Test Supplier");
    });

    it("should update existing supplier config", () => {
      useSLASettings.getState().updateSupplierConfig("supplier-1", {
        supplierName: "Test",
        enabled: true,
      });
      useSLASettings.getState().updateSupplierConfig("supplier-1", {
        customThreshold: 95,
      });
      const configs = useSLASettings.getState().settings.supplierAlertConfigs;
      expect(configs).toHaveLength(1);
      expect(configs[0].customThreshold).toBe(95);
    });

    it("should handle multiple suppliers", () => {
      useSLASettings.getState().updateSupplierConfig("s1", { supplierName: "S1", enabled: true });
      useSLASettings.getState().updateSupplierConfig("s2", { supplierName: "S2", enabled: false });
      expect(useSLASettings.getState().settings.supplierAlertConfigs).toHaveLength(2);
    });
  });

  describe("resetToDefaults", () => {
    it("should reset all settings to defaults", () => {
      useSLASettings.getState().updateSettings({
        warningThresholdDays: 99,
        criticalThresholdDays: 99,
        supplierSLAThreshold: 50,
      });
      useSLASettings.getState().resetToDefaults();
      
      const settings = useSLASettings.getState().settings;
      expect(settings.warningThresholdDays).toBe(3);
      expect(settings.criticalThresholdDays).toBe(1);
      expect(settings.supplierSLAThreshold).toBe(85);
    });
  });

  describe("Edge cases", () => {
    it("should handle zero thresholds", () => {
      useSLASettings.getState().updateSettings({ warningThresholdDays: 0, criticalThresholdDays: 0 });
      expect(useSLASettings.getState().settings.warningThresholdDays).toBe(0);
    });

    it("should handle negative thresholds (no validation)", () => {
      useSLASettings.getState().updateSettings({ warningThresholdDays: -1 });
      expect(useSLASettings.getState().settings.warningThresholdDays).toBe(-1);
    });

    it("should handle empty email recipients array", () => {
      useSLASettings.getState().updateSettings({ emailRecipients: [] });
      expect(useSLASettings.getState().settings.emailRecipients).toHaveLength(0);
    });
  });
});

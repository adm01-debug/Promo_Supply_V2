import { describe, it, expect, beforeEach } from "vitest";
import { useKPITargetsStore, checkKPIStatus, KPITarget } from "@/stores/kpiTargetsStore";

describe("KPITargetsStore — KPI Targets & Alerts", () => {
  beforeEach(() => {
    useKPITargetsStore.getState().clearAlerts();
  });

  describe("Default targets", () => {
    it("should have 8 default KPI targets", () => {
      expect(useKPITargetsStore.getState().targets).toHaveLength(8);
    });

    it("should have all targets enabled by default", () => {
      const targets = useKPITargetsStore.getState().targets;
      expect(targets.every(t => t.enabled)).toBe(true);
    });

    it("should include core KPIs", () => {
      const ids = useKPITargetsStore.getState().targets.map(t => t.id);
      expect(ids).toContain("procurement_roi");
      expect(ids).toContain("maverick_spend");
      expect(ids).toContain("contract_compliance");
      expect(ids).toContain("po_cycle_time");
    });
  });

  describe("updateTarget", () => {
    it("should update target value", () => {
      useKPITargetsStore.getState().updateTarget("procurement_roi", { target: 8.0 });
      const target = useKPITargetsStore.getState().targets.find(t => t.id === "procurement_roi");
      expect(target?.target).toBe(8.0);
    });

    it("should toggle enabled state", () => {
      useKPITargetsStore.getState().updateTarget("procurement_roi", { enabled: false });
      const target = useKPITargetsStore.getState().targets.find(t => t.id === "procurement_roi");
      expect(target?.enabled).toBe(false);
    });

    it("should not affect other targets", () => {
      useKPITargetsStore.getState().updateTarget("procurement_roi", { target: 999 });
      const maverick = useKPITargetsStore.getState().targets.find(t => t.id === "maverick_spend");
      expect(maverick?.target).toBe(10);
    });
  });

  describe("Alerts", () => {
    it("should add alerts and limit to 50", () => {
      const store = useKPITargetsStore.getState();
      for (let i = 0; i < 55; i++) {
        store.addAlert({ kpiId: `kpi-${i}`, kpiName: `KPI ${i}`, type: "warning", message: "test", currentValue: 0, targetValue: 100 });
      }
      expect(useKPITargetsStore.getState().alerts.length).toBeLessThanOrEqual(50);
    });

    it("should mark alert as read", () => {
      const store = useKPITargetsStore.getState();
      store.addAlert({ kpiId: "test", kpiName: "Test", type: "critical", message: "Low", currentValue: 50, targetValue: 100 });
      const alertId = useKPITargetsStore.getState().alerts[0].id;
      
      store.markAlertAsRead(alertId);
      expect(useKPITargetsStore.getState().alerts[0].read).toBe(true);
    });

    it("should mark all alerts as read", () => {
      const store = useKPITargetsStore.getState();
      store.addAlert({ kpiId: "a", kpiName: "A", type: "warning", message: "W", currentValue: 0, targetValue: 0 });
      store.addAlert({ kpiId: "b", kpiName: "B", type: "critical", message: "C", currentValue: 0, targetValue: 0 });
      
      store.markAllAlertsAsRead();
      expect(useKPITargetsStore.getState().alerts.every(a => a.read)).toBe(true);
    });

    it("should count unread alerts", () => {
      const store = useKPITargetsStore.getState();
      store.addAlert({ kpiId: "a", kpiName: "A", type: "warning", message: "W", currentValue: 0, targetValue: 0 });
      store.addAlert({ kpiId: "b", kpiName: "B", type: "warning", message: "W", currentValue: 0, targetValue: 0 });
      
      expect(store.getUnreadCount()).toBe(2);
      store.markAlertAsRead(useKPITargetsStore.getState().alerts[0].id);
      expect(useKPITargetsStore.getState().getUnreadCount()).toBe(1);
    });

    it("should clear all alerts", () => {
      const store = useKPITargetsStore.getState();
      store.addAlert({ kpiId: "a", kpiName: "A", type: "warning", message: "W", currentValue: 0, targetValue: 0 });
      store.clearAlerts();
      expect(useKPITargetsStore.getState().alerts).toHaveLength(0);
    });
  });
});

describe("checkKPIStatus — KPI threshold evaluation", () => {
  const baseTarget: KPITarget = {
    id: "test",
    name: "Test KPI",
    target: 100,
    warningThreshold: 20,
    criticalThreshold: 40,
    unit: "%",
    enabled: true,
  };

  describe("Normal KPIs (higher is better)", () => {
    it("should return success when at target", () => {
      expect(checkKPIStatus("test", 100, baseTarget).status).toBe("success");
    });

    it("should return success when above target", () => {
      expect(checkKPIStatus("test", 120, baseTarget).status).toBe("success");
    });

    it("should return warning when slightly below target", () => {
      const result = checkKPIStatus("test", 75, baseTarget);
      expect(result.status).toBe("warning");
    });

    it("should return critical when far below target", () => {
      const result = checkKPIStatus("test", 50, baseTarget);
      expect(result.status).toBe("critical");
    });

    it("should return critical when at zero", () => {
      const result = checkKPIStatus("test", 0, baseTarget);
      expect(result.status).toBe("critical");
    });

    it("should calculate correct percentage", () => {
      const result = checkKPIStatus("test", 80, baseTarget);
      expect(result.percentage).toBe(80);
    });
  });

  describe("Inverse KPIs (lower is better)", () => {
    const inverseTarget: KPITarget = {
      ...baseTarget,
      id: "cycle_time",
      target: 2,
      warningThreshold: 30,
      criticalThreshold: 60,
      unit: "dias",
    };

    it("should return success when at or below target", () => {
      expect(checkKPIStatus("ct", 1.5, inverseTarget, true).status).toBe("success");
      expect(checkKPIStatus("ct", 2.0, inverseTarget, true).status).toBe("success");
    });

    it("should return non-success when significantly above target", () => {
      const result = checkKPIStatus("ct", 6, inverseTarget, true);
      expect(["warning", "critical"]).toContain(result.status);
    });

    it("should return critical when far above target", () => {
      const result = checkKPIStatus("ct", 10, inverseTarget, true);
      expect(result.status).toBe("critical");
    });
  });

  describe("Disabled KPIs", () => {
    it("should always return success when disabled", () => {
      const disabled = { ...baseTarget, enabled: false };
      expect(checkKPIStatus("test", 0, disabled).status).toBe("success");
      expect(checkKPIStatus("test", 0, disabled).percentage).toBe(100);
    });
  });

  describe("Edge cases", () => {
    it("should handle zero target", () => {
      const zeroTarget = { ...baseTarget, target: 0 };
      // Division by zero edge case
      const result = checkKPIStatus("test", 0, zeroTarget);
      expect(result).toBeDefined();
    });

    it("should handle negative values", () => {
      const result = checkKPIStatus("test", -50, baseTarget);
      expect(result.status).toBe("critical");
    });

    it("should handle very large values", () => {
      const result = checkKPIStatus("test", 999999, baseTarget);
      expect(result.status).toBe("success");
    });
  });
});

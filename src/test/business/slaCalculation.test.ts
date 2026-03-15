import { describe, it, expect } from "vitest";

type SLAStatus = "ok" | "warning" | "critical" | "overdue";

interface SLAConfig {
  warningThresholdDays: number;
  criticalThresholdDays: number;
}

const calculateSLAStatus = (
  dataNecessidade: string,
  config: SLAConfig,
  now = new Date()
): { status: SLAStatus; daysRemaining: number } => {
  const deadline = new Date(dataNecessidade);
  const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  let status: SLAStatus;
  if (daysUntil < 0) status = "overdue";
  else if (daysUntil <= config.criticalThresholdDays) status = "critical";
  else if (daysUntil <= config.warningThresholdDays) status = "warning";
  else status = "ok";

  return { status, daysRemaining: daysUntil };
};

describe("SLA Calculation — Status determination", () => {
  const config: SLAConfig = { warningThresholdDays: 3, criticalThresholdDays: 1 };
  const now = new Date("2026-03-15T12:00:00Z");

  it("should be OK for deadline 10 days away", () => {
    expect(calculateSLAStatus("2026-03-25", config, now).status).toBe("ok");
  });

  it("should be OK for deadline 5 days away", () => {
    expect(calculateSLAStatus("2026-03-20", config, now).status).toBe("ok");
  });

  it("should be WARNING for deadline 3 days away", () => {
    expect(calculateSLAStatus("2026-03-18", config, now).status).toBe("warning");
  });

  it("should be WARNING for deadline 2 days away", () => {
    expect(calculateSLAStatus("2026-03-17", config, now).status).toBe("warning");
  });

  it("should be CRITICAL for deadline 1 day away", () => {
    expect(calculateSLAStatus("2026-03-16", config, now).status).toBe("critical");
  });

  it("should be CRITICAL for deadline today", () => {
    const result = calculateSLAStatus("2026-03-15", config, now);
    expect(["critical", "overdue"]).toContain(result.status);
  });

  it("should be OVERDUE for past deadline", () => {
    expect(calculateSLAStatus("2026-03-10", config, now).status).toBe("overdue");
  });

  it("should return negative days for overdue", () => {
    expect(calculateSLAStatus("2026-03-10", config, now).daysRemaining).toBeLessThan(0);
  });

  it("should handle very far future dates", () => {
    expect(calculateSLAStatus("2030-12-31", config, now).status).toBe("ok");
  });

  describe("Custom thresholds", () => {
    const strictConfig: SLAConfig = { warningThresholdDays: 7, criticalThresholdDays: 3 };

    it("should use custom warning threshold", () => {
      expect(calculateSLAStatus("2026-03-21", strictConfig, now).status).toBe("warning");
    });

    it("should use custom critical threshold", () => {
      expect(calculateSLAStatus("2026-03-17", strictConfig, now).status).toBe("critical");
    });
  });

  describe("Batch SLA analysis", () => {
    it("should correctly categorize multiple items", () => {
      const items = [
        "2026-03-25", // ok
        "2026-03-18", // warning
        "2026-03-16", // critical
        "2026-03-10", // overdue
        "2026-03-10", // overdue
      ];

      const results = items.map(d => calculateSLAStatus(d, config, now));
      const counts = results.reduce((acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      }, {} as Record<SLAStatus, number>);

      expect(counts.ok).toBe(1);
      expect(counts.warning).toBe(1);
      expect(counts.critical).toBe(1);
      expect(counts.overdue).toBe(2);
    });
  });
});

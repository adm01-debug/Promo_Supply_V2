import { describe, it, expect } from "vitest";

describe("Contracts — Business Logic", () => {
  describe("Contract renewal detection", () => {
    const needsRenewalNotice = (
      endDate: string,
      renewalNoticeDays: number | null,
      now = new Date()
    ): boolean => {
      if (!renewalNoticeDays) return false;
      const end = new Date(endDate);
      const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= renewalNoticeDays && diffDays > 0;
    };

    const now = new Date("2026-03-15T12:00:00Z");

    it("should detect contract needing renewal notice", () => {
      expect(needsRenewalNotice("2026-03-25", 30, now)).toBe(true);
    });

    it("should not flag contracts far from expiry", () => {
      expect(needsRenewalNotice("2026-12-31", 30, now)).toBe(false);
    });

    it("should not flag expired contracts", () => {
      expect(needsRenewalNotice("2026-03-01", 30, now)).toBe(false);
    });

    it("should handle null renewal_notice_days", () => {
      expect(needsRenewalNotice("2026-03-20", null, now)).toBe(false);
    });

    it("should handle exact boundary", () => {
      expect(needsRenewalNotice("2026-04-14", 30, now)).toBe(true);
    });
  });

  describe("Contract value validation", () => {
    const validateContractItems = (items: { quantity: number; unit_price: number; total_price: number }[]) => {
      return items.map(item => ({
        ...item,
        isValid: Math.abs(item.quantity * item.unit_price - item.total_price) < 0.01,
      }));
    };

    it("should validate correct item totals", () => {
      const result = validateContractItems([
        { quantity: 10, unit_price: 50, total_price: 500 },
        { quantity: 100, unit_price: 2.5, total_price: 250 },
      ]);
      expect(result.every(r => r.isValid)).toBe(true);
    });

    it("should detect incorrect totals", () => {
      const result = validateContractItems([
        { quantity: 10, unit_price: 50, total_price: 600 },
      ]);
      expect(result[0].isValid).toBe(false);
    });

    it("should handle floating point precision", () => {
      const result = validateContractItems([
        { quantity: 3, unit_price: 9.99, total_price: 29.97 },
      ]);
      expect(result[0].isValid).toBe(true);
    });

    it("should handle zero values", () => {
      const result = validateContractItems([
        { quantity: 0, unit_price: 100, total_price: 0 },
      ]);
      expect(result[0].isValid).toBe(true);
    });
  });

  describe("Contract status transitions", () => {
    const validTransitions: Record<string, string[]> = {
      draft: ["pending_approval", "cancelled"],
      pending_approval: ["active", "rejected", "cancelled"],
      active: ["suspended", "completed", "cancelled"],
      suspended: ["active", "cancelled"],
      completed: ["renewed"],
      renewed: [],
      rejected: ["draft"],
      cancelled: [],
    };

    const isValidTransition = (from: string, to: string): boolean =>
      validTransitions[from]?.includes(to) ?? false;

    it("should allow draft -> pending_approval", () => {
      expect(isValidTransition("draft", "pending_approval")).toBe(true);
    });

    it("should allow active -> suspended", () => {
      expect(isValidTransition("active", "suspended")).toBe(true);
    });

    it("should allow suspended -> active (reactivation)", () => {
      expect(isValidTransition("suspended", "active")).toBe(true);
    });

    it("should not allow cancelled -> any", () => {
      expect(isValidTransition("cancelled", "active")).toBe(false);
      expect(isValidTransition("cancelled", "draft")).toBe(false);
    });

    it("should not allow completed -> active", () => {
      expect(isValidTransition("completed", "active")).toBe(false);
    });

    it("should allow rejected -> draft (rework)", () => {
      expect(isValidTransition("rejected", "draft")).toBe(true);
    });

    it("should not allow backward from active to draft", () => {
      expect(isValidTransition("active", "draft")).toBe(false);
    });
  });

  describe("Contract duration calculation", () => {
    const calcDuration = (startDate: string, endDate: string) => {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffMs = end.getTime() - start.getTime();
      const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const months = Math.round(days / 30.44);
      return { days, months };
    };

    it("should calculate 1-year contract", () => {
      const { months } = calcDuration("2026-01-01", "2026-12-31");
      expect(months).toBe(12);
    });

    it("should calculate 6-month contract", () => {
      const { days } = calcDuration("2026-01-01", "2026-07-01");
      expect(days).toBe(181);
    });

    it("should handle same-day contract", () => {
      const { days } = calcDuration("2026-03-15", "2026-03-15");
      expect(days).toBe(0);
    });

    it("should handle invalid (end before start)", () => {
      const { days } = calcDuration("2026-12-31", "2026-01-01");
      expect(days).toBeLessThan(0);
    });
  });
});

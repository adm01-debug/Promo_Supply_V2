import { describe, it, expect } from "vitest";

describe("Dashboard Filters — Data Filtering Logic", () => {
  interface FilterState {
    period: string;
    category: string;
    supplier: string;
    showComparison: boolean;
  }

  const defaultFilters: FilterState = {
    period: "30d", category: "all", supplier: "all", showComparison: false,
  };

  describe("Period range calculation", () => {
    const getDateRange = (period: string, now = new Date("2026-03-15")) => {
      const end = new Date(now);
      const start = new Date(now);
      switch (period) {
        case "7d": start.setDate(end.getDate() - 7); break;
        case "30d": start.setDate(end.getDate() - 30); break;
        case "90d": start.setDate(end.getDate() - 90); break;
        case "365d": start.setDate(end.getDate() - 365); break;
        case "ytd": start.setMonth(0, 1); break;
        case "all": start.setFullYear(2000); break;
        default: start.setDate(end.getDate() - 30);
      }
      return { start, end, days: Math.ceil((end.getTime() - start.getTime()) / 86400000) };
    };

    it("should calculate 7-day range", () => {
      expect(getDateRange("7d").days).toBe(7);
    });

    it("should calculate 30-day range", () => {
      expect(getDateRange("30d").days).toBe(30);
    });

    it("should calculate 90-day range", () => {
      expect(getDateRange("90d").days).toBe(90);
    });

    it("should calculate YTD from Jan 1", () => {
      const r = getDateRange("ytd");
      expect(r.start.getMonth()).toBe(0);
      expect(r.start.getDate()).toBe(1);
    });

    it("should handle 'all' period", () => {
      const r = getDateRange("all");
      expect(r.days).toBeGreaterThan(9000);
    });

    it("should default to 30d for unknown period", () => {
      expect(getDateRange("unknown").days).toBe(30);
    });
  });

  describe("Multi-filter application", () => {
    interface Item {
      categoria: string;
      fornecedor_id: string;
      data: string;
      valor: number;
    }

    const applyFilters = (items: Item[], filters: FilterState) => {
      let result = [...items];
      if (filters.category !== "all") {
        result = result.filter(i => i.categoria === filters.category);
      }
      if (filters.supplier !== "all") {
        result = result.filter(i => i.fornecedor_id === filters.supplier);
      }
      return result;
    };

    const items: Item[] = [
      { categoria: "A", fornecedor_id: "f1", data: "2026-03-10", valor: 100 },
      { categoria: "B", fornecedor_id: "f1", data: "2026-03-11", valor: 200 },
      { categoria: "A", fornecedor_id: "f2", data: "2026-03-12", valor: 300 },
      { categoria: "B", fornecedor_id: "f2", data: "2026-03-13", valor: 400 },
    ];

    it("should return all items with default filters", () => {
      expect(applyFilters(items, defaultFilters)).toHaveLength(4);
    });

    it("should filter by category", () => {
      const r = applyFilters(items, { ...defaultFilters, category: "A" });
      expect(r).toHaveLength(2);
      expect(r.every(i => i.categoria === "A")).toBe(true);
    });

    it("should filter by supplier", () => {
      const r = applyFilters(items, { ...defaultFilters, supplier: "f1" });
      expect(r).toHaveLength(2);
    });

    it("should combine category + supplier", () => {
      const r = applyFilters(items, { ...defaultFilters, category: "A", supplier: "f1" });
      expect(r).toHaveLength(1);
      expect(r[0].valor).toBe(100);
    });

    it("should return empty for non-matching filter", () => {
      expect(applyFilters(items, { ...defaultFilters, category: "Z" })).toHaveLength(0);
    });
  });

  describe("Comparison period calculation", () => {
    const getComparisonRange = (period: string, now = new Date("2026-03-15")) => {
      const days = period === "7d" ? 7 : period === "30d" ? 30 : period === "90d" ? 90 : 30;
      const currentEnd = new Date(now);
      const currentStart = new Date(now);
      currentStart.setDate(currentEnd.getDate() - days);
      const prevEnd = new Date(currentStart);
      prevEnd.setDate(prevEnd.getDate() - 1);
      const prevStart = new Date(prevEnd);
      prevStart.setDate(prevEnd.getDate() - days + 1);
      return { current: { start: currentStart, end: currentEnd }, previous: { start: prevStart, end: prevEnd } };
    };

    it("should generate non-overlapping ranges", () => {
      const r = getComparisonRange("30d");
      expect(r.previous.end.getTime()).toBeLessThan(r.current.start.getTime());
    });

    it("should have similar length periods", () => {
      const r = getComparisonRange("7d");
      const currentDays = Math.ceil((r.current.end.getTime() - r.current.start.getTime()) / 86400000);
      const prevDays = Math.ceil((r.previous.end.getTime() - r.previous.start.getTime()) / 86400000);
      expect(Math.abs(currentDays - prevDays)).toBeLessThanOrEqual(1);
    });
  });

  describe("KPI delta calculation", () => {
    const calcDelta = (current: number, previous: number) => {
      if (previous === 0) return { delta: current > 0 ? 100 : 0, direction: current > 0 ? "up" as const : "neutral" as const };
      const delta = ((current - previous) / previous) * 100;
      return {
        delta: Math.round(delta * 10) / 10,
        direction: delta > 0 ? "up" as const : delta < 0 ? "down" as const : "neutral" as const,
      };
    };

    it("should calculate positive delta", () => {
      const r = calcDelta(120, 100);
      expect(r.delta).toBe(20);
      expect(r.direction).toBe("up");
    });

    it("should calculate negative delta", () => {
      const r = calcDelta(80, 100);
      expect(r.delta).toBe(-20);
      expect(r.direction).toBe("down");
    });

    it("should handle zero previous", () => {
      expect(calcDelta(50, 0).delta).toBe(100);
    });

    it("should handle equal values", () => {
      expect(calcDelta(100, 100).direction).toBe("neutral");
    });

    it("should handle both zero", () => {
      expect(calcDelta(0, 0).direction).toBe("neutral");
    });
  });
});

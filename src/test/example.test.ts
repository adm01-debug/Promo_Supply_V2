import { describe, it, expect } from "vitest";

describe("Promo Supply - Setup", () => {
  it("should pass basic test", () => {
    expect(true).toBe(true);
  });

  it("should verify date utilities work", () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    expect(startOfMonth.getDate()).toBe(1);
  });
});

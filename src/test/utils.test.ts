import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn() — Tailwind class merge utility", () => {
  it("should merge simple classes", () => {
    expect(cn("text-sm", "font-bold")).toBe("text-sm font-bold");
  });

  it("should handle empty inputs", () => {
    expect(cn()).toBe("");
    expect(cn("")).toBe("");
    expect(cn(undefined)).toBe("");
    expect(cn(null as any)).toBe("");
  });

  it("should override conflicting Tailwind classes", () => {
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
    expect(cn("p-4", "p-2")).toBe("p-2");
    expect(cn("bg-primary", "bg-secondary")).toBe("bg-secondary");
  });

  it("should handle conditional classes", () => {
    const isActive = true;
    const isDisabled = false;
    expect(cn("base", isActive && "active", isDisabled && "disabled")).toBe("base active");
  });

  it("should handle arrays", () => {
    expect(cn(["text-sm", "font-bold"])).toBe("text-sm font-bold");
  });

  it("should handle complex merge scenarios", () => {
    const result = cn("px-2 py-1 bg-red-500 hover:bg-red-600", "py-3 bg-blue-500");
    expect(result).toContain("px-2");
    expect(result).toContain("py-3");
    expect(result).toContain("bg-blue-500");
    expect(result).toContain("hover:bg-red-600");
    expect(result).not.toContain("py-1");
    expect(result).not.toContain("bg-red-500");
  });

  it("should handle responsive prefixes", () => {
    expect(cn("md:text-sm", "md:text-lg")).toBe("md:text-lg");
  });

  it("should preserve non-conflicting classes", () => {
    expect(cn("flex items-center", "gap-2 justify-between")).toBe(
      "flex items-center gap-2 justify-between"
    );
  });
});

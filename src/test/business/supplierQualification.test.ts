import { describe, it, expect } from "vitest";

describe("Supplier Qualification — Scoring & Status", () => {
  const calcQualificationScore = (
    docScore: number,
    complianceScore: number,
    expiryScore: number,
    weights = { doc: 0.5, compliance: 0.3, expiry: 0.2 }
  ) => {
    const overall = docScore * weights.doc + complianceScore * weights.compliance + expiryScore * weights.expiry;
    let status: string;
    if (docScore === 0 && complianceScore === 0) status = "pending";
    else if (overall >= 100) status = "qualified";
    else if (overall >= 70) status = "partially_qualified";
    else status = "disqualified";
    return { overall: Math.round(overall * 100) / 100, status };
  };

  describe("Score calculation", () => {
    it("should return qualified for perfect scores", () => {
      const r = calcQualificationScore(100, 100, 100);
      expect(r.overall).toBe(100);
      expect(r.status).toBe("qualified");
    });

    it("should return partially_qualified for 70-99", () => {
      const r = calcQualificationScore(80, 70, 60);
      expect(r.status).toBe("partially_qualified");
    });

    it("should return disqualified for low scores", () => {
      const r = calcQualificationScore(30, 20, 10);
      expect(r.status).toBe("disqualified");
    });

    it("should return pending for zero scores", () => {
      const r = calcQualificationScore(0, 0, 100);
      expect(r.status).toBe("pending");
    });

    it("should weight documents highest (50%)", () => {
      const highDoc = calcQualificationScore(100, 0, 0);
      const highCompliance = calcQualificationScore(0, 100, 0);
      expect(highDoc.overall).toBeGreaterThan(highCompliance.overall);
    });
  });

  describe("Document expiry tracking", () => {
    const getExpiryStatus = (expiryDate: string | null, warningDays = 30, now = new Date()) => {
      if (!expiryDate) return "no_expiry";
      const expiry = new Date(expiryDate);
      const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / 86400000);
      if (diffDays < 0) return "expired";
      if (diffDays <= warningDays) return "expiring_soon";
      return "valid";
    };

    const now = new Date("2026-03-15T12:00:00Z");

    it("should detect expired document", () => {
      expect(getExpiryStatus("2026-03-01", 30, now)).toBe("expired");
    });

    it("should detect expiring soon", () => {
      expect(getExpiryStatus("2026-04-01", 30, now)).toBe("expiring_soon");
    });

    it("should detect valid document", () => {
      expect(getExpiryStatus("2027-01-01", 30, now)).toBe("valid");
    });

    it("should handle null expiry", () => {
      expect(getExpiryStatus(null)).toBe("no_expiry");
    });

    it("should handle exact boundary", () => {
      expect(getExpiryStatus("2026-04-14", 30, now)).toBe("expiring_soon");
    });
  });

  describe("Supplier type classification", () => {
    const classifySupplier = (tipo: string, estado?: string) => {
      if (tipo === "internacional") return { requiresImportDocs: true, taxRegime: "import" };
      if (tipo === "fabricante") return { requiresImportDocs: false, taxRegime: "icms_ipi" };
      return { requiresImportDocs: false, taxRegime: estado ? "icms" : "unknown" };
    };

    it("should classify internacional supplier", () => {
      const r = classifySupplier("internacional");
      expect(r.requiresImportDocs).toBe(true);
      expect(r.taxRegime).toBe("import");
    });

    it("should classify nacional with state", () => {
      const r = classifySupplier("nacional", "SP");
      expect(r.taxRegime).toBe("icms");
    });

    it("should classify fabricante", () => {
      const r = classifySupplier("fabricante");
      expect(r.taxRegime).toBe("icms_ipi");
    });

    it("should handle missing state", () => {
      const r = classifySupplier("distribuidor");
      expect(r.taxRegime).toBe("unknown");
    });
  });
});

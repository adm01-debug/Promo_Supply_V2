import { describe, it, expect } from "vitest";
import { roleLabels, roleColors, type AppRole } from "@/hooks/useAuth";
import { moduleLabels, actionLabels } from "@/hooks/usePermissions";

describe("RBAC — Role-Based Access Control", () => {
  describe("Role definitions", () => {
    const allRoles: AppRole[] = ["admin", "coordinator", "buyer", "finance", "viewer"];

    it("should have Portuguese labels for all roles", () => {
      allRoles.forEach((role) => {
        expect(roleLabels[role]).toBeDefined();
        expect(roleLabels[role].length).toBeGreaterThan(0);
      });
    });

    it("should have color classes for all roles", () => {
      allRoles.forEach((role) => {
        expect(roleColors[role]).toBeDefined();
        expect(roleColors[role]).toContain("bg-");
        expect(roleColors[role]).toContain("text-");
      });
    });

    it("should have admin labeled as Administrador", () => {
      expect(roleLabels.admin).toBe("Administrador");
    });

    it("should use destructive color for admin", () => {
      expect(roleColors.admin).toContain("destructive");
    });

    it("should use muted color for viewer (least privilege)", () => {
      expect(roleColors.viewer).toContain("muted");
    });
  });

  describe("hasRole logic simulation", () => {
    const hasRole = (currentRole: AppRole | null, requiredRole: AppRole | AppRole[]): boolean => {
      if (!currentRole) return false;
      if (currentRole === "admin") return true;
      if (Array.isArray(requiredRole)) return requiredRole.includes(currentRole);
      return currentRole === requiredRole;
    };

    it("admin should have access to everything", () => {
      expect(hasRole("admin", "buyer")).toBe(true);
      expect(hasRole("admin", "finance")).toBe(true);
      expect(hasRole("admin", "viewer")).toBe(true);
      expect(hasRole("admin", ["coordinator", "buyer"])).toBe(true);
    });

    it("buyer should not access finance", () => {
      expect(hasRole("buyer", "finance")).toBe(false);
    });

    it("buyer should access buyer role", () => {
      expect(hasRole("buyer", "buyer")).toBe(true);
    });

    it("viewer should only access viewer", () => {
      expect(hasRole("viewer", "viewer")).toBe(true);
      expect(hasRole("viewer", "admin")).toBe(false);
      expect(hasRole("viewer", "buyer")).toBe(false);
    });

    it("null role should have no access", () => {
      expect(hasRole(null, "admin")).toBe(false);
      expect(hasRole(null, "viewer")).toBe(false);
      expect(hasRole(null, ["admin", "viewer"])).toBe(false);
    });

    it("should handle array of required roles", () => {
      expect(hasRole("buyer", ["buyer", "coordinator"])).toBe(true);
      expect(hasRole("finance", ["buyer", "coordinator"])).toBe(false);
    });

    it("coordinator should access coordinator", () => {
      expect(hasRole("coordinator", "coordinator")).toBe(true);
      expect(hasRole("coordinator", "buyer")).toBe(false);
    });
  });

  describe("Permission modules coverage", () => {
    it("should have all critical modules defined", () => {
      const requiredModules = [
        "solicitacoes", "cotacoes", "fornecedores", "pedidos",
        "pagamentos", "contratos", "relatorios", "auditoria", "security",
      ];
      requiredModules.forEach((mod) => {
        expect(moduleLabels[mod]).toBeDefined();
      });
    });

    it("should have all critical actions defined", () => {
      const requiredActions = ["view", "create", "edit", "delete", "approve"];
      requiredActions.forEach((action) => {
        expect(actionLabels[action]).toBeDefined();
      });
    });

    it("should have Portuguese module labels", () => {
      expect(moduleLabels["solicitacoes"]).toBe("Solicitações");
      expect(moduleLabels["cotacoes"]).toBe("Cotações");
      expect(moduleLabels["pagamentos"]).toBe("Pagamentos");
    });
  });
});

describe("Security — Input validation patterns", () => {
  describe("Email normalization", () => {
    it("should normalize email to lowercase and trimmed", () => {
      const normalize = (email: string) => email.trim().toLowerCase();
      expect(normalize("  Admin@Company.COM  ")).toBe("admin@company.com");
      expect(normalize("USER@test.com")).toBe("user@test.com");
    });
  });

  describe("CNPJ format validation", () => {
    it("should match valid CNPJ format", () => {
      const cnpjRegex = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;
      expect(cnpjRegex.test("12.345.678/0001-90")).toBe(true);
      expect(cnpjRegex.test("12345678000190")).toBe(false);
      expect(cnpjRegex.test("")).toBe(false);
    });
  });

  describe("Password strength patterns", () => {
    const hasMinLength = (p: string) => p.length >= 8;
    const hasUppercase = (p: string) => /[A-Z]/.test(p);
    const hasLowercase = (p: string) => /[a-z]/.test(p);
    const hasNumber = (p: string) => /\d/.test(p);
    const hasSpecial = (p: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p);

    it("should reject short passwords", () => {
      expect(hasMinLength("Ab1@")).toBe(false);
    });

    it("should accept strong passwords", () => {
      const strong = "MyStr0ng!Pass";
      expect(hasMinLength(strong)).toBe(true);
      expect(hasUppercase(strong)).toBe(true);
      expect(hasLowercase(strong)).toBe(true);
      expect(hasNumber(strong)).toBe(true);
      expect(hasSpecial(strong)).toBe(true);
    });

    it("should detect missing uppercase", () => {
      expect(hasUppercase("alllowercase1!")).toBe(false);
    });

    it("should detect missing special characters", () => {
      expect(hasSpecial("NoSpecial123")).toBe(false);
    });
  });

  describe("Lockout countdown formatter", () => {
    const formatCountdown = (seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    it("should format 0 seconds", () => {
      expect(formatCountdown(0)).toBe("0:00");
    });

    it("should format 60 seconds as 1:00", () => {
      expect(formatCountdown(60)).toBe("1:00");
    });

    it("should format 90 seconds as 1:30", () => {
      expect(formatCountdown(90)).toBe("1:30");
    });

    it("should format 300 seconds as 5:00", () => {
      expect(formatCountdown(300)).toBe("5:00");
    });

    it("should format 1800 seconds as 30:00", () => {
      expect(formatCountdown(1800)).toBe("30:00");
    });
  });
});

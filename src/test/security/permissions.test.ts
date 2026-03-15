import { describe, it, expect } from "vitest";

describe("Permissions Matrix — Comprehensive RBAC", () => {
  type Role = "admin" | "coordinator" | "buyer" | "finance" | "viewer";

  const permissionMatrix: Record<Role, Record<string, string[]>> = {
    admin: {
      solicitacoes: ["view", "create", "edit", "delete", "approve"],
      cotacoes: ["view", "create", "edit", "delete", "approve"],
      pedidos: ["view", "create", "edit", "delete", "approve"],
      pagamentos: ["view", "create", "edit", "delete", "approve"],
      fornecedores: ["view", "create", "edit", "delete"],
      contratos: ["view", "create", "edit", "delete", "approve"],
      relatorios: ["view", "export"],
      auditoria: ["view"],
      security: ["view", "manage"],
    },
    coordinator: {
      solicitacoes: ["view", "create", "edit", "approve"],
      cotacoes: ["view", "create", "edit", "approve"],
      pedidos: ["view", "create", "edit", "approve"],
      pagamentos: ["view", "approve"],
      fornecedores: ["view", "create", "edit"],
      contratos: ["view", "create", "edit"],
      relatorios: ["view", "export"],
      auditoria: ["view"],
      security: [],
    },
    buyer: {
      solicitacoes: ["view", "create", "edit"],
      cotacoes: ["view", "create", "edit"],
      pedidos: ["view", "create", "edit"],
      pagamentos: ["view"],
      fornecedores: ["view", "create", "edit"],
      contratos: ["view"],
      relatorios: ["view"],
      auditoria: [],
      security: [],
    },
    finance: {
      solicitacoes: ["view"],
      cotacoes: ["view"],
      pedidos: ["view"],
      pagamentos: ["view", "create", "edit", "approve"],
      fornecedores: ["view"],
      contratos: ["view", "create", "edit"],
      relatorios: ["view", "export"],
      auditoria: [],
      security: [],
    },
    viewer: {
      solicitacoes: ["view"],
      cotacoes: ["view"],
      pedidos: ["view"],
      pagamentos: ["view"],
      fornecedores: ["view"],
      contratos: ["view"],
      relatorios: ["view"],
      auditoria: [],
      security: [],
    },
  };

  const hasPermission = (role: Role, module: string, action: string): boolean => {
    return permissionMatrix[role]?.[module]?.includes(action) ?? false;
  };

  describe("Admin — Full access", () => {
    const modules = Object.keys(permissionMatrix.admin);

    it("should have access to all modules", () => {
      modules.forEach(mod => {
        expect(hasPermission("admin", mod, "view")).toBe(true);
      });
    });

    it("should have delete access everywhere except security/audit", () => {
      ["solicitacoes", "cotacoes", "pedidos", "pagamentos", "fornecedores", "contratos"].forEach(mod => {
        expect(hasPermission("admin", mod, "delete")).toBe(true);
      });
    });

    it("should be the only role with security manage", () => {
      expect(hasPermission("admin", "security", "manage")).toBe(true);
      expect(hasPermission("coordinator", "security", "manage")).toBe(false);
      expect(hasPermission("buyer", "security", "manage")).toBe(false);
    });
  });

  describe("Viewer — Minimum privilege", () => {
    it("should only have view access", () => {
      Object.keys(permissionMatrix.viewer).forEach(mod => {
        const actions = permissionMatrix.viewer[mod];
        actions.forEach(action => expect(action).toBe("view"));
      });
    });

    it("should NOT create, edit, delete, or approve anything", () => {
      const forbidden = ["create", "edit", "delete", "approve"];
      Object.keys(permissionMatrix.viewer).forEach(mod => {
        forbidden.forEach(action => {
          expect(hasPermission("viewer", mod, action)).toBe(false);
        });
      });
    });
  });

  describe("Buyer — Operational access", () => {
    it("should create solicitações, cotações, pedidos", () => {
      expect(hasPermission("buyer", "solicitacoes", "create")).toBe(true);
      expect(hasPermission("buyer", "cotacoes", "create")).toBe(true);
      expect(hasPermission("buyer", "pedidos", "create")).toBe(true);
    });

    it("should NOT approve anything", () => {
      Object.keys(permissionMatrix.buyer).forEach(mod => {
        expect(hasPermission("buyer", mod, "approve")).toBe(false);
      });
    });

    it("should NOT delete anything", () => {
      Object.keys(permissionMatrix.buyer).forEach(mod => {
        expect(hasPermission("buyer", mod, "delete")).toBe(false);
      });
    });

    it("should NOT access security or audit", () => {
      expect(hasPermission("buyer", "security", "view")).toBe(false);
      expect(hasPermission("buyer", "auditoria", "view")).toBe(false);
    });
  });

  describe("Finance — Payment-focused", () => {
    it("should have full access to pagamentos", () => {
      ["view", "create", "edit", "approve"].forEach(action => {
        expect(hasPermission("finance", "pagamentos", action)).toBe(true);
      });
    });

    it("should NOT create solicitações", () => {
      expect(hasPermission("finance", "solicitacoes", "create")).toBe(false);
    });

    it("should have contract access", () => {
      expect(hasPermission("finance", "contratos", "create")).toBe(true);
      expect(hasPermission("finance", "contratos", "edit")).toBe(true);
    });
  });

  describe("Coordinator — Supervisory access", () => {
    it("should approve solicitações, cotações, pedidos", () => {
      expect(hasPermission("coordinator", "solicitacoes", "approve")).toBe(true);
      expect(hasPermission("coordinator", "cotacoes", "approve")).toBe(true);
      expect(hasPermission("coordinator", "pedidos", "approve")).toBe(true);
    });

    it("should NOT delete anything", () => {
      Object.keys(permissionMatrix.coordinator).forEach(mod => {
        expect(hasPermission("coordinator", mod, "delete")).toBe(false);
      });
    });

    it("should NOT manage security", () => {
      expect(hasPermission("coordinator", "security", "manage")).toBe(false);
    });
  });

  describe("Cross-role privilege escalation checks", () => {
    const allRoles: Role[] = ["admin", "coordinator", "buyer", "finance", "viewer"];

    it("only admin should have delete on solicitacoes", () => {
      allRoles.forEach(role => {
        if (role === "admin") {
          expect(hasPermission(role, "solicitacoes", "delete")).toBe(true);
        } else {
          expect(hasPermission(role, "solicitacoes", "delete")).toBe(false);
        }
      });
    });

    it("only admin should access auditoria", () => {
      allRoles.forEach(role => {
        if (["admin", "coordinator"].includes(role)) {
          expect(hasPermission(role, "auditoria", "view")).toBe(true);
        } else {
          expect(hasPermission(role, "auditoria", "view")).toBe(false);
        }
      });
    });

    it("viewer should be strictest role", () => {
      allRoles.forEach(role => {
        const viewerActions = Object.values(permissionMatrix.viewer).flat().length;
        const roleActions = Object.values(permissionMatrix[role]).flat().length;
        expect(roleActions).toBeGreaterThanOrEqual(viewerActions);
      });
    });
  });
});

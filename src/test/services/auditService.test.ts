import { describe, it, expect } from "vitest";
import {
  actionTypeLabels,
  entityTypeLabels,
  actionTypeColors,
  type AuditActionType,
  type AuditEntityType,
} from "@/services/auditService";

describe("AuditService — Labels & Configuration", () => {
  describe("actionTypeLabels", () => {
    const expectedActions: AuditActionType[] = [
      "create", "update", "delete", "view", "export", "login", "logout", "approve", "reject", "cancel",
    ];

    it("should have labels for all action types", () => {
      expectedActions.forEach((action) => {
        expect(actionTypeLabels[action]).toBeDefined();
        expect(typeof actionTypeLabels[action]).toBe("string");
        expect(actionTypeLabels[action].length).toBeGreaterThan(0);
      });
    });

    it("should have Portuguese labels", () => {
      expect(actionTypeLabels.create).toBe("Criação");
      expect(actionTypeLabels.update).toBe("Atualização");
      expect(actionTypeLabels.delete).toBe("Exclusão");
      expect(actionTypeLabels.approve).toBe("Aprovação");
      expect(actionTypeLabels.reject).toBe("Rejeição");
    });
  });

  describe("entityTypeLabels", () => {
    const expectedEntities: AuditEntityType[] = [
      "solicitacao", "cotacao", "pedido", "pagamento", "fornecedor", "usuario", "configuracao", "relatorio",
    ];

    it("should have labels for all entity types", () => {
      expectedEntities.forEach((entity) => {
        expect(entityTypeLabels[entity]).toBeDefined();
        expect(typeof entityTypeLabels[entity]).toBe("string");
      });
    });

    it("should have proper Portuguese labels", () => {
      expect(entityTypeLabels.solicitacao).toBe("Solicitação");
      expect(entityTypeLabels.cotacao).toBe("Cotação");
      expect(entityTypeLabels.pagamento).toBe("Pagamento");
      expect(entityTypeLabels.fornecedor).toBe("Fornecedor");
    });
  });

  describe("actionTypeColors", () => {
    it("should have color classes for all action types", () => {
      Object.values(actionTypeColors).forEach((color) => {
        expect(color).toContain("bg-");
        expect(color).toContain("text-");
        expect(color).toContain("border-");
      });
    });

    it("should use semantic tokens for CRUD actions", () => {
      expect(actionTypeColors.create).toContain("success");
      expect(actionTypeColors.delete).toContain("destructive");
      expect(actionTypeColors.update).toContain("primary");
    });

    it("should use muted for view actions", () => {
      expect(actionTypeColors.view).toContain("muted");
    });
  });
});

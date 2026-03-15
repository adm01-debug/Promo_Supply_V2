import { describe, it, expect } from "vitest";
import type { Solicitacao, CreateSolicitacaoInput } from "@/hooks/useSolicitacoes";
import type { Fornecedor, CreateFornecedorInput } from "@/hooks/useFornecedores";
import type { Pedido, PedidoItem, CreatePedidoInput } from "@/hooks/usePedidos";
import type { ApprovalRule, ApprovalWorkflow, ApprovalStep, ApprovalDelegation } from "@/hooks/useApprovalWorkflow";
import type { AppRole } from "@/hooks/useAuth";

describe("Type Validation — Interface Contracts", () => {
  describe("Solicitacao types", () => {
    it("should accept valid status values", () => {
      const validStatuses: Solicitacao["status"][] = [
        "pendente", "em_cotacao", "aprovada", "rejeitada", "em_andamento", "concluida", "cancelada",
      ];
      validStatuses.forEach((status) => {
        expect(typeof status).toBe("string");
      });
    });

    it("should accept valid tipo values", () => {
      const validTypes: Solicitacao["tipo"][] = [
        "material", "servico", "equipamento", "urgente", "contrato",
      ];
      expect(validTypes).toHaveLength(5);
    });

    it("should accept valid prioridade values", () => {
      const validPriorities: Solicitacao["prioridade"][] = [
        "baixa", "media", "alta", "urgente",
      ];
      expect(validPriorities).toHaveLength(4);
    });

    it("should validate CreateSolicitacaoInput has required fields", () => {
      const input: CreateSolicitacaoInput = {
        titulo: "Test",
        tipo: "material",
      };
      expect(input.titulo).toBeDefined();
      expect(input.tipo).toBeDefined();
    });
  });

  describe("Fornecedor types", () => {
    it("should accept valid tipo values", () => {
      const validTypes: Fornecedor["tipo"][] = ["nacional", "internacional", "local"];
      expect(validTypes).toHaveLength(3);
    });

    it("should accept valid status values", () => {
      const validStatuses: Fornecedor["status"][] = ["ativo", "inativo", "bloqueado", "pendente"];
      expect(validStatuses).toHaveLength(4);
    });

    it("should validate CreateFornecedorInput requires razao_social", () => {
      const input: CreateFornecedorInput = { razao_social: "Test Corp" };
      expect(input.razao_social).toBeDefined();
    });
  });

  describe("Pedido types", () => {
    it("should accept valid status values", () => {
      const validStatuses: Pedido["status"][] = [
        "pendente", "aprovado", "enviado", "em_transito", "entregue", "parcial", "cancelado",
      ];
      expect(validStatuses).toHaveLength(7);
    });

    it("should validate CreatePedidoInput requires fornecedor_id and valor_total", () => {
      const input: CreatePedidoInput = {
        fornecedor_id: "uuid",
        valor_total: 1000,
      };
      expect(input.fornecedor_id).toBeDefined();
      expect(input.valor_total).toBeDefined();
    });

    it("should validate PedidoItem has quantity tracking", () => {
      const item: Partial<PedidoItem> = {
        quantidade: 100,
        quantidade_recebida: 75,
      };
      expect(item.quantidade).toBeGreaterThan(item.quantidade_recebida!);
    });
  });

  describe("Approval types", () => {
    it("should have valid workflow statuses", () => {
      const statuses: ApprovalWorkflow["status"][] = [
        "pending", "approved", "rejected", "escalated", "cancelled",
      ];
      expect(statuses).toHaveLength(5);
    });

    it("should validate ApprovalRule structure", () => {
      const rule: Partial<ApprovalRule> = {
        nome: "Test",
        valor_min: 0,
        valor_max: 10000,
        niveis_aprovacao: 2,
        requer_unanimidade: false,
        escalacao_automatica: true,
        tempo_limite_horas: 24,
      };
      expect(rule.valor_min).toBeLessThan(rule.valor_max!);
      expect(rule.niveis_aprovacao).toBeGreaterThan(0);
      expect(rule.tempo_limite_horas).toBeGreaterThan(0);
    });
  });

  describe("AppRole", () => {
    it("should have all defined roles", () => {
      const roles: AppRole[] = ["admin", "coordinator", "buyer", "finance", "viewer"];
      expect(roles).toHaveLength(5);
    });
  });
});

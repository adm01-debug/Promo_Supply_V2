import { describe, it, expect } from "vitest";
import { normalizeText, createSearchIndex, type FuseSearchItem } from "@/hooks/useFuseSearch";

describe("FuseSearch — Brazilian Portuguese normalization", () => {
  describe("normalizeText", () => {
    it("should convert to lowercase", () => {
      expect(normalizeText("HELLO WORLD")).toBe("hello world");
    });

    it("should remove Portuguese accents", () => {
      expect(normalizeText("ação")).toBe("acao");
      expect(normalizeText("cômputo")).toBe("computo");
      expect(normalizeText("café")).toBe("cafe");
      expect(normalizeText("naïve")).toBe("naive");
    });

    it("should handle common Portuguese words", () => {
      expect(normalizeText("Solicitação")).toBe("solicitacao");
      expect(normalizeText("Cotação")).toBe("cotacao");
      expect(normalizeText("Pagamento")).toBe("pagamento");
      expect(normalizeText("Fornecedores")).toBe("fornecedores");
      expect(normalizeText("Aprovação")).toBe("aprovacao");
    });

    it("should remove special characters", () => {
      expect(normalizeText("test@email.com")).toBe("test email com");
      expect(normalizeText("12.345.678/0001-90")).toBe("12 345 678 0001 90");
    });

    it("should normalize multiple spaces", () => {
      expect(normalizeText("  multiple   spaces  ")).toBe("multiple spaces");
    });

    it("should handle empty string", () => {
      expect(normalizeText("")).toBe("");
    });

    it("should handle purely accented strings", () => {
      expect(normalizeText("àáâãäèéêëìíîïòóôõöùúûü")).toBe("aaaaaeeeeiiiiooooouu u u");
    });

    it("should handle cedilla", () => {
      expect(normalizeText("ç")).toBe("c");
      expect(normalizeText("Preço")).toBe("preco");
    });

    it("should handle mixed content", () => {
      expect(normalizeText("OC-2024-0461 (Fornecedor: Estrela)")).toBe("oc 2024 0461 fornecedor estrela");
    });
  });

  describe("createSearchIndex", () => {
    const sampleData = [
      { id: "1", nome: "Produto A", descricao: "Descrição do produto A", codigo: "P001" },
      { id: "2", nome: "Produto B", descricao: "Outra descrição", codigo: "P002" },
    ];

    it("should create valid search items from data", () => {
      const index = createSearchIndex(sampleData, {
        idField: "id",
        titleField: "nome",
        descriptionField: "descricao",
        typeValue: "produto",
      });

      expect(index).toHaveLength(2);
      expect(index[0].id).toBe("1");
      expect(index[0].title).toBe("Produto A");
      expect(index[0].type).toBe("produto");
    });

    it("should include keyword fields when specified", () => {
      const index = createSearchIndex(sampleData, {
        idField: "id",
        titleField: "nome",
        typeValue: "produto",
        keywordFields: ["codigo"],
      });

      expect(index[0].keywords).toContain("P001");
    });

    it("should handle missing fields gracefully", () => {
      const sparseData = [{ id: "1", nome: "Test" }];
      const index = createSearchIndex(sparseData, {
        idField: "id",
        titleField: "nome",
        descriptionField: "nonexistent",
        typeValue: "test",
      });

      expect(index[0].description).toBe("");
    });

    it("should handle empty data array", () => {
      const index = createSearchIndex([], {
        idField: "id",
        titleField: "nome",
        typeValue: "test",
      });
      expect(index).toHaveLength(0);
    });
  });
});

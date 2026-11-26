import { beforeEach, describe, expect, it, vi } from "vitest";
import { salvarDocumentoFiscal } from "@/pages/documentos/persistenciaFiscal";

const estado = vi.hoisted(() => ({
  // ids devolvidos por cada SELECT, na ordem das chamadas
  existentes: [] as Array<{ id: string } | null>,
  erroSelect: null as { message: string } | null,
  erroUpdate: null as { message: string } | null,
  erroInsert: null as { message: string; code?: string } | null,
  operacoes: [] as string[],
}));

vi.mock("@/integrations/supabase/client", () => {
  const criarConsulta = () => {
    const b: Record<string, unknown> = {};
    b.select = () => b;
    b.eq = () => b;
    b.limit = () => b;
    b.maybeSingle = () => {
      estado.operacoes.push("select");
      const proximo = estado.existentes.length > 1 ? estado.existentes.shift() : estado.existentes[0] ?? null;
      return Promise.resolve({ data: proximo, error: estado.erroSelect });
    };
    b.update = () => {
      estado.operacoes.push("update");
      return b;
    };
    b.insert = () => {
      estado.operacoes.push("insert");
      return b;
    };
    b.single = () =>
      Promise.resolve(
        estado.erroInsert ? { data: null, error: estado.erroInsert } : { data: { id: "novo-id" }, error: null },
      );
    b.then = (ok: (v: unknown) => unknown, err?: (e: unknown) => unknown) =>
      Promise.resolve({ data: null, error: estado.erroUpdate }).then(ok, err);
    return b;
  };
  return { supabase: { from: () => criarConsulta() } };
});

const notaXml = {
  numero_nf: "1234",
  serie: "1",
  chave_acesso: "35240112345678000199550010000123451234567890",
  valor_total: 1500,
  status: "validada" as const,
  fornecedor_id: "forn-1",
  tenant_id: "tenant-legado",
};

beforeEach(() => {
  estado.existentes = [];
  estado.erroSelect = null;
  estado.erroUpdate = null;
  estado.erroInsert = null;
  estado.operacoes = [];
});

describe("persistencia de documento fiscal e idempotente (QA 130)", () => {
  it("nota nova e inserida", async () => {
    const r = await salvarDocumentoFiscal(notaXml, "atualizar");

    expect(r).toEqual({ id: "novo-id", situacao: "criado" });
    expect(estado.operacoes).toEqual(["select", "insert"]);
  });

  it("XML reimportado atualiza a nota existente em vez de duplicar", async () => {
    estado.existentes = [{ id: "doc-existente" }];

    const r = await salvarDocumentoFiscal(notaXml, "atualizar");

    expect(r).toEqual({ id: "doc-existente", situacao: "atualizado" });
    expect(estado.operacoes).toEqual(["select", "update"]);
  });

  it("PDF reimportado nao grava nada e nao rebaixa um documento ja revisado", async () => {
    estado.existentes = [{ id: "doc-existente" }];
    const pdf = { numero_nf: "1234", valor_total: 1500, source_type: "pdf" as const, status: "pendente" as const, tenant_id: "tenant-legado" };

    const r = await salvarDocumentoFiscal(pdf, "ignorar");

    expect(r).toEqual({ id: "doc-existente", situacao: "ignorado" });
    expect(estado.operacoes).toEqual(["select"]);
  });

  it("corrida entre duas importacoes: o 23505 do indice unico vira atualizacao", async () => {
    estado.existentes = [null, { id: "doc-da-corrida" }];
    estado.erroInsert = { message: "duplicate key value violates unique constraint", code: "23505" };

    const r = await salvarDocumentoFiscal(notaXml, "atualizar");

    expect(r).toEqual({ id: "doc-da-corrida", situacao: "atualizado" });
    expect(estado.operacoes).toEqual(["select", "insert", "select", "update"]);
  });

  it("erro de banco que nao e duplicidade continua sendo propagado", async () => {
    estado.erroInsert = { message: "permission denied for table fiscal_documents", code: "42501" };

    await expect(salvarDocumentoFiscal(notaXml, "atualizar")).rejects.toEqual({
      message: "permission denied for table fiscal_documents",
      code: "42501",
    });
  });
});
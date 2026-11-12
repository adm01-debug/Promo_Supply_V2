import { describe, it, expect } from "vitest";
import { replaceContractItems } from "../replaceContractItems";
import type { ContractItem } from "@/types/contract";

type Call = { op: string; args: unknown[] };

function fakeDb(opts: { insertError?: unknown; insertedIds?: string[] } = {}) {
  const calls: Call[] = [];
  const db = {
    from(table: string) {
      calls.push({ op: "from", args: [table] });
      return {
        insert(rows: unknown) {
          calls.push({ op: "insert", args: [rows] });
          return {
            select: async () => {
              calls.push({ op: "select", args: [] });
              return opts.insertError
                ? { data: null, error: opts.insertError }
                : { data: (opts.insertedIds ?? []).map((id) => ({ id })), error: null };
            },
          };
        },
        delete() {
          calls.push({ op: "delete", args: [] });
          const q = {
            eq(col: string, val: string) {
              calls.push({ op: "eq", args: [col, val] });
              return q;
            },
            not(col: string, operator: string, val: string) {
              calls.push({ op: "not", args: [col, operator, val] });
              return q;
            },
            then(resolve: (v: { error: null }) => void) {
              resolve({ error: null });
            },
          };
          return q;
        },
      };
    },
  };
  return { db: db as never, calls };
}

const item: ContractItem = {
  item_name: "Caneta",
  description: null,
  unit: "un",
  quantity: 10,
  unit_price: 2,
  total_price: 20,
};

describe("replaceContractItems", () => {
  it("insere os novos antes de apagar e preserva os recém-inseridos", async () => {
    const { db, calls } = fakeDb({ insertedIds: ["n1", "n2"] });
    await replaceContractItems(db, "c1", [item, item]);
    const ops = calls.map((c) => c.op);
    expect(ops.indexOf("insert")).toBeLessThan(ops.indexOf("delete"));
    expect(calls.find((c) => c.op === "eq")?.args).toEqual(["contract_id", "c1"]);
    expect(calls.find((c) => c.op === "not")?.args).toEqual(["id", "in", "(n1,n2)"]);
  });

  it("não apaga os itens antigos quando o insert falha", async () => {
    const { db, calls } = fakeDb({ insertError: new Error("FK tenant") });
    await expect(replaceContractItems(db, "c1", [item])).rejects.toThrow("FK tenant");
    expect(calls.some((c) => c.op === "delete")).toBe(false);
  });

  it("sem itens novos apaga todos os itens do contrato", async () => {
    const { db, calls } = fakeDb();
    await replaceContractItems(db, "c1", []);
    expect(calls.some((c) => c.op === "insert")).toBe(false);
    expect(calls.some((c) => c.op === "not")).toBe(false);
    expect(calls.find((c) => c.op === "eq")?.args).toEqual(["contract_id", "c1"]);
  });
});

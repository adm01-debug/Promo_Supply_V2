import { describe, it, expect } from "vitest";
import { summarizePermissionChanges } from "../permissionChanges";

describe("summarizePermissionChanges", () => {
  it("agrupa inclusoes num unico upsert e remocoes por role", () => {
    const { upserts, removals } = summarizePermissionChanges({
      buyer: { "perm-1": true, "perm-2": true, "perm-3": false },
      finance: { "perm-1": false, "perm-4": false },
    });

    expect(upserts).toEqual([
      { role: "buyer", permission_id: "perm-1" },
      { role: "buyer", permission_id: "perm-2" },
    ]);
    expect(removals).toEqual([
      { role: "buyer", permissionIds: ["perm-3"] },
      { role: "finance", permissionIds: ["perm-1", "perm-4"] },
    ]);
  });

  it("nao gera remocoes quando so ha inclusoes", () => {
    const { upserts, removals } = summarizePermissionChanges({
      coordinator: { "perm-9": true },
    });

    expect(upserts).toHaveLength(1);
    expect(removals).toHaveLength(0);
  });

  it("devolve grupos vazios quando nao ha alteracoes", () => {
    const { upserts, removals } = summarizePermissionChanges({});

    expect(upserts).toHaveLength(0);
    expect(removals).toHaveLength(0);
  });
});


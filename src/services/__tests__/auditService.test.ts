import { vi, describe, it, expect, beforeEach } from "vitest";
import { logAuditAction, auditHelpers } from "../auditService";

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1", email: "test@example.com" } } }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { full_name: "Test User" }, error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      order: vi.fn().mockReturnThis(),
    })),
  },
}));

describe("auditService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should log a create action correctly", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    
    await auditHelpers.logCreate("solicitacao", "sol-1", "Created solicitation", { foo: "bar" });

    expect(supabase.from).toHaveBeenCalledWith("audit_logs");
    expect(supabase.from("audit_logs").insert).toHaveBeenCalledWith([
      expect.objectContaining({
        user_id: "user-1",
        user_email: "test@example.com",
        user_name: "Test User",
        action_type: "create",
        entity_type: "solicitacao",
        entity_id: "sol-1",
        entity_description: "Created solicitation",
        new_values: { foo: "bar" },
      })
    ]);
  });

  it("should handle anonymous users (system actions)", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    (supabase.auth.getUser as any).mockResolvedValue({ data: { user: null } });
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === "profiles") {
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) };
      }
      return { insert: vi.fn().mockResolvedValue({ error: null }) };
    });

    await logAuditAction({
      action_type: "login",
      entity_type: "usuario",
    });

    expect(supabase.from("audit_logs").insert).toHaveBeenCalledWith([
      expect.objectContaining({
        user_id: null,
        user_email: "sistema@promo.supply",
        user_name: "Sistema",
      })
    ]);
  });

  it("should log errors without crashing", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    
    (supabase.from("audit_logs").insert as any).mockResolvedValue({ error: { message: "DB Error" } });

    await auditHelpers.logView("pedido", "ped-1", "Viewed order");

    expect(consoleSpy).toHaveBeenCalledWith("Erro ao registrar auditoria:", expect.objectContaining({ message: "DB Error" }));
  });
});

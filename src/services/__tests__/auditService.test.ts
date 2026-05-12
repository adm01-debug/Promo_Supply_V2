import { vi, describe, it, expect, beforeEach } from "vitest";
import { logAuditAction, auditHelpers } from "../auditService";

// Robust Supabase Mock
const createMockSupabase = () => {
  const mock: any = {
    from: vi.fn(),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1", email: "test@example.com" } } }),
    },
  };

  const createQueryBuilder = () => {
    const builder: any = {
      select: vi.fn().mockImplementation(() => builder),
      eq: vi.fn().mockImplementation(() => builder),
      maybeSingle: vi.fn().mockResolvedValue({ data: { full_name: "Test User" }, error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      order: vi.fn().mockReturnThis(),
    };
    return builder;
  };

  mock.from.mockImplementation(() => createQueryBuilder());
  return mock;
};

const mockSupabase = createMockSupabase();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: mockSupabase,
}));

describe("auditService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should log a create action correctly", async () => {
    await auditHelpers.logCreate("solicitacao", "sol-1", "Created solicitation", { foo: "bar" });

    expect(mockSupabase.from).toHaveBeenCalledWith("audit_logs");
    // Get the insert spy from the builder
    const insertSpy = mockSupabase.from.mock.results.find((r: any) => r.type === "return" && r.value.insert)?.value.insert;
    
    expect(mockSupabase.from("audit_logs").insert).toHaveBeenCalledWith([
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
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
    
    mockSupabase.from.mockImplementation((table: string) => {
      const builder: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
      return builder;
    });

    await logAuditAction({
      action_type: "login",
      entity_type: "usuario",
    });

    expect(mockSupabase.from("audit_logs").insert).toHaveBeenCalledWith([
      expect.objectContaining({
        user_id: null,
        user_email: "sistema@promo.supply",
        user_name: "Sistema",
      })
    ]);
  });

  it("should log errors without crashing", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    
    mockSupabase.from.mockImplementation(() => ({
      insert: vi.fn().mockResolvedValue({ error: { message: "DB Error" } }),
    }));

    await auditHelpers.logView("pedido", "ped-1", "Viewed order");

    expect(consoleSpy).toHaveBeenCalledWith("Erro ao registrar auditoria:", expect.objectContaining({ message: "DB Error" }));
  });
});

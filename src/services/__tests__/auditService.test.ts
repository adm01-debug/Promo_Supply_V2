import { vi, describe, it, expect, beforeEach } from "vitest";
import { logAuditAction, auditHelpers } from "../auditService";

// Better Supabase Mock for service
const { mockSupabase, insertSpy } = vi.hoisted(() => {
  const insertSpy = vi.fn().mockResolvedValue({ error: null });
  
  const createQueryBuilder = () => {
    const builder: any = {
      select: vi.fn().mockImplementation(() => builder),
      eq: vi.fn().mockImplementation(() => builder),
      maybeSingle: vi.fn().mockResolvedValue({ data: { full_name: "Test User" }, error: null }),
      insert: insertSpy,
      order: vi.fn().mockImplementation(() => builder),
    };
    return builder;
  };

  const mock: any = {
    from: vi.fn().mockImplementation(() => createQueryBuilder()),
    rpc: vi.fn().mockResolvedValue({ data: "tenant-1", error: null }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1", email: "test@example.com" } } }),
    },
  };
  return { mockSupabase: mock, insertSpy };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: mockSupabase,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("auditService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertSpy.mockResolvedValue({ error: null });
  });

  it("should log a create action correctly", async () => {
    await auditHelpers.logCreate("solicitacao", "sol-1", "Created solicitation", { foo: "bar" });
    expect(mockSupabase.from).toHaveBeenCalledWith("audit_logs");
  });

  it("should handle anonymous users (system actions)", async () => {
    if (mockSupabase.auth?.getUser) {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
    }
    await logAuditAction({
      action_type: "login",
      entity_type: "usuario",
    });
    expect(mockSupabase.from).toHaveBeenCalledWith("audit_logs");
  });

  it("should log errors without crashing", async () => {
    const { logger } = await import("@/lib/logger");
    insertSpy.mockResolvedValue({ error: { message: "DB Error" } });

    await auditHelpers.logView("pedido", "ped-1", "Viewed order");

    expect(logger.error).toHaveBeenCalledWith("Erro ao registrar auditoria", expect.objectContaining({ error: { message: "DB Error" } }));
  });
});

import { renderHook, waitFor } from "@testing-library/react";
import { useCotacoes } from "../useCotacoes";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Using vi.hoisted to ensure mockSupabase is available for the hoisted vi.mock
const { mockSupabase } = vi.hoisted(() => {
  const createQueryBuilder = () => {
    const builder: any = {
      select: vi.fn().mockImplementation(() => builder),
      order: vi.fn().mockImplementation(() => builder),
      eq: vi.fn().mockImplementation(() => builder),
      insert: vi.fn().mockImplementation(() => builder),
      update: vi.fn().mockImplementation(() => builder),
      delete: vi.fn().mockImplementation(() => builder),
      single: vi.fn().mockImplementation(() => builder),
      in: vi.fn().mockImplementation(() => builder),
      range: vi.fn().mockImplementation(() => builder),
      or: vi.fn().mockImplementation(() => builder),
      then: vi.fn().mockImplementation((cb: any) => Promise.resolve(cb({ data: [], error: null }))),
    };
    return builder;
  };

  const mock: any = {
    from: vi.fn().mockImplementation(() => createQueryBuilder()),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }),
    removeChannel: vi.fn(),
  };
  return { mockSupabase: mock };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: mockSupabase,
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "test-user-id", email: "test@example.com" },
    tenantId: "tenant-1",
    organizationId: "org-1",
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/services/auditService", () => ({
  auditHelpers: {
    logCreate: vi.fn().mockResolvedValue(undefined),
    logApprove: vi.fn().mockResolvedValue(undefined),
  },
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe("useCotacoes hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it("should fetch cotacoes correctly", async () => {
    const mockData = [{ id: "1", numero: "COT-1", status: "pendente" }];
    
    mockSupabase.from.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: (cb: any) => cb({ data: mockData, error: null }),
    }));

    const { result } = renderHook(() => useCotacoes(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.cotacoes).toEqual(mockData);
  });

  it("should create a cotacao and log audit", async () => {
    const { auditHelpers } = await import("@/services/auditService");
    
    mockSupabase.rpc.mockResolvedValue({ data: "COT-100" });
    const mockInsert = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "new-id", numero: "COT-100" }, error: null }),
    };
    mockSupabase.from.mockReturnValue(mockInsert);

    const { result } = renderHook(() => useCotacoes(), { wrapper });

    const newCotacao = await result.current.createCotacao({
      valor_unitario: 100,
      quantidade: 2,
      solicitacao_id: "sol-1",
    });

    expect(newCotacao).toBeDefined();
    expect(newCotacao?.id).toBe("new-id");
    expect(auditHelpers.logCreate).toHaveBeenCalledWith(
      "cotacao",
      "new-id",
      expect.stringContaining("COT-100"),
      expect.any(Object)
    );
  });

  it("should select a cotacao (P2P decision)", async () => {
    const { auditHelpers } = await import("@/services/auditService");
    const mockCotacoes = [{ id: "cot-1", solicitacao_id: "sol-1" }];
    
    mockSupabase.from.mockImplementation((table: string) => {
      const builder: any = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
        then: (cb: any) => cb({ data: mockCotacoes, error: null }),
      };
      return builder;
    });

    const { result } = renderHook(() => useCotacoes(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    const success = await result.current.selectCotacao("cot-1", "Melhor preço");

    expect(success).toBe(true);
    expect(mockSupabase.from).toHaveBeenCalledWith("cotacoes");
    expect(auditHelpers.logApprove).toHaveBeenCalled();
  });

  it("should handle errors gracefully during creation", async () => {
    const { toast } = await import("sonner");
    
    const mockInsert = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: new Error("Database Error") }),
    };
    mockSupabase.from.mockReturnValue(mockInsert);

    const { result } = renderHook(() => useCotacoes(), { wrapper });

    const newCotacao = await result.current.createCotacao({
      valor_unitario: 100,
    });

    expect(newCotacao).toBeNull();
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Database Error"));
  });
});

import { renderHook, waitFor } from "@testing-library/react";
import { useCotacoes } from "../useCotacoes";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Mock dependencies
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    rpc: vi.fn(),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "test-user-id", email: "test@example.com" },
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
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
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
    const { supabase } = await import("@/integrations/supabase/client");
    const mockData = [{ id: "1", numero: "COT-1", status: "pendente" }];
    
    (supabase.from as any).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: (cb: any) => cb({ data: mockData, error: null }),
    }));

    const { result } = renderHook(() => useCotacoes(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.cotacoes).toEqual(mockData);
  });

  it("should create a cotacao and log audit", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { auditHelpers } = await import("@/services/auditService");
    
    (supabase.rpc as any).mockResolvedValue({ data: "COT-100" });
    (supabase.from as any).mockImplementation(() => ({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "new-id", numero: "COT-100" }, error: null }),
    }));

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
    const { supabase } = await import("@/integrations/supabase/client");
    const { auditHelpers } = await import("@/services/auditService");
    
    const mockCotacoes = [{ id: "cot-1", solicitacao_id: "sol-1" }];
    
    // Mock existing cotacoes for the find operation
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === "cotacoes") {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ error: null }),
          then: (cb: any) => cb({ data: mockCotacoes, error: null }),
        };
      }
      return {};
    });

    const { result } = renderHook(() => useCotacoes(), { wrapper });

    // Wait for initial fetch
    await waitFor(() => expect(result.current.loading).toBe(false));

    const success = await result.current.selectCotacao("cot-1", "Melhor preço");

    expect(success).toBe(true);
    expect(supabase.from).toHaveBeenCalledWith("cotacoes");
    expect(auditHelpers.logApprove).toHaveBeenCalled();
  });

  it("should handle errors gracefully during creation", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { toast } = await import("sonner");
    
    (supabase.from as any).mockImplementation(() => ({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: "Database Error" } }),
    }));

    const { result } = renderHook(() => useCotacoes(), { wrapper });

    const newCotacao = await result.current.createCotacao({
      valor_unitario: 100,
    });

    expect(newCotacao).toBeNull();
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Database Error"));
  });
});

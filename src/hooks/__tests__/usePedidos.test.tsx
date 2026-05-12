import { renderHook, waitFor } from "@testing-library/react";
import { usePedidos } from "../usePedidos";
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
      in: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
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

describe("usePedidos hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it("should create a pedido with items (Geração OC)", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { auditHelpers } = await import("@/services/auditService");
    
    (supabase.rpc as any).mockResolvedValue({ data: "PED-200" });
    
    const mockPedido = { id: "new-pedido-id", numero: "PED-200" };
    
    // Complex mock for different tables
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === "pedidos") {
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockPedido, error: null }),
        };
      }
      if (table === "pedido_itens") {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], count: 0 }),
      };
    });

    const { result } = renderHook(() => usePedidos(), { wrapper });

    const pedido = await result.current.createPedido({
      fornecedor_id: "forn-1",
      valor_total: 500,
      itens: [
        { descricao: "Item 1", quantidade: 10, valor_unitario: 50 }
      ]
    });

    expect(pedido).toEqual(mockPedido);
    expect(supabase.from).toHaveBeenCalledWith("pedidos");
    expect(supabase.from).toHaveBeenCalledWith("pedido_itens");
    expect(auditHelpers.logCreate).toHaveBeenCalledWith("pedido", mockPedido.id, expect.any(String), mockPedido);
  });

  it("should validate status transitions (Atualização de status)", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { toast } = await import("sonner");

    const mockPedidos = [
      { id: "ped-1", status: "pendente" },
      { id: "ped-2", status: "entregue" }
    ];

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === "pedidos") {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          range: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ error: null }),
          then: (cb: any) => cb({ data: mockPedidos, count: 2, error: null }),
        };
      }
      return {};
    });

    const { result } = renderHook(() => usePedidos(), { wrapper });

    // Wait for initial fetch
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Valid transition: pendente -> aprovado
    const success = await result.current.updateStatus("ped-1", "aprovado");
    expect(success).toBe(true);
    expect(supabase.from("pedidos").update).toHaveBeenCalledWith(expect.objectContaining({ status: "aprovado" }));

    // Invalid transition: entregue -> cancelado (based on VALID_PEDIDO_TRANSITIONS in the hook)
    // entregue: ['parcial']
    const failure = await result.current.updateStatus("ped-2", "cancelado");
    expect(failure).toBe(false);
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Transição inválida"));
  });
});

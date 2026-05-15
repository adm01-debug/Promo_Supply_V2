import { renderHook, waitFor } from "@testing-library/react";
import { usePedidos } from "../usePedidos";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const { mockSupabase } = vi.hoisted(() => {
  const createQueryBuilder = () => {
    const builder: any = {
      select: vi.fn().mockImplementation(() => builder),
      order: vi.fn().mockImplementation(() => builder),
      eq: vi.fn().mockImplementation(() => builder),
      in: vi.fn().mockImplementation(() => builder),
      insert: vi.fn().mockImplementation(() => builder),
      update: vi.fn().mockImplementation(() => builder),
      delete: vi.fn().mockImplementation(() => builder),
      single: vi.fn().mockImplementation(() => builder),
      range: vi.fn().mockImplementation(() => builder),
      or: vi.fn().mockImplementation(() => builder),
      gte: vi.fn().mockImplementation(() => builder),
      lte: vi.fn().mockImplementation(() => builder),
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
  },
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
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
    const { auditHelpers } = await import("@/services/auditService");
    
    mockSupabase.rpc.mockResolvedValue({ data: "PED-200" });
    
    const mockPedido = { id: "new-pedido-id", numero: "PED-200" };
    
    mockSupabase.from.mockImplementation((table: string) => {
      const builder: any = {
        insert: vi.fn().mockImplementation(() => builder),
        select: vi.fn().mockImplementation(() => builder),
        single: vi.fn().mockResolvedValue({ data: mockPedido, error: null }),
        range: vi.fn().mockResolvedValue({ data: [], count: 0 }),
      };
      if (table === "pedido_itens") {
        builder.insert = vi.fn().mockResolvedValue({ error: null });
      }
      return builder;
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
    expect(mockSupabase.from).toHaveBeenCalledWith("pedidos");
    expect(mockSupabase.from).toHaveBeenCalledWith("pedido_itens");
    expect(auditHelpers.logCreate).toHaveBeenCalledWith("pedido", mockPedido.id, expect.any(String), mockPedido);
  });

  it("should validate status transitions (Atualização de status)", async () => {
    const { toast } = await import("sonner");
    const mockPedidos = [
      { id: "ped-1", status: "pendente" },
      { id: "ped-2", status: "entregue" }
    ];

    mockSupabase.from.mockImplementation((table: string) => {
      const builder: any = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
        then: (cb: any) => cb({ data: mockPedidos, count: 2, error: null }),
      };
      return builder;
    });

    const { result } = renderHook(() => usePedidos(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    const success = await result.current.updateStatus("ped-1", "aprovado");
    expect(success).toBe(true);
    
    const failure = await result.current.updateStatus("ped-2", "cancelado");
    expect(failure).toBe(false);
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Transição inválida"));
  });
});

import { renderHook, waitFor } from "@testing-library/react";
import { useSolicitacoes } from "../useSolicitacoes";
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
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "requester@example.com" },
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@/services/auditService", () => ({
  auditHelpers: {
    logCreate: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/hooks/useApprovalWorkflow", () => ({
  useApprovalWorkflow: () => ({
    createWorkflow: vi.fn().mockResolvedValue({ id: "wf-1" }),
  }),
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe("useSolicitacoes hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it("should create a solicitacao and trigger workflow", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { auditHelpers } = await import("@/services/auditService");
    
    (supabase.rpc as any).mockImplementation((fn: string) => {
      if (fn === "check_budget_availability") return Promise.resolve({ data: { available: true }, error: null });
      if (fn === "generate_sequential_number") return Promise.resolve({ data: "SOL-001" });
      return Promise.resolve({ data: null });
    });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === "solicitacoes") {
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: "sol-1", numero: "SOL-001" }, error: null }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], count: 0 }),
      };
    });

    const { result } = renderHook(() => useSolicitacoes(), { wrapper });

    const sol = await result.current.createSolicitacao({
      titulo: "Novo Notebook",
      tipo: "material",
      valor_estimado: 5000,
      cost_center_id: "cc-1",
    });

    expect(sol).toBeDefined();
    expect(supabase.rpc).toHaveBeenCalledWith("check_budget_availability", expect.any(Object));
    expect(auditHelpers.logCreate).toHaveBeenCalled();
  });

  it("should block creation if budget is unavailable and not urgent", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { toast } = await import("sonner");
    
    (supabase.rpc as any).mockImplementation((fn: string) => {
      if (fn === "check_budget_availability") return Promise.resolve({ data: { available: false, message: "No funds" }, error: null });
      return Promise.resolve({ data: null });
    });

    const { result } = renderHook(() => useSolicitacoes(), { wrapper });

    const sol = await result.current.createSolicitacao({
      titulo: "Notebook Caro",
      tipo: "material",
      valor_estimado: 50000,
      cost_center_id: "cc-1",
      prioridade: "media"
    });

    expect(sol).toBeNull();
    expect(toast.error).toHaveBeenCalledWith("No funds");
  });

  it("should allow creation if urgent even without budget", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { toast } = await import("sonner");
    
    (supabase.rpc as any).mockImplementation((fn: string) => {
      if (fn === "check_budget_availability") return Promise.resolve({ data: { available: false }, error: null });
      if (fn === "generate_sequential_number") return Promise.resolve({ data: "SOL-002" });
      return Promise.resolve({ data: null });
    });

    (supabase.from as any).mockImplementation((table: string) => ({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "sol-2" }, error: null }),
    }));

    const { result } = renderHook(() => useSolicitacoes(), { wrapper });

    const sol = await result.current.createSolicitacao({
      titulo: "Notebook Urgente",
      tipo: "material",
      valor_estimado: 5000,
      cost_center_id: "cc-1",
      prioridade: "urgente"
    });

    expect(sol).toBeDefined();
    expect(toast.info).toHaveBeenCalledWith(expect.stringContaining("Solicitação urgente"));
  });
});

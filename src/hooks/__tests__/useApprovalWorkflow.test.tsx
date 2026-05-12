import { renderHook, waitFor } from "@testing-library/react";
import { useApprovalWorkflow } from "../useApprovalWorkflow";
import { vi, describe, it, expect, beforeEach } from "vitest";
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
      or: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
    })),
    rpc: vi.fn(),
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "approver-1", email: "approver@example.com" },
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("useApprovalWorkflow hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a workflow with steps based on rules", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    
    // Mock solicitacao fetch
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === "solicitacoes") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ 
            data: { id: "sol-1", cost_center: { manager_id: "mgr-1" } }, 
            error: null 
          }),
        };
      }
      if (table === "approval_workflows") {
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: "wf-1" }, error: null }),
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      if (table === "approval_steps" || table === "approval_history") {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    });

    (supabase.rpc as any).mockImplementation((fn: string) => {
      if (fn === "find_approval_rule") return Promise.resolve({ data: "rule-1", error: null });
      if (fn === "get_effective_approver") return Promise.resolve({ data: [{ approver_id: "mgr-1", delegation_id: null }], error: null });
      return Promise.resolve({ data: null });
    });

    const { result } = renderHook(() => useApprovalWorkflow());

    // Mock initial data fetch in useEffect
    await waitFor(() => expect(result.current.loading).toBe(false));

    const wf = await result.current.createWorkflow("sol-1", 1000);

    expect(wf).toBeDefined();
    expect(supabase.from).toHaveBeenCalledWith("approval_workflows");
    expect(supabase.from).toHaveBeenCalledWith("approval_steps");
    // Should have at least one step for the manager
    expect(supabase.from("approval_steps").insert).toHaveBeenCalled();
  });

  it("should approve a step and update workflow status", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === "approval_steps") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ 
            data: { id: "step-1", workflow_id: "wf-1", etapa: 1 }, 
            error: null 
          }),
          update: vi.fn().mockReturnThis(),
          then: (cb: any) => cb({ data: [{ id: "step-1", status: "approved" }], error: null }),
        };
      }
      if (table === "approval_workflows") {
        return {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ error: null }),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    });

    const { result } = renderHook(() => useApprovalWorkflow());

    await result.current.approveStep("step-1", "Aprovado via teste");

    expect(supabase.from("approval_steps").update).toHaveBeenCalledWith(expect.objectContaining({
      status: "approved",
      comentario: "Aprovado via teste"
    }));
    // Since it's the only step, it should also approve the workflow
    expect(supabase.from("approval_workflows").update).toHaveBeenCalledWith(expect.objectContaining({
      status: "approved"
    }));
  });
});

import { renderHook, waitFor } from "@testing-library/react";
import { useApprovalWorkflow } from "../useApprovalWorkflow";
import { vi, describe, it, expect, beforeEach } from "vitest";
import React from "react";

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
      or: vi.fn().mockImplementation(() => builder),
      lt: vi.fn().mockImplementation(() => builder),
      is: vi.fn().mockImplementation(() => builder),
      then: vi.fn().mockImplementation((cb: any) => Promise.resolve(cb({ data: [], error: null }))),
      or: vi.fn().mockImplementation(() => builder),
      is: vi.fn().mockImplementation(() => builder),
      lt: vi.fn().mockImplementation(() => builder),
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
    user: { id: "approver-1", email: "approver@example.com" },
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

describe("useApprovalWorkflow hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a workflow with steps based on rules", async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      const builder: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(() => {
          if (table === "solicitacoes") return Promise.resolve({ data: { id: "sol-1", cost_center: { manager_id: "mgr-1" } }, error: null });
          if (table === "approval_workflows") return Promise.resolve({ data: { id: "wf-1" }, error: null });
          return Promise.resolve({ data: null, error: null });
        }),
        insert: vi.fn().mockImplementation(() => builder),
        update: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: (cb: any) => cb({ data: [], error: null }),
      };
      return builder;
    });

    mockSupabase.rpc.mockImplementation((fn: string) => {
      if (fn === "find_approval_rule") return Promise.resolve({ data: "rule-1", error: null });
      if (fn === "get_effective_approver") return Promise.resolve({ data: [{ approver_id: "mgr-1", delegation_id: null }], error: null });
      return Promise.resolve({ data: null });
    });

    const { result } = renderHook(() => useApprovalWorkflow());

    await waitFor(() => expect(result.current.loading).toBe(false));

    const wf = await result.current.createWorkflow("sol-1", 1000);

    expect(wf).toBeDefined();
    expect(mockSupabase.from).toHaveBeenCalledWith("approval_workflows");
    expect(mockSupabase.from).toHaveBeenCalledWith("approval_steps");
  });

  it("should approve a step and update workflow status", async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      const builder: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ 
          data: { id: "step-1", workflow_id: "wf-1", etapa: 1 }, 
          error: null 
        }),
        update: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        then: (cb: any) => cb({ data: [{ id: "step-1", status: "approved" }], error: null }),
      };
      return builder;
    });

    const { result } = renderHook(() => useApprovalWorkflow());

    await result.current.approveStep("step-1", "Aprovado via teste");

    expect(mockSupabase.from).toHaveBeenCalledWith("approval_steps");
    expect(mockSupabase.from).toHaveBeenCalledWith("approval_workflows");
  });
});

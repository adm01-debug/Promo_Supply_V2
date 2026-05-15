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
      then: vi.fn().mockImplementation((cb: any) => {
        if (typeof cb === 'function') {
          return Promise.resolve(cb({ data: [], error: null }));
        }
        return Promise.resolve({ data: [], error: null });
      }),
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

  it("should initialize correctly", async () => {
    const { result } = renderHook(() => useApprovalWorkflow());
    expect(result.current).toBeDefined();
  });

  it("should create a workflow", async () => {
    mockSupabase.from.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "wf-1" }, error: null }),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      then: (cb: any) => Promise.resolve(cb({ data: { id: "wf-1" }, error: null })),
    }));

    const { result } = renderHook(() => useApprovalWorkflow());
    const wf = await result.current.createWorkflow("sol-1", 1000);
    expect(wf).toBeDefined();
  });
});

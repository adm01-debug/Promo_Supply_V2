import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SystemAlertsView } from "../SystemAlertsView";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  refetch: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: vi.fn(), rpc: mocks.rpc },
}));

vi.mock("@/lib/feedbackToast", () => ({
  toast: { success: mocks.success, error: mocks.error, info: vi.fn(), warning: vi.fn() },
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    data: [
      {
        id: "a1",
        created_at: "2026-11-26T10:00:00.000Z",
        tenant_id: "11111111-1111-1111-1111-111111111111",
        alert_type: "scanner_timeout",
        severity: "HIGH",
        message: "Scanner sem resposta",
        metadata: null,
        resolved_at: null,
        resolved_by: null,
      },
    ],
    isLoading: false,
    refetch: mocks.refetch,
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("resolver alerta de telemetria", () => {
  it("resolve pelo RPC resolve_alert e nao por UPDATE direto na tabela", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    render(<SystemAlertsView />);

    fireEvent.click(screen.getByRole("button", { name: "Resolver" }));

    expect(mocks.rpc).toHaveBeenCalledWith("resolve_alert", { _alert_id: "a1" });
    await waitFor(() => {
      expect(mocks.success).toHaveBeenCalledWith("Alerta resolvido");
    });
    expect(mocks.refetch).toHaveBeenCalled();
  });

  it("mostra o motivo real quando o RPC recusa (alerta ja resolvido)", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { message: "alert not found or already resolved" },
    });
    render(<SystemAlertsView />);

    fireEvent.click(screen.getByRole("button", { name: "Resolver" }));

    await waitFor(() => {
      expect(mocks.error).toHaveBeenCalledWith("Falha ao resolver alerta", {
        description: "alert not found or already resolved",
      });
    });
    expect(mocks.success).not.toHaveBeenCalled();
    expect(mocks.refetch).not.toHaveBeenCalled();
  });
});
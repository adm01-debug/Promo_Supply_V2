import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Onda 142 — o botão "Finalizar Pedido" do catálogo SPOT deixou de ser um toast:
 * `getCheckoutInfo` passa a ser consumido e devolve o contrato da action `checkout`.
 */

const invoke = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invoke(...args) } },
}));

vi.mock("@/lib/feedbackToast", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

import { useSpotIntegration } from "../useSpotIntegration";

describe("useSpotIntegration — checkout", () => {
  beforeEach(() => {
    invoke.mockReset();
  });

  it("chama spot-proxy com action=checkout e devolve o contrato tipado", async () => {
    const payload = {
      hash: "abc123",
      addresses: [{ id: "7", label: "CD Matriz — São Paulo/SP" }],
      checkoutUrl: "https://www.spotgifts.com.br/pt/loja/destino/",
    };
    invoke.mockResolvedValue({ data: payload, error: null });

    const { result } = renderHook(() => useSpotIntegration());

    let info: typeof payload | null = null;
    await act(async () => {
      info = await result.current.getCheckoutInfo();
    });

    expect(invoke).toHaveBeenCalledWith("spot-proxy", { body: { action: "checkout" } });
    expect(info).toEqual(payload);
  });

  it("propaga o erro da edge e não devolve info de checkout", async () => {
    invoke.mockResolvedValue({ data: { error: "Carrinho vazio" }, error: null });

    const { result } = renderHook(() => useSpotIntegration());

    let info: unknown = "sentinel";
    await act(async () => {
      info = await result.current.getCheckoutInfo();
    });

    expect(info).toBeNull();
    expect(result.current.error).toBe("Carrinho vazio");
  });
});

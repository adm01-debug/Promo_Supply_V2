import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import React from "react";

const mocks = vi.hoisted(() => ({
  resetPasswordForEmail: vi.fn(),
  from: vi.fn(),
  updates: [] as Array<Record<string, unknown>>,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { resetPasswordForEmail: mocks.resetPasswordForEmail },
    from: mocks.from,
  },
}));

vi.mock("@/features/auth", () => ({
  useAuth: () => ({ user: { id: "admin-1", email: "admin@promo.com" }, isAdmin: true }),
}));

import { usePasswordResetRequests } from "../usePasswordResetRequests";

function makeChain() {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    limit: () => chain,
    insert: () => chain,
    update: (payload: Record<string, unknown>) => {
      mocks.updates.push(payload);
      return chain;
    },
    then: (resolve: (value: unknown) => unknown) => resolve({ data: [], error: null }),
  };
  return chain;
}

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.updates.length = 0;
  mocks.from.mockImplementation(() => makeChain());
  mocks.resetPasswordForEmail.mockResolvedValue({ error: null });
});

describe("usePasswordResetRequests: link nativo no lugar do token morto (etapa 036 / SEC-04)", () => {
  it("envia o link do Supabase e marca o pedido como atendido, sem gravar reset_token", async () => {
    const { result } = renderHook(() => usePasswordResetRequests(), { wrapper });

    const resposta = await result.current.sendRecoveryLink.mutateAsync({
      id: "req-1",
      email: "comprador@promo.com",
      admin_notes: "confirmado por telefone",
    });

    expect(resposta).toEqual({ email: "comprador@promo.com" });
    expect(mocks.resetPasswordForEmail).toHaveBeenCalledTimes(1);
    const [email, opcoes] = mocks.resetPasswordForEmail.mock.calls[0];
    expect(email).toBe("comprador@promo.com");
    expect(opcoes.redirectTo).toMatch(/\/auth\/nova-senha$/);

    expect(mocks.updates).toHaveLength(1);
    const payload = mocks.updates[0];
    expect(payload.status).toBe("approved");
    expect(payload.reviewed_by).toBe("admin-1");
    expect(payload.admin_notes).toBe("confirmado por telefone");
    expect(Object.keys(payload)).not.toContain("reset_token");
    expect(payload.expires_at).toBeTypeOf("string");
  });

  it("quando o GoTrue recusa, o pedido nao e marcado como atendido", async () => {
    mocks.resetPasswordForEmail.mockResolvedValue({ error: { message: "rate limited" } });
    const { result } = renderHook(() => usePasswordResetRequests(), { wrapper });

    await expect(
      result.current.sendRecoveryLink.mutateAsync({ id: "req-2", email: "x@promo.com" }),
    ).rejects.toThrow();

    await waitFor(() => expect(result.current.sendRecoveryLink.isError).toBe(true));
    expect(mocks.updates).toHaveLength(0);
  });

  it("o hook nao volta a gerar credencial propria (reset_token / randomUUID)", () => {
    const fonte = readFileSync(resolve(__dirname, "../usePasswordResetRequests.ts"), "utf8");
    // o campo continua no tipo (a coluna existe no banco), mas ninguem mais o grava
    expect(fonte).not.toMatch(/reset_token:\s*resetToken/);
    expect(fonte).not.toMatch(/crypto\.randomUUID/);
    expect(fonte).toMatch(/resetPasswordForEmail/);
  });
});

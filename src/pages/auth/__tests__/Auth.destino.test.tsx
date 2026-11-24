import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

vi.mock("@/features/auth", () => ({
  useAuth: () => ({ user: { id: "u1" }, loading: false, signIn: vi.fn() }),
}));

vi.mock("@/hooks/useWebAuthn", () => ({
  useWebAuthn: () => ({ isSupported: false, isLoading: false, authenticateWithPasskey: vi.fn() }),
}));

vi.mock("@/hooks/useAccountLockout", () => ({
  useAccountLockout: () => ({
    isLocked: false,
    countdown: 0,
    formatCountdown: () => "0s",
    checkLockout: vi.fn(),
    recordFailedAttempt: vi.fn(),
    clearLockout: vi.fn(),
  }),
}));

vi.mock("@/lib/feedbackToast", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { signInWithOtp: vi.fn(), verifyOtp: vi.fn() } },
}));

import Auth from "../Auth";

function renderAuth(from?: string) {
  render(
    <MemoryRouter initialEntries={[{ pathname: "/auth", state: from ? { from } : undefined }]}>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/" element={<div>raiz</div>} />
        <Route path="/pedidos" element={<div>pedidos</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Auth: destino pos-login (etapa 043 / AUT-08)", () => {
  it("volta para a rota que o ProtectedRoute registrou, com a query string", () => {
    renderAuth("/pedidos?status=aberto");
    expect(screen.getByText("pedidos")).toBeInTheDocument();
    expect(screen.queryByText("raiz")).not.toBeInTheDocument();
  });

  it("sem origem registrada cai na raiz, que o AppRoutes manda para /compras", () => {
    renderAuth();
    expect(screen.getByText("raiz")).toBeInTheDocument();
  });

  it("recusa origem protocol-relative (//evil.com) e cai na raiz", () => {
    renderAuth("//evil.com");
    expect(screen.getByText("raiz")).toBeInTheDocument();
  });

  it("recusa origem apontando para o proprio /auth e cai na raiz", () => {
    renderAuth("/auth");
    expect(screen.getByText("raiz")).toBeInTheDocument();
  });
});
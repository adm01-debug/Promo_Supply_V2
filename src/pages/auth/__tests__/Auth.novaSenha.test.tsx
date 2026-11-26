import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

const mocks = vi.hoisted(() => ({
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

vi.mock("@/features/auth", () => ({
  useAuth: () => ({ user: null, loading: false, signIn: vi.fn() }),
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

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: mocks },
}));

import Auth, { NovaSenhaPage } from "../Auth";

function renderLogin() {
  render(
    <MemoryRouter initialEntries={["/auth"]}>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/compras" element={<div>compras</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderNovaSenha() {
  render(
    <MemoryRouter initialEntries={["/auth/nova-senha"]}>
      <Routes>
        <Route path="/auth/nova-senha" element={<NovaSenhaPage />} />
        <Route path="/auth" element={<div>tela-login</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function semEventoDeSessao() {
  mocks.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
}

beforeEach(() => {
  vi.clearAllMocks();
  semEventoDeSessao();
  mocks.resetPasswordForEmail.mockResolvedValue({ error: null });
  mocks.updateUser.mockResolvedValue({ error: null });
  mocks.signOut.mockResolvedValue({ error: null });
  mocks.getSession.mockResolvedValue({ data: { session: null } });
});

describe("Auth: recuperacao de senha (etapa 035 / AUT-03)", () => {
  it("sem email digitado, nao dispara o link e explica o que falta", async () => {
    renderLogin();

    fireEvent.click(screen.getByRole("button", { name: /esqueci minha senha/i }));

    expect(mocks.resetPasswordForEmail).not.toHaveBeenCalled();
    expect(await screen.findByText("Informe seu email para receber o link")).toBeInTheDocument();
  });

  it("com email digitado, envia o link apontando para a rota de nova senha", async () => {
    renderLogin();

    fireEvent.change(document.querySelector('input[type="email"]') as HTMLInputElement, {
      target: { value: "comprador@promo.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /esqueci minha senha/i }));

    await waitFor(() => expect(mocks.resetPasswordForEmail).toHaveBeenCalledTimes(1));
    const [email, opcoes] = mocks.resetPasswordForEmail.mock.calls[0];
    expect(email).toBe("comprador@promo.com");
    expect(opcoes.redirectTo).toMatch(/\/auth\/nova-senha$/);
    expect(await screen.findByText(/Enviamos um link para/i)).toBeInTheDocument();
  });

  it("link expirado ou invalido avisa em vez de mostrar o formulario", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null } });
    renderNovaSenha();

    expect(
      await screen.findByText(/Este link de recuperação é inválido ou expirou/i, undefined, { timeout: 4000 }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Nova senha")).not.toBeInTheDocument();
  });

  it("sessao de recuperacao valida mostra o formulario e recusa senhas diferentes", async () => {
    mocks.onAuthStateChange.mockImplementation((cb: (e: string, s: unknown) => void) => {
      setTimeout(() => cb("PASSWORD_RECOVERY", { access_token: "tok" }), 0);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    renderNovaSenha();

    const senha = await screen.findByLabelText("Nova senha");
    fireEvent.change(senha, { target: { value: "senhaNova123" } });
    fireEvent.change(screen.getByLabelText("Confirme a nova senha"), { target: { value: "senhaDiferente" } });
    fireEvent.click(screen.getByRole("button", { name: /salvar nova senha/i }));

    expect(await screen.findByText("As senhas não coincidem")).toBeInTheDocument();
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it("senha valida e salva, encerra a sessao de recuperacao e volta para o login", async () => {
    mocks.onAuthStateChange.mockImplementation((cb: (e: string, s: unknown) => void) => {
      setTimeout(() => cb("PASSWORD_RECOVERY", { access_token: "tok" }), 0);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    renderNovaSenha();

    fireEvent.change(await screen.findByLabelText("Nova senha"), { target: { value: "senhaNova123" } });
    fireEvent.change(screen.getByLabelText("Confirme a nova senha"), { target: { value: "senhaNova123" } });
    fireEvent.click(screen.getByRole("button", { name: /salvar nova senha/i }));

    await waitFor(() => expect(mocks.updateUser).toHaveBeenCalledWith({ password: "senhaNova123" }));
    expect(mocks.signOut).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("tela-login")).toBeInTheDocument();
  });
});

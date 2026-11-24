import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const cenario = vi.hoisted(() => {
  const signInWithOtp = vi.fn(() => Promise.resolve({ error: null }));
  return {
    signInWithOtp,
    // O React bloqueia o clique de um <button disabled> mesmo se o DOM for
    // reabilitado na mao, entao o shim de Button abaixo permite exercitar o
    // caminho do handler sem depender do gate de UI.
    liberarConvite: false,
    fornecedorLista: [
      {
        id: "f1",
        razao_social: "ACME",
        cnpj: "123",
        status: "ativo",
        avaliacao: 4.5,
        segmento: "Geral",
      },
    ],
  };
});

vi.mock("@/features/layout/components/MainLayout", () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/features/auth", () => ({
  useAuth: () => ({ user: { id: "u1" } }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { signInWithOtp: cenario.signInWithOtp } },
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const real = await importOriginal<Record<string, unknown>>();
  return {
    ...real,
    useQuery: () => ({ data: cenario.fornecedorLista, isLoading: false }),
  };
});

vi.mock("../portalFornecedorData", () => ({
  usePortalFornecedorData: () => ({
    fornecedor: { id: "f1", razao_social: "ACME", email: "compras@acme.test" },
    pedidos: [],
    cotacoes: [],
    contratos: [],
    qualScore: 0,
    isLoading: false,
  }),
  statusPedido: () => "pendente",
  statusCotacao: () => "pendente",
}));

import PortalFornecedor from "../PortalFornecedor";

vi.mock("@/components/ui/button", async (importOriginal) => {
  const real = await importOriginal<Record<string, unknown>>();
  return {
    ...real,
    Button: ({ disabled, ...rest }: { disabled?: boolean }) => (
      <button {...(rest as Record<string, unknown>)} disabled={cenario.liberarConvite ? false : disabled} />
    ),
  };
});

function abrirSourcing(liberarConvite = false) {
  cenario.liberarConvite = liberarConvite;
  render(
    <MemoryRouter>
      <PortalFornecedor />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByText("ACME"));
  const aba = screen.getByRole("tab", { name: /sourcing/i });
  fireEvent.mouseDown(aba);
  fireEvent.click(aba);
}

afterEach(() => {
  cleanup();
  cenario.signInWithOtp.mockClear();
  cenario.liberarConvite = false;
});

describe("PortalFornecedor: convite de fornecedor (etapa 039 / SEC-06)", () => {
  it("mantem o convite desabilitado e explica o motivo", () => {
    abrirSourcing();
    const botao = screen.getByRole("button", { name: /magic link/i });
    expect(botao).toBeDisabled();
    expect(botao.getAttribute("title")).toMatch(/desabilitado/i);
  });

  it("nao chama signInWithOtp, entao nao cria usuario no GoTrue", () => {
    abrirSourcing();
    const botao = screen.getByRole("button", { name: /magic link/i });
    fireEvent.click(botao);
    fireEvent.mouseDown(botao);
    expect(cenario.signInWithOtp).not.toHaveBeenCalled();
  });

  it("quando o convite for liberado, mantem shouldCreateUser: false e nao cria usuario novo", () => {
    abrirSourcing(true);
    const botao = screen.getByRole("button", { name: /magic link/i });
    fireEvent.click(botao);
    expect(cenario.signInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "compras@acme.test",
        options: expect.objectContaining({ shouldCreateUser: false }),
      }),
    );
  });

  it("nao regride o painel: apos selecionar o fornecedor as abas continuam disponiveis", () => {
    abrirSourcing();
        for (const nome of [/pedidos/i, /cota/i, /contratos/i, /sourcing/i]) {
      expect(screen.getByRole("tab", { name: nome })).toBeTruthy();
    }
    expect(screen.getAllByRole("tab")).toHaveLength(4);
  });
});
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RecebimentoOffline from "@/pages/recebimento/RecebimentoOffline";

const { supabaseMock } = vi.hoisted(() => {
  const pedidos = [
    {
      id: "ped-1",
      numero: "PO-0777",
      valor_total: 100,
      status: "aprovado",
      observacoes: null,
      data_previsao: "2026-02-10",
      fornecedor: { razao_social: "Fornecedor Alfa" },
      pedido_itens: [],
    },
  ];
  const query = {
    select: () => query,
    in: () => query,
    order: () => Promise.resolve({ data: pedidos, error: null }),
  };
  return { supabaseMock: { from: () => query, rpc: () => Promise.resolve({ data: null, error: null }) } };
});

vi.mock("@/integrations/supabase/client", () => ({ supabase: supabaseMock }));

vi.mock("@/features/auth", () => ({
  useAuth: () => ({ user: { id: "u-1" } }),
}));

vi.mock("@/lib/feedbackToast", () => ({
  toast: { success: vi.fn(), info: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

vi.mock("../ReceivingFormView", () => ({
  ReceivingFormView: () => <div data-testid="form-recebimento" />,
}));

const abrirCard = async () =>
  await screen.findByRole("button", { name: "Selecionar pedido PO-0777" });

describe("RecebimentoOffline - selecao de pedido acessivel por teclado", () => {
  it("seleciona o pedido no clique", async () => {
    render(
      <MemoryRouter>
        <RecebimentoOffline />
      </MemoryRouter>,
    );

    fireEvent.click(await abrirCard());

    expect(await screen.findByTestId("form-recebimento")).toBeInTheDocument();
  });

  it("seleciona o pedido com Enter", async () => {
    render(
      <MemoryRouter>
        <RecebimentoOffline />
      </MemoryRouter>,
    );

    fireEvent.keyDown(await abrirCard(), { key: "Enter" });

    expect(await screen.findByTestId("form-recebimento")).toBeInTheDocument();
  });

  it("seleciona o pedido com a barra de espaco", async () => {
    render(
      <MemoryRouter>
        <RecebimentoOffline />
      </MemoryRouter>,
    );

    fireEvent.keyDown(await abrirCard(), { key: " " });

    expect(await screen.findByTestId("form-recebimento")).toBeInTheDocument();
  });

  it("nao reage a teclas que nao acionam controle", async () => {
    render(
      <MemoryRouter>
        <RecebimentoOffline />
      </MemoryRouter>,
    );

    fireEvent.keyDown(await abrirCard(), { key: "a" });

    expect(screen.queryByTestId("form-recebimento")).not.toBeInTheDocument();
  });
});

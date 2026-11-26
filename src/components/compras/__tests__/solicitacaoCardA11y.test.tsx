import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SolicitacaoCard } from "@/components/compras/SolicitacaoCard";
import type { Solicitacao } from "@/types/legacyTypes";

vi.mock("@/lib/feedbackToast", () => ({
  toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

const solicitacao = {
  id: "SOL-1",
  empresa: "Empresa Alfa",
  status: "AGUARDANDO_COTACAO",
  tipo: "COMPRA",
  prazoEntrega: new Date(Date.now() + 10 * 86400000).toISOString(),
} as unknown as Solicitacao;

const renderCard = () =>
  render(
    <MemoryRouter>
      <SolicitacaoCard solicitacao={solicitacao} />
    </MemoryRouter>,
  );

describe("SolicitacaoCard - nome acess\u00edvel dos controles", () => {
  it("nomeia o gatilho s\u00f3-\u00edcone do fluxo de aprova\u00e7\u00e3o", () => {
    renderCard();

    expect(screen.getByRole("button", { name: "Ver fluxo de aprova\u00e7\u00e3o" })).toBeInTheDocument();
  });

  it("mant\u00e9m o r\u00f3tulo textual do gatilho de contexto", () => {
    renderCard();

    expect(screen.getByRole("button", { name: "Contexto" })).toBeInTheDocument();
  });

  it("n\u00e3o deixa nenhum bot\u00e3o do cart\u00e3o sem nome acess\u00edvel", () => {
    renderCard();

    const botoes = screen.getAllByRole("button");
    expect(botoes.length).toBeGreaterThan(0);
    for (const botao of botoes) {
      expect(botao).toHaveAccessibleName();
    }
  });
});

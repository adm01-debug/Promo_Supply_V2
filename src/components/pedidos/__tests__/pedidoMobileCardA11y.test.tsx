import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PedidoMobileCard } from "../PedidoMobileCard";
import type { Pedido } from "@/features/pedidos";

const pedido = {
  id: "11111111-1111-1111-1111-111111111111",
  numero: "PO-4242",
  status: "aprovado",
  valor_total: 987.65,
  data_emissao: "2026-11-01T00:00:00.000Z",
  data_previsao: "2026-12-01T00:00:00.000Z",
  fornecedor: { id: "f1", razao_social: "Fornecedor Teste" },
} as unknown as Pedido;

const montar = () => {
  const onView = vi.fn();
  render(<PedidoMobileCard pedido={pedido} onView={onView} />);
  return { onView };
};

const cartao = () => screen.getByRole("button", { name: /Ver detalhes do pedido PO-4242/i });

describe("PedidoMobileCard - cartao acessivel pelo teclado (etapa 235)", () => {
  it("o cartao expoe papel de botao, nome e entra na tabulacao", () => {
    montar();
    const el = cartao();
    expect(el).toHaveAttribute("tabindex", "0");
  });

  it("Enter abre os detalhes", () => {
    const { onView } = montar();
    fireEvent.keyDown(cartao(), { key: "Enter" });
    expect(onView).toHaveBeenCalledTimes(1);
    expect(onView).toHaveBeenCalledWith(pedido);
  });

  it("espaco abre os detalhes", () => {
    const { onView } = montar();
    fireEvent.keyDown(cartao(), { key: " " });
    expect(onView).toHaveBeenCalledTimes(1);
  });

  it("teclas comuns nao abrem", () => {
    const { onView } = montar();
    fireEvent.keyDown(cartao(), { key: "a" });
    expect(onView).not.toHaveBeenCalled();
  });

  it("o clique com mouse continua funcionando", () => {
    const { onView } = montar();
    fireEvent.click(cartao());
    expect(onView).toHaveBeenCalledWith(pedido);
  });
});

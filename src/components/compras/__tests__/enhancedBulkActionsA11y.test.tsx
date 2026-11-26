import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { EnhancedBulkActionsBar } from "@/components/compras/EnhancedBulkActionsBar";
import type { BulkItem } from "@/components/compras/BulkOperationsPreview";

const selectedItems = [
  { id: "p1", title: "PO-0001", subtitle: "Fornecedor Beta" },
] as unknown as BulkItem[];

const renderBar = () =>
  render(
    <EnhancedBulkActionsBar
      entityType="pedidos"
      selectedItems={selectedItems}
      totalCount={1}
      onSelectAll={vi.fn()}
      onDeselectAll={vi.fn()}
      onExecute={vi.fn(async () => true)}
      isAllSelected={false}
      statusOptions={[]}
    />,
  );

describe("EnhancedBulkActionsBar - nome acess\u00edvel das a\u00e7\u00f5es", () => {
  it("nomeia o gatilho s\u00f3-\u00edcone do menu de a\u00e7\u00f5es da sele\u00e7\u00e3o", () => {
    renderBar();

    expect(screen.getByRole("button", { name: "Mais a\u00e7\u00f5es da sele\u00e7\u00e3o" })).toBeInTheDocument();
  });

  it("nomeia o gatilho s\u00f3-\u00edcone que expande e recolhe a pr\u00e9via", () => {
    renderBar();

    const gatilho = screen.getByRole("button", { name: /pr\u00e9via da sele\u00e7\u00e3o/ });
    const nomeInicial = gatilho.getAttribute("aria-label");

    fireEvent.click(gatilho);

    const nomeDepois = screen
      .getByRole("button", { name: /pr\u00e9via da sele\u00e7\u00e3o/ })
      .getAttribute("aria-label");

    expect(nomeInicial).toMatch(/^(Expandir|Recolher) pr\u00e9via da sele\u00e7\u00e3o$/);
    expect(nomeDepois).not.toBe(nomeInicial);
  });

  it("n\u00e3o deixa nenhum bot\u00e3o da barra sem nome acess\u00edvel", () => {
    renderBar();

    const botoes = screen.getAllByRole("button");
    expect(botoes.length).toBeGreaterThanOrEqual(2);
    for (const botao of botoes) {
      expect(botao).toHaveAccessibleName();
    }
  });
});

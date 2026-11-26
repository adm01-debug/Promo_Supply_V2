import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Contagens diferentes dos literais antigos (5/3/2/4) do palette, para que um
// badge escrito a mao volte a falhar aqui.
const cenario = vi.hoisted(() => ({
  badges: { solicitacoes: 7, cotacoes: 8, pagamentos: 9, aprovacoes: 6 },
  admin: false,
}));

vi.mock("@/hooks/useSidebarBadges", () => ({
  useSidebarBadges: () => ({ data: cenario.badges }),
}));

vi.mock("@/features/auth", () => ({
  useAuth: () => ({
    hasRole: (papel: string) => cenario.admin && papel === "admin",
    signOut: () => Promise.resolve(),
  }),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "light", setTheme: () => undefined }),
}));

import { CommandPalette } from "@/features/layout/components/CommandPalette";
import { getShortcutsList } from "@/hooks/useKeyboardShortcuts";

// Radix Dialog e cmdk medem o container; o jsdom nao implementa essas APIs.
if (!(globalThis as unknown as { ResizeObserver?: unknown }).ResizeObserver) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
if (!HTMLElement.prototype.scrollIntoView) {
  HTMLElement.prototype.scrollIntoView = () => undefined;
}

const REGISTRY = getShortcutsList().flatMap((grupo) => grupo.items);

// Prefixo ASCII para nao depender de acentos no arquivo de teste.
function chaveDe(prefixo: string): string {
  const item = REGISTRY.find((i) => i.description.startsWith(prefixo));
  expect(item, `registry de atalhos sem item "${prefixo}"`).toBeDefined();
  return item!.keys;
}

// Atalhos que o palette anunciava sem existir no registry (AUT-09 / etapa 044).
const CMD = String.fromCharCode(0x2318);
const SHIFT = String.fromCharCode(0x21e7);
const ATALHOS_INVENTADOS = [
  `${CMD}D`,
  `${CMD}S`,
  `${CMD}Q`,
  `${CMD}P`,
  `${CMD}F`,
  `${CMD}R`,
  `${CMD}N`,
  `${CMD}${SHIFT}R`,
  `${CMD}T`,
  `${CMD}?`,
  `${CMD}${SHIFT}Q`,
];

function renderPalette() {
  return render(
    <MemoryRouter>
      <CommandPalette open onOpenChange={() => undefined} />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  cenario.admin = false;
});

describe("CommandPalette: atalhos e badges (etapa 044)", () => {
  it("nao anuncia nenhum atalho ausente do registry de teclado", () => {
    renderPalette();
    const texto = document.body.textContent ?? "";
    for (const inventado of ATALHOS_INVENTADOS) {
      expect(texto, `atalho inventado reapareceu: ${inventado}`).not.toContain(inventado);
    }
  });

  it("exibe a combinacao real do registry em cada item", () => {
    renderPalette();
    const texto = document.body.textContent ?? "";
    const prefixos = [
      "Dashboard",
      "Solicita",
      "Cota",
      "Pedidos",
      "Fornecedores",
      "Relat",
      "Nova Solicita",
    ];
    for (const prefixo of prefixos) {
      const chave = chaveDe(prefixo);
      // "Dashboard" tambem casa com "Dashboard Executivo"; escolhe o item que
      // realmente exibe a combinacao vinda do registry.
      const opcao = screen
        .getAllByRole("option", { name: new RegExp(`^${prefixo}`) })
        .find((el) => el.textContent?.includes(chave));
      expect(opcao, `item "${prefixo}" nao exibe ${chave}`).toBeDefined();
      expect(texto).toContain(chave);
    }
  });

  it("le os badges do hook de contagens vivas, nao de literais", () => {
    renderPalette();
    const casos: Array<[RegExp, number]> = [
      [/^Solicita/, cenario.badges.solicitacoes],
      [/^Cota/, cenario.badges.cotacoes],
      [/^Pagamentos/, cenario.badges.pagamentos],
      [/^Aprova/, cenario.badges.aprovacoes],
    ];
    for (const [nome, valor] of casos) {
      expect(screen.getByRole("option", { name: nome }).textContent).toContain(String(valor));
    }
  });

  it("esconde Ajuda & Suporte (/admin/docs) de quem nao e admin", () => {
    renderPalette();
    expect(screen.queryByRole("option", { name: /Ajuda/ })).toBeNull();

    cleanup();
    cenario.admin = true;
    renderPalette();
    const ajuda = screen.getByRole("option", { name: /Ajuda/ });
    expect(ajuda.textContent).toContain(chaveDe("Mostrar atalhos"));
  });
});
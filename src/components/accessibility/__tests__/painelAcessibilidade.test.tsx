import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fireEvent, render, screen, within } from "@testing-library/react";
import {
  AccessibilityPanelContent,
  AccessibilityProvider,
} from "@/components/accessibility/AdvancedAccessibility";

// O Slider do Radix mede o trilho com ResizeObserver; o jsdom do repo nao traz a API.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

if (!("ResizeObserver" in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub;
}

const raiz = path.resolve(process.cwd());

const fonte = (rel: string): string => fs.readFileSync(path.join(raiz, rel), "utf-8");

const arquivosTsx = (relDir: string): string[] => {
  const saida: string[] = [];
  const visitar = (abs: string, rel: string): void => {
    for (const entrada of fs.readdirSync(abs, { withFileTypes: true })) {
      const filhoAbs = path.join(abs, entrada.name);
      const filhoRel = path.posix.join(rel, entrada.name);
      if (entrada.isDirectory()) {
        if (entrada.name !== "__tests__") visitar(filhoAbs, filhoRel);
        continue;
      }
      if (/\.tsx?$/.test(entrada.name)) saida.push(filhoRel);
    }
  };
  visitar(path.join(raiz, relDir), relDir);
  return saida;
};

const camadaDeAcessibilidade = (): void => {
  document.documentElement.className = "";
  document.documentElement.style.fontSize = "";
  document.documentElement.removeAttribute("data-color-blind");
  localStorage.clear();
};

describe("o corpo do painel de acessibilidade funciona fora do Sheet", () => {
  it("mostra os controles e o botao de restaurar padroes", () => {
    camadaDeAcessibilidade();
    render(
      <AccessibilityProvider>
        <AccessibilityPanelContent />
      </AccessibilityProvider>,
    );

    expect(screen.getByText("Tamanho do texto")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Restaurar padrões/i })).toBeInTheDocument();
    expect(screen.getAllByRole("switch")).toHaveLength(6);
  });

  it("o switch de fonte para dislexia muda o documento pelo provider", () => {
    camadaDeAcessibilidade();
    render(
      <AccessibilityProvider>
        <AccessibilityPanelContent />
      </AccessibilityProvider>,
    );

    const linha = screen.getByText("Fonte para dislexia").closest(".flex.items-center.justify-between");
    expect(linha).not.toBeNull();
    fireEvent.click(within(linha as HTMLElement).getByRole("switch"));

    expect(document.documentElement.classList.contains("dyslexia-font")).toBe(true);
  });

  it("restaurar padroes desliga o que foi ligado no documento", () => {
    camadaDeAcessibilidade();
    render(
      <AccessibilityProvider>
        <AccessibilityPanelContent />
      </AccessibilityProvider>,
    );

    const linha = screen.getByText("Alto contraste").closest(".flex.items-center.justify-between");
    fireEvent.click(within(linha as HTMLElement).getByRole("switch"));
    expect(document.documentElement.classList.contains("high-contrast")).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: /Restaurar padrões/i }));
    expect(document.documentElement.classList.contains("high-contrast")).toBe(false);
  });
});

describe("um unico painel de acessibilidade e um unico landmark principal por rota", () => {
  it("o gatilho do cabecalho monta o conteudo, nao um segundo Sheet", () => {
    const cabecalho = fonte("src/features/layout/components/HeaderActions.tsx");

    expect(cabecalho).toContain("AccessibilityPanelContent");
    expect(cabecalho).not.toMatch(/<AccessibilityPanel\s*\/>/);
  });

  it("o painel flutuante continua montado uma unica vez, no App", () => {
    const montados = arquivosTsx("src").filter((rel) => /<AccessibilityPanel\s*\/>/.test(fonte(rel)));

    expect(montados).toEqual(["src/App.tsx"]);
  });

  it("App.tsx nao embrulha as rotas em main nem duplica o id main-content", () => {
    const app = fonte("src/App.tsx");

    expect(app).not.toContain('id="main-content"');
    expect(app).not.toMatch(/<\/?main[\s>]/);
  });

  it("o id main-content existe so nos landmarks de rota, MainLayout e Auth", () => {
    const donos = arquivosTsx("src").filter((rel) => fonte(rel).includes('id="main-content"'));

    expect(donos.sort()).toEqual([
      "src/features/layout/components/MainLayout.tsx",
      "src/pages/auth/Auth.tsx",
    ]);
  });

  it("a rota de login tem landmark principal alcancavel pelo teclado", () => {
    const auth = fonte("src/pages/auth/Auth.tsx");

    expect(auth.match(/<main id="main-content" tabIndex=\{-1\}/g)).toHaveLength(2);
    expect(auth.match(/<\/main>/g)).toHaveLength(2);
  });
});

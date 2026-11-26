import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { SkipLinks } from "@/components/accessibility/SkipLinks";

const raiz = path.resolve(process.cwd());

const fonte = (rel: string): string => fs.readFileSync(path.join(raiz, rel), "utf-8");

const arquivosDeCodigo = (relDir: string): string[] => {
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

const idsDeclarados = (): Set<string> => {
  const ids = new Set<string>();
  for (const rel of arquivosDeCodigo("src")) {
    const codigo = fonte(rel);
    for (const achado of codigo.matchAll(/id=(?:"([^"]+)"|\{[^}]*?"([^"]+)"[^}]*?\})/g)) {
      const id = achado[1] ?? achado[2];
      if (id) ids.add(id);
    }
  }
  return ids;
};

describe("os links de pular levam a alvos que existem", () => {
  it("so oferece conteudo principal e navegacao, sem link morto de busca", () => {
    render(<SkipLinks />);

    const links = screen.getAllByRole("link").map((link) => link.getAttribute("href"));

    expect(links).toEqual(["#main-content", "#main-navigation"]);
  });

  it("todo href de pular aponta para um id que alguma tela declara", () => {
    render(<SkipLinks />);

    const alvos = idsDeclarados();
    const orfaos = screen
      .getAllByRole("link")
      .map((link) => (link.getAttribute("href") ?? "").replace("#", ""))
      .filter((id) => !alvos.has(id));

    expect(orfaos).toEqual([]);
  });
});

describe("cada breakpoint tem exatamente uma navegacao alcancavel", () => {
  it("o menu lateral so carrega o id no desktop e a barra inferior so no celular", () => {
    const layout = fonte("src/features/layout/components/MainLayout.tsx");
    const barra = fonte("src/components/mobile/BottomNavigation.tsx");

    expect(layout).toContain('id={isMobile ? undefined : "main-navigation"}');
    expect(barra).toContain('id={isMobile ? "main-navigation" : undefined}');
  });

  it("os dois alvos recebem tabIndex -1 para o foco do teclado ir junto", () => {
    const layout = fonte("src/features/layout/components/MainLayout.tsx");
    const barra = fonte("src/components/mobile/BottomNavigation.tsx");

    expect(layout).toContain('id={isMobile ? undefined : "main-navigation"} tabIndex={-1}');
    expect(barra).toMatch(/id=\{isMobile \? "main-navigation" : undefined\}[\s\S]{0,80}tabIndex=\{-1\}/);
  });
});

describe("sobra um unico sistema de skip link e um unico landmark", () => {
  it("o SkipToContent concorrente sai do App e o SkipLinks continua montado no layout", () => {
    const app = fonte("src/App.tsx");

    expect(app).not.toContain("SkipToContent");
    expect(fonte("src/features/layout/components/MainLayout.tsx")).toContain("<SkipLinks />");
  });

  it("o id main-content segue so nos landmarks de rota", () => {
    const donos = arquivosDeCodigo("src").filter((rel) => fonte(rel).includes('id="main-content"'));

    expect(donos.sort()).toEqual([
      "src/features/layout/components/MainLayout.tsx",
      "src/pages/auth/Auth.tsx",
    ]);
  });
});

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const raiz = path.resolve(process.cwd());

const fonte = (rel: string): string => fs.readFileSync(path.join(raiz, rel), "utf-8");

const layout = (): string => fonte("src/features/layout/components/MainLayout.tsx");

describe("o menu do celular fechado nao fica na ordem de tabulacao", () => {
  it("o estado fechado esconde e desliga o ponteiro, nao so desloca o drawer", () => {
    const trecho = layout().match(/mobileMenuOpen \? "([^"]*)" : "([^"]*)"/);

    expect(trecho).not.toBeNull();
    const fechado = trecho?.[2] ?? "";

    expect(fechado).toContain("-translate-x-full");
    expect(fechado).toContain("invisible");
    expect(fechado).toContain("pointer-events-none");
  });

  it("o drawer fechado sai da arvore de acessibilidade", () => {
    expect(layout()).toContain("aria-hidden={!mobileMenuOpen}");
  });

  it("a solucao nao e tabIndex -1 no container, que nao alcanca os filhos focaveis", () => {
    const codigo = layout();
    const inicio = codigo.indexOf("fixed left-0 top-0 z-40 h-screen w-72");
    const fim = codigo.indexOf("AppSidebar collapsed={false}");
    const drawer = codigo.slice(inicio, fim);

    expect(inicio).toBeGreaterThan(-1);
    expect(drawer).not.toContain("tabIndex");
  });
});

describe("o menu do celular fecha com Esc e devolve o foco ao gatilho", () => {
  it("escuta Escape so enquanto o menu esta aberto e remove o listener ao fechar", () => {
    const codigo = layout();

    expect(codigo).toContain("document.addEventListener('keydown', fecharComEsc)");
    expect(codigo).toContain("document.removeEventListener('keydown', fecharComEsc)");
    expect(codigo).toMatch(/if \(evento\.key !== 'Escape'\) return;/);
    expect(codigo).toMatch(/if \(!mobileMenuOpen\) return;/);
  });

  it("o foco volta para o botao que abriu o menu", () => {
    const codigo = layout();

    expect(codigo).toContain("const menuButtonRef = useRef<HTMLButtonElement>(null);");
    expect(codigo).toContain("ref={menuButtonRef}");
    expect(codigo).toContain("menuButtonRef.current?.focus();");
  });
});

describe("o menu do celular abre em qualquer tela", () => {
  it("o gatilho nao esta mais preso ao bloco da home", () => {
    const codigo = layout();
    const posicao = codigo.indexOf('aria-label="Abrir menu"');
    const antes = codigo.slice(Math.max(0, posicao - 400), posicao);

    expect(posicao).toBeGreaterThan(-1);
    expect(antes).not.toContain("isHome &&");
  });

  it("o conteudo do menu nao foi alterado: o problema era o container", () => {
    const sidebar = fonte("src/features/layout/components/AppSidebar.tsx");

    expect(sidebar).not.toContain("pointer-events-none");
    expect(sidebar).not.toContain("aria-hidden={!mobileMenuOpen}");
  });
});

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { useReducedMotionConfig } from "framer-motion";
import {
  AccessibilityPanelContent,
  AccessibilityProvider,
  useAccessibility,
} from "@/components/accessibility/AdvancedAccessibility";
import { ACCESSIBILITY_STORAGE_KEY } from "@/components/accessibility/accessibilityHelpers";

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

const limparPrefs = (): void => {
  document.documentElement.className = "";
  document.documentElement.style.fontSize = "";
  document.documentElement.removeAttribute("data-color-blind");
  localStorage.clear();
};

// O helper reseta de proposito highContrast/colorBlindMode/reducedMotion no load
// (`shouldAutoRecoverVisualSettings`), entao a preferencia vale na sessao: o teste
// liga e desliga pelo painel, como o usuario faz.
const interruptorDe = (rotulo: RegExp): Element => {
  const linha = screen.getByText(rotulo).closest('div[class*="justify-between"]');
  const interruptor = linha?.querySelector('[role="switch"]');
  if (!interruptor) throw new Error(`switch nao encontrado para ${rotulo}`);
  return interruptor;
};

// `useReducedMotionConfig` le o valor que o MotionConfig entrega ao framer-motion para
// toda a arvore: false = anima normal, true = app inteiro sem movimento.
const SondaMovimento = () => {
  const reduzido = useReducedMotionConfig();
  return <output data-testid="sonda-movimento">{String(reduzido)}</output>;
};

const BotaoAnunciar = ({ mensagem }: { mensagem: string }) => {
  const { announceToScreenReader } = useAccessibility();
  return (
    <button type="button" onClick={() => announceToScreenReader(mensagem)}>
      anunciar
    </button>
  );
};

const PALAVRA_REDUZIR = /Reduzir movimento/i;

describe("o interruptor Reduzir movimento chega no framer-motion", () => {
  it("com o app recem-aberto o framer-motion usa o padrao (sem forcar reducao)", () => {
    limparPrefs();

    render(
      <AccessibilityProvider>
        <SondaMovimento />
      </AccessibilityProvider>,
    );

    expect(screen.getByTestId("sonda-movimento")).toHaveTextContent("false");
  });

  it("ligar o switch no painel muda o app inteiro na hora, sem recarregar", () => {
    limparPrefs();

    render(
      <AccessibilityProvider>
        <AccessibilityPanelContent />
        <SondaMovimento />
      </AccessibilityProvider>,
    );

    expect(screen.getByTestId("sonda-movimento")).toHaveTextContent("false");

    fireEvent.click(interruptorDe(PALAVRA_REDUZIR));

    expect(screen.getByTestId("sonda-movimento")).toHaveTextContent("true");
  });

  it("desligar o switch devolve a animacao do sistema", () => {
    limparPrefs();

    render(
      <AccessibilityProvider>
        <AccessibilityPanelContent />
        <SondaMovimento />
      </AccessibilityProvider>,
    );

    fireEvent.click(interruptorDe(PALAVRA_REDUZIR));
    expect(screen.getByTestId("sonda-movimento")).toHaveTextContent("true");

    fireEvent.click(interruptorDe(PALAVRA_REDUZIR));
    expect(screen.getByTestId("sonda-movimento")).toHaveTextContent("false");
  });
});

describe("o anuncio para leitor de tela usa uma unica region viva", () => {
  it("a mensagem chega na region status montada pelo provider", () => {
    limparPrefs();

    render(
      <AccessibilityProvider>
        <BotaoAnunciar mensagem="Alto contraste ativado" />
      </AccessibilityProvider>,
    );

    const region = screen.getByRole("status");
    expect(region).toBeEmptyDOMElement();

    fireEvent.click(screen.getByRole("button", { name: "anunciar" }));

    expect(screen.getByRole("status")).toHaveTextContent("Alto contraste ativado");
  });

  it("dois anuncios seguidos nao empilham regions no body", () => {
    limparPrefs();

    render(
      <AccessibilityProvider>
        <BotaoAnunciar mensagem="Primeiro" />
      </AccessibilityProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "anunciar" }));
    fireEvent.click(screen.getByRole("button", { name: "anunciar" }));

    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveTextContent("Primeiro");
  });
});

describe("o arquivo de acessibilidade nao guarda mais codigo morto", () => {
  it("o provider entrega o MotionConfig com a preferencia do usuario", () => {
    const codigo = fonte("src/components/accessibility/AdvancedAccessibility.tsx");

    expect(codigo).toContain(
      "reducedMotion={settings.reducedMotion ? 'always' : 'user'}",
    );
  });

  it("SkipToContent e useFocusTrap sairam do src inteiro", () => {
    const codigo = fonte("src/components/accessibility/AdvancedAccessibility.tsx");

    expect(codigo).not.toContain("SkipToContent");
    expect(codigo).not.toContain("useFocusTrap");
  });

  it("LiveRegion vem de um unico lugar em vez de duas implementacoes iguais", () => {
    const codigo = fonte("src/components/accessibility/AdvancedAccessibility.tsx");

    expect(codigo).toContain("import { LiveRegion } from './VisuallyHidden';");
    expect(codigo).not.toContain("LiveRegionProps");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import DocumentosFiscais from "@/pages/documentos/DocumentosFiscais";

const estado = vi.hoisted(() => ({
  erro: null as { message: string } | null,
  nuncaResolve: false,
  buscas: [] as string[],
}));

vi.mock("@/integrations/supabase/client", () => {
  const criar = (tabela: string) => {
    const b: Record<string, unknown> = {};
    for (const m of ["select", "eq", "in", "order", "limit", "range", "update", "insert"]) b[m] = () => b;
    b.then = (ok: (v: unknown) => unknown, err?: (e: unknown) => unknown) => {
      estado.buscas.push(tabela);
      if (estado.nuncaResolve) return new Promise(() => {}).then(ok, err);
      return Promise.resolve({ data: [], error: estado.erro, count: 0 }).then(ok, err);
    };
    return b;
  };
  return { supabase: { from: (tabela: string) => criar(tabela) } };
});

vi.mock("@/lib/feedbackToast", () => ({
  toast: { success: vi.fn(), info: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

const renderizar = () =>
  render(
    <MemoryRouter>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <DocumentosFiscais />
      </QueryClientProvider>
    </MemoryRouter>,
  );

beforeEach(() => {
  estado.erro = null;
  estado.nuncaResolve = false;
  estado.buscas = [];
});

describe("DocumentosFiscais - falha e carga nao viram 'nenhum documento importado' (QA 251)", () => {
  it("mostra o erro da consulta e um botao de nova tentativa", async () => {
    estado.erro = { message: "permission denied for table fiscal_documents" };
    renderizar();

    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent(/Não foi possível carregar os documentos fiscais/i);
    expect(alerta).toHaveTextContent("permission denied for table fiscal_documents");
    expect(screen.queryByText(/Nenhum documento fiscal importado/i)).not.toBeInTheDocument();
  });

  it("o botao de nova tentativa refaz a busca da lista", async () => {
    estado.erro = { message: "timeout" };
    renderizar();

    await screen.findByRole("alert");
    const antes = estado.buscas.filter((t) => t === "fiscal_documents").length;
    screen.getByRole("button", { name: /Tentar de novo/i }).click();

    await waitFor(() => {
      expect(estado.buscas.filter((t) => t === "fiscal_documents").length).toBeGreaterThan(antes);
    });
  });

  it("com a consulta em curso, mostra carregando e nao zera os contadores", async () => {
    estado.nuncaResolve = true;
    renderizar();

    expect(await screen.findByText(/Carregando documentos fiscais/i)).toBeInTheDocument();
    expect(screen.queryByText(/Nenhum documento fiscal importado/i)).not.toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBe(4);
  });

  it("com a consulta bem sucedida e vazia, o estado vazio legitimo continua igual", async () => {
    renderizar();

    expect(await screen.findByText(/Nenhum documento fiscal importado/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText("—")).not.toBeInTheDocument();
  });
});

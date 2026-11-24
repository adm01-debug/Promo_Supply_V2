import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PendingApprovalsList } from "@/components/compras/PendingApprovalsList";

const estado = vi.hoisted(() => ({
  loading: false,
  error: null as string | null,
  fetchPendingSteps: vi.fn(),
  fetchAllHistory: vi.fn(),
}));

vi.mock("@/hooks/useApprovalWorkflow", () => ({
  useApprovalWorkflow: () => ({
    pendingSteps: [],
    workflows: [],
    allHistory: [],
    approveStep: vi.fn(),
    rejectStep: vi.fn(),
    loading: estado.loading,
    error: estado.error,
    fetchPendingSteps: estado.fetchPendingSteps,
    fetchAllHistory: estado.fetchAllHistory,
  }),
}));

vi.mock("@/hooks/useApprovalNotifications", () => ({
  useApprovalNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    permissionGranted: false,
    checkApprovalDeadlines: vi.fn(),
    startMonitoring: () => () => undefined,
  }),
}));

vi.mock("@/lib/feedbackToast", () => ({
  toast: { success: vi.fn(), info: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

beforeEach(() => {
  estado.loading = false;
  estado.error = null;
  estado.fetchPendingSteps = vi.fn();
  estado.fetchAllHistory = vi.fn();
});

describe("PendingApprovalsList - falha e carga nao viram 'tudo processado' (QA 251)", () => {
  it("mostra o erro da consulta em vez de 'Todas as solicitacoes foram processadas'", () => {
    estado.error = "JWT expired";
    render(<PendingApprovalsList />);

    const alerta = screen.getByRole("alert");
    expect(alerta).toHaveTextContent(/Não foi possível carregar as aprovações/i);
    expect(alerta).toHaveTextContent("JWT expired");
    expect(screen.queryByText(/Todas as solicitações foram processadas/i)).not.toBeInTheDocument();
  });

  it("o botao de nova tentativa refaz as duas buscas da tela", () => {
    estado.error = "timeout";
    render(<PendingApprovalsList />);

    const antesSteps = estado.fetchPendingSteps.mock.calls.length;
    const antesHistorico = estado.fetchAllHistory.mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: /Tentar de novo/i }));

    expect(estado.fetchPendingSteps.mock.calls.length).toBe(antesSteps + 1);
    expect(estado.fetchAllHistory.mock.calls.length).toBe(antesHistorico + 1);
  });

  it("enquanto carrega, nao afirma que nao ha nada pendente", () => {
    estado.loading = true;
    render(<PendingApprovalsList />);

    expect(screen.getByText(/Carregando aprovações pendentes/i)).toBeInTheDocument();
    expect(screen.queryByText(/Nenhuma aprovação pendente/i)).not.toBeInTheDocument();
  });

  it("sem erro e sem carga, o estado vazio legitimo continua igual", () => {
    render(<PendingApprovalsList />);

    expect(screen.getByText(/Nenhuma aprovação pendente/i)).toBeInTheDocument();
    expect(screen.getByText(/Todas as solicitações foram processadas/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("o hook de aprovacoes passa a expor erro e a sinalizar fetch em curso", () => {
    const fonte = readFileSync(resolve(process.cwd(), "src/hooks/useApprovalWorkflow.ts"), "utf8");

    expect(fonte).toContain("error: fetchError,");
    expect(fonte).toContain("loading: loading || rulesApi.loading || fetching,");
    expect(fonte).toContain("setFetchError(mensagemDeErro(error));");
    expect(fonte).toContain("const mensagemDeErro = (error: unknown): string =>");
  });
});

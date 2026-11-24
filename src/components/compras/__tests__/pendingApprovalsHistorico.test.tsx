import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PendingApprovalsList } from "@/components/compras/PendingApprovalsList";

const estado = vi.hoisted(() => ({
  allHistory: [] as Array<Record<string, unknown>>,
  fetchAllHistory: vi.fn(),
}));

const passo = {
  id: "s1",
  workflow_id: "wf-1",
  etapa: 2,
  prazo_limite: "2026-03-10T12:00:00.000Z",
  created_at: "2026-03-01T12:00:00.000Z",
  delegacao_id: null,
};

const workflow = {
  id: "wf-1",
  solicitacao_id: "sol-1",
  valor: 1500,
  created_at: "2026-03-01T10:00:00.000Z",
  prazo_limite: "2026-03-10T12:00:00.000Z",
  total_etapas: 3,
  solicitacoes: {
    numero: "SOL-1",
    titulo: "Compra de uniformes",
    prioridade: "normal",
    solicitante: { full_name: "Carla Dias" },
  },
  categorias: { nome: "Uniformes" },
};

vi.mock("@/hooks/useApprovalWorkflow", () => ({
  useApprovalWorkflow: () => ({
    pendingSteps: [passo],
    workflows: [workflow],
    allHistory: estado.allHistory,
    approveStep: vi.fn(),
    rejectStep: vi.fn(),
    loading: false,
    error: null,
    fetchPendingSteps: vi.fn(),
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
  estado.fetchAllHistory = vi.fn();
});

const abrirHistorico = () => {
  const gatilho = screen.getByRole("button", { name: /Mais ações da aprovação/i });
  fireEvent.pointerDown(gatilho, { button: 0, ctrlKey: false });
  const item = screen.getByRole("menuitem", { name: /Ver Histórico/i });
  fireEvent.pointerMove(item);
  fireEvent.pointerUp(item);
  return screen.getByRole("dialog");
};

describe("PendingApprovalsList - 'Ver Histórico' abre o historico do workflow (QA 253)", () => {
  it("mostra os eventos do workflow da aprovacao, nao os de outro workflow", () => {
    estado.allHistory = [
      { id: "h1", workflow_id: "wf-1", acao: "created", usuario_nome: "Sistema", created_at: "2026-03-01T10:00:00.000Z", detalhes: {} },
      { id: "h2", workflow_id: "wf-1", acao: "approved", usuario_nome: "Ana Souza", created_at: "2026-03-02T10:00:00.000Z", detalhes: { comentario: "Ok para mim" } },
      { id: "h9", workflow_id: "wf-9", acao: "rejected", usuario_nome: "Bruno Lima", created_at: "2026-03-03T10:00:00.000Z", detalhes: { motivo: "Fora do orcamento" } },
    ];

    render(<PendingApprovalsList />);
    const dialogo = abrirHistorico();

    expect(dialogo).toHaveTextContent("Histórico da aprovação SOL-1");
    expect(dialogo).toHaveTextContent("Workflow criado");
    expect(dialogo).toHaveTextContent("Aprovado");
    expect(dialogo).toHaveTextContent("Ana Souza");
    expect(dialogo).toHaveTextContent("Comentário: Ok para mim");

    expect(dialogo).not.toHaveTextContent("Rejeitado");
    expect(dialogo).not.toHaveTextContent("Bruno Lima");
    expect(dialogo).not.toHaveTextContent("Fora do orcamento");
  });

  it("lista os eventos mais recentes primeiro", () => {
    estado.allHistory = [
      { id: "h1", workflow_id: "wf-1", acao: "created", usuario_nome: "Sistema", created_at: "2026-03-01T10:00:00.000Z", detalhes: {} },
      { id: "h2", workflow_id: "wf-1", acao: "escalated", usuario_nome: "Ana Souza", created_at: "2026-03-04T10:00:00.000Z", detalhes: { motivo: "Prazo expirado" } },
    ];

    render(<PendingApprovalsList />);
    const dialogo = abrirHistorico();

    const textos = Array.from(dialogo.querySelectorAll("span")).map(no => no.textContent);
    expect(textos.indexOf("Escalado")).toBeLessThan(textos.indexOf("Workflow criado"));
    expect(dialogo).toHaveTextContent("Motivo: Prazo expirado");
  });

  it("sem eventos, diz que nao ha historico em vez de abrir um dialogo vazio", () => {
    estado.allHistory = [];

    render(<PendingApprovalsList />);
    const dialogo = abrirHistorico();

    expect(dialogo).toHaveTextContent("Nenhum evento de histórico registrado para esta aprovação.");
  });
});

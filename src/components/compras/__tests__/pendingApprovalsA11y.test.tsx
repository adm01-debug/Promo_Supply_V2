import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/hooks/useApprovalWorkflow", () => ({
  useApprovalWorkflow: () => ({
    pendingSteps: [
      {
        id: "step-1",
        workflow_id: "wf-1",
        etapa: 1,
        created_at: "2026-11-20T10:00:00Z",
        prazo_limite: "2026-11-25T10:00:00Z",
        delegacao_id: null,
      },
    ],
    workflows: [],
    allHistory: [],
    approveStep: vi.fn(),
    rejectStep: vi.fn(),
    loading: false,
    fetchAllHistory: vi.fn(),
  }),
}));

vi.mock("@/hooks/useApprovalNotifications", () => ({
  useApprovalNotifications: () => ({
    unreadCount: 0,
    permissionGranted: false,
    startMonitoring: vi.fn(),
    checkApprovalDeadlines: vi.fn(),
  }),
}));

vi.mock("@/lib/feedbackToast", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("@/components/compras/pending-approvals/ApprovalModals", () => ({
  RejectModal: () => null,
  DetailsModal: () => null,
}));

import { PendingApprovalsList } from "../PendingApprovalsList";

// Etapa QA 229 (UX-04 parte 1/4): o menu de acoes de cada aprovacao pendente era
// um Button so-icone (ChevronDown) sem aria-label, entao aparecia como "botao" sem
// nome na arvore de acessibilidade.

describe("PendingApprovalsList acessibilidade (UX-04 1/4)", () => {
  it("o menu de acoes de cada aprovacao tem nome acessivel", () => {
    render(<PendingApprovalsList />);
    const botao = screen.getByRole("button", { name: "Mais ações da aprovação" });
    expect(botao).toHaveAttribute("aria-label", "Mais ações da aprovação");
  });

  it("nao sobra botao so-icone sem nome no cartao da aprovacao", () => {
    render(<PendingApprovalsList />);
    const semNome = screen
      .getAllByRole("button")
      .filter((el) => !el.textContent?.trim() && !el.getAttribute("aria-label")?.trim());
    expect(semNome.map((el) => el.className)).toEqual([]);
  });
});

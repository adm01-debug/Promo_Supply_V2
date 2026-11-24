import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChatArea } from "@/features/layout/components/chat/ChatArea";

const contato = {
  id: "c1",
  name: "Vendedor Alfa",
  company: "Empresa Alfa",
  online: true,
  fornecedorId: "f1",
};

const renderArea = () =>
  render(
    <ChatArea
      selectedContact={contato}
      messages={[]}
      loadingNotes={false}
      typingUsers={[]}
      newMessage="Mensagem"
      sendingMessage={false}
      messagesEndRef={{ current: null }}
      onMessageChange={vi.fn()}
      onKeyPress={vi.fn()}
      onSendMessage={vi.fn()}
    />,
  );

describe("ChatArea - nome acess\u00edvel dos controles s\u00f3-\u00edcone", () => {
  it("nomeia as a\u00e7\u00f5es do cabe\u00e7alho do contato", () => {
    renderArea();

    expect(screen.getByRole("button", { name: "Ligar para o contato" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Chamada de v\u00eddeo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mais a\u00e7\u00f5es do contato" })).toBeInTheDocument();
  });

  it("nomeia as a\u00e7\u00f5es do compositor de mensagem", () => {
    renderArea();

    expect(screen.getByRole("button", { name: "Anexar arquivo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Inserir emoji" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enviar mensagem" })).toBeInTheDocument();
  });

  it("n\u00e3o deixa nenhum bot\u00e3o do chat sem nome acess\u00edvel", () => {
    renderArea();

    const botoes = screen.getAllByRole("button");
    expect(botoes.length).toBeGreaterThanOrEqual(6);
    for (const botao of botoes) {
      expect(botao).toHaveAccessibleName();
    }
  });
});

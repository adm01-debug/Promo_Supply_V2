import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  action: () => void;
}

export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  const shortcuts: KeyboardShortcut[] = [
    // Navigation shortcuts (with Alt)
    { key: "1", alt: true, description: "Ir para Dashboard", action: () => navigate("/") },
    { key: "2", alt: true, description: "Ir para Solicitações", action: () => navigate("/solicitacoes") },
    { key: "3", alt: true, description: "Ir para Cotações", action: () => navigate("/cotacao") },
    { key: "4", alt: true, description: "Ir para Pedidos", action: () => navigate("/pedidos") },
    { key: "5", alt: true, description: "Ir para Acompanhamento", action: () => navigate("/acompanhamento") },
    { key: "6", alt: true, description: "Ir para Pagamentos", action: () => navigate("/pagamentos") },
    { key: "7", alt: true, description: "Ir para Fornecedores", action: () => navigate("/fornecedores") },
    { key: "8", alt: true, description: "Ir para Contratos", action: () => navigate("/contratos") },
    { key: "9", alt: true, description: "Ir para Relatórios", action: () => navigate("/relatorios") },
    
    // Quick actions (Ctrl/Cmd + Shift)
    { key: "n", ctrl: true, shift: true, description: "Nova Solicitação", action: () => {
      navigate("/solicitacoes");
      setTimeout(() => {
        const event = new CustomEvent('open-new-solicitacao');
        window.dispatchEvent(event);
      }, 100);
    }},
    { key: "p", ctrl: true, shift: true, description: "Novo Pedido", action: () => navigate("/gerar-ordem") },
    { key: "f", ctrl: true, shift: true, description: "Novo Fornecedor", action: () => {
      navigate("/fornecedores");
      setTimeout(() => {
        const event = new CustomEvent('open-new-fornecedor');
        window.dispatchEvent(event);
      }, 100);
    }},
    { key: "c", ctrl: true, shift: true, description: "Novo Contrato", action: () => {
      navigate("/contratos");
      setTimeout(() => {
        const event = new CustomEvent('open-new-contrato');
        window.dispatchEvent(event);
      }, 100);
    }},

    // Help
    { key: "?", shift: true, description: "Mostrar atalhos", action: () => {
      const event = new CustomEvent('show-keyboard-shortcuts');
      window.dispatchEvent(event);
    }},
  ];

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts if user is typing in an input
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    for (const shortcut of shortcuts) {
      const ctrlMatch = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : !(event.ctrlKey || event.metaKey);
      const metaMatch = shortcut.meta ? event.metaKey : true;
      const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
      const altMatch = shortcut.alt ? event.altKey : !event.altKey;
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

      if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
        event.preventDefault();
        shortcut.action();
        return;
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return shortcuts;
}

// Export shortcuts list for display
export const shortcutsList = [
  { category: "Navegação (Alt + número)", items: [
    { keys: "Alt + 1", description: "Dashboard" },
    { keys: "Alt + 2", description: "Solicitações" },
    { keys: "Alt + 3", description: "Cotações" },
    { keys: "Alt + 4", description: "Pedidos" },
    { keys: "Alt + 5", description: "Acompanhamento" },
    { keys: "Alt + 6", description: "Pagamentos" },
    { keys: "Alt + 7", description: "Fornecedores" },
    { keys: "Alt + 8", description: "Contratos" },
    { keys: "Alt + 9", description: "Relatórios" },
  ]},
  { category: "Ações Rápidas", items: [
    { keys: "Ctrl/⌘ + K", description: "Busca Global" },
    { keys: "Ctrl/⌘ + Shift + N", description: "Nova Solicitação" },
    { keys: "Ctrl/⌘ + Shift + P", description: "Novo Pedido" },
    { keys: "Ctrl/⌘ + Shift + F", description: "Novo Fornecedor" },
    { keys: "Ctrl/⌘ + Shift + C", description: "Novo Contrato" },
  ]},
  { category: "Ajuda", items: [
    { keys: "Shift + ?", description: "Mostrar atalhos" },
  ]},
];

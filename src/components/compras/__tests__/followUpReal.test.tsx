import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SupplierInteractionLog, formatarQuando } from '../SupplierInteractionLog';
import { NeuralFollowUpMonitor, descreverFollowUp, formatarEnvio } from '../NeuralFollowUpMonitor';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: React.HTMLAttributes<HTMLSpanElement>) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('descreverFollowUp', () => {
  it('sem registro nao afirma envio', () => {
    const resumo = descreverFollowUp();
    expect(resumo.registrado).toBe(false);
    expect(resumo.situacao).toBe('Sem registro');
    expect(resumo.latencia).toBe('Sem registro');
    expect(resumo.linhas[0]).toContain('Nenhum follow-up registrado');
  });

  it('com registro usa o status e o atraso reais', () => {
    const resumo = descreverFollowUp('2026-01-15T02:30:00.000Z', 'notificado', 72);
    expect(resumo.registrado).toBe(true);
    expect(resumo.situacao).toBe('Notificado');
    expect(resumo.latencia).toBe('+72h de atraso');
    expect(resumo.linhas.join(' ')).toContain('Follow-up registrado em');
  });

  it('sem atraso nao inventa "+48h Overdue"', () => {
    expect(descreverFollowUp('2026-01-15T02:30:00.000Z', 'notificado', 0).latencia).toBe('No prazo');
    expect(descreverFollowUp('2026-01-15T02:30:00.000Z', 'notificado').latencia).toBe('Sem prazo registrado');
  });

  it('status desconhecido aparece como veio, sem traducao inventada', () => {
    expect(descreverFollowUp('2026-01-15T02:30:00.000Z', 'pendente_manual').situacao).toBe('pendente_manual');
  });

  it('data e exibida no fuso de Brasilia', () => {
    expect(formatarEnvio('2026-01-15T02:30:00.000Z')).toContain('14/01');
    expect(formatarEnvio('2026-01-15T02:30:00.000Z')).toContain('23:30');
    expect(formatarQuando(null)).toBe('sem data registrada');
    expect(formatarQuando('nao-e-data')).toBe('data invalida');
  });
});

describe('SupplierInteractionLog so mostra interacao registrada', () => {
  it('lista vazia mostra estado vazio honesto', () => {
    render(<SupplierInteractionLog supplierName="Fornecedor Real" />);
    expect(screen.getByText(/Nenhuma interacao registrada com Fornecedor Real/)).toBeTruthy();
    expect(screen.queryByText(/caneca/)).toBeNull();
    expect(screen.queryByText(/materia-prima/)).toBeNull();
  });

  it('renderiza a interacao real com data', () => {
    render(
      <SupplierInteractionLog
        supplierName="Fornecedor Real"
        interacoes={[
          { id: 'n1', origem: 'sistema', texto: 'A cotacao #COT-7 esta pendente ha mais de 48 horas.', quando: '2026-01-15T02:30:00.000Z', situacao: 'notificado' },
        ]}
      />,
    );
    expect(screen.getByText(/A cotacao #COT-7 esta pendente/)).toBeTruthy();
    expect(screen.getByText('notificado')).toBeTruthy();
    expect(screen.getByText(/14\/01\/2026/)).toBeTruthy();
  });
});

describe('NeuralFollowUpMonitor', () => {
  it('sem follow-up registrado nao exibe entrega', () => {
    render(<NeuralFollowUpMonitor itemName="Caneca" />);
    expect(screen.getByText('Sem envio')).toBeTruthy();
    expect(screen.getByText(/Nenhum follow-up registrado/)).toBeTruthy();
    expect(screen.queryByText(/SLA Restored/)).toBeNull();
    expect(screen.queryByText(/\+48h Overdue/)).toBeNull();
  });

  it('com follow-up registrado mostra status e latencia reais', () => {
    render(
      <NeuralFollowUpMonitor
        itemName="Caneca"
        ultimoFollowUpEm="2026-01-15T02:30:00.000Z"
        followUpStatus="notificado"
        horasDeAtraso={50}
      />,
    );
    expect(screen.getByText('Follow-up enviado')).toBeTruthy();
    expect(screen.getByText('Notificado')).toBeTruthy();
    expect(screen.getByText('+50h de atraso')).toBeTruthy();
  });
});

describe('os componentes nao tem mais texto fabricado nem timer', () => {
  const ler = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf-8');
  const log = ler('src/components/compras/SupplierInteractionLog.tsx');
  const monitor = ler('src/components/compras/NeuralFollowUpMonitor.tsx');

  it('SupplierInteractionLog perdeu a conversa e o botao sem handler', () => {
    expect(log).not.toContain('mockInteractions');
    expect(log).not.toContain('Intervir Agora');
    expect(log).not.toContain('Ativo');
  });

  it('a consulta de cotacoes traz as colunas de follow-up', () => {
    const hook = ler('src/features/cotacoes/hooks/useCotacoes.ts');
    expect(hook).toContain('last_follow_up_at, follow_up_status,');
  });

  it('NeuralFollowUpMonitor perdeu setTimeout, gateway e SLA', () => {
    expect(monitor).not.toContain('setTimeout');
    expect(monitor).not.toContain('Promo AI Gateway');
    expect(monitor).not.toContain('SLA Restored');
    expect(monitor).not.toContain('TRIGGER AI FOLLOW-UP');
  });
});

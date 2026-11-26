import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { montarInteracoesPedido, type NotificacaoFollowUp } from '../PedidoDetailsDialog';
import { resumoFollowUpDaCotacao } from '../../cotacao/Cotacao';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: React.HTMLAttributes<HTMLSpanElement>) => <span {...props}>{children}</span>,
    section: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => <section {...props}>{children}</section>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
    removeChannel: vi.fn(),
    auth: { getUser: vi.fn() },
  },
}));

vi.mock('@/lib/feedbackToast', () => ({
  toast: { info: vi.fn(), success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

vi.mock('@/features/auth', () => ({
  useAuth: () => ({ hasRole: () => true, user: { id: 'u1' } }),
}));

vi.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams(''), vi.fn()],
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const raiz = join(__dirname, '..', '..', '..', '..');
const ler = (relativo: string) => readFileSync(join(raiz, relativo), 'utf8');

const notificacao = (over: Partial<NotificacaoFollowUp> = {}): NotificacaoFollowUp => ({
  id: 'n1',
  title: 'Cotacao sem resposta ha 48h',
  message: 'A cotacao #COT-1 segue sem resposta do fornecedor.',
  action_url: '/cotacao?id=cot-1',
  created_at: '2026-01-15T12:00:00.000Z',
  read: false,
  ...over,
});

describe('montarInteracoesPedido', () => {
  it('sem cotacao e sem notificacao devolve lista vazia, sem dialogo fabricado', () => {
    expect(montarInteracoesPedido(null)).toEqual([]);
    expect(montarInteracoesPedido(undefined, [])).toEqual([]);
  });

  it('cotacao sem last_follow_up_at nao gera registro de follow-up', () => {
    expect(montarInteracoesPedido({ id: 'cot-1', last_follow_up_at: null }, [])).toEqual([]);
  });

  it('usa a data e o status reais do follow-up gravado na cotacao', () => {
    const [interacao] = montarInteracoesPedido(
      { id: 'cot-1', last_follow_up_at: '2026-01-15T02:30:00.000Z', follow_up_status: 'notificado' },
      [],
    );
    expect(interacao.origem).toBe('sistema');
    expect(interacao.quando).toBe('2026-01-15T02:30:00.000Z');
    expect(interacao.situacao).toBe('notificado');
    expect(interacao.id).toBe('follow-up-cot-1');
    expect(interacao.texto).toContain('agendador');
  });

  it('traz a mensagem real da notificacao e marca leitura', () => {
    const [interacao] = montarInteracoesPedido({ id: 'cot-1' }, [notificacao({ read: true })]);
    expect(interacao.id).toBe('n1');
    expect(interacao.texto).toBe('A cotacao #COT-1 segue sem resposta do fornecedor.');
    expect(interacao.quando).toBe('2026-01-15T12:00:00.000Z');
    expect(interacao.situacao).toBe('lida');
    expect(montarInteracoesPedido({ id: 'cot-1' }, [notificacao({ read: null })])[0].situacao).toBe('nao lida');
  });

  it('ordena do mais recente para o mais antigo', () => {
    const interacoes = montarInteracoesPedido(
      { id: 'cot-1', last_follow_up_at: '2026-01-10T10:00:00.000Z' },
      [notificacao({ created_at: '2026-01-20T10:00:00.000Z' })],
    );
    expect(interacoes.map((i) => i.id)).toEqual(['n1', 'follow-up-cot-1']);
  });
});

describe('resumoFollowUpDaCotacao', () => {
  it('sem cotacao devolve tudo nulo', () => {
    expect(resumoFollowUpDaCotacao()).toEqual({
      ultimoFollowUpEm: null,
      followUpStatus: null,
      horasDeAtraso: null,
    });
  });

  it('nao inventa follow-up quando a coluna esta vazia', () => {
    const resumo = resumoFollowUpDaCotacao({ created_at: '2026-01-01T00:00:00.000Z' }, Date.parse('2026-01-03T00:00:00.000Z'));
    expect(resumo.ultimoFollowUpEm).toBeNull();
    expect(resumo.followUpStatus).toBeNull();
    expect(resumo.horasDeAtraso).toBe(48);
  });

  it('propaga o follow-up registrado e o status', () => {
    const resumo = resumoFollowUpDaCotacao(
      {
        created_at: '2026-01-01T00:00:00.000Z',
        last_follow_up_at: '2026-01-03T00:00:00.000Z',
        follow_up_status: 'notificado',
      },
      Date.parse('2026-01-04T12:00:00.000Z'),
    );
    expect(resumo.ultimoFollowUpEm).toBe('2026-01-03T00:00:00.000Z');
    expect(resumo.followUpStatus).toBe('notificado');
    expect(resumo.horasDeAtraso).toBe(84);
  });

  it('data de criacao invalida nao gera atraso inventado', () => {
    expect(resumoFollowUpDaCotacao({ created_at: 'nao-e-data' }).horasDeAtraso).toBeNull();
    expect(resumoFollowUpDaCotacao({ created_at: null }).horasDeAtraso).toBeNull();
  });
});

describe('Cotacao e dossie do pedido nao encenam follow-up', () => {
  it('Cotacao nao tem botao nem handler de follow-up simulado', () => {
    const fonte = ler(join('src', 'pages', 'cotacao', 'Cotacao.tsx'));
    expect(fonte).not.toContain('handleRunFollowUp');
    expect(fonte).not.toContain('isRunningFollowUp');
    expect(fonte).not.toContain('caneca de alum');
    expect(fonte).not.toContain('Smart follow-up executed');
    expect(fonte).not.toContain('setTimeout');
  });

  it('Cotacao alimenta o monitor com o registro real da cotacao', () => {
    const fonte = ler(join('src', 'pages', 'cotacao', 'Cotacao.tsx'));
    expect(fonte).toContain('resumoFollowUpDaCotacao(cotacoes[0])');
    expect(fonte).toContain('ultimoFollowUpEm={followUp.ultimoFollowUpEm}');
    expect(fonte).toContain('followUpStatus={followUp.followUpStatus}');
    expect(fonte).toContain('horasDeAtraso={followUp.horasDeAtraso}');
  });

  it('PedidoDetailsDialog passa as interacoes reais para o log', () => {
    const fonte = ler(join('src', 'pages', 'pedidos', 'PedidoDetailsDialog.tsx'));
    expect(fonte).toContain('interacoes={interacoesPedido}');
    expect(fonte).toContain("from('notifications')");
    expect(fonte).toContain("eq('type', 'cotacao_followup')");
    expect(fonte).toContain('carregando={carregandoFollowUp}');
  });
});

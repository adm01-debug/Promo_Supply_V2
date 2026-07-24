import { describe, it, expect } from 'vitest';
import {
  dashboardTourSteps,
  cotacaoTourSteps,
  fornecedorTourSteps,
  pedidosTourSteps,
  solicitacoesTourSteps,
} from '../tourStepDefinitions';

// ─── tourStepDefinitions ──────────────────────────────────────────────────────

const VALID_POSITIONS = ['top', 'bottom', 'left', 'right'] as const;
const VALID_HIGHLIGHTS = ['primary', 'info', 'success', 'warning', 'destructive'] as const;

const ALL_TOURS = [
  { name: 'dashboardTourSteps', steps: dashboardTourSteps },
  { name: 'cotacaoTourSteps', steps: cotacaoTourSteps },
  { name: 'fornecedorTourSteps', steps: fornecedorTourSteps },
  { name: 'pedidosTourSteps', steps: pedidosTourSteps },
  { name: 'solicitacoesTourSteps', steps: solicitacoesTourSteps },
];

// ── individual tour step counts ───────────────────────────────────────────────

describe('dashboardTourSteps', () => {
  it('has 5 steps', () => {
    expect(dashboardTourSteps).toHaveLength(5);
  });
});

describe('cotacaoTourSteps', () => {
  it('has 3 steps', () => {
    expect(cotacaoTourSteps).toHaveLength(3);
  });
});

describe('fornecedorTourSteps', () => {
  it('has 4 steps', () => {
    expect(fornecedorTourSteps).toHaveLength(4);
  });
});

describe('pedidosTourSteps', () => {
  it('has 4 steps', () => {
    expect(pedidosTourSteps).toHaveLength(4);
  });
});

describe('solicitacoesTourSteps', () => {
  it('has 5 steps', () => {
    expect(solicitacoesTourSteps).toHaveLength(5);
  });
});

// ── structural validity across all tours ──────────────────────────────────────

describe('all tour step arrays', () => {
  ALL_TOURS.forEach(({ name, steps }) => {
    describe(name, () => {
      it('has at least one step', () => {
        expect(steps.length).toBeGreaterThan(0);
      });

      it('every step has a non-empty target selector', () => {
        steps.forEach(step => {
          expect(typeof step.target).toBe('string');
          expect(step.target.length).toBeGreaterThan(0);
        });
      });

      it('every step has a non-empty title', () => {
        steps.forEach(step => {
          expect(typeof step.title).toBe('string');
          expect(step.title.length).toBeGreaterThan(0);
        });
      });

      it('every step has non-empty content', () => {
        steps.forEach(step => {
          expect(typeof step.content).toBe('string');
          expect(step.content.length).toBeGreaterThan(0);
        });
      });

      it('every step has a valid position', () => {
        steps.forEach(step => {
          expect(VALID_POSITIONS).toContain(step.position);
        });
      });

      it('every step has a valid highlight', () => {
        steps.forEach(step => {
          expect(VALID_HIGHLIGHTS).toContain(step.highlight);
        });
      });

      it('target selectors are CSS attribute selectors', () => {
        steps.forEach(step => {
          // All targets use [data-tour='...'] pattern
          expect(step.target).toMatch(/^\[data-tour=/);
        });
      });
    });
  });
});

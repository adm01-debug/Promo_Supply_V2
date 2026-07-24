import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSonnerToast = vi.hoisted(() => ({
  success: vi.fn().mockReturnValue('toast-id'),
  error: vi.fn().mockReturnValue('toast-id'),
  warning: vi.fn().mockReturnValue('toast-id'),
  info: vi.fn().mockReturnValue('toast-id'),
  dismiss: vi.fn(),
  promise: vi.fn(),
  loading: vi.fn(),
}));

vi.mock('sonner', () => ({ toast: mockSonnerToast }));

vi.mock('@/hooks/useFeedback', () => ({
  useFeedbackPreferences: {
    getState: vi.fn(() => ({ soundEnabled: false, hapticEnabled: false, volume: 0.5 })),
  },
  hapticPatterns: { success: [100], error: [200], warning: [100], info: [50] },
  soundConfigs: {
    success: { type: 'sine', frequency: 440, duration: 0.1 },
    error: { type: 'square', frequency: 220, duration: 0.2 },
    warning: { type: 'triangle', frequency: 330, duration: 0.15 },
    info: { type: 'sine', frequency: 523, duration: 0.1 },
  },
}));

import { toast } from '../feedbackToast';

// ─── feedbackToast ────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('toast', () => {
  it('is defined', () => {
    expect(toast).toBeDefined();
  });

  it('exposes success, error, warning, info, dismiss, promise, loading, custom', () => {
    expect(typeof toast.success).toBe('function');
    expect(typeof toast.error).toBe('function');
    expect(typeof toast.warning).toBe('function');
    expect(typeof toast.info).toBe('function');
    expect(typeof toast.dismiss).toBe('function');
    expect(typeof toast.promise).toBe('function');
    expect(typeof toast.loading).toBe('function');
    expect(toast.custom).toBeDefined();
  });
});

describe('toast.success', () => {
  it('calls sonnerToast.success with the message', () => {
    toast.success('Operação realizada');
    expect(mockSonnerToast.success).toHaveBeenCalledWith('Operação realizada', undefined);
  });

  it('passes options to sonnerToast.success', () => {
    const opts = { description: 'Detalhe' };
    toast.success('OK', opts);
    expect(mockSonnerToast.success).toHaveBeenCalledWith('OK', opts);
  });

  it('does not throw', () => {
    expect(() => toast.success('Test')).not.toThrow();
  });
});

describe('toast.error', () => {
  it('calls sonnerToast.error with the message', () => {
    toast.error('Erro ao processar');
    expect(mockSonnerToast.error).toHaveBeenCalledWith('Erro ao processar', undefined);
  });

  it('does not throw', () => {
    expect(() => toast.error('Error')).not.toThrow();
  });
});

describe('toast.warning', () => {
  it('calls sonnerToast.warning with the message', () => {
    toast.warning('Atenção');
    expect(mockSonnerToast.warning).toHaveBeenCalledWith('Atenção', undefined);
  });

  it('does not throw', () => {
    expect(() => toast.warning('Warn')).not.toThrow();
  });
});

describe('toast.info', () => {
  it('calls sonnerToast.info with the message', () => {
    toast.info('Informação');
    expect(mockSonnerToast.info).toHaveBeenCalledWith('Informação', undefined);
  });

  it('does not throw', () => {
    expect(() => toast.info('Info')).not.toThrow();
  });
});

describe('toast.dismiss', () => {
  it('is the same reference as sonnerToast.dismiss', () => {
    expect(toast.dismiss).toBe(mockSonnerToast.dismiss);
  });
});

describe('toast.promise', () => {
  it('is the same reference as sonnerToast.promise', () => {
    expect(toast.promise).toBe(mockSonnerToast.promise);
  });
});

describe('toast.loading', () => {
  it('is the same reference as sonnerToast.loading', () => {
    expect(toast.loading).toBe(mockSonnerToast.loading);
  });
});

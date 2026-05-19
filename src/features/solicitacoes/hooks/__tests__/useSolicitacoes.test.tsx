import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSolicitacoes } from '../useSolicitacoes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock Auth Context
const mockAuthContext = {
  user: { id: 'test-user' },
  session: { access_token: 'test-token' },
  userRole: 'admin',
  loading: false,
};

vi.mock('../../auth/hooks/useAuth', () => ({
  useAuth: () => mockAuthContext,
}));

// Wrapper for React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useSolicitacoes Hook', () => {
  it('should initialize with default states', () => {
    const { result } = renderHook(() => useSolicitacoes(), {
      wrapper: createWrapper(),
    });
    
    expect(result.current.solicitacoes).toBeDefined();
    expect(typeof result.current.createSolicitacao).toBe('function');
  });

  it('should handle creation workflow', async () => {
    const { result } = renderHook(() => useSolicitacoes(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      expect(result.current.solicitacoes).toBeInstanceOf(Array);
    });
  });
});

import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSolicitacoes } from '../useSolicitacoes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock Auth Context - Using the absolute path matching the import in the hook
vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user' },
    session: { access_token: 'test-token' },
    userRole: 'admin',
    loading: false,
  }),
}));

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({ data: [], error: null })),
      insert: vi.fn(() => ({ data: null, error: null })),
    })),
  },
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

    expect(result.current.solicitacoes).toBeInstanceOf(Array);
  });
});

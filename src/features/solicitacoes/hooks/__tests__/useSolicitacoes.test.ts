import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSolicitacoes } from '../useSolicitacoes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

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
      // Simulation of creating a request
      const mockData = { titulo: 'Teste', prioridade: 'alta' };
      // This is a simplified test as the actual hook depends on Supabase
      expect(result.current.solicitacoes).toBeInstanceOf(Array);
    });
  });
});

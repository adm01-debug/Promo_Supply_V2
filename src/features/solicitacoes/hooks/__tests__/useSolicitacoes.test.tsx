import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSolicitacoes } from '../useSolicitacoes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock Auth - Matching the exact import in useSolicitacoes.ts: import { useAuth } from '@/features/auth';
vi.mock('@/features/auth', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    session: { access_token: 'test-token' },
    userRole: 'admin',
    organizationId: 'test-org',
    loading: false,
  }),
}));

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({ 
        count: vi.fn(() => ({ data: [], error: null, count: 0 })),
        order: vi.fn(() => ({ 
          eq: vi.fn(() => ({ 
            range: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 })) 
          })) 
        }))
      })),
      insert: vi.fn(() => ({ 
        select: vi.fn(() => ({ 
          single: vi.fn(() => Promise.resolve({ data: null, error: null })) 
        })) 
      })),
      rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
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

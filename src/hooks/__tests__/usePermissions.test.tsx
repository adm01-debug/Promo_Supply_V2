import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/features/auth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Mock dependencies
vi.mock('@/features/auth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
  },
}));

const createQueryClientWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('usePermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return default permissions for admin', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'admin-id' },
      role: 'admin',
      isAdmin: true,
    } as ReturnType<typeof useAuth>);

    const { result } = renderHook(() => usePermissions(), {
      wrapper: createQueryClientWrapper(),
    });

    // Admin should have all permissions
    expect(result.current.hasPermission('any', 'any')).toBe(true);
    expect(result.current.hasAnyPermission([{ module: 'any', action: 'any' }])).toBe(true);
  });

  it('should check user permissions correctly for non-admin', async () => {
    // Mock user permissions data
    const mockUserPermissions = [
      {
        id: '1',
        role: 'buyer',
        permission: { module: 'solicitacoes', action: 'view' },
      },
      {
        id: '2',
        role: 'buyer',
        permission: { module: 'solicitacoes', action: 'create' },
      },
    ];

    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-id' },
      role: 'buyer',
      isAdmin: false,
    } as ReturnType<typeof useAuth>);

    // Mock supabase response for role_permissions
    const { supabase } = await import('@/integrations/supabase/client');
    vi.mocked(supabase.from).mockImplementation((_table: string) => ({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        eq: vi.fn(() => Promise.resolve({ data: mockUserPermissions, error: null })),
      })),
    }) as ReturnType<typeof supabase.from>);

    const { result } = renderHook(() => usePermissions(), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Should have specific permissions
    expect(result.current.hasPermission('solicitacoes', 'view')).toBe(true);
    expect(result.current.hasPermission('solicitacoes', 'create')).toBe(true);
    
    // Should NOT have other permissions
    expect(result.current.hasPermission('solicitacoes', 'delete')).toBe(false);
    expect(result.current.hasPermission('security', 'manage_ips')).toBe(false);

    // Any/All checks
    expect(result.current.hasAnyPermission([
      { module: 'solicitacoes', action: 'view' },
      { module: 'security', action: 'view' }
    ])).toBe(true);

    expect(result.current.hasAllPermissions([
      { module: 'solicitacoes', action: 'view' },
      { module: 'solicitacoes', action: 'create' }
    ])).toBe(true);

    expect(result.current.hasAllPermissions([
      { module: 'solicitacoes', action: 'view' },
      { module: 'solicitacoes', action: 'delete' }
    ])).toBe(false);
  });

  it('should return false if no role is present', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      role: null,
      isAdmin: false,
    } as ReturnType<typeof useAuth>);

    const { result } = renderHook(() => usePermissions(), {
      wrapper: createQueryClientWrapper(),
    });

    expect(result.current.hasPermission('any', 'any')).toBe(false);
  });
});

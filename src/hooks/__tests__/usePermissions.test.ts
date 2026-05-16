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
    (useAuth as any).mockReturnValue({
      user: { id: 'admin-id' },
      role: 'admin',
      isAdmin: true,
    });

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

    (useAuth as any).mockReturnValue({
      user: { id: 'user-id' },
      role: 'buyer',
      isAdmin: false,
    });

    // Mock supabase response for role_permissions
    const { supabase } = await import('@/integrations/supabase/client');
    (supabase.from as any).mockImplementation((table: string) => ({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        eq: vi.fn(() => Promise.resolve({ data: mockUserPermissions, error: null })),
      })),
    }));

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
    (useAuth as any).mockReturnValue({
      user: null,
      role: null,
      isAdmin: false,
    });

    const { result } = renderHook(() => usePermissions(), {
      wrapper: createQueryClientWrapper(),
    });

    expect(result.current.hasPermission('any', 'any')).toBe(false);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import type { AppRole } from '@/features/auth';

const authState: { loading: boolean; user: unknown; role: AppRole | null } = {
  loading: false,
  user: { id: 'u1' },
  role: 'admin',
};

vi.mock('@/features/auth', () => ({
  useAuth: () => ({
    user: authState.user,
    loading: authState.loading,
    isAdmin: authState.role === 'admin',
    hasRole: (required: AppRole | AppRole[]) => {
      if (authState.role === 'admin') return true;
      if (authState.role === null) return false;
      return Array.isArray(required) ? required.includes(authState.role) : required === authState.role;
    },
  }),
}));

vi.mock('@/lib/feedbackToast', () => ({
  toast: { warning: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

const renderAt = (requiredRole?: AppRole | AppRole[]) =>
  render(
    <MemoryRouter initialEntries={['/auditoria']}>
      <Routes>
        <Route
          path="/auditoria"
          element={<ProtectedRoute requiredRole={requiredRole}>conteudo</ProtectedRoute>}
        />
        <Route path="/compras" element={<div>dashboard</div>} />
        <Route path="/auth" element={<div>login</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe('ProtectedRoute', () => {
  beforeEach(() => {
    authState.loading = false;
    authState.user = { id: 'u1' };
    authState.role = 'admin';
  });

  it('renderiza o conteudo quando o papel tem permissao', () => {
    authState.role = 'buyer';
    renderAt(['admin', 'coordinator', 'buyer', 'finance']);
    expect(screen.getByText('conteudo')).toBeInTheDocument();
  });

  it('mostra acesso restrito em vez de redirecionar silenciosamente', () => {
    authState.role = 'viewer';
    renderAt(['admin', 'coordinator', 'buyer', 'finance']);
    expect(screen.queryByText('conteudo')).not.toBeInTheDocument();
    expect(screen.getByText('Acesso restrito')).toBeInTheDocument();
    expect(screen.queryByText('dashboard')).not.toBeInTheDocument();
  });

  it('redireciona para o login quando nao ha sessao', () => {
    authState.user = null;
    renderAt('admin');
    expect(screen.getByText('login')).toBeInTheDocument();
  });

  it('bloqueia quando o papel nao foi carregado', () => {
    authState.role = null;
    renderAt('admin');
    expect(screen.getByText('Acesso restrito')).toBeInTheDocument();
  });
});
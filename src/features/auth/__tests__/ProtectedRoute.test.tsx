import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
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

  // QA-043 (AUT-08): sem o state.from o login sempre voltava para /compras e o
  // usuario perdia a tela onde estava, inclusive a query string.
  it('entrega a rota de origem (path + busca) para o login devolver o usuario la', () => {
    authState.user = null;
    const AuthProbe = () => {
      const location = useLocation();
      const from = (location.state as { from?: string } | null)?.from;
      return <div>{`origem=${from ?? 'sem-origem'}`}</div>;
    };
    render(
      <MemoryRouter initialEntries={['/auditoria?tab=2']}>
        <Routes>
          <Route path="/auditoria" element={<ProtectedRoute>conteudo</ProtectedRoute>} />
          <Route path="/auth" element={<AuthProbe />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('origem=/auditoria?tab=2')).toBeInTheDocument();
    expect(screen.queryByText('conteudo')).not.toBeInTheDocument();
  });

  it('bloqueia quando o papel nao foi carregado', () => {
    authState.role = null;
    renderAt('admin');
    expect(screen.getByText('Acesso restrito')).toBeInTheDocument();
  });
});
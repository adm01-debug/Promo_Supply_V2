import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PasskeyManager } from '../PasskeyManager';

// Etapa QA 061 (SEC-11): o cartao anunciava "Faca login usando biometria ou chave
// de seguranca" e deixava cadastrar passkey, enquanto o servidor recusa o login
// (webauthn-authenticate/index.ts e fail-closed). O cadastro agora esta bloqueado.

vi.mock('@/hooks/useWebAuthn', () => ({
  useWebAuthn: () => ({
    isSupported: true,
    isLoading: false,
    credentials: [],
    fetchCredentials: vi.fn().mockResolvedValue(undefined),
    isPlatformAuthenticatorAvailable: vi.fn().mockResolvedValue(true),
    registerPasskey: vi.fn(),
    deleteCredential: vi.fn(),
  }),
}));

vi.mock('@/features/auth', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'a@b.c' } }),
}));

describe('PasskeyManager / anuncio honesto (SEC-11)', () => {
  it('nao promete login por biometria enquanto o servidor recusa', () => {
    render(<PasskeyManager />);
    expect(screen.queryByText(/Faça login usando biometria/i)).toBeNull();
    expect(screen.getByText(/verificação de assinatura no servidor está pendente/i)).toBeTruthy();
  });

  it('botao Adicionar Passkey fica desabilitado', () => {
    render(<PasskeyManager />);
    expect(screen.getByRole('button', { name: /Adicionar Passkey/i })).toBeDisabled();
  });
});

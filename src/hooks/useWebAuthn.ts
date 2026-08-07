import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/feedbackToast';
import { logger } from '@/lib/logger';

interface WebAuthnCredential {
  id: string;
  credential_id: string;
  credential_name: string | null;
  device_type: string | null;
  last_used_at: string | null;
  created_at: string;
}

// Base64URL helpers
function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64UrlDecode(str: string): ArrayBuffer {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer as ArrayBuffer;
}

export function useWebAuthn() {
  const [isLoading, setIsLoading] = useState(false);
  const [credentials, setCredentials] = useState<WebAuthnCredential[]>([]);

  // Check if WebAuthn is supported
  const isSupported = useCallback(() => {
    return !!(
      window.PublicKeyCredential &&
      typeof window.PublicKeyCredential === 'function'
    );
  }, []);

  // Check if platform authenticator is available (biometric)
  const isPlatformAuthenticatorAvailable = useCallback(async () => {
    if (!isSupported()) return false;
    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      return false;
    }
  }, [isSupported]);

  // Fetch user's registered credentials
  const fetchCredentials = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('webauthn_credentials')
        .select('id, credential_id, credential_name, device_type, last_used_at, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCredentials(data || []);
      return data || [];
    } catch (error) {
      logger.error('Error fetching credentials', { error });
      return [];
    }
  }, []);

  // Register a new passkey
  const registerPasskey = useCallback(async (userId: string, email: string, credentialName?: string) => {
    if (!isSupported()) {
      toast.error('WebAuthn não é suportado neste navegador');
      return { success: false };
    }

    setIsLoading(true);

    try {
      // Step 1: Get registration options from server
      const { data: startData, error: startError } = await supabase.functions.invoke('webauthn-register', {
        body: { action: 'start', userId, email },
      });

      if (startError || startData?.error) {
        throw new Error(startData?.error || startError?.message || 'Failed to start registration');
      }

      const options = startData.options;

      // Step 2: Create credential using WebAuthn API
      const publicKeyOptions: PublicKeyCredentialCreationOptions = {
        challenge: base64UrlDecode(options.challenge),
        rp: options.rp,
        user: {
          id: base64UrlDecode(options.user.id),
          name: options.user.name,
          displayName: options.user.displayName,
        },
        pubKeyCredParams: options.pubKeyCredParams,
        excludeCredentials: options.excludeCredentials?.map((cred: { id: string; type: 'public-key'; transports?: AuthenticatorTransport[] }) => ({
          id: base64UrlDecode(cred.id),
          type: cred.type,
          transports: cred.transports,
        })),
        authenticatorSelection: options.authenticatorSelection,
        timeout: options.timeout,
        attestation: options.attestation,
      };

      const credential = await navigator.credentials.create({
        publicKey: publicKeyOptions,
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error('Failed to create credential');
      }

      const attestationResponse = credential.response as AuthenticatorAttestationResponse;

      // Step 3: Send credential to server for verification and storage
      const credentialData = {
        id: credential.id,
        rawId: base64UrlEncode(credential.rawId),
        type: credential.type,
        authenticatorAttachment: (credential as PublicKeyCredential & { authenticatorAttachment?: string }).authenticatorAttachment,
        response: {
          attestationObject: base64UrlEncode(attestationResponse.attestationObject),
          clientDataJSON: base64UrlEncode(attestationResponse.clientDataJSON),
          transports: attestationResponse.getTransports?.() || [],
        },
      };

      const { data: finishData, error: finishError } = await supabase.functions.invoke('webauthn-register', {
        body: {
          action: 'finish',
          userId,
          email,
          credential: credentialData,
          credentialName: credentialName || 'Passkey',
        },
      });

      if (finishError || finishData?.error) {
        throw new Error(finishData?.error || finishError?.message || 'Failed to finish registration');
      }

      toast.success('Passkey registrada com sucesso!');
      await fetchCredentials();
      return { success: true };
    } catch (error: unknown) {
      logger.error('WebAuthn registration error', { error });
      
      const err = error as Error & { name?: string };
      if (err.name === 'NotAllowedError') {
        toast.error('Operação cancelada pelo usuário');
      } else if (err.name === 'SecurityError') {
        toast.error('Erro de segurança. Verifique se está usando HTTPS.');
      } else {
        toast.error(err.message || 'Falha ao registrar passkey');
      }
      
      return { success: false, error: err };
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, fetchCredentials]);

  // Authenticate with passkey
  const authenticateWithPasskey = useCallback(async (email: string) => {
    if (!isSupported()) {
      toast.error('WebAuthn não é suportado neste navegador');
      return { success: false };
    }

    setIsLoading(true);

    try {
      // Step 1: Get authentication options from server
      const { data: startData, error: startError } = await supabase.functions.invoke('webauthn-authenticate', {
        body: { action: 'start', email },
      });

      if (startError || startData?.error) {
        throw new Error(startData?.error || startError?.message || 'Failed to start authentication');
      }

      const options = startData.options;

      // Step 2: Get credential using WebAuthn API
      const publicKeyOptions: PublicKeyCredentialRequestOptions = {
        challenge: base64UrlDecode(options.challenge),
        timeout: options.timeout,
        rpId: options.rpId,
        allowCredentials: options.allowCredentials?.map((cred: { id: string; type: 'public-key'; transports?: AuthenticatorTransport[] }) => ({
          id: base64UrlDecode(cred.id),
          type: cred.type,
          transports: cred.transports,
        })),
        userVerification: options.userVerification,
      };

      const credential = await navigator.credentials.get({
        publicKey: publicKeyOptions,
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error('Failed to get credential');
      }

      const assertionResponse = credential.response as AuthenticatorAssertionResponse;

      // Step 3: Send credential to server for verification
      const credentialData = {
        id: credential.id,
        rawId: base64UrlEncode(credential.rawId),
        type: credential.type,
        response: {
          authenticatorData: base64UrlEncode(assertionResponse.authenticatorData),
          clientDataJSON: base64UrlEncode(assertionResponse.clientDataJSON),
          signature: base64UrlEncode(assertionResponse.signature),
          userHandle: assertionResponse.userHandle ? base64UrlEncode(assertionResponse.userHandle) : null,
        },
      };

      const { data: finishData, error: finishError } = await supabase.functions.invoke('webauthn-authenticate', {
        body: { action: 'finish', email, credential: credentialData },
      });

      if (finishError || finishData?.error) {
        throw new Error(finishData?.error || finishError?.message || 'Failed to finish authentication');
      }

      // Use the action link to sign in
      if (finishData.actionLink) {
        // Extract token and sign in
        const url = new URL(finishData.actionLink);
        const token = url.searchParams.get('token');
        const type = url.searchParams.get('type') || 'magiclink';
        
        if (token) {
          const otpType = type as 'magiclink' | 'recovery' | 'signup' | 'invite' | 'email';
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: otpType,
          });

          if (verifyError) {
            logger.error('OTP verification error', { error: verifyError });
            // Try alternative approach - direct session refresh
          }
        }
      }

      toast.success('Login realizado com sucesso!');
      return { success: true, userId: finishData.userId };
    } catch (error: unknown) {
      logger.error('WebAuthn authentication error', { error });
      
      const err = error as Error & { name?: string };
      if (err.name === 'NotAllowedError') {
        toast.error('Operação cancelada pelo usuário');
      } else if (err.message === 'Nenhuma passkey registrada para este usuário') {
        toast.error('Nenhuma passkey registrada para este email');
      } else {
        toast.error(err.message || 'Falha na autenticação');
      }
      
      return { success: false, error: err };
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  // Delete a credential
  const deleteCredential = useCallback(async (credentialId: string) => {
    try {
      const { error } = await supabase
        .from('webauthn_credentials')
        .delete()
        .eq('id', credentialId);

      if (error) throw error;

      toast.success('Passkey removida com sucesso');
      await fetchCredentials();
      return { success: true };
    } catch (error: unknown) {
      logger.error('Error deleting credential', { error });
      toast.error('Falha ao remover passkey');
      const err = error as Error;
      return { success: false, error: err };
    }
  }, [fetchCredentials]);

  return {
    isLoading,
    isSupported: isSupported(),
    isPlatformAuthenticatorAvailable,
    credentials,
    fetchCredentials,
    registerPasskey,
    authenticateWithPasskey,
    deleteCredential,
  };
}

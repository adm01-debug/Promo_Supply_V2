import { corsHeaders } from "../_shared/security.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function base64UrlEncode(buffer: Uint8Array | ArrayBuffer): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64UrlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Verify auth and return the authenticated user ID */
async function verifyAuthUser(req: Request): Promise<string> {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Não autorizado: token ausente");
  }
  const token = authHeader.slice(7).trim();
  if (!token) throw new Error("Não autorizado: token inválido");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw new Error("Não autorizado: token inválido");
  return user.id;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Validate the caller's identity
    const authenticatedUserId = await verifyAuthUser(req);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, userId, email, credential, credentialName } = await req.json();
    console.log(`WebAuthn register action: ${action}`);

    // SECURITY: Ensure the userId from the body matches the authenticated user
    if (userId && userId !== authenticatedUserId) {
      throw new Error("Não autorizado: userId não corresponde ao usuário autenticado");
    }
    const safeUserId = authenticatedUserId;

    const rpName = 'Sistema de Compras';
    const rpId = new URL(req.headers.get('origin') || 'https://localhost').hostname;

    if (action === 'start') {
      const challengeBytes = new Uint8Array(32);
      crypto.getRandomValues(challengeBytes);
      const challenge = base64UrlEncode(challengeBytes);

      const { error: challengeError } = await supabase
        .from('webauthn_challenges')
        .insert({
          user_id: safeUserId,
          email: email,
          challenge: challenge,
          type: 'registration',
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        });

      if (challengeError) {
        console.error('Error storing challenge:', challengeError);
        throw new Error('Failed to create registration challenge');
      }

      let excludeCredentials: Array<{ id: string; type: string; transports: string[] }> = [];
      const { data: existingCreds } = await supabase
        .from('webauthn_credentials')
        .select('credential_id, transports')
        .eq('user_id', safeUserId);

      if (existingCreds) {
        excludeCredentials = existingCreds.map((cred) => ({
          id: cred.credential_id,
          type: 'public-key',
          transports: cred.transports || ['internal'],
        }));
      }

      const options = {
        challenge: challenge,
        rp: {
          name: rpName,
          id: rpId,
        },
        user: {
          id: base64UrlEncode(new TextEncoder().encode(safeUserId)),
          name: email,
          displayName: email.split('@')[0],
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },
          { alg: -257, type: 'public-key' },
        ],
        excludeCredentials,
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'preferred',
          residentKey: 'preferred',
          requireResidentKey: false,
        },
        timeout: 60000,
        attestation: 'none',
      };

      console.log('Registration options generated for:', email);

      return new Response(JSON.stringify({ options }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'finish') {
      const { data: challengeData, error: challengeError } = await supabase
        .from('webauthn_challenges')
        .select('*')
        .eq('email', email)
        .eq('type', 'registration')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (challengeError || !challengeData) {
        console.error('Challenge not found or expired:', challengeError);
        throw new Error('Registration challenge expired or not found');
      }

      const { id: credentialId, response: credResponse, authenticatorAttachment } = credential;

      const clientDataJSON = base64UrlDecode(credResponse.clientDataJSON);
      const clientData = JSON.parse(new TextDecoder().decode(clientDataJSON));
      if (clientData.challenge !== challengeData.challenge) {
        throw new Error('Challenge mismatch');
      }
      if (clientData.type !== 'webauthn.create') {
        throw new Error('Invalid credential type');
      }

      // SECURITY: Store credential for the authenticated user only
      const { error: credError } = await supabase
        .from('webauthn_credentials')
        .insert({
          user_id: safeUserId,
          credential_id: credentialId,
          public_key: credResponse.attestationObject,
          counter: 0,
          device_type: authenticatorAttachment || 'platform',
          transports: credResponse.transports || ['internal'],
          credential_name: credentialName || 'Passkey',
        });

      if (credError) {
        console.error('Error storing credential:', credError);
        throw new Error('Failed to store credential');
      }

      await supabase
        .from('webauthn_challenges')
        .delete()
        .eq('id', challengeData.id);

      console.log('Passkey registered successfully for user:', safeUserId);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('WebAuthn register error:', error);
    const status = errorMessage.includes("Não autorizado") ? 401 : 400;
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

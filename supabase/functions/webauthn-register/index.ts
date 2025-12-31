import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Base64URL encoding/decoding helpers
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, userId, email, credential, credentialName } = await req.json();
    console.log(`WebAuthn register action: ${action}`);

    const rpName = 'Sistema de Compras';
    const rpId = new URL(req.headers.get('origin') || 'https://localhost').hostname;

    if (action === 'start') {
      // Generate registration challenge
      const challengeBytes = new Uint8Array(32);
      crypto.getRandomValues(challengeBytes);
      const challenge = base64UrlEncode(challengeBytes);

      // Store challenge in database
      const { error: challengeError } = await supabase
        .from('webauthn_challenges')
        .insert({
          user_id: userId || null,
          email: email,
          challenge: challenge,
          type: 'registration',
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
        });

      if (challengeError) {
        console.error('Error storing challenge:', challengeError);
        throw new Error('Failed to create registration challenge');
      }

      // Get existing credentials for this user to exclude
      let excludeCredentials: any[] = [];
      if (userId) {
        const { data: existingCreds } = await supabase
          .from('webauthn_credentials')
          .select('credential_id, transports')
          .eq('user_id', userId);

        if (existingCreds) {
          excludeCredentials = existingCreds.map((cred) => ({
            id: cred.credential_id,
            type: 'public-key',
            transports: cred.transports || ['internal'],
          }));
        }
      }

      // Return registration options
      const options = {
        challenge: challenge,
        rp: {
          name: rpName,
          id: rpId,
        },
        user: {
          id: userId ? base64UrlEncode(new TextEncoder().encode(userId)) : base64UrlEncode(new TextEncoder().encode(email)),
          name: email,
          displayName: email.split('@')[0],
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },   // ES256
          { alg: -257, type: 'public-key' }, // RS256
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
      // Verify the challenge exists and hasn't expired
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

      // Parse the credential
      const { id: credentialId, rawId, response: credResponse, type, authenticatorAttachment } = credential;

      // Extract public key from attestation response
      const attestationObject = base64UrlDecode(credResponse.attestationObject);
      const clientDataJSON = base64UrlDecode(credResponse.clientDataJSON);

      // Verify clientDataJSON
      const clientData = JSON.parse(new TextDecoder().decode(clientDataJSON));
      if (clientData.challenge !== challengeData.challenge) {
        throw new Error('Challenge mismatch');
      }
      if (clientData.type !== 'webauthn.create') {
        throw new Error('Invalid credential type');
      }

      // Store the credential
      const { error: credError } = await supabase
        .from('webauthn_credentials')
        .insert({
          user_id: userId,
          credential_id: credentialId,
          public_key: credResponse.attestationObject, // Store the full attestation for verification
          counter: 0,
          device_type: authenticatorAttachment || 'platform',
          transports: credResponse.transports || ['internal'],
          credential_name: credentialName || 'Passkey',
        });

      if (credError) {
        console.error('Error storing credential:', credError);
        throw new Error('Failed to store credential');
      }

      // Clean up the challenge
      await supabase
        .from('webauthn_challenges')
        .delete()
        .eq('id', challengeData.id);

      console.log('Passkey registered successfully for user:', userId);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('WebAuthn register error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

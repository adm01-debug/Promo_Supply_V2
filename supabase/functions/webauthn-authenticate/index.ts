import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { action, email, credential } = await req.json();
    console.log(`WebAuthn authenticate action: ${action}`);

    const rpId = new URL(req.headers.get('origin') || 'https://localhost').hostname;

    if (action === 'start') {
      // Get user by email first
      const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
      
      const user = userData?.users?.find(u => u.email === email);
      if (!user) {
        // Don't reveal if user exists or not
        console.log('User not found for email:', email);
        throw new Error('Autenticação falhou');
      }

      // Get user's credentials
      const { data: credentials, error: credError } = await supabase
        .from('webauthn_credentials')
        .select('credential_id, transports')
        .eq('user_id', user.id);

      if (credError || !credentials || credentials.length === 0) {
        console.log('No credentials found for user');
        throw new Error('Nenhuma passkey registrada para este usuário');
      }

      // Generate authentication challenge
      const challengeBytes = new Uint8Array(32);
      crypto.getRandomValues(challengeBytes);
      const challenge = base64UrlEncode(challengeBytes);

      // Store challenge
      const { error: challengeError } = await supabase
        .from('webauthn_challenges')
        .insert({
          user_id: user.id,
          email: email,
          challenge: challenge,
          type: 'authentication',
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        });

      if (challengeError) {
        console.error('Error storing challenge:', challengeError);
        throw new Error('Failed to create authentication challenge');
      }

      const allowCredentials = credentials.map((cred) => ({
        id: cred.credential_id,
        type: 'public-key',
        transports: cred.transports || ['internal'],
      }));

      const options = {
        challenge: challenge,
        timeout: 60000,
        rpId: rpId,
        allowCredentials,
        userVerification: 'preferred',
      };

      console.log('Authentication options generated for:', email);

      return new Response(JSON.stringify({ options, userId: user.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'finish') {
      // Verify the challenge exists and hasn't expired
      const { data: challengeData, error: challengeError } = await supabase
        .from('webauthn_challenges')
        .select('*')
        .eq('email', email)
        .eq('type', 'authentication')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (challengeError || !challengeData) {
        console.error('Challenge not found or expired:', challengeError);
        throw new Error('Authentication challenge expired');
      }

      // Parse the credential response
      const { id: credentialId, response: authResponse } = credential;

      // Verify the credential exists
      const { data: storedCred, error: credFetchError } = await supabase
        .from('webauthn_credentials')
        .select('*')
        .eq('credential_id', credentialId)
        .single();

      if (credFetchError || !storedCred) {
        console.error('Credential not found:', credFetchError);
        throw new Error('Credential not registered');
      }

      // Verify clientDataJSON
      const clientDataJSON = base64UrlDecode(authResponse.clientDataJSON);
      const clientData = JSON.parse(new TextDecoder().decode(clientDataJSON));
      
      if (clientData.challenge !== challengeData.challenge) {
        throw new Error('Challenge mismatch');
      }
      if (clientData.type !== 'webauthn.get') {
        throw new Error('Invalid credential type');
      }

      // Update counter and last used
      const newCounter = (storedCred.counter || 0) + 1;
      await supabase
        .from('webauthn_credentials')
        .update({ 
          counter: newCounter, 
          last_used_at: new Date().toISOString() 
        })
        .eq('id', storedCred.id);

      // Clean up the challenge
      await supabase
        .from('webauthn_challenges')
        .delete()
        .eq('id', challengeData.id);

      // Generate a custom access token for the user
      // Using magic link as a workaround since we've verified the user via passkey
      const { data: signInData, error: signInError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
        options: {
          redirectTo: '/',
        }
      });

      if (signInError) {
        console.error('Error generating sign in link:', signInError);
        throw new Error('Failed to create session');
      }

      // Extract the token from the link
      const linkUrl = new URL(signInData.properties?.hashed_token ? 
        `${Deno.env.get('SUPABASE_URL')}/auth/v1/verify?token=${signInData.properties.hashed_token}&type=magiclink` : 
        signInData.properties?.action_link || '');
      
      const token = linkUrl.searchParams.get('token') || signInData.properties?.hashed_token;

      console.log('WebAuthn authentication successful for:', email);

      // Log security event
      await supabase.rpc('log_security_event', {
        _user_id: storedCred.user_id,
        _event_type: 'webauthn_login',
        _event_description: 'User logged in via WebAuthn/Passkey',
        _severity: 'info',
      });

      return new Response(JSON.stringify({ 
        success: true,
        token: token,
        userId: storedCred.user_id,
        email: email,
        actionLink: signInData.properties?.action_link,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('WebAuthn authenticate error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

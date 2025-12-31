-- Create table for storing WebAuthn/Passkey credentials
CREATE TABLE public.webauthn_credentials (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    credential_id TEXT NOT NULL UNIQUE,
    public_key TEXT NOT NULL,
    counter INTEGER NOT NULL DEFAULT 0,
    device_type TEXT, -- 'platform' for built-in authenticators, 'cross-platform' for security keys
    transports TEXT[], -- Array of transports (usb, nfc, ble, internal)
    aaguid TEXT, -- Authenticator attestation GUID
    credential_name TEXT, -- User-friendly name for the credential
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.webauthn_credentials ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own credentials" 
ON public.webauthn_credentials 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own credentials" 
ON public.webauthn_credentials 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credentials" 
ON public.webauthn_credentials 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credentials" 
ON public.webauthn_credentials 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_webauthn_credentials_updated_at
BEFORE UPDATE ON public.webauthn_credentials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster credential lookups
CREATE INDEX idx_webauthn_credentials_user_id ON public.webauthn_credentials(user_id);
CREATE INDEX idx_webauthn_credentials_credential_id ON public.webauthn_credentials(credential_id);

-- Create table for storing WebAuthn challenges (temporary, for registration/authentication)
CREATE TABLE public.webauthn_challenges (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT, -- For registration when user doesn't exist yet
    challenge TEXT NOT NULL,
    type TEXT NOT NULL, -- 'registration' or 'authentication'
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on challenges table
ALTER TABLE public.webauthn_challenges ENABLE ROW LEVEL SECURITY;

-- Challenges can be accessed by the edge function using service role
-- No user-facing policies needed since this is server-only

-- Create function to clean up expired challenges
CREATE OR REPLACE FUNCTION public.cleanup_expired_challenges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM public.webauthn_challenges WHERE expires_at < now();
END;
$$;
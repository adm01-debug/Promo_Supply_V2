-- Create fiscal_events table
CREATE TABLE IF NOT EXISTS public.fiscal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  document_id UUID, -- Link to fiscal_documents if already exists
  external_id TEXT, -- ID in Focus NFe or other provider
  type TEXT NOT NULL, -- 'NFe', 'NFSe', 'CTe', 'MDFe'
  action TEXT NOT NULL, -- 'send', 'cancel', 'query', 'manifest'
  status TEXT NOT NULL, -- 'pending', 'authorized', 'denied', 'error'
  request_payload JSONB,
  response_payload JSONB,
  error_message TEXT,
  protocol TEXT,
  xml_url TEXT,
  pdf_url TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for performance and multi-tenancy
CREATE INDEX IF NOT EXISTS idx_fiscal_events_tenant ON public.fiscal_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_events_document ON public.fiscal_events(document_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_events_status ON public.fiscal_events(status);

-- Enable RLS
ALTER TABLE public.fiscal_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "fiscal_events tenant isolation" 
ON public.fiscal_events 
FOR ALL 
TO authenticated 
USING (tenant_id = public.current_tenant_id())
WITH CHECK (tenant_id = public.current_tenant_id());

-- Add trigger for updated_at
CREATE TRIGGER update_fiscal_events_updated_at
BEFORE UPDATE ON public.fiscal_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Check if fiscal_documents needs tenant_id and other columns (making sure it exists first)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'fiscal_documents') THEN
        -- Ensure tenant_id exists
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'fiscal_documents' AND column_name = 'tenant_id') THEN
            ALTER TABLE public.fiscal_documents ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
        END IF;
        
        -- Add technical fiscal columns if missing
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'fiscal_documents' AND column_name = 'xml_content') THEN
            ALTER TABLE public.fiscal_documents ADD COLUMN xml_content TEXT;
        END IF;
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'fiscal_documents' AND column_name = 'sefaz_status') THEN
            ALTER TABLE public.fiscal_documents ADD COLUMN sefaz_status TEXT;
        END IF;
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'fiscal_documents' AND column_name = 'sefaz_protocol') THEN
            ALTER TABLE public.fiscal_documents ADD COLUMN sefaz_protocol TEXT;
        END IF;
    END IF;
END $$;
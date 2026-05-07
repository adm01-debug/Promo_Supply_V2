-- Create bucket for fiscal documents if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('fiscal-documents', 'fiscal-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS for storage
CREATE POLICY "Users can upload fiscal documents" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'fiscal-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Users can view fiscal documents" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'fiscal-documents' AND auth.role() = 'authenticated');

-- Update table to track source
ALTER TABLE public.fiscal_documents 
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'xml', -- 'xml' or 'pdf'
ADD COLUMN IF NOT EXISTS file_path TEXT,
ADD COLUMN IF NOT EXISTS processing_id TEXT;

COMMENT ON COLUMN public.fiscal_documents.source_type IS 'Origem do documento: xml ou pdf (processado via IA).';

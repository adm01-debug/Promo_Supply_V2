-- Enable realtime for critical tables
-- First ensure the publication exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

-- Add tables to publication
ALTER PUBLICATION supabase_realtime ADD TABLE 
    public.solicitacoes, 
    public.pedidos, 
    public.cotacoes, 
    public.pagamentos, 
    public.fornecedores, 
    public.contracts, 
    public.approval_workflows, 
    public.approval_steps;

-- Fix storage listing for product-images
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access"
ON storage.objects
FOR SELECT
USING (bucket_id = 'product-images' AND (auth.role() = 'anon' OR auth.role() = 'authenticated'));
-- Note: Listing is still technically possible with broad SELECT if not handled by Supabase API, 
-- but this is the standard way to allow public reads.

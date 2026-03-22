
-- Storage bucket for payment receipts
INSERT INTO storage.buckets (id, name, public) VALUES ('comprovantes', 'comprovantes', false)
ON CONFLICT (id) DO NOTHING;

-- RLS for comprovantes bucket
CREATE POLICY "Authenticated users can upload comprovantes"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'comprovantes');

CREATE POLICY "Authenticated users can view comprovantes"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'comprovantes');

CREATE POLICY "Admins can delete comprovantes"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'comprovantes' AND has_role(auth.uid(), 'admin'::app_role));

-- Add payment_history table for partial payments tracking
CREATE TABLE IF NOT EXISTS public.payment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pagamento_id uuid NOT NULL REFERENCES public.pagamentos(id) ON DELETE CASCADE,
  valor_parcela numeric NOT NULL DEFAULT 0,
  data_pagamento date NOT NULL DEFAULT CURRENT_DATE,
  comprovante_url text,
  observacoes text,
  registrado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance admin can manage payment history"
  ON public.payment_history FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'finance'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'finance'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role));

CREATE INDEX idx_payment_history_pagamento ON public.payment_history(pagamento_id);

-- Enable realtime for payment_history
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_history;

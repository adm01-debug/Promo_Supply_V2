
-- Table for fiscal documents (NF-e)
CREATE TABLE public.fiscal_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id UUID REFERENCES public.pedidos(id),
  fornecedor_id UUID REFERENCES public.fornecedores(id),
  numero_nf TEXT NOT NULL,
  serie TEXT,
  chave_acesso TEXT,
  data_emissao DATE,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  valor_produtos NUMERIC DEFAULT 0,
  valor_frete NUMERIC DEFAULT 0,
  valor_desconto NUMERIC DEFAULT 0,
  valor_impostos NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendente',
  xml_url TEXT,
  pdf_url TEXT,
  reconciliation_status TEXT DEFAULT 'pending',
  reconciliation_notes TEXT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fiscal_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view fiscal documents"
  ON public.fiscal_documents FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Buyers coordinators admins can manage fiscal documents"
  ON public.fiscal_documents FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role) OR has_role(auth.uid(), 'finance'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role) OR has_role(auth.uid(), 'finance'::app_role));

CREATE TRIGGER update_fiscal_documents_updated_at
  BEFORE UPDATE ON public.fiscal_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table for repurchase suggestions
CREATE TABLE public.repurchase_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  produto_id UUID REFERENCES public.produtos(id),
  fornecedor_id UUID REFERENCES public.fornecedores(id),
  ultimo_pedido_id UUID REFERENCES public.pedidos(id),
  quantidade_sugerida INTEGER NOT NULL DEFAULT 1,
  preco_estimado NUMERIC DEFAULT 0,
  frequencia_dias INTEGER,
  proxima_compra_estimada DATE,
  confianca_score NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'sugerido',
  descartado_motivo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.repurchase_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view repurchase suggestions"
  ON public.repurchase_suggestions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Buyers coordinators admins can manage repurchase suggestions"
  ON public.repurchase_suggestions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role));

CREATE TRIGGER update_repurchase_suggestions_updated_at
  BEFORE UPDATE ON public.repurchase_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table for AI negotiation analyses
CREATE TABLE public.negotiation_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cotacao_id UUID REFERENCES public.cotacoes(id),
  solicitacao_id UUID REFERENCES public.solicitacoes(id),
  analise_texto TEXT,
  sugestoes JSONB DEFAULT '[]',
  economia_estimada NUMERIC DEFAULT 0,
  score_negociacao NUMERIC DEFAULT 0,
  modelo_ia TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.negotiation_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view negotiation analyses"
  ON public.negotiation_analyses FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Buyers coordinators admins can manage negotiation analyses"
  ON public.negotiation_analyses FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role));

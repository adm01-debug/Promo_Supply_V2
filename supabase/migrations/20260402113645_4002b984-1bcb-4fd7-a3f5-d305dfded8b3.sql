-- Licitações (Tenders) table
CREATE TABLE public.licitacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero TEXT NOT NULL UNIQUE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  modalidade TEXT NOT NULL DEFAULT 'pregao',
  tipo TEXT NOT NULL DEFAULT 'menor_preco',
  status TEXT NOT NULL DEFAULT 'rascunho',
  data_publicacao TIMESTAMPTZ,
  data_abertura TIMESTAMPTZ,
  data_encerramento TIMESTAMPTZ,
  valor_estimado NUMERIC DEFAULT 0,
  valor_vencedor NUMERIC,
  fornecedor_vencedor_id UUID REFERENCES public.fornecedores(id),
  objeto TEXT,
  edital_url TEXT,
  documentos_exigidos JSONB DEFAULT '[]'::jsonb,
  criterios_avaliacao JSONB DEFAULT '[]'::jsonb,
  observacoes TEXT,
  responsavel_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Proposals for each tender
CREATE TABLE public.licitacao_propostas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  licitacao_id UUID NOT NULL REFERENCES public.licitacoes(id) ON DELETE CASCADE,
  fornecedor_id UUID NOT NULL REFERENCES public.fornecedores(id),
  valor_proposta NUMERIC NOT NULL DEFAULT 0,
  desconto_percentual NUMERIC DEFAULT 0,
  prazo_entrega INTEGER DEFAULT 0,
  score_tecnico NUMERIC DEFAULT 0,
  score_preco NUMERIC DEFAULT 0,
  score_total NUMERIC DEFAULT 0,
  documentos JSONB DEFAULT '[]'::jsonb,
  observacoes TEXT,
  status TEXT NOT NULL DEFAULT 'submetida',
  data_submissao TIMESTAMPTZ DEFAULT now(),
  vencedora BOOLEAN DEFAULT false,
  desclassificada BOOLEAN DEFAULT false,
  motivo_desclassificacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(licitacao_id, fornecedor_id)
);

-- Indexes
CREATE INDEX idx_licitacoes_status ON public.licitacoes(status);
CREATE INDEX idx_licitacoes_modalidade ON public.licitacoes(modalidade);
CREATE INDEX idx_licitacao_propostas_licitacao ON public.licitacao_propostas(licitacao_id);

-- updated_at triggers
CREATE TRIGGER update_licitacoes_updated_at
  BEFORE UPDATE ON public.licitacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_licitacao_propostas_updated_at
  BEFORE UPDATE ON public.licitacao_propostas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.licitacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licitacao_propostas ENABLE ROW LEVEL SECURITY;

-- Policies for licitacoes
CREATE POLICY "Authenticated users can view licitacoes" ON public.licitacoes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and coordinators can manage licitacoes" ON public.licitacoes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator'));

-- Policies for propostas
CREATE POLICY "Authenticated users can view propostas" ON public.licitacao_propostas
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins coordinators buyers can manage propostas" ON public.licitacao_propostas
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'buyer'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'buyer'));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.licitacoes;
-- UNSPSC Codes table
CREATE TABLE public.unspsc_codes (
  code TEXT PRIMARY KEY,
  parent_code TEXT REFERENCES public.unspsc_codes(code),
  level INT NOT NULL CHECK (level BETWEEN 1 AND 4),
  nome TEXT NOT NULL,
  nome_en TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  tenant_id UUID REFERENCES public.tenants(id) DEFAULT '00000000-0000-0000-0000-000000000000'
);

ALTER TABLE public.unspsc_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "unspsc_codes_read" ON public.unspsc_codes FOR SELECT TO authenticated USING (true);

-- Add unspsc_code to pedido_itens
ALTER TABLE public.pedido_itens ADD COLUMN unspsc_code TEXT REFERENCES public.unspsc_codes(code);
CREATE INDEX idx_pedido_itens_unspsc ON public.pedido_itens(unspsc_code);

-- Seed some root categories (UNSPSC Level 1)
INSERT INTO public.unspsc_codes (code, level, nome) VALUES
('10000000', 1, 'Material Vivo de Animal e Vegetal'),
('14000000', 1, 'Materiais de Papel e Papelão'),
('24000000', 1, 'Maquinaria e Acessórios para Manuseio de Materiais'),
('43000000', 1, 'Tecnologia da Informação, Radiodifusão e Telecomunicações'),
('44000000', 1, 'Equipamentos e Suprimentos de Escritório'),
('70000000', 1, 'Serviços de Limpeza, Edifícios e Manutenção'),
('80000000', 1, 'Serviços de Gestão e Administrativos'),
('81000000', 1, 'Serviços de Engenharia e Pesquisa e Tecnologia'),
('82000000', 1, 'Serviços de Editorial, Design e Gráficos')
ON CONFLICT (code) DO NOTHING;

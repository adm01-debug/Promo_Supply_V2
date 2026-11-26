ALTER TABLE public.produtos 
  ADD COLUMN IF NOT EXISTS preco_referencia numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ultimo_preco numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fornecedor_preferencial_id uuid REFERENCES public.fornecedores(id),
  ADD COLUMN IF NOT EXISTS imagem_url text,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS created_by uuid;

ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'produtos' AND policyname = 'Authenticated users can view produtos') THEN
    CREATE POLICY "Authenticated users can view produtos" ON public.produtos FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'produtos' AND policyname = 'Admin coordinator can manage produtos') THEN
    CREATE POLICY "Admin coordinator can manage produtos" ON public.produtos FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator'))
      WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'produtos' AND policyname = 'Buyers can insert produtos') THEN
    CREATE POLICY "Buyers can insert produtos" ON public.produtos FOR INSERT TO authenticated
      WITH CHECK (public.has_role(auth.uid(), 'buyer'));
  END IF;
END $$;
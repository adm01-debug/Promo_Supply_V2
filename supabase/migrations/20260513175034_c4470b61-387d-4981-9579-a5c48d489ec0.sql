-- Expandir taxonomia UNSPSC para nível 4 (Commodity) com categorias essenciais

-- Adicionar coluna para nome em inglês se não existir (para i18n futuro)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='unspsc_codes' AND column_name='nome_en') THEN
        ALTER TABLE public.unspsc_codes ADD COLUMN nome_en TEXT;
    END IF;
END $$;

-- Inserir Segmentos (Level 1) se não existirem
INSERT INTO public.unspsc_codes (code, nome, nome_en, level, tenant_id)
VALUES 
('10000000', 'Material Vivo de Animal e Vegetal', 'Live Plant and Animal Material', 1, '00000000-0000-0000-0000-000000000000'),
('43000000', 'Tecnologia da Informação, Radiodifusão e Telecomunicações', 'Information Technology Broadcasting and Telecommunications', 1, '00000000-0000-0000-0000-000000000000'),
('44000000', 'Equipamentos e Suprimentos de Escritório', 'Office Equipment and Accessories and Supplies', 1, '00000000-0000-0000-0000-000000000000')
ON CONFLICT (code) DO UPDATE SET nome = EXCLUDED.nome, nome_en = EXCLUDED.nome_en;

-- Inserir Famílias (Level 2)
INSERT INTO public.unspsc_codes (code, nome, nome_en, level, parent_code, tenant_id)
VALUES 
('43210000', 'Equipamento de Computação', 'Computer Equipment', 2, '43000000', '00000000-0000-0000-0000-000000000000'),
('43220000', 'Equipamentos de Redes', 'Data Voice or Multimedia Network Equipment', 2, '43000000', '00000000-0000-0000-0000-000000000000'),
('44100000', 'Maquinaria de Escritório', 'Office machines and their supplies and accessories', 2, '44000000', '00000000-0000-0000-0000-000000000000'),
('44120000', 'Suprimentos de Escritório', 'Office supplies', 2, '44000000', '00000000-0000-0000-0000-000000000000')
ON CONFLICT (code) DO UPDATE SET nome = EXCLUDED.nome, nome_en = EXCLUDED.nome_en;

-- Inserir Classes (Level 3)
INSERT INTO public.unspsc_codes (code, nome, nome_en, level, parent_code, tenant_id)
VALUES 
('43211500', 'Computadores', 'Computers', 3, '43210000', '00000000-0000-0000-0000-000000000000'),
('43211700', 'Periféricos de Computador', 'Computer peripherals', 3, '43210000', '00000000-0000-0000-0000-000000000000'),
('44121700', 'Instrumentos de Escrita', 'Writing instruments', 3, '44120000', '00000000-0000-0000-0000-000000000000'),
('44122000', 'Pastas e Organizadores', 'Folders and binders and indexes', 3, '44120000', '00000000-0000-0000-0000-000000000000')
ON CONFLICT (code) DO UPDATE SET nome = EXCLUDED.nome, nome_en = EXCLUDED.nome_en;

-- Inserir Commodities (Level 4)
INSERT INTO public.unspsc_codes (code, nome, nome_en, level, parent_code, tenant_id)
VALUES 
('43211503', 'Notebooks', 'Notebook computers', 4, '43211500', '00000000-0000-0000-0000-000000000000'),
('43211507', 'Desktops', 'Desktop computers', 4, '43211500', '00000000-0000-0000-0000-000000000000'),
('43211708', 'Mouses', 'Computer mice', 4, '43211700', '00000000-0000-0000-0000-000000000000'),
('43211706', 'Teclados', 'Keyboards', 4, '43211700', '00000000-0000-0000-0000-000000000000'),
('44121701', 'Canetas Esferográficas', 'Ballpoint pens', 4, '44121700', '00000000-0000-0000-0000-000000000000'),
('44122011', 'Pastas de Arquivo', 'File folders', 4, '44122000', '00000000-0000-0000-0000-000000000000')
ON CONFLICT (code) DO UPDATE SET nome = EXCLUDED.nome, nome_en = EXCLUDED.nome_en;

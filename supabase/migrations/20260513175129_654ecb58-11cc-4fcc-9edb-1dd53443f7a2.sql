-- Vincular categorias existentes a códigos UNSPSC

-- Adicionar coluna codigo_unspsc à tabela categorias
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categorias' AND column_name='codigo_unspsc') THEN
        ALTER TABLE public.categorias ADD COLUMN codigo_unspsc TEXT REFERENCES public.unspsc_codes(code);
    END IF;
END $$;

-- Mapear categorias existentes para códigos UNSPSC de nível 2 ou 3
UPDATE public.categorias SET codigo_unspsc = '44121700' WHERE nome ILIKE '%Canetas%'; -- Instrumentos de Escrita
UPDATE public.categorias SET codigo_unspsc = '44120000' WHERE nome ILIKE '%Mochilas%'; -- Suprimentos de Escritório (Genérico)
UPDATE public.categorias SET codigo_unspsc = '10000000' WHERE nome ILIKE '%Camisetas%'; -- Ajustar para Têxteis se disponível, ou genérico

-- Criar uma função para sugerir código UNSPSC baseado no nome (Mock para lógica de IA futuro)
CREATE OR REPLACE FUNCTION public.suggest_unspsc_code(item_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
    IF item_name ILIKE '%notebook%' OR item_name ILIKE '%laptop%' THEN
        RETURN '43211503';
    ELSIF item_name ILIKE '%computador%' OR item_name ILIKE '%desktop%' THEN
        RETURN '43211507';
    ELSIF item_name ILIKE '%mouse%' THEN
        RETURN '43211708';
    ELSIF item_name ILIKE '%teclado%' THEN
        RETURN '43211706';
    ELSIF item_name ILIKE '%caneta%' THEN
        RETURN '44121701';
    ELSE
        RETURN NULL;
    END IF;
END;
$$;

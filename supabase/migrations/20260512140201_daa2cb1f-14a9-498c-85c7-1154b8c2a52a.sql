-- Garantir que as colunas existam
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cost_centers' AND column_name = 'manager_id') THEN
        ALTER TABLE public.cost_centers ADD COLUMN manager_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cost_centers' AND column_name = 'parent_id') THEN
        ALTER TABLE public.cost_centers ADD COLUMN parent_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cost_centers' AND column_name = 'department') THEN
        ALTER TABLE public.cost_centers ADD COLUMN department TEXT;
    END IF;
END $$;

-- Adicionar constraints se não existirem
ALTER TABLE public.cost_centers 
DROP CONSTRAINT IF EXISTS cost_centers_manager_id_fkey,
ADD CONSTRAINT cost_centers_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.cost_centers 
DROP CONSTRAINT IF EXISTS cost_centers_parent_id_fkey,
ADD CONSTRAINT cost_centers_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.cost_centers(id) ON DELETE SET NULL;

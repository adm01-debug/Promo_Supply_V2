-- Add produto_id to solicitacoes
ALTER TABLE public.solicitacoes 
ADD COLUMN produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL;

-- Since the policy already allows access within tenant, no specific new policy is strictly needed if it uses *.
-- But let's check if we need to update any explicit column list in existing policies if they are not generic.
-- Actually, the current policies are "Users can manage solicitacoes within tenant", which is generic.

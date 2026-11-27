-- data(fn): nota de qualificacao de fornecedor passa a herdar o tenant do fornecedor mesmo sem JWT (etapa 143, parte b).
--
-- Causa: public.calculate_supplier_qualification_score(uuid) e chamada pelos triggers
-- recalculate_qualification_on_document_change e trg_recalculate_qualification_score (em supplier_documents) e
-- insere em supplier_qualification_scores sem tenant_id. Como a tabela tem
-- tenant_id NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000' e esse tenant nao existe em public.tenants,
-- o insert dependia de duas coincidencias: a linha ja existir (o ramo ON CONFLICT DO UPDATE nao revalida a FK) e
-- o trigger a_fill_tenant_id conseguir resolver o tenant - o que so acontece com auth.uid() preenchido, ou seja
-- nunca no caminho de servico. O corpo dessa funcao nao vem de migration nenhuma no repositorio (foi criado no
-- banco), entao reescreve-la aqui seria chutar o codigo; a correcao entra por gatilho, que vale para qualquer
-- origem do insert (funcao do banco, edge function com service_role ou o front).
--
-- Regra: tenant da nota = tenant do fornecedor da propria linha (public.fornecedores.tenant_id). Nao ha chute nem
-- tenant "padrao": se o fornecedor nao tiver tenant valido, a coluna fica como veio e o NOT NULL acusa, que e o
-- comportamento desejado (falha visivel, nao linha em empresa errada).
--
-- Reversao: supabase/rollbacks/20261128194000_revert_supplier_qualification_scores_tenant.sql (nao aplicada).

CREATE OR REPLACE FUNCTION public.fill_tenant_id_from_supplier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_tenant uuid;
BEGIN
  IF NEW.tenant_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = NEW.tenant_id) THEN
    RETURN NEW;
  END IF;

  SELECT f.tenant_id INTO v_tenant
    FROM public.fornecedores f
   WHERE f.id = NEW.fornecedor_id;

  IF v_tenant IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = v_tenant) THEN
    NEW.tenant_id := v_tenant;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.fill_tenant_id_from_supplier() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS a_fill_tenant_id_supplier ON public.supplier_qualification_scores;
CREATE TRIGGER a_fill_tenant_id_supplier
BEFORE INSERT ON public.supplier_qualification_scores
FOR EACH ROW
EXECUTE FUNCTION public.fill_tenant_id_from_supplier();

-- Prova: aborta se o gatilho nao estiver ligado na tabela ou se o corpo aplicado nao herdar o tenant do fornecedor.
DO $prova$
DECLARE
  v_def text;
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_trigger tg
      JOIN pg_class cl ON cl.oid = tg.tgrelid
      JOIN pg_namespace ns ON ns.oid = cl.relnamespace
      JOIN pg_proc pr ON pr.oid = tg.tgfoid
     WHERE ns.nspname = 'public'
       AND cl.relname = 'supplier_qualification_scores'
       AND pr.proname = 'fill_tenant_id_from_supplier'
       AND NOT tg.tgisinternal
       AND tg.tgtype & 2 = 2
       AND tg.tgtype & 4 = 4
  ) THEN
    RAISE EXCEPTION 'prova falhou: gatilho before insert ausente em supplier_qualification_scores';
  END IF;

  SELECT pg_get_functiondef('public.fill_tenant_id_from_supplier()'::regprocedure) INTO v_def;

  IF v_def NOT LIKE '%FROM public.fornecedores f%' OR v_def NOT LIKE '%public.tenants%' THEN
    RAISE EXCEPTION 'prova falhou: corpo aplicado nao herda o tenant do fornecedor';
  END IF;
END $prova$;
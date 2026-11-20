-- fio-2: aprovar workflow de compras promove solicitacoes.status para 'aprovada'
--
-- Causa: ao aprovar o ultimo step de um approval_workflows, o front atualizava
-- approval_workflows.status='approved', mas nunca promovia a solicitacao vinculada.
-- Como a RLS de solicitacoes nao permite ao aprovador dar UPDATE, a promocao agora
-- e feita por um trigger SECURITY DEFINER no banco (mesmo padrao de
-- auto_transition_solicitacao_on_cotacao_approval da migration 20261113122616).
--
-- So transiciona a partir de 'pendente'/'em_cotacao' (nao sobrescreve estado
-- posterior como 'em_andamento'/'concluida').
CREATE OR REPLACE FUNCTION public.auto_transition_solicitacao_on_workflow_approved()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'approved'
     AND OLD.status IS DISTINCT FROM 'approved'
     AND NEW.solicitacao_id IS NOT NULL THEN
    UPDATE public.solicitacoes
    SET status = 'aprovada', updated_at = now()
    WHERE id = NEW.solicitacao_id
      AND status IN ('pendente', 'em_cotacao');
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.auto_transition_solicitacao_on_workflow_approved() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.auto_transition_solicitacao_on_workflow_approved() TO authenticated, service_role;

DROP TRIGGER IF EXISTS trg_workflow_approved_promotes_solicitacao ON public.approval_workflows;
CREATE TRIGGER trg_workflow_approved_promotes_solicitacao
  AFTER UPDATE OF status ON public.approval_workflows
  FOR EACH ROW
  WHEN (NEW.status = 'approved')
  EXECUTE FUNCTION public.auto_transition_solicitacao_on_workflow_approved();
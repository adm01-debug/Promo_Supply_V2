-- NEG-01 / etapa 073: selecionar a cotacao vencedora aprovava a solicitacao e
-- pulava o workflow de alcada inteiro.
--
-- Causa (medida no codigo do main): a aprovacao de uma solicitacao tem DUAS
-- portas no banco. A legitima e o workflow
-- (auto_transition_solicitacao_on_workflow_approved + trigger
-- trg_workflow_approved_promotes_solicitacao, migration 20261120120000). A
-- outra sao os dois triggers de cotacao recriados abaixo
-- (auto_transition_solicitacao_on_cotacao_approval e
-- trg_cotacao_approved_transition, ultima versao na migration 20261113122616):
-- eles promoviam solicitacoes.status para 'aprovada' sem consultar
-- approval_workflows nem approval_steps. Como a policy de cotacoes permite
-- UPDATE ao papel buyer, o comprador aprovava a compra sem nenhuma aprovacao
-- humana registrada - o approval_workflows da solicitacao continuava 'pending'.
--
-- Correcao: as duas portas de cotacao so promovem a solicitacao quando NAO
-- existe workflow nao aprovado para ela. Sem workflow cadastrado o
-- comportamento anterior e mantido (senao solicitacoes sem workflow nunca
-- chegariam a 'aprovada'); com workflow cadastrado, quem promove e o workflow,
-- pelo trg_workflow_approved_promotes_solicitacao.
--
-- O que NAO muda: cotacoes.selecionada e cotacoes.status = 'aprovada' seguem
-- sendo gravados iguais - e deles que GerarOrdem.tsx parte para achar o
-- fornecedor da ordem de compra.
--
-- Reversao (nao aplicada de proposito, para uso manual se necessario): recriar
-- as duas funcoes com o corpo da migration 20261113122616, sem o bloco
-- "AND NOT EXISTS (...)".

CREATE OR REPLACE FUNCTION public.auto_transition_solicitacao_on_cotacao_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'aprovada' AND OLD.status IS DISTINCT FROM 'aprovada' AND NEW.solicitacao_id IS NOT NULL THEN
    UPDATE public.solicitacoes s
    SET status = 'aprovada', updated_at = now()
    WHERE s.id = NEW.solicitacao_id
      AND s.status IN ('pendente', 'em_cotacao')
      AND NOT EXISTS (
        SELECT 1
        FROM public.approval_workflows w
        WHERE w.solicitacao_id = s.id
          AND w.status <> 'approved'
      );
  END IF;
  RETURN NEW;
END;
$function$

CREATE OR REPLACE FUNCTION public.trg_cotacao_approved_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.selecionada = true AND (OLD.selecionada IS DISTINCT FROM NEW.selecionada) AND NEW.solicitacao_id IS NOT NULL THEN
    UPDATE public.solicitacoes s
    SET status = 'aprovada', updated_at = now()
    WHERE s.id = NEW.solicitacao_id
      AND s.status IN ('pendente', 'em_cotacao')
      AND NOT EXISTS (
        SELECT 1
        FROM public.approval_workflows w
        WHERE w.solicitacao_id = s.id
          AND w.status <> 'approved'
      );
  END IF;
  RETURN NEW;
END;
$function$

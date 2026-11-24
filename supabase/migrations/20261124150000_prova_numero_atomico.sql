-- PROVA EM PRODUCAO (arquivo temporario, nao deve ser mergeado).
--
-- O que prova: o trigger trg_assign_numero_solicitacao gera `numero` dentro do
-- proprio INSERT quando a coluna vem NULL -- que e' exatamente o que a edge
-- receive-os-sync envia. Sem o trigger, este INSERT morre em "null value in
-- column numero violates not-null constraint".
--
-- A EXCEPTION aborta a transacao de proposito: a linha de teste NAO permanece no
-- banco e a mensagem de erro carrega o numero gerado, aparecendo no log da
-- execucao do workflow.
DO $$
DECLARE
  v_anterior text;
  v_numero text;
BEGIN
  SELECT s.numero INTO v_anterior
  FROM public.solicitacoes s
  ORDER BY s.created_at DESC
  LIMIT 1;

  INSERT INTO public.solicitacoes (titulo, descricao, tipo)
  VALUES (
    'PROVA numero atomico',
    'linha temporaria de prova, revertida pela EXCEPTION',
    'material'
  )
  RETURNING numero INTO v_numero;

  RAISE EXCEPTION 'PROVA_NUMERO_ATOMICO anterior=% gerado=% tamanho=%',
    coalesce(v_anterior, 'nenhum'), v_numero, length(v_numero);
END $$;
-- Reversao da migration 20261128130000_on_delete_restrict_historico_financeiro.sql.
--
-- Volta as quatro FKs para ON DELETE CASCADE, que era o comportamento antes da etapa 131.
-- O nome da constraint e lido do banco (mesmo criterio da ida), e a FK e recriada apenas
-- quando esta em RESTRICT - rodar duas vezes nao faz nada na segunda.
--
-- Quando usar: se alguma tela ou integracao passar a depender do DELETE em cascata e a
-- guarda na UI nao cobrir o caso. Nao e um caminho de rotina: com RESTRICT, apagar o pai
-- sem tratar os filhos devolve 23503, que e justamente o freio pretendido.

BEGIN;

DO $$
DECLARE
  r      RECORD;
  v_nome text;
  v_acao char;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('creditos_fornecedor',  'fornecedor_id',  'fornecedores'),
      ('cotacoes',             'solicitacao_id', 'solicitacoes'),
      ('receiving_checklists', 'pedido_id',      'pedidos'),
      ('payment_history',      'pagamento_id',   'pagamentos')
    ) AS t(tabela, coluna, alvo)
  LOOP
    v_nome := NULL;
    v_acao := NULL;

    SELECT c.conname, c.confdeltype
      INTO v_nome, v_acao
      FROM pg_constraint c
      JOIN pg_attribute a
        ON a.attrelid = c.conrelid
       AND a.attnum   = c.conkey[1]
     WHERE c.contype    = 'f'
       AND c.conrelid   = ('public.' || r.tabela)::regclass
       AND c.confrelid  = ('public.' || r.alvo)::regclass
       AND a.attname    = r.coluna
       AND array_length(c.conkey, 1) = 1;

    IF v_nome IS NULL THEN
      RAISE EXCEPTION 'FK ausente: public.%.% -> public.%', r.tabela, r.coluna, r.alvo;
    END IF;

    IF v_acao = 'c' THEN
      RAISE NOTICE 'ja em CASCADE, preservada: %', v_nome;
      CONTINUE;
    END IF;

    RAISE NOTICE 'desfazendo: % | public.%.% | on delete = % -> c',
      v_nome, r.tabela, r.coluna, v_acao;

    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', r.tabela, v_nome);
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.%I(id) ON DELETE CASCADE',
      r.tabela, v_nome, r.coluna, r.alvo
    );

    RAISE NOTICE 'desfeito : % -> CASCADE', v_nome;
  END LOOP;
END $$;

COMMIT;

-- DB-04 (parte 4 de 4) / etapa 131: filhos de historico e de dinheiro deixam de ser
-- apagados em cascata junto com o pai.
--
-- Causa: o ON DELETE foi escolhido FK por FK tratando todo filho como parte do documento do
-- pai. Isso esta certo para pedido_itens, devolucao_itens e contract_items, e errado para
-- quem guarda dinheiro ou trilha. Quatro pares schema x codigo no repo:
--   * public.creditos_fornecedor.fornecedor_id -> fornecedores(id) ON DELETE CASCADE: a
--     tabela e razao de credito (valor, valor_utilizado, saldo, utilizado_em_pagamento_id).
--     Apagar o cadastro do fornecedor levava o saldo junto, sem aviso;
--   * public.cotacoes.solicitacao_id -> solicitacoes(id) ON DELETE CASCADE: apagar a
--     solicitacao apagava as propostas de fornecedor, com preco;
--   * public.receiving_checklists.pedido_id -> pedidos(id) ON DELETE CASCADE: o checklist e
--     a inspecao do que chegou, nao uma parte do documento pedido;
--   * public.payment_history.pagamento_id -> pagamentos(id) ON DELETE CASCADE: e a trilha de
--     quem mudou o status e quando.
-- Nos quatro casos o pai so era protegido pelos filhos marcados NO ACTION
-- (fiscal_documents.pedido_id, pagamentos.pedido_id, contract_penalties.pedido_id,
-- pedidos.solicitacao_id), ou seja: o registro que ainda nao chegou ao fiscal ou ao
-- pagamento era apagavel e levava o historico com ele.
--
-- As telas que excluem passaram a conferir dependentes antes do DELETE nas etapas 132
-- (fornecedores e devolucoes) e 133 (solicitacoes e pedidos); esta migration e o lado do
-- banco do mesmo trabalho, e e o que faz o erro 23503 existir como ultima linha de defesa
-- quando alguem escrever um DELETE fora da UI.
--
-- Atalho evitado 1: trocar por ON DELETE SET NULL. Nao apaga o dinheiro, mas deixa o credito
-- e a inspecao sem origem - pior para auditoria do que o erro de FK.
-- Atalho evitado 2: incluir os filhos de composicao e os SET NULL que apontam para
-- auth.users. Ali o comportamento atual e o certo e foi preservado byte a byte.
--
-- A constraint e localizada por (tabela, coluna, tabela alvo) em pg_constraint, e o nome e
-- reaproveitado do banco em vez de presumido: o rollback fica simetrico e uma constraint
-- com nome customizado nao quebra a migration. ADD ... NOT VALID apenas quando a original
-- tambem estava NOT VALID - promover uma FK nao validada e mudanca de comportamento nao
-- pedida.
--
-- Prova embutida: cada troca imprime antes/depois por RAISE NOTICE e a transacao so termina
-- se as quatro estiverem em RESTRICT; se qualquer uma escapar, a migration inteira volta.
--
-- Reversao: supabase/rollbacks/20261128130000_revert_on_delete_restrict_historico_financeiro.sql

BEGIN;

DO $$
DECLARE
  r          RECORD;
  v_nome     text;
  v_acao     char;
  v_validada boolean;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('creditos_fornecedor',  'fornecedor_id',  'fornecedores'),
      ('cotacoes',             'solicitacao_id', 'solicitacoes'),
      ('receiving_checklists', 'pedido_id',      'pedidos'),
      ('payment_history',      'pagamento_id',   'pagamentos')
    ) AS t(tabela, coluna, alvo)
  LOOP
    IF to_regclass('public.' || r.tabela) IS NULL THEN
      RAISE EXCEPTION 'tabela ausente em producao: public.%', r.tabela;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name   = r.tabela
         AND column_name  = r.coluna
    ) THEN
      RAISE EXCEPTION 'coluna ausente em producao: public.%.%', r.tabela, r.coluna;
    END IF;

    SELECT c.conname, c.confdeltype, c.convalidated
      INTO v_nome, v_acao, v_validada
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

    RAISE NOTICE 'antes  : % | public.%.% -> public.% | on delete = % | validada = %',
      v_nome, r.tabela, r.coluna, r.alvo, v_acao, v_validada;

    IF v_acao = 'r' THEN
      RAISE NOTICE 'ja em RESTRICT, preservada: %', v_nome;
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', r.tabela, v_nome);
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.%I(id) ON DELETE RESTRICT%s',
      r.tabela, v_nome, r.coluna, r.alvo,
      CASE WHEN v_validada THEN '' ELSE ' NOT VALID' END
    );

    RAISE NOTICE 'depois : % | public.%.% -> public.% | on delete = r | validada = %',
      v_nome, r.tabela, r.coluna, r.alvo, v_validada;
  END LOOP;
END $$;

-- Porta fechada: as quatro precisam estar em RESTRICT no fim da transacao.
DO $$
DECLARE
  r      RECORD;
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
    v_acao := NULL;

    SELECT c.confdeltype
      INTO v_acao
      FROM pg_constraint c
      JOIN pg_attribute a
        ON a.attrelid = c.conrelid
       AND a.attnum   = c.conkey[1]
     WHERE c.contype    = 'f'
       AND c.conrelid   = ('public.' || r.tabela)::regclass
       AND c.confrelid  = ('public.' || r.alvo)::regclass
       AND a.attname    = r.coluna
       AND array_length(c.conkey, 1) = 1;

    IF v_acao IS DISTINCT FROM 'r' THEN
      RAISE EXCEPTION 'verificacao falhou: public.%.% continua com on delete = %',
        r.tabela, r.coluna, coalesce(v_acao::text, 'FK ausente');
    END IF;

    RAISE NOTICE 'verificado: public.%.% -> RESTRICT', r.tabela, r.coluna;
  END LOOP;
END $$;

-- Prova impressa: o stdout deste arquivo aparece no log do run de aplicacao e e' a
-- evidencia do estado final das quatro FKs (on_delete 'r' = RESTRICT).
SELECT c.conname              AS constraint,
       c.conrelid::regclass   AS tabela,
       a.attname              AS coluna,
       c.confrelid::regclass  AS referenciada,
       c.confdeltype          AS on_delete,
       c.convalidated         AS validada
  FROM pg_constraint c
  JOIN pg_attribute a
    ON a.attrelid = c.conrelid
   AND a.attnum   = c.conkey[1]
 WHERE c.contype = 'f'
   AND (c.conrelid, a.attname) IN (
         ('public.creditos_fornecedor'::regclass,  'fornecedor_id'),
         ('public.cotacoes'::regclass,             'solicitacao_id'),
         ('public.receiving_checklists'::regclass, 'pedido_id'),
         ('public.payment_history'::regclass,      'pagamento_id')
       )
 ORDER BY 2, 3;

COMMIT;

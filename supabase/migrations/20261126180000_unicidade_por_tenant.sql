-- DB-09 / etapa 147: chaves de negocio unicas globalmente, quando o certo e' por empresa.
--
-- As constraints UNIQUE nasceram antes do multi-tenant (tenant_id entrou em maio/2026) e
-- nunca foram reescritas. Quando o CNPJ por tenant foi feito (20260711192812_449d919a:83-92,
-- comentario "Unicidade: CNPJ por tenant (fornecedores) e global (tenants)") o indice novo
-- foi criado mas o antigo nao foi removido - ficaram os dois, e o mais restritivo (global)
-- e' o que vale. Consequencia: o segundo tenant recebe erro 23505 ao cadastrar fornecedor
-- com CNPJ que outro tenant ja tem. Hoje existe 1 tenant, entao o defeito esta' latente.
--
-- Correcao: para cada chave, criar o par por empresa ANTES de dropar o global.
-- Atalho evitado: dropar o global sem criar o par - ai nao sobra unicidade nenhuma e passa
-- a aceitar fornecedor/produto duplicado dentro da MESMA empresa.
--
-- Fora do escopo, de proposito:
--   * tenants.cnpj / tenants.slug: tenants e organizations sao globais por definicao;
--   * user_roles_user_id_role_key e produto_fornecedores_produto_id_fornecedor_id_key;
--   * supplier_qualification_scores.fornecedor_id: e' 1:1 com o fornecedor, o global esta' certo;
--   * generate_sequential_number: continua calculando MAX(...)+1 sobre a tabela inteira, de modo
--     que as numeracoes seguem unicas globalmente e o par por empresa e' apenas a rede de
--     seguranca. Mudar o gerador muda o numero emitido para o usuario e isso e' decisao do dono.
--
-- Reversao: supabase/rollbacks/20261126180000_revert_unicidade_por_tenant.sql

BEGIN;

DO $$
DECLARE
  -- tabela, coluna, constraint global a remover, indice por empresa
  alvos text[][] := ARRAY[
    ['fornecedores','cnpj','fornecedores_cnpj_key','uq_fornecedores_tenant_cnpj'],
    ['fornecedores','codigo','fornecedores_codigo_key','uq_fornecedores_tenant_codigo'],
    ['produtos','codigo','produtos_codigo_key','uq_produtos_tenant_codigo'],
    ['cost_centers','code','cost_centers_code_key','uq_cost_centers_tenant_code'],
    ['contracts','contract_number','contracts_contract_number_key','uq_contracts_tenant_contract_number'],
    ['pedidos','numero','pedidos_numero_key','uq_pedidos_tenant_numero'],
    ['solicitacoes','numero','solicitacoes_numero_key','uq_solicitacoes_tenant_numero'],
    ['cotacoes','numero','cotacoes_numero_key','uq_cotacoes_tenant_numero'],
    ['pagamentos','numero','pagamentos_numero_key','uq_pagamentos_tenant_numero'],
    ['licitacoes','numero','licitacoes_numero_key','uq_licitacoes_tenant_numero'],
    ['devolucoes','numero','devolucoes_numero_key','uq_devolucoes_tenant_numero']
  ];
  i        int;
  t        text;
  col      text;
  cglobal  text;
  idx      text;
  v_tem_col   boolean;
  v_tem_tenant boolean;
  v_dup    bigint;
BEGIN
  FOR i IN 1 .. array_length(alvos, 1) LOOP
    t       := alvos[i][1];
    col     := alvos[i][2];
    cglobal := alvos[i][3];
    idx     := alvos[i][4];

    IF to_regclass('public.' || t) IS NULL THEN
      RAISE NOTICE 'etapa 147: % nao existe - pulando', t;
      CONTINUE;
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = t AND column_name = col
    ) INTO v_tem_col;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = t AND column_name = 'tenant_id'
    ) INTO v_tem_tenant;

    IF NOT v_tem_col THEN
      RAISE NOTICE 'etapa 147: %.% nao existe - pulando', t, col;
      CONTINUE;
    END IF;

    IF NOT v_tem_tenant THEN
      RAISE NOTICE 'etapa 147: % sem tenant_id - global mantido', t;
      CONTINUE;
    END IF;

    -- duplicata dentro da mesma empresa impediria o indice composto; aborta dizendo onde
    EXECUTE format(
      'SELECT count(*) FROM (SELECT 1 FROM public.%I WHERE %I IS NOT NULL GROUP BY tenant_id, %I HAVING count(*) > 1) d',
      t, col, col
    ) INTO v_dup;

    IF v_dup > 0 THEN
      RAISE EXCEPTION 'etapa 147: % tem % valor(es) de % repetido(s) dentro da mesma empresa; corrija antes',
        t, v_dup, col;
    END IF;

    EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS %I ON public.%I (tenant_id, %I)', idx, t, col);
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', t, cglobal);

    RAISE NOTICE 'etapa 147: % - % por empresa (%), global removida', t, col, idx;
  END LOOP;
END
$$;

COMMIT;
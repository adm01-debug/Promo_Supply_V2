-- ============================================================================
-- Seed: devolucoes + creditos_fornecedor
-- Uses FK IDs already present. Idempotent (re-running safe via [SEED] marker).
-- ============================================================================

DO $$
DECLARE
  v_tenant_id   uuid;
  v_forn_a      uuid;
  v_forn_b      uuid;
  v_pedido_a    uuid;
  v_pedido_b    uuid;
  v_solicitante uuid;
  v_dev_id_1    uuid;
  v_dev_id_2    uuid;
  v_dev_id_3    uuid;
BEGIN
  -- 1) Pick first tenant with at least one supplier
  SELECT tenant_id INTO v_tenant_id
    FROM public.fornecedores
   ORDER BY created_at NULLS LAST
   LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE NOTICE 'No tenant with suppliers — skipping devolucoes seed.';
    RETURN;
  END IF;

  -- 2) Two distinct suppliers in same tenant
  SELECT id INTO v_forn_a FROM public.fornecedores
   WHERE tenant_id = v_tenant_id ORDER BY created_at LIMIT 1;

  SELECT id INTO v_forn_b FROM public.fornecedores
   WHERE tenant_id = v_tenant_id AND id <> v_forn_a
   ORDER BY created_at LIMIT 1;

  -- 3) Two pedidos in same tenant
  SELECT id INTO v_pedido_a FROM public.pedidos
   WHERE tenant_id = v_tenant_id ORDER BY created_at LIMIT 1;

  SELECT id INTO v_pedido_b FROM public.pedidos
   WHERE tenant_id = v_tenant_id AND (v_pedido_a IS NULL OR id <> v_pedido_a)
   ORDER BY created_at LIMIT 1;

  -- 4) Try user_tenants (this project's actual schema); tolerate other variants
  BEGIN
    SELECT user_id INTO v_solicitante FROM public.user_tenants
     WHERE tenant_id = v_tenant_id ORDER BY joined_at LIMIT 1;
  EXCEPTION WHEN undefined_table THEN
    v_solicitante := NULL;
  END;
  IF v_solicitante IS NULL THEN
    BEGIN
      SELECT id INTO v_solicitante FROM public.profiles LIMIT 1;
    EXCEPTION WHEN undefined_table THEN
      v_solicitante := NULL;
    END;
  END IF;

  -- 5) Idempotency: clean prior [SEED] rows in this tenant
  DELETE FROM public.creditos_fornecedor c
   USING public.fornecedores f
   WHERE c.fornecedor_id = f.id
     AND f.tenant_id = v_tenant_id
     AND c.descricao LIKE '[SEED]%';

  DELETE FROM public.devolucoes d
   WHERE (d.fornecedor_id IN (SELECT id FROM public.fornecedores WHERE tenant_id = v_tenant_id)
          OR d.pedido_id IN (SELECT id FROM public.pedidos WHERE tenant_id = v_tenant_id))
     AND d.observacoes LIKE '[SEED]%';

  -- 6) Devolução 1: aberta (solicitada)
  INSERT INTO public.devolucoes (
    numero, pedido_id, fornecedor_id, solicitante_id, status, tipo,
    motivo, motivo_detalhe, valor_total, resolucao, observacoes
  ) VALUES (
    'DEV-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-A',
    v_pedido_a, v_forn_a, v_solicitante,
    'solicitada', 'devolucao',
    'defeito', 'Produto apresentou defeito de fábrica na primeira utilização.',
    1250.00, 'credito',
    '[SEED] devolução em análise pela equipe de qualidade'
  )
  RETURNING id INTO v_dev_id_1;

  -- 7) Devolução 2: em trânsito
  INSERT INTO public.devolucoes (
    numero, pedido_id, fornecedor_id, solicitante_id, status, tipo,
    motivo, motivo_detalhe, valor_total, resolucao, observacoes,
    data_aprovacao, data_envio, codigo_rastreamento, transportadora
  ) VALUES (
    'DEV-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-B',
    v_pedido_b, v_forn_b, v_solicitante,
    'em_transito', 'troca',
    'troca', 'Cliente solicitou troca por modelo diferente.',
    480.50, 'reposicao',
    '[SEED] devolução em trânsito para fornecedor',
    now() - interval '5 days',
    now() - interval '2 days',
    'BR' || (random() * 1e10)::bigint::text,
    'Correios'
  )
  RETURNING id INTO v_dev_id_2;

  -- 8) Devolução 3: crédito emitido (concluída do ponto de vista do fluxo)
  INSERT INTO public.devolucoes (
    numero, pedido_id, fornecedor_id, solicitante_id, status, tipo,
    motivo, motivo_detalhe, valor_total, resolucao, observacoes,
    data_aprovacao, data_envio, data_recebimento_fornecedor
  ) VALUES (
    'DEV-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-C',
    v_pedido_a, v_forn_a, v_solicitante,
    'credito_emitido', 'garantia',
    'garantia', 'Garantia acionada dentro do prazo de 90 dias.',
    2750.75, 'credito',
    '[SEED] crédito emitido pelo fornecedor',
    now() - interval '20 days',
    now() - interval '15 days',
    now() - interval '7 days'
  )
  RETURNING id INTO v_dev_id_3;

  -- 9) Crédito ativo referente à devolução 3
  INSERT INTO public.creditos_fornecedor (
    fornecedor_id, devolucao_id, tipo, valor, valor_utilizado,
    saldo, status, descricao, data_emissao
  ) VALUES (
    v_forn_a, v_dev_id_3,
    'credito_devolucao', 2750.75, 0,
    2750.75, 'ativo',
    '[SEED] crédito gerado automaticamente para devolução concluída',
    now() - interval '7 days'
  );

  RAISE NOTICE 'Seed OK. tenant=%, devolucoes=%,%,%, credito=R$2750.75', v_tenant_id, v_dev_id_1, v_dev_id_2, v_dev_id_3;
END $$;
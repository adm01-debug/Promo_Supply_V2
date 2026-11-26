-- Reversao da etapa 147 (DB-09). Nao aplicada: recria os UNIQUE globais e derruba os pares
-- por empresa criados pela migration.
BEGIN;

DO $$
DECLARE
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
  i int;
BEGIN
  FOR i IN 1 .. array_length(alvos, 1) LOOP
    IF to_regclass('public.' || alvos[i][1]) IS NULL THEN CONTINUE; END IF;
    -- volta o global so se nao houver duplicata entre empresas
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
       WHERE conrelid = ('public.' || alvos[i][1])::regclass AND conname = alvos[i][3]
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I UNIQUE (%I)', alvos[i][1], alvos[i][3], alvos[i][2]);
    END IF;
    EXECUTE format('DROP INDEX IF EXISTS public.%I', alvos[i][4]);
  END LOOP;
END
$$;

COMMIT;
-- Corrige tenant_id gravado errado pelo front.
-- O app envia organizationId (id de organização), tenantId vindo de
-- current_tenant_id() (sempre NULL: nenhum hook põe 'tenant_id' no JWT) ou
-- omite a coluna (default '00000000-...' que não existe em public.tenants).
-- Gatilho BEFORE INSERT troca esses valores pelo tenant padrão do usuário
-- logado (user_tenants.is_default; senão profiles.tenant_id).
-- Sem auth.uid() (service_role/cron) não altera nada. Idempotente.

create or replace function public.fill_tenant_id_from_profile()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_tenant uuid;
begin
  if v_uid is null then
    return new;
  end if;

  if new.tenant_id is not null
     and exists (select 1 from public.tenants t where t.id = new.tenant_id)
     and not exists (select 1 from public.tenants t where t.organization_id = new.tenant_id) then
    return new;
  end if;

  select ut.tenant_id into v_tenant
    from public.user_tenants ut
   where ut.user_id = v_uid and ut.is_default
   order by ut.joined_at
   limit 1;

  if v_tenant is null then
    select p.tenant_id into v_tenant
      from public.profiles p
     where p.user_id = v_uid or p.id = v_uid
     order by (p.user_id = v_uid) desc nulls last
     limit 1;
  end if;

  if v_tenant is not null then
    new.tenant_id := v_tenant;
  end if;

  return new;
end;
$$;

revoke all on function public.fill_tenant_id_from_profile() from public, anon, authenticated;

-- Tabelas com coluna tenant_id que o front insere via .from('<t>').insert/upsert.
-- Nome "a_..." para disparar antes dos demais gatilhos BEFORE INSERT (ordem alfabética).
do $$
declare
  t text;
begin
  foreach t in array array[
    'approval_delegations','approval_history','approval_rules','approval_steps',
    'approval_workflows','audit_logs','contact_notes','contract_documents',
    'contract_history','contract_items','contracts','cost_centers','cotacoes',
    'creditos_fornecedor','department_budgets','devolucao_itens','devolucoes',
    'fiscal_documents','fornecedores','licitacao_lances','licitacao_propostas',
    'licitacoes','pagamentos','payment_history','pedido_itens','pedidos',
    'penalty_escalation_config','produto_fornecedores','produtos',
    'repurchase_suggestions','solicitacoes','sourcing_event_criteria',
    'sourcing_event_lots','sourcing_events','sourcing_invitations',
    'sso_configurations','supplier_bonifications'
  ] loop
    if exists (
      select 1 from information_schema.columns
       where table_schema = 'public' and table_name = t and column_name = 'tenant_id'
    ) then
      execute format('drop trigger if exists a_fill_tenant_id on public.%I', t);
      execute format(
        'create trigger a_fill_tenant_id before insert on public.%I '
        'for each row execute function public.fill_tenant_id_from_profile()', t);
    end if;
  end loop;
end;
$$;

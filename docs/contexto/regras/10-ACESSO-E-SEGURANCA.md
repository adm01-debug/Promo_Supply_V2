# 10 · ACESSO E SEGURANÇA — quem pode o quê

> Gerado automaticamente por AI Context Sync v1.4.0 · commit `3118a1fd0b` · branch `main` · 2026-11-13 03:41 UTC
> Não edite à mão — regras humanas vão em `manual/`.

## Perfis / roles identificados

`admin`, `approver`, `buyer`, `c`, `coordinator`, `finance`, `supplier`, `viewer`

- Valores comparados em checagens de perfil/permissão no código que não constam de nenhum enum de perfil, rota ou política (podem não ser perfis — ex.: permissão do navegador, papel de mensagem de chat; veja `07` seção J): `denied`, `granted`, `user`
- Tabelas de perfil/permissão: `user_roles`, `permissions`, `role_permissions`
- Colunas de perfil: `user_roles.role` (app_role NOT NULL), `role_permissions.role` (app_role NOT NULL), `user_organizations.role` (TEXT DEFAULT 'member'), `user_tenants.role` (public.app_role NOT NULL DEFAULT 'viewer')
- Claims do JWT usados em políticas/funções: `tenant_id`
- Funções usadas dentro de políticas RLS (a regra real está no corpo delas — veja `context.json` → `schema` (derivado das migrations; snapshot do banco real ainda não gerado — NÃO VERIFICADO)): `current_tenant_id`, `get_my_organization`, `get_user_grupo_id`, `has_role`, `is_supplier`, `tenant_in_my_group`, `user_belongs_to_tenant`

## Matriz tabela × operação → quem pode (derivada das políticas RLS)

> ⚠️ **NÃO VERIFICADO:** 20 comando(s) em 5 migration(s) criam, removem ou reescrevem políticas com SQL que só existe em runtime (lê `pg_policies` ou depende de condição do banco). A lista abaixo pode trazer política já removida ou com a expressão antiga; tabelas citadas: `approval_rules`, `audit_logs`, `notifications`, `penalty_escalation_config`, `rate_limit_logs`, `receiving_checklists`, `security_logs`, `supplier_bonifications`, `supplier_qualification_scores`. Ex.: `EXECUTE format('DROP POLICY IF EXISTS %I ON public.audit_logs', pol.policyname);`. Arquivos: `supabase/migrations/20260317222336_b11455d7-3bed-421d-9f68-835d7ef26d66.sql`<br>`supabase/migrations/20260317225700_89f28570-4d8b-455a-8d44-8c36c454efd3.sql`<br>`supabase/migrations/20260317230002_e7619b9a-5a26-4d44-9023-1d986f965464.sql`<br>`supabase/migrations/20260619205841_08fc0043-6b1e-4ed9-9c1a-89440df3c816.sql`<br>`supabase/migrations/20260719000001_rls_using_true_cleanup.sql`. Confirme no banco real antes de assumir.

| Tabela | RLS | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|---|
| `account_lockouts` | enabled | public: has_role(auth.uid(), 'admin'::app_role)<br>authenticated: (email = auth.email()) OR has_role(auth.uid(), 'admin'::app_role) | public: has_role(auth.uid(), 'admin'::app_role) | public: has_role(auth.uid(), 'admin'::app_role) | public: has_role(auth.uid(), 'admin'::app_role) |
| `active_sessions` | enabled | public: auth.uid() = user_id<br>public: has_role(auth.uid(), 'admin')<br>authenticated: public.tenant_in_my_group(tenant_id) | public: auth.uid() = user_id<br>authenticated: public.tenant_in_my_group(tenant_id) | public: auth.uid() = user_id<br>authenticated: public.tenant_in_my_group(tenant_id) | public: auth.uid() = user_id<br>public: has_role(auth.uid(), 'admin')<br>authenticated: public.tenant_in_my_group(tenant_id) |
| `alert_subscriptions` | enabled | authenticated: auth.uid() = user_id AND public.has_role(auth.uid(), 'admin') | authenticated: auth.uid() = user_id AND public.has_role(auth.uid(), 'admin') | authenticated: auth.uid() = user_id AND public.has_role(auth.uid(), 'admin') | authenticated: auth.uid() = user_id AND public.has_role(auth.uid(), 'admin') |
| `aliquotas_tributarias` | enabled | authenticated: organization_id = public.get_user_grupo_id()<br>authenticated: organization_id = public.get_user_grupo_id() AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid() | authenticated: organization_id = public.get_user_grupo_id() AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid() | authenticated: organization_id = public.get_user_grupo_id() AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid() | authenticated: organization_id = public.get_user_grupo_id() AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid() |
| `allowed_countries` | enabled | public: has_role(auth.uid(), 'admin'::app_role)<br>authenticated: public.has_role(auth.uid(), 'admin'::app_role) | public: has_role(auth.uid(), 'admin'::app_role) | public: has_role(auth.uid(), 'admin'::app_role) | public: has_role(auth.uid(), 'admin'::app_role) |
| `approval_delegations` | enabled | public: auth.uid() = delegante_id OR auth.uid() = delegado_id OR has_role(auth.uid(), 'admin'::app_role)<br>public: organization_id IN (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid())<br>authenticated: public.tenant_in_my_group(tenant_id) | public: auth.uid() = delegante_id OR has_role(auth.uid(), 'admin'::app_role)<br>authenticated: public.tenant_in_my_group(tenant_id) | public: auth.uid() = delegante_id OR has_role(auth.uid(), 'admin'::app_role)<br>authenticated: public.tenant_in_my_group(tenant_id) | public: auth.uid() = delegante_id OR has_role(auth.uid(), 'admin'::app_role)<br>authenticated: public.tenant_in_my_group(tenant_id) |
| `approval_hierarchy` | enabled | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() |
| `approval_history` | enabled | authenticated: auth.uid() = usuario_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator')<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: auth.uid() = usuario_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator')<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: public.tenant_in_my_group(tenant_id) | authenticated: public.tenant_in_my_group(tenant_id) |
| `approval_rules` | enabled | public: auth.uid() IS NOT NULL<br>public: has_role(auth.uid(), 'admin'::app_role)<br>authenticated: public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator')<br>public: organization_id IN (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid())<br>public: organization_id IN (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid())<br>authenticated: public.tenant_in_my_group(tenant_id) | public: has_role(auth.uid(), 'admin'::app_role)<br>public: organization_id IN (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid())<br>authenticated: public.tenant_in_my_group(tenant_id) | public: has_role(auth.uid(), 'admin'::app_role)<br>public: organization_id IN (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid())<br>authenticated: public.tenant_in_my_group(tenant_id) | public: has_role(auth.uid(), 'admin'::app_role)<br>public: organization_id IN (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid())<br>authenticated: public.tenant_in_my_group(tenant_id) |
| `approval_steps` | enabled | authenticated: auth.uid() = aprovador_id OR auth.uid() = aprovador_efetivo_id OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.ui<br>authenticated: tenant_id = public.current_tenant_id() | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)<br>authenticated: tenant_id = public.current_tenant_id() | public: auth.uid() = aprovador_id OR auth.uid() = aprovador_efetivo_id OR has_role(auth.uid(), 'admin'::app_role)<br>authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() |
| `approval_workflows` | enabled | authenticated: public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'finance')<br>public: organization_id IN (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid())<br>public: organization_id IN (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid())<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)<br>public: organization_id IN (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid())<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)<br>public: organization_id IN (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid())<br>authenticated: public.tenant_in_my_group(tenant_id) | public: organization_id IN (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid())<br>authenticated: public.tenant_in_my_group(tenant_id) |
| `auction_bids` | enabled | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() |
| `audit_logs` | enabled | authenticated: has_role(auth.uid(), 'admin'::app_role)<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: tenant_in_my_group(tenant_id) AND auth.uid() IS NOT NULL<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: public.tenant_in_my_group(tenant_id) | authenticated: public.tenant_in_my_group(tenant_id) |
| `audit_logs_202605` | não encontrado | ? | ? | ? | ? |
| `audit_logs_202606` | não encontrado | ? | ? | ? | ? |
| `audit_logs_202607` | não encontrado | ? | ? | ? | ? |
| `audit_logs_202608` | não encontrado | ? | ? | ? | ? |
| `audit_logs_202609` | não encontrado | ? | ? | ? | ? |
| `audit_logs_legacy_20260712` | enabled | authenticated: has_role(auth.uid(), 'admin'::app_role) | — | — | — |
| `blocked_countries` | não encontrado | authenticated: public.has_role(auth.uid(), 'admin'::app_role) | ? | ? | ? |
| `blocked_ips` | enabled | public: has_role(auth.uid(), 'admin')<br>authenticated: has_role(auth.uid(), 'admin'::app_role) | public: has_role(auth.uid(), 'admin') | public: has_role(auth.uid(), 'admin') | public: has_role(auth.uid(), 'admin') |
| `budget_audit_logs` | enabled | authenticated: public.has_role(auth.uid(), 'admin') | — | — | — |
| `budget_transactions` | enabled | authenticated: tenant_id = current_tenant_id() AND ( has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'finance'::app_role) OR<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: public.tenant_in_my_group(tenant_id) | authenticated: public.tenant_in_my_group(tenant_id) | authenticated: public.tenant_in_my_group(tenant_id) |
| `categorias` | enabled | public: has_role(auth.uid(), 'admin'::app_role)<br>public: organization_id IN (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid())<br>public: organization_id IN (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid())<br>authenticated: tenant_in_my_group(tenant_id)<br>authenticated: public.tenant_in_my_group(tenant_id) | public: has_role(auth.uid(), 'admin'::app_role)<br>public: organization_id IN (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid())<br>authenticated: public.tenant_in_my_group(tenant_id) | public: has_role(auth.uid(), 'admin'::app_role)<br>public: organization_id IN (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid())<br>authenticated: public.tenant_in_my_group(tenant_id) | public: has_role(auth.uid(), 'admin'::app_role)<br>public: organization_id IN (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid())<br>authenticated: public.tenant_in_my_group(tenant_id) |
| `category_strategies` | enabled | public: organization_id IN (SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid())<br>public: organization_id = public.get_my_organization()<br>authenticated: public.tenant_in_my_group(tenant_id) | public: organization_id = public.get_my_organization()<br>authenticated: public.tenant_in_my_group(tenant_id) | public: organization_id = public.get_my_organization()<br>authenticated: public.tenant_in_my_group(tenant_id) | public: organization_id = public.get_my_organization()<br>authenticated: public.tenant_in_my_group(tenant_id) |
| `checkpoint_snapshots` | enabled | authenticated: public.has_role(auth.uid(), 'admin') | — | — | — |
| `contact_notes` | enabled | authenticated: auth.uid() = author_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator')<br>authenticated: public.tenant_in_my_group(tenant_id) | public: auth.uid() IS NOT NULL AND auth.uid() = author_id<br>authenticated: public.tenant_in_my_group(tenant_id) | public: auth.uid() = author_id<br>authenticated: public.tenant_in_my_group(tenant_id) | public: auth.uid() = author_id OR has_role(auth.uid(), 'admin'::app_role)<br>authenticated: public.tenant_in_my_group(tenant_id) |
| `contract_documents` | enabled | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'finance'::a<br>authenticated: public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'finance')<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'finance'::a<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'finance'::a<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'finance'::a<br>authenticated: public.tenant_in_my_group(tenant_id) |
| `contract_history` | enabled | authenticated: public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'finance')<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: (auth.uid() IS NOT NULL) AND (performed_by IS NULL OR performed_by = auth.uid())<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: public.tenant_in_my_group(tenant_id) | authenticated: public.tenant_in_my_group(tenant_id) |
| `contract_items` | enabled | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'finance'::a<br>authenticated: public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'finance')<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'finance'::a<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'finance'::a<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'finance'::a<br>authenticated: public.tenant_in_my_group(tenant_id) |
| `contract_penalties` | enabled | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'finance'::a<br>authenticated: public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'finance')<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'finance'::a<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'finance'::a<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'finance'::a<br>authenticated: public.tenant_in_my_group(tenant_id) |
| `contracts` | enabled | authenticated: tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR <br>authenticated: tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR <br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR <br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR <br>authenticated: public.tenant_in_my_group(tenant_id) | public: has_role(auth.uid(), 'admin'::app_role)<br>authenticated: tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR <br>authenticated: public.tenant_in_my_group(tenant_id) |
| `cost_centers` | enabled | authenticated: tenant_id = (auth.jwt() ->> 'tenant_id')::uuid | authenticated: has_role(auth.uid(), 'admin'::app_role)<br>authenticated: tenant_id = (auth.jwt() ->> 'tenant_id')::uuid | authenticated: tenant_id = (auth.jwt() ->> 'tenant_id')::uuid | authenticated: tenant_id = (auth.jwt() ->> 'tenant_id')::uuid |
| `cotacoes` | enabled | public: auth.is_supplier() AND fornecedor_id IN ( SELECT id FROM fornecedores WHERE user_id = auth.uid() )<br>authenticated: tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR <br>authenticated: tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR <br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR <br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR <br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR <br>authenticated: public.tenant_in_my_group(tenant_id) |
| `creditos_fornecedor` | enabled | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'finance'::a<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'finance'::a<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'finance'::a<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'finance'::a<br>authenticated: public.tenant_in_my_group(tenant_id) |
| `cron_heartbeats` | enabled | service_role: true<br>authenticated: true | service_role: true | service_role: true | service_role: true |
| `currencies` | enabled | authenticated: true<br>authenticated: true | — | — | — |
| `dashboard_filter_favorites` | enabled | public: auth.uid() = user_id | public: auth.uid() = user_id | public: auth.uid() = user_id | public: auth.uid() = user_id |
| `dashboard_layouts` | enabled | public: auth.uid() = user_id | public: auth.uid() = user_id | public: auth.uid() = user_id | — |
| `deadlock_snapshots` | enabled | authenticated: public.has_role(auth.uid(), 'admin') | — | — | — |
| `department_budgets` | enabled | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)<br>authenticated: has_role(auth.uid(), 'finance'::app_role)<br>authenticated: public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'finance')<br>public: organization_id IN (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid())<br>public: organization_id IN (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid())<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)<br>authenticated: has_role(auth.uid(), 'finance'::app_role)<br>public: organization_id IN (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid())<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)<br>authenticated: has_role(auth.uid(), 'finance'::app_role)<br>public: organization_id IN (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid())<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)<br>authenticated: has_role(auth.uid(), 'finance'::app_role)<br>public: organization_id IN (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid())<br>authenticated: public.tenant_in_my_group(tenant_id) |
| `dependency_health` | enabled | authenticated: public.has_role(auth.uid(), 'admin')<br>authenticated: auth.uid() IS NOT NULL | authenticated: public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'admin') |
| `dependency_health_history` | enabled | authenticated: auth.uid() IS NOT NULL | authenticated: has_role(auth.uid(), 'admin'::app_role) | — | — |
| `devolucao_itens` | enabled | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app<br>authenticated: has_role(auth.uid(), 'finance'::app_role)<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app<br>authenticated: public.tenant_in_my_group(tenant_id) |
| `devolucoes` | enabled | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app<br>authenticated: has_role(auth.uid(), 'finance'::app_role)<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app<br>authenticated: public.tenant_in_my_group(tenant_id) |
| `entity_versions` | enabled | authenticated: true | public: auth.uid() = changed_by OR changed_by IS NULL | — | — |
| `erp_connections` | enabled | authenticated: tenant_id = public.current_tenant_id() AND ( public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.ui | authenticated: tenant_id = public.current_tenant_id() AND ( public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.ui | authenticated: tenant_id = public.current_tenant_id() AND ( public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.ui | authenticated: tenant_id = public.current_tenant_id() AND ( public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.ui |
| `erp_field_mappings` | enabled | authenticated: EXISTS ( SELECT 1 FROM public.erp_connections c WHERE c.id = connection_id AND c.tenant_id = public.current_tenant_id() ) | authenticated: EXISTS ( SELECT 1 FROM public.erp_connections c WHERE c.id = connection_id AND c.tenant_id = public.current_tenant_id() ) | authenticated: EXISTS ( SELECT 1 FROM public.erp_connections c WHERE c.id = connection_id AND c.tenant_id = public.current_tenant_id() ) | authenticated: EXISTS ( SELECT 1 FROM public.erp_connections c WHERE c.id = connection_id AND c.tenant_id = public.current_tenant_id() ) |
| `erp_sync_log` | enabled | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() |
| `estoque` | enabled | authenticated: organization_id = (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid())<br>authenticated: organization_id = (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid()) | authenticated: organization_id = (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid()) | authenticated: organization_id = (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid()) | authenticated: organization_id = (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid()) |
| `estoque_movimentacoes` | enabled | authenticated: organization_id = (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid()) | authenticated: organization_id = (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid()) | — | — |
| `exchange_rates` | enabled | authenticated: true<br>authenticated: true | — | — | — |
| `financial_audit_logs` | enabled | public: EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text IN ('admin', 'coordinator')) | — | — | — |
| `fiscal_documents` | enabled | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app<br>authenticated: public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'buyer') OR<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app<br>authenticated: public.tenant_in_my_group(tenant_id) |
| `fiscal_events` | enabled | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() |
| `fornecedor_categorias` | enabled | authenticated: tenant_id = public.current_tenant_id()<br>authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id()<br>authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id()<br>authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id()<br>authenticated: tenant_id = public.current_tenant_id() |
| `fornecedores` | enabled | public: auth.is_supplier() AND ( user_id = auth.uid() OR EXISTS ( SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.organization_id = f<br>authenticated: tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR <br>authenticated: tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR <br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR <br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR <br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR <br>authenticated: public.tenant_in_my_group(tenant_id) |
| `geo_access_logs` | não encontrado | ? | public: auth.uid() IS NOT NULL | ? | ? |
| `geo_settings` | enabled | public: has_role(auth.uid(), 'admin'::app_role)<br>public: auth.uid() IS NOT NULL | public: has_role(auth.uid(), 'admin'::app_role) | public: has_role(auth.uid(), 'admin'::app_role) | public: has_role(auth.uid(), 'admin'::app_role) |
| `health_scan_runs` | enabled | authenticated: public.has_role(auth.uid(), 'admin') | — | — | — |
| `historico_compras` | enabled | — | — | — | — |
| `integration_outbox` | enabled | authenticated: public.has_role(auth.uid(), 'admin')<br>service_role: true | authenticated: created_by = auth.uid()<br>service_role: true | service_role: true | service_role: true |
| `ip_whitelist` | enabled | public: has_role(auth.uid(), 'admin')<br>authenticated: has_role(auth.uid(), 'admin'::app_role) | public: has_role(auth.uid(), 'admin') | public: has_role(auth.uid(), 'admin') | public: has_role(auth.uid(), 'admin') |
| `licitacao_lances` | enabled | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() |
| `licitacao_propostas` | enabled | authenticated: public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'buyer')<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'buyer')<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'buyer')<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'buyer')<br>authenticated: public.tenant_in_my_group(tenant_id) |
| `licitacoes` | enabled | authenticated: public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator')<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator')<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator')<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator')<br>authenticated: public.tenant_in_my_group(tenant_id) |
| `login_attempts` | enabled | authenticated: has_role(auth.uid(), 'admin'::app_role) | authenticated: (auth.uid() IS NOT NULL) AND (auth.email() = email) | — | — |
| `mfa_settings` | enabled | public: auth.uid() = user_id | public: auth.uid() = user_id | public: auth.uid() = user_id | public: auth.uid() = user_id |
| `negotiation_analyses` | enabled | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app<br>authenticated: public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'buyer') | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app |
| `notification_preferences` | enabled | public: auth.uid() = user_id | public: auth.uid() = user_id | public: auth.uid() = user_id | public: auth.uid() = user_id |
| `notifications` | enabled | public: auth.uid() = user_id<br>authenticated: tenant_id = public.current_tenant_id()<br>authenticated: user_id = auth.uid() | authenticated: auth.uid() = user_id<br>authenticated: tenant_id = public.current_tenant_id()<br>authenticated: user_id = auth.uid() | public: auth.uid() = user_id<br>authenticated: tenant_id = public.current_tenant_id()<br>authenticated: user_id = auth.uid() | authenticated: tenant_id = public.current_tenant_id()<br>authenticated: user_id = auth.uid() |
| `order_contracts` | enabled | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app<br>authenticated: public.tenant_in_my_group(tenant_id) |
| `organizations` | enabled | public: id IN (SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()) | — | — | — |
| `pagamentos` | enabled | authenticated: tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'finance'::app_role) OR has_<br>authenticated: tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'finance'::app_role))<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'finance'::app_role))<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'finance'::app_role))<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'finance'::app_role))<br>authenticated: public.tenant_in_my_group(tenant_id) |
| `password_reset_requests` | enabled | public: auth.uid() = user_id<br>public: has_role(auth.uid(), 'admin'::app_role) | public: auth.uid() = user_id | public: has_role(auth.uid(), 'admin'::app_role) | — |
| `payment_history` | enabled | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'finance'::app_role) OR has_role(auth.uid(), 'coordinator'::a<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'finance'::app_role) OR has_role(auth.uid(), 'coordinator'::a<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'finance'::app_role) OR has_role(auth.uid(), 'coordinator'::a<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'finance'::app_role) OR has_role(auth.uid(), 'coordinator'::a<br>authenticated: public.tenant_in_my_group(tenant_id) |
| `pedido_itens` | enabled | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app<br>authenticated: public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'buyer') OR<br>authenticated: tenant_id = public.current_tenant_id()<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app<br>authenticated: tenant_id = public.current_tenant_id()<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app<br>authenticated: tenant_id = public.current_tenant_id()<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app<br>authenticated: tenant_id = public.current_tenant_id()<br>authenticated: public.tenant_in_my_group(tenant_id) |
| `pedidos` | enabled | authenticated: tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR <br>authenticated: tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR <br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR <br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR <br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR <br>authenticated: public.tenant_in_my_group(tenant_id) |
| `penalty_escalation_config` | enabled | public: auth.uid() IS NOT NULL<br>authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)<br>authenticated: public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator')<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)<br>authenticated: public.tenant_in_my_group(tenant_id) |
| `permissions` | enabled | public: has_role(auth.uid(), 'admin')<br>authenticated: public.has_role(auth.uid(), 'admin'::app_role) | public: has_role(auth.uid(), 'admin') | public: has_role(auth.uid(), 'admin') | public: has_role(auth.uid(), 'admin') |
| `produto_fornecedores` | enabled | authenticated: EXISTS ( SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.tenant_id = produto_fornecedores.tenant_id )<br>authenticated: EXISTS ( SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.tenant_id = produto_fornecedores.tenant_id ) | authenticated: EXISTS ( SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.tenant_id = produto_fornecedores.tenant_id ) | authenticated: EXISTS ( SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.tenant_id = produto_fornecedores.tenant_id ) | authenticated: EXISTS ( SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.tenant_id = produto_fornecedores.tenant_id ) |
| `produtos` | enabled | authenticated: tenant_id = (auth.jwt() ->> 'tenant_id')::uuid<br>authenticated: tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role))<br>authenticated: tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR  | authenticated: public.has_role(auth.uid(), 'buyer')<br>authenticated: tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role))<br>authenticated: tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR  | authenticated: tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role))<br>authenticated: tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR  | authenticated: tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role))<br>authenticated: tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR  |
| `profiles` | enabled | authenticated: public.has_role(auth.uid(), 'admin')<br>authenticated: public.has_role(auth.uid(), 'admin')<br>authenticated: auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role)<br>authenticated: tenant_id = public.current_tenant_id()<br>authenticated: tenant_id = (auth.jwt() ->> 'tenant_id')::uuid | authenticated: auth.uid() = user_id<br>authenticated: public.has_role(auth.uid(), 'admin')<br>authenticated: tenant_id = (auth.jwt() ->> 'tenant_id')::uuid | authenticated: auth.uid() = user_id<br>authenticated: public.has_role(auth.uid(), 'admin')<br>authenticated: tenant_id = (auth.jwt() ->> 'tenant_id')::uuid | authenticated: public.has_role(auth.uid(), 'admin')<br>authenticated: tenant_id = (auth.jwt() ->> 'tenant_id')::uuid |
| `punchout_catalogs` | enabled | authenticated: tenant_id = public.current_tenant_id() AND ( public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.ui | authenticated: tenant_id = public.current_tenant_id() AND ( public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.ui | authenticated: tenant_id = public.current_tenant_id() AND ( public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.ui | authenticated: tenant_id = public.current_tenant_id() AND ( public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.ui |
| `punchout_sessions` | enabled | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() |
| `push_subscriptions` | enabled | public: auth.uid() = user_id | public: auth.uid() = user_id | public: auth.uid() = user_id | public: auth.uid() = user_id |
| `qualification_history` | não encontrado | authenticated: public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'buyer') | authenticated: (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator')) AND performed_by = auth.uid() | ? | ? |
| `qualification_requirements` | não encontrado | authenticated: public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'coordinator'::app_role) OR public.has_role(aut | ? | ? | ? |
| `query_telemetry` | enabled | authenticated: public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'admin')<br>authenticated: user_id = auth.uid() | authenticated: public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'admin') |
| `rate_limit_logs` | enabled | public: has_role(auth.uid(), 'admin') | public: (auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid())) OR user_id IS NULL<br>authenticated: auth.uid() IS NOT NULL | — | — |
| `receiving_checklists` | enabled | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app<br>authenticated: public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'buyer') OR<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app<br>authenticated: public.tenant_in_my_group(tenant_id) |
| `repurchase_suggestions` | enabled | authenticated: tenant_id = public.current_tenant_id()<br>authenticated: tenant_id = public.current_tenant_id() AND ( public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.ui | authenticated: tenant_id = public.current_tenant_id() AND ( public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.ui | authenticated: tenant_id = public.current_tenant_id() AND ( public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.ui | authenticated: tenant_id = public.current_tenant_id() AND ( public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.ui |
| `role_permissions` | enabled | public: has_role(auth.uid(), 'admin')<br>authenticated: public.has_role(auth.uid(), 'admin'::app_role) | public: has_role(auth.uid(), 'admin') | public: has_role(auth.uid(), 'admin') | public: has_role(auth.uid(), 'admin') |
| `saved_filters` | enabled | public: auth.uid() = user_id | public: auth.uid() = user_id | public: auth.uid() = user_id | public: auth.uid() = user_id |
| `savings_tracker` | enabled | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() |
| `scim_provisioning_log` | enabled | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() |
| `secret_rotation_schedule` | enabled | authenticated: public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'admin') |
| `security_definer_baseline` | enabled | authenticated: public.has_role(auth.uid(), 'admin') | — | — | — |
| `security_logs` | enabled | public: has_role(auth.uid(), 'admin') | public: auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid())<br>authenticated: public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator') | — | — |
| `solicitacoes` | enabled | public: auth.uid() = solicitante_id OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)<br>public: organization_id IN (SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid())<br>authenticated: tenant_id = (auth.jwt() ->> 'tenant_id')::uuid | public: auth.uid() = solicitante_id<br>authenticated: tenant_id = (auth.jwt() ->> 'tenant_id')::uuid | public: (auth.uid() = solicitante_id AND status = 'pendente') OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinato<br>authenticated: tenant_id = (auth.jwt() ->> 'tenant_id')::uuid | public: has_role(auth.uid(), 'admin'::app_role)<br>authenticated: tenant_id = (auth.jwt() ->> 'tenant_id')::uuid |
| `sourcing_awards` | enabled | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() |
| `sourcing_event_criteria` | enabled | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() |
| `sourcing_event_lots` | enabled | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() |
| `sourcing_event_questions` | enabled | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() |
| `sourcing_events` | enabled | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() |
| `sourcing_invitations` | enabled | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() |
| `sourcing_pipeline` | enabled | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() |
| `sourcing_projects` | enabled | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() |
| `sourcing_response_answers` | enabled | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() |
| `sourcing_response_items` | enabled | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() |
| `sourcing_responses` | enabled | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() |
| `spend_forecasts` | enabled | public: organization_id IN (SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid())<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: public.tenant_in_my_group(tenant_id) | authenticated: public.tenant_in_my_group(tenant_id) | authenticated: public.tenant_in_my_group(tenant_id) |
| `spot_api_sync_log` | enabled | authenticated: has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'buyer'::app_ro | — | — | — |
| `spot_customization_options` | enabled | authenticated: has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'buyer'::app_ro | — | — | — |
| `spot_estoque` | enabled | authenticated: has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'buyer'::app_ro | — | — | — |
| `spot_pedidos` | enabled | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app<br>authenticated: has_role(auth.uid(), 'admin'::public.app_role) OR has_role(auth.uid(), 'coordinator'::public.app_role) OR has_role(auth.uid() | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app |
| `spot_produtos` | enabled | authenticated: has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'buyer'::app_ro | — | — | — |
| `spot_sessions` | enabled | authenticated: false | authenticated: false | authenticated: false | authenticated: false |
| `spot_skus` | enabled | authenticated: has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'buyer'::app_ro | — | — | — |
| `sso_configurations` | enabled | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() |
| `supplier_bonifications` | enabled | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)<br>authenticated: public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'finance') <br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)<br>authenticated: public.tenant_in_my_group(tenant_id) |
| `supplier_documents` | não encontrado | authenticated: tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR <br>authenticated: tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR <br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR <br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR <br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR <br>authenticated: public.tenant_in_my_group(tenant_id) |
| `supplier_qualification_scores` | não encontrado | authenticated: public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'buyer') OR<br>authenticated: tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role))<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role))<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role))<br>authenticated: public.tenant_in_my_group(tenant_id) | authenticated: tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role))<br>authenticated: public.tenant_in_my_group(tenant_id) |
| `system_alerts` | enabled | authenticated: (tenant_id IS NOT NULL AND public.tenant_in_my_group(tenant_id)) OR (tenant_id IS NULL AND public.has_role(auth.uid(), 'admin | — | — | — |
| `table_size_snapshots` | enabled | authenticated: public.has_role(auth.uid(), 'admin') | — | — | — |
| `telemetry_logs` | enabled | public: EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text = 'admin' ) | authenticated: auth.uid() = user_id | — | — |
| `telemetry_logs_202605` | enabled | — | — | — | — |
| `telemetry_logs_202606` | enabled | — | — | — | — |
| `telemetry_logs_202607` | enabled | — | — | — | — |
| `telemetry_logs_202608` | enabled | — | — | — | — |
| `telemetry_logs_202609` | enabled | — | — | — | — |
| `telemetry_logs_legacy_20260712` | enabled | public: EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text = 'admin' )<br>public: public.has_role(auth.uid(), 'admin') | authenticated: auth.uid() = user_id | — | — |
| `temp_file_snapshots` | enabled | authenticated: public.has_role(auth.uid(), 'admin') | — | — | — |
| `tenants` | enabled | authenticated: public.user_belongs_to_tenant(auth.uid(), id) | — | — | — |
| `unspsc_codes` | enabled | authenticated: auth.uid() IS NOT NULL | — | — | — |
| `user_filter_preferences` | enabled | public: auth.uid() = user_id | public: auth.uid() = user_id | public: auth.uid() = user_id | public: auth.uid() = user_id |
| `user_organizations` | enabled | public: user_id = auth.uid() | — | — | — |
| `user_roles` | enabled | authenticated: auth.uid() = user_id<br>authenticated: public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'admin') |
| `user_tenants` | enabled | authenticated: user_id = auth.uid() | — | — | — |
| `user_tour_preferences` | enabled | public: auth.uid() = user_id | public: auth.uid() = user_id | public: auth.uid() = user_id | public: auth.uid() = user_id |
| `wal_rate_snapshots` | enabled | authenticated: public.has_role(auth.uid(), 'admin') | — | — | — |
| `webauthn_challenges` | enabled | public: (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR (auth.email() IS NOT NULL AND email = auth.email()) | public: (auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid())) OR (auth.email() IS NOT NULL AND (email IS NULL OR email = au | — | public: (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR (auth.email() IS NOT NULL AND email = auth.email()) |
| `webauthn_credentials` | enabled | public: auth.uid() = user_id | public: auth.uid() = user_id | public: auth.uid() = user_id | public: auth.uid() = user_id |
| `webhook_events` | enabled | authenticated: public.has_role(auth.uid(), 'admin') | — | — | — |
| `workflow_approvals` | enabled | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() |
| `workflow_audit_log` | enabled | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() |
| `workflow_edges` | enabled | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() |
| `workflow_instances` | enabled | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() |
| `workflow_logs` | enabled | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() |
| `workflow_nodes` | enabled | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() |
| `workflow_sod_rules` | enabled | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() |
| `workflow_tasks` | enabled | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() |
| `workflow_templates` | enabled | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() | authenticated: tenant_id = public.current_tenant_id() |
| `xbz_carrinho_log` | enabled | authenticated: public.tenant_in_my_group(tenant_id) | — | — | — |
| `xbz_cores` | enabled | authenticated: true | — | — | — |
| `xbz_credentials` | enabled | authenticated: public.tenant_in_my_group(tenant_id) AND public.has_role(auth.uid(), 'admin'::app_role) | authenticated: public.tenant_in_my_group(tenant_id) AND public.has_role(auth.uid(), 'admin'::app_role) | authenticated: public.tenant_in_my_group(tenant_id) AND public.has_role(auth.uid(), 'admin'::app_role) | authenticated: public.tenant_in_my_group(tenant_id) AND public.has_role(auth.uid(), 'admin'::app_role) |
| `xbz_pedido_status_history` | enabled | authenticated: public.tenant_in_my_group(tenant_id) | — | — | — |
| `xbz_pedidos` | enabled | authenticated: public.tenant_in_my_group(tenant_id) | — | — | — |
| `xbz_produto_fiscal` | enabled | authenticated: public.tenant_in_my_group(tenant_id) | — | — | — |
| `xbz_produtos` | enabled | authenticated: public.tenant_in_my_group(tenant_id) | — | — | — |

> `—` com RLS ligado = ninguém além de service_role. `sem RLS` = qualquer chave anon lê/escreve tudo. `?` = nenhuma migration do repo liga ou desliga RLS nessa tabela (ex.: tabela conhecida só pelo arquivo de tipos) — NÃO VERIFICADO; política listada numa linha `não encontrado` só vale se o RLS estiver ligado no banco real.

## Onde o RLS é IGNORADO (service_role) — 51 arquivo(s)

- `scripts/ai-context/cenarios.mjs`
- `scripts/ai-context/gerar.unit.mjs`
- `scripts/ci/check-bundle-secrets.mjs`
- `scripts/ci/check-bundle-secrets.unit.mjs`
- `scripts/ci/scripts-operacionais.unit.mjs`
- `scripts/inventario/gerar-banco.mjs`
- `scripts/regras_negocio/generate.py`
- `scripts/regras_negocio/test_generate.py`
- `scripts/rls-audit.ts`
- `scripts/supabase_snapshot/snapshot.py`
- `scripts/supabase_snapshot/test_snapshot.py`
- `src/tests/integration/supabase-db.test.ts`
- `supabase/functions/_shared/idempotency.ts`
- `supabase/functions/_shared/logger.fuzz.test.ts`
- `supabase/functions/_shared/logger.ts`
- `supabase/functions/_shared/rate_limit.ts`
- `supabase/functions/_shared/security.ts`
- `supabase/functions/_shared/telemetry.ts`
- `supabase/functions/_shared/xbz_auth.ts`
- `supabase/functions/alert-dispatcher/index.ts`
- `supabase/functions/check-approval-escalations/index.ts`
- `supabase/functions/check-cotacao-followup/index.ts`
- `supabase/functions/check-expiry-alerts/index.ts`
- `supabase/functions/check-sla-alerts/index.ts`
- `supabase/functions/dependency-health/index.ts`
- `supabase/functions/erp-sync/index.ts`
- `supabase/functions/external-db-bridge/index.ts`
- `supabase/functions/fiscal-orchestrator/index.ts`
- `supabase/functions/generate-contract-pdf/index.ts`
- `supabase/functions/guided-buying-ai/index.ts`
- `supabase/functions/health-dashboard/index.ts`
- `supabase/functions/maintain-partitions/index.ts`
- `supabase/functions/migrate-helper/index.ts`
- `supabase/functions/migrate-storage-paths/index.ts`
- `supabase/functions/process-invoice-idp/index.ts`
- `supabase/functions/process-outbox/index.ts`
- `supabase/functions/punchout-receive/index.ts`
- `supabase/functions/punchout-setup/index.ts`
- `supabase/functions/run-audit/index.ts`
- `supabase/functions/run-audit/rls_test.ts`
- `supabase/functions/scim-v2/index.ts`
- `supabase/functions/send-push-notification/index.ts`
- `supabase/functions/spot-api/index.ts`
- `supabase/functions/spot-proxy/index.ts`
- `supabase/functions/system-simulation/index.ts`
- `supabase/functions/telemetry/index.ts`
- `supabase/functions/webauthn-authenticate/index.ts`
- `supabase/functions/webauthn-register/index.ts`
- `supabase/functions/weekly-report/index.ts`
- `supabase/functions/weekly-summary-report/index.ts`
- `supabase/functions/workflow-engine/index.ts`

## Funções SQL `SECURITY DEFINER` (rodam com privilégio do dono, ignoram RLS)

- `_invoke_edge_function`
- `_invoke_spot_sync`
- `_invoke_xbz_sync`
- `admin_scan_runs_sla_status`
- `alert_on_outbox_dead`
- `alert_subscribers_for`
- `alerts_mttr_by_type`
- `alerts_noisy_scanners`
- `alerts_severity_timeseries`
- `apply_lgpd_retention`
- `archive_audit_logs_older_than`
- `archive_telemetry_logs_older_than`
- `audit_pagamento_changes`
- `audit_user_roles_changes`
- `auto_approve_low_value_solicitacao`
- `auto_block_low_score_supplier`
- `auto_calculate_delivery_penalty`
- `auto_create_pagamento_on_delivery`
- `auto_transition_solicitacao_on_cotacao_approval`
- `auto_transition_solicitacao_on_pedido_delivery`
- `auto_update_supplier_score_on_delivery`
- `calculate_cotacao_scores`
- `check_budget_availability`
- `check_escalation`
- `check_rate_limit`
- `check_secret_rotation_due`
- `check_telemetry_alerts`
- `check_workflow_sod`
- `cleanup_deadlock_snapshots`
- `cleanup_expired_challenges`
- `cleanup_expired_password_resets`
- `cleanup_health_scan_runs`
- `cleanup_old_audit_logs`
- `cleanup_old_geo_access_logs`
- `cleanup_old_integration_outbox`
- `cleanup_old_login_attempts`
- `cleanup_old_query_telemetry`
- `cleanup_old_rate_limit_logs`
- `cleanup_old_security_logs`
- `cleanup_old_system_alerts`
- `cleanup_old_telemetry_logs`
- `cleanup_old_temp_file_snapshots`
- `cleanup_old_wal_rate_snapshots`
- `cleanup_old_webhook_events`
- `clear_login_lockout`
- `count_legacy_storage_urls`
- `cron_watchdog`
- `current_tenant_id`
- `enforce_audit_integrity`
- `ensure_audit_logs_partition`
- `ensure_telemetry_logs_partition`
- `exec_sql`
- `execute_read_query`
- `fill_tenant_id_from_profile`
- `find_approval_rule`
- `fx_convert`
- `generate_sequential_number`
- `get_compras_dashboard_metrics`
- `get_cron_job_staleness`
- `get_dashboard_kpis`
- `get_db_health_snapshot`
- `get_effective_approver`
- `get_failed_login_count`
- `get_fornecedores_kpis`
- `get_my_organization`
- `get_pagamentos_kpis`
- `get_pedidos_kpis`
- `get_solicitacoes_kpis`
- `get_user_grupo_id`
- `get_user_role`
- `grant_tenant_access_on_insert`
- `handle_new_user`
- `handle_pedido_budget_realization`
- `handle_solicitacao_budget_change`
- `has_permission`
- `has_role`
- `is_account_locked`
- `is_ip_blocked`
- `is_ip_whitelisted`
- `is_supplier`
- `log_audit_event`
- `log_budget_changes`
- `log_cotacao_action`
- `log_login_attempt`
- `log_security_event`
- `maintain_monthly_partitions`
- `pg_activity_watchdog`
- `recalculate_all_solicitacao_cotacoes`
- `recalculate_saldo_comprometido`
- `record_failed_login`
- `refresh_mv_dashboard_kpis`
- `resolve_alert`
- `run_all_health_scans`
- `sanitize_audit_metadata`
- `sanitize_session_token`
- `scan_autovacuum_starvation`
- `scan_blocking_locks`
- `scan_cache_hit_ratio`
- `scan_checkpoint_health`
- `scan_connection_saturation`
- `scan_dangerous_statements`
- `scan_deadlocks_and_conflicts`
- `scan_duplicate_indexes`
- `scan_fk_without_cascade`
- `scan_idle_in_transaction`
- `scan_invalid_and_duplicate_indexes`
- `scan_lock_waits`
- `scan_long_running_queries`
- `scan_long_running_transactions`
- `scan_partition_candidates`
- `scan_replication_lag`
- `scan_replication_slots`
- `scan_rollback_rate`
- `scan_scan_runs_sla`
- `scan_schema_hygiene`
- `scan_security_definer_drift`
- `scan_sequence_exhaustion`
- `scan_slow_query_hotspots`
- `scan_stale_alerts`
- `scan_stale_statistics`
- `scan_table_bloat`
- `scan_table_growth`
- `scan_tables_without_pk`
- `scan_temp_file_usage`
- `scan_temp_files_spill`
- `scan_toast_bloat`
- `scan_txid_wraparound`
- `scan_unindexed_fks`
- `scan_unindexed_foreign_keys`
- `scan_unused_indexes`
- `scan_wal_generation_rate`
- `scan_xid_wraparound`
- `simulate_scan_sla_loop`
- `sync_budget_on_payment`
- `tenant_in_my_group`
- `tenants_in_my_group`
- `trg_cotacao_approved_transition`
- `trg_pedido_entregue_transition`
- `trg_solicitacao_approved_transition`
- `trigger_update_saldo_on_pagamento`
- `trigger_update_saldo_on_pedido`
- `update_cost_center_budget_totals`
- `update_estoque_saldo`
- `update_licitacao_best_bid`
- `upsert_cron_heartbeat`
- `user_belongs_to_tenant`
- `verify_xbz_cron_key`
- `xbz_cron_key_get`
- `xbz_sync_watchdog`

## Edge functions públicas (sem JWT — qualquer um chama)

- `migrate-helper`

## Rotas protegidas no front

| Rota | Guard | Roles | Arquivo |
|---|---|---|---|
| /admin | ProtectedRoute | admin | `scripts/ci/inventario-types/rotas.unit.mjs` |
| /admin/dependency-health | ProtectedRoute | admin | `src/routes/AppRoutes.tsx` |
| /admin/docs | ProtectedRoute | admin | `src/routes/AppRoutes.tsx` |
| /admin/erp | ProtectedRoute | admin | `src/routes/AppRoutes.tsx` |
| /admin/fiscal | ProtectedRoute | admin | `src/routes/AppRoutes.tsx` |
| /admin/health | ProtectedRoute | admin | `src/routes/AppRoutes.tsx` |
| /admin/health/alerts/:id | ProtectedRoute | admin | `src/routes/AppRoutes.tsx` |
| /admin/punchout | ProtectedRoute | admin | `src/routes/AppRoutes.tsx` |
| /admin/sourcing-pipeline | ProtectedRoute | admin | `src/routes/AppRoutes.tsx` |
| /admin/sso | ProtectedRoute | admin | `src/routes/AppRoutes.tsx` |
| /admin/storage-migration | ProtectedRoute | admin | `src/routes/AppRoutes.tsx` |
| /admin/telemetria | ProtectedRoute | admin | `src/routes/AppRoutes.tsx` |
| /admin/workflows | ProtectedRoute | admin | `src/routes/AppRoutes.tsx` |
| /app | ProtectedRoute |  | `scripts/ai-context/gerar.unit.mjs` |
| /dentro2 | ProtectedRoute | c | `scripts/ci/inventario-types/rotas.unit.mjs` |
| /portal-fornecedor | ProtectedRoute | supplier, admin | `src/routes/AppRoutes.tsx` |

Guards usados: Protected, ProtectedRoute

Middleware matcher (Next.js): nenhum

## Grants / Revokes (agrupados por role e privilégio)

| Ação | Para/De | Privilégios | Objetos |
|---|---|---|---|
| grant | anon, authenticated | execute | `has_role`, `has_permission`, `get_user_role`, `is_ip_blocked`, `log_login_attempt` |
| grant | authenticated | execute | `generate_sequential_number`, `find_approval_rule`, `get_effective_approver`, `is_account_locked`, `record_failed_login`, `clear_login_lockout`, `check_budget_availability`, `log_login_attempt`, `has_role`, `has_permission`, `get_user_role`, `update_estoque_saldo`, `get_pagamentos_kpis`, `get_fornecedores_kpis`, `get_compras_dashboard_metrics` … +48 |
| grant | authenticated | insert | `telemetry_logs` |
| grant | authenticated | select | `system_alerts`, `webhook_events`, `wal_rate_snapshots`, `checkpoint_snapshots`, `deadlock_snapshots`, `v_system_health_overview`, `health_scan_runs`, `security_definer_baseline`, `mv_dashboard_kpis`, `audit_logs_legacy_20260712`, `table_size_snapshots`, `xbz_pedidos`, `xbz_pedido_status_history`, `xbz_produtos`, `xbz_produto_fiscal` … +8 |
| grant | authenticated | select, insert | `audit_logs`, `audit_logs`, `telemetry_logs`, `audit_logs` |
| grant | authenticated | select, insert, update | `integration_outbox` |
| grant | authenticated | select, insert, update, delete | `produto_fornecedores`, `repurchase_suggestions`, `produto_fornecedores`, `repurchase_suggestions`, `erp_connections`, `punchout_catalogs`, `aliquotas_tributarias`, `alert_subscriptions`, `secret_rotation_schedule`, `xbz_credentials` |
| grant | authenticated, service_role | execute | `check_rate_limit`, `get_user_grupo_id`, `get_user_role`, `has_permission`, `has_role`, `is_ip_blocked`, `tenant_in_my_group`, `tenants_in_my_group`, `check_rate_limit`, `get_user_grupo_id`, `get_user_role`, `has_permission`, `has_role`, `is_ip_blocked`, `tenant_in_my_group` … +10 |
| grant | authenticated, service_role | select | `cron_job_staleness` |
| grant | postgres | select | `mv_dashboard_kpis` |
| grant | service_role | all | `telemetry_logs`, `system_alerts`, `audit_logs`, `produto_fornecedores`, `repurchase_suggestions`, `audit_logs`, `produto_fornecedores`, `repurchase_suggestions`, `erp_connections`, `punchout_catalogs`, `aliquotas_tributarias`, `webhook_events`, `integration_outbox`, `wal_rate_snapshots`, `checkpoint_snapshots` … +25 |
| grant | service_role | execute | `update_estoque_saldo`, `exec_sql`, `exec_sql`, `log_security_event`, `log_audit_event`, `count_legacy_storage_urls`, `cleanup_expired_challenges`, `cleanup_old_telemetry`, `grant_tenant_access_on_insert`, `grant_tenant_access_on_insert`, `cleanup_old_security_logs`, `cleanup_old_audit_logs`, `_invoke_edge_function`, `cleanup_old_webhook_events`, `cleanup_old_integration_outbox` … +85 |
| grant | service_role | select | `v_system_health_overview` |
| grant | service_role | usage, select | `wal_rate_snapshots_id_seq`, `checkpoint_snapshots_id_seq` |
| grant | service_role, authenticated | execute | `check_rate_limit` |
| revoke | PUBLIC | all | `update_estoque_saldo`, `exec_sql`, `count_legacy_storage_urls`, `alerts_severity_timeseries`, `alerts_mttr_by_type`, `alerts_noisy_scanners`, `resolve_alert`, `ensure_audit_logs_partition`, `archive_audit_logs_older_than`, `archive_telemetry_logs_older_than`, `simulate_scan_sla_loop`, `scan_table_growth`, `scan_unused_indexes`, `scan_duplicate_indexes`, `scan_txid_wraparound` … +2 |
| revoke | PUBLIC | execute | `check_rate_limit`, `check_rate_limit`, `get_user_grupo_id`, `get_user_role`, `grant_tenant_access_on_insert`, `has_permission`, `has_role`, `is_ip_blocked`, `tenant_in_my_group`, `tenants_in_my_group`, `cleanup_old_security_logs`, `cleanup_old_audit_logs`, `_invoke_edge_function`, `cleanup_old_webhook_events`, `cleanup_old_integration_outbox` … +29 |
| revoke | PUBLIC, anon | all | `cron_job_staleness` |
| revoke | PUBLIC, anon | execute | `generate_sequential_number`, `normalize_email_lowercase`, `is_valid_cnpj`, `normalize_cnpj_digits`, `get_cron_job_staleness`, `get_dashboard_kpis`, `get_compras_dashboard_metrics`, `get_compras_dashboard_metrics`, `user_belongs_to_tenant` |
| revoke | PUBLIC, anon, authenticated | all | `exec_sql`, `scan_stale_statistics`, `scan_cache_hit_ratio`, `xbz_cron_key_get`, `verify_xbz_cron_key`, `_invoke_xbz_sync`, `xbz_sync_watchdog`, `exec_sql`, `xbz_cron_key_get`, `verify_xbz_cron_key`, `_invoke_edge_function`, `_invoke_xbz_sync`, `_invoke_spot_sync` |
| revoke | PUBLIC, anon, authenticated | execute | `apply_penalty_escalation`, `calc_checklist_overall_score`, `check_telemetry_alerts`, `cleanup_old_telemetry`, `mask_sensitive_data`, `cleanup_expired_challenges`, `cleanup_old_query_telemetry`, `audit_user_roles_changes`, `scan_dangerous_statements`, `pg_activity_watchdog`, `scan_unused_indexes`, `scan_table_bloat`, `scan_sequence_exhaustion`, `scan_fk_without_cascade`, `scan_duplicate_indexes` … +22 |
| revoke | anon | all | `exec_sql`, `audit_logs`, `produto_fornecedores`, `repurchase_suggestions`, `supplier_compliance_summary`, `v_system_health_overview` |
| revoke | anon | execute | `log_security_event`, `log_audit_event`, `check_rate_limit`, `get_user_grupo_id`, `get_user_role`, `grant_tenant_access_on_insert`, `has_permission`, `has_role`, `is_ip_blocked`, `tenant_in_my_group`, `tenants_in_my_group` |
| revoke | anon | insert | `audit_logs` |
| revoke | anon | select | `supplier_compliance_summary`, `v_system_health_overview`, `mv_dashboard_kpis` |
| revoke | anon, authenticated | all | `telemetry_logs_legacy_20260712`, `mv_dashboard_kpis` |
| revoke | authenticated | all | `exec_sql` |
| revoke | authenticated | update, delete | `audit_logs` |
| revoke | authenticated, anon | execute | `log_security_event`, `log_audit_event` |
| revoke | authenticated, anon | select | `mv_dashboard_kpis` |
| revoke | public | all | `audit_logs`, `produto_fornecedores`, `repurchase_suggestions` |
| revoke | public | execute | `get_pagamentos_kpis`, `get_fornecedores_kpis`, `get_compras_dashboard_metrics`, `get_pedidos_kpis`, `get_solicitacoes_kpis`, `log_security_event`, `log_audit_event` |
| revoke | public | insert | `audit_logs` |
| revoke | public, anon | execute | `get_pagamentos_kpis`, `get_fornecedores_kpis`, `get_compras_dashboard_metrics`, `get_pedidos_kpis`, `get_solicitacoes_kpis`, `update_estoque_saldo` |
| revoke | public, anon, authenticated | all | `fill_tenant_id_from_profile` |
| revoke | public, anon, authenticated | execute | `scan_rollback_rate`, `scan_connection_saturation`, `scan_cache_hit_ratio`, `scan_long_running_queries`, `scan_unindexed_fks` |

## Riscos de acesso detectados

| Tabela | Problema | Arquivos |
|---|---|---|
| `blocked_countries` | acessada do front (1 arquivo(s)) e nenhuma migration do repo liga RLS nela — NÃO VERIFICADO, confirme no banco real | `src/components/security/BlockedCountriesPanel.tsx` |
| `geo_access_logs` | acessada do front (1 arquivo(s)) e nenhuma migration do repo liga RLS nela — NÃO VERIFICADO, confirme no banco real | `src/components/security/GeoAccessLogsPanel.tsx` |
| `qualification_history` | acessada do front (1 arquivo(s)) e nenhuma migration do repo liga RLS nela — NÃO VERIFICADO, confirme no banco real | `src/components/compras/QualificationHistoryTimeline.tsx` |
| `qualification_requirements` | acessada do front (1 arquivo(s)) e nenhuma migration do repo liga RLS nela — NÃO VERIFICADO, confirme no banco real | `src/hooks/useSupplierQualification.ts` |
| `supplier_documents` | acessada do front (1 arquivo(s)) e nenhuma migration do repo liga RLS nela — NÃO VERIFICADO, confirme no banco real | `src/hooks/useSupplierQualification.ts` |
| `supplier_qualification_scores` | acessada do front (3 arquivo(s)) e nenhuma migration do repo liga RLS nela — NÃO VERIFICADO, confirme no banco real | `src/components/compras/scorecard/supplierScorecardData.ts`<br>`src/hooks/useSupplierQualification.ts`<br>`src/pages/portal-fornecedor/portalFornecedorData.ts` |
| `user_tenants` | front faz UPDATE mas nenhuma política RLS permite UPDATE → vai falhar/retornar vazio para usuários | `src/features/auth/hooks/useAuth.tsx` |

## Multi-tenancy

- Chave de tenant: **`tenant_id`** presente em 98 tabela(s): `solicitacoes`, `cotacoes`, `fornecedores`, `profiles`, `contracts`, `contract_items`, `contract_documents`, `contract_history`, `order_contracts`, `notifications`, `categorias`, `produtos`, `pedidos`, `pedido_itens`, `pagamentos`, `active_sessions`, `contact_notes`, `approval_rules`, `approval_delegations`, `approval_workflows`, `approval_steps`, `approval_history`, `department_budgets`, `fiscal_documents`, `repurchase_suggestions`, `contract_penalties`, `receiving_checklists`, `penalty_escalation_config`, `supplier_bonifications`, `devolucoes`, `devolucao_itens`, `creditos_fornecedor`, `payment_history`, `licitacoes`, `licitacao_propostas`, `licitacao_lances`, `category_strategies`, `sourcing_pipeline`, `spend_forecasts`, `sourcing_events`, `sourcing_event_lots`, `sourcing_event_questions`, `sourcing_event_criteria`, `sourcing_invitations`, `sourcing_responses`, `sourcing_response_items`, `sourcing_response_answers`, `auction_bids`, `sourcing_awards`, `cost_centers`, `budget_transactions`, `approval_hierarchy`, `user_tenants`, `unspsc_codes`, `sso_configurations`, `scim_provisioning_log`, `punchout_catalogs`, `punchout_sessions`, `erp_connections`, `erp_sync_log`, `fiscal_events`, `sourcing_projects`, `savings_tracker`, `workflow_templates`, `workflow_nodes`, `workflow_edges`, `workflow_instances`, `workflow_approvals`, `workflow_logs`, `workflow_sod_rules`, `workflow_tasks`, `workflow_audit_log`, `fornecedor_categorias`, `produto_fornecedores`, `system_alerts`, `integration_outbox`, `telemetry_logs_legacy_20260712`, `telemetry_logs`, `audit_logs_legacy_20260712`, `audit_logs`, `xbz_credentials`, `xbz_pedidos`, `xbz_pedido_status_history`, `xbz_produtos`, `xbz_produto_fiscal`, `xbz_carrinho_log`, `audit_logs_202605`, `audit_logs_202606`, `audit_logs_202607`, `audit_logs_202608`, `audit_logs_202609`, `supplier_documents`, `supplier_qualification_scores`, `telemetry_logs_202605`, `telemetry_logs_202606`, `telemetry_logs_202607`, `telemetry_logs_202608`, `telemetry_logs_202609`
- Cobertura: 61% das tabelas. Tabelas SEM a chave (verificar isolamento): `saved_filters`, `entity_versions`, `historico_compras`, `dashboard_filter_favorites`, `push_subscriptions`, `notification_preferences`, `permissions`, `blocked_ips`, `ip_whitelist`, `webauthn_credentials`, `webauthn_challenges`, `allowed_countries`, `password_reset_requests`, `account_lockouts`, `user_tour_preferences`, `spot_sessions`, `spot_pedidos`, `negotiation_analyses`, `query_telemetry`, `dependency_health`, `dependency_health_history`, `user_filter_preferences`, `dashboard_layouts`, `erp_field_mappings`, `currencies`, `exchange_rates`, `estoque`, `estoque_movimentacoes`, `aliquotas_tributarias`, `webhook_events`, `wal_rate_snapshots`, `checkpoint_snapshots`, `temp_file_snapshots`, `deadlock_snapshots`, `health_scan_runs`, `alert_subscriptions`, `security_definer_baseline`, `secret_rotation_schedule`, `table_size_snapshots`, `cron_heartbeats`, `xbz_cores`, `spot_produtos`, `spot_skus`, `spot_customization_options`, `spot_estoque`, `blocked_countries`, `qualification_history`, `qualification_requirements`

## Soft delete (registros 'apagados' continuam na tabela — filtre!)

| Tabela | Coluna |
|---|---|
| `categorias` | `ativo` |
| `produtos` | `ativo` |
| `allowed_countries` | `is_active` |
| `approval_rules` | `ativo` |
| `approval_delegations` | `ativo` |
| `penalty_escalation_config` | `is_active` |
| `supplier_bonifications` | `is_active` |
| `cost_centers` | `is_active` |
| `sso_configurations` | `is_active` |
| `punchout_catalogs` | `is_active` |
| `erp_connections` | `is_active` |
| `workflow_templates` | `is_active` |
| `currencies` | `is_active` |
| `workflow_sod_rules` | `is_active` |
| `xbz_credentials` | `is_active` |
| `xbz_credentials` | `deleted_at` |
| `blocked_countries` | `is_active` |
| `qualification_requirements` | `is_active` |

## Auditoria (colunas de rastreio)

| Tabela | Colunas |
|---|---|
| `saved_filters` | `created_at`, `updated_at` |
| `solicitacoes` | `created_at`, `updated_at` |
| `cotacoes` | `created_at`, `updated_at` |
| `fornecedores` | `created_at`, `created_by`, `updated_at` |
| `historico_compras` | `created_at` |
| `user_roles` | `created_at` |
| `profiles` | `created_at`, `updated_at` |
| `dashboard_filter_favorites` | `created_at`, `updated_at` |
| `contracts` | `created_at`, `created_by`, `updated_at` |
| `contract_items` | `created_at` |
| `contract_documents` | `created_at` |
| `contract_history` | `created_at` |
| `order_contracts` | `created_at` |
| `push_subscriptions` | `created_at`, `updated_at` |
| `notification_preferences` | `created_at`, `updated_at` |
| `notifications` | `created_at` |
| `categorias` | `created_at`, `updated_at` |
| `produtos` | `created_at`, `created_by`, `updated_at` |
| `pedidos` | `created_at`, `updated_at` |
| `pedido_itens` | `created_at` |
| `pagamentos` | `created_at`, `created_by`, `updated_at` |
| `permissions` | `created_at` |
| `role_permissions` | `created_at`, `created_by` |
| `mfa_settings` | `created_at`, `updated_at` |
| `login_attempts` | `created_at` |
| `ip_whitelist` | `created_at`, `created_by` |
| `rate_limit_logs` | `created_at` |
| `active_sessions` | `created_at` |
| `security_logs` | `created_at` |
| `webauthn_credentials` | `created_at`, `updated_at` |
| `webauthn_challenges` | `created_at` |
| `geo_settings` | `updated_at`, `updated_by` |
| `account_lockouts` | `created_at`, `updated_at` |
| `user_tour_preferences` | `created_at`, `updated_at` |
| `contact_notes` | `created_at`, `updated_at` |
| `approval_rules` | `created_at`, `created_by`, `updated_at` |
| `approval_delegations` | `created_at`, `updated_at` |
| `approval_workflows` | `created_at`, `updated_at` |
| `approval_steps` | `created_at` |
| `approval_history` | `created_at` |
| `spot_sessions` | `created_at` |
| `spot_pedidos` | `created_at`, `updated_at` |
| `department_budgets` | `created_at`, `created_by`, `updated_at` |
| `fiscal_documents` | `created_at`, `updated_at` |
| `repurchase_suggestions` | `created_at`, `updated_at` |
| `negotiation_analyses` | `created_at`, `created_by` |
| `contract_penalties` | `created_at`, `updated_at` |
| `receiving_checklists` | `created_at`, `updated_at` |
| `penalty_escalation_config` | `created_at`, `updated_at` |
| `supplier_bonifications` | `created_at`, `updated_at` |
| `devolucoes` | `created_at`, `updated_at` |
| `devolucao_itens` | `created_at` |
| `creditos_fornecedor` | `created_at`, `created_by`, `updated_at` |
| `payment_history` | `created_at` |
| `query_telemetry` | `created_at` |
| `licitacoes` | `created_at`, `created_by`, `updated_at` |
| `licitacao_propostas` | `created_at`, `updated_at` |
| `dependency_health` | `updated_at`, `updated_by` |
| `dependency_health_history` | `created_at`, `created_by` |
| `user_filter_preferences` | `created_at`, `updated_at` |
| `organizations` | `created_at`, `updated_at` |
| `user_organizations` | `created_at` |
| `licitacao_lances` | `created_at` |
| `category_strategies` | `created_at`, `updated_at` |
| `sourcing_pipeline` | `created_at`, `updated_at` |
| `spend_forecasts` | `created_at` |
| `sourcing_events` | `created_at`, `updated_at` |
| `sourcing_event_lots` | `created_at` |
| `sourcing_event_questions` | `created_at` |
| `sourcing_event_criteria` | `created_at` |
| `sourcing_responses` | `created_at`, `updated_at` |
| `sourcing_awards` | `created_at` |
| `cost_centers` | `created_at`, `updated_at` |
| `budget_audit_logs` | `created_at` |
| `financial_audit_logs` | `created_at` |
| `budget_transactions` | `created_at`, `created_by` |
| `approval_hierarchy` | `created_at` |
| `dashboard_layouts` | `created_at`, `updated_at` |
| `tenants` | `created_at`, `updated_at` |
| `unspsc_codes` | `created_at` |
| `sso_configurations` | `created_at`, `updated_at` |
| `scim_provisioning_log` | `created_at` |
| `punchout_catalogs` | `created_at`, `updated_at` |
| `punchout_sessions` | `created_at` |
| `erp_connections` | `created_at`, `updated_at` |
| `erp_sync_log` | `created_at` |
| `fiscal_events` | `created_at`, `updated_at` |
| `sourcing_projects` | `created_at`, `updated_at` |
| `savings_tracker` | `created_at`, `updated_at` |
| `workflow_templates` | `created_at`, `updated_at` |
| `workflow_nodes` | `created_at` |
| `workflow_edges` | `created_at` |
| `workflow_instances` | `updated_at` |
| `workflow_approvals` | `created_at` |
| `workflow_logs` | `created_at` |
| `currencies` | `created_at` |
| `exchange_rates` | `created_at` |
| `workflow_sod_rules` | `created_at` |
| `workflow_tasks` | `created_at` |
| `workflow_audit_log` | `created_at` |
| `estoque` | `created_at`, `updated_at` |
| `estoque_movimentacoes` | `created_at` |
| `fornecedor_categorias` | `created_at` |
| `produto_fornecedores` | `created_at`, `updated_at` |
| `system_alerts` | `created_at` |
| `aliquotas_tributarias` | `created_at`, `updated_at` |
| `webhook_events` | `created_at`, `updated_at` |
| `integration_outbox` | `created_at`, `created_by`, `updated_at` |
| `alert_subscriptions` | `created_at`, `updated_at` |
| `security_definer_baseline` | `created_at` |
| `secret_rotation_schedule` | `created_at`, `updated_at` |
| `telemetry_logs_legacy_20260712` | `created_at` |
| `telemetry_logs` | `created_at` |
| `audit_logs_legacy_20260712` | `created_at` |
| `audit_logs` | `created_at` |
| `cron_heartbeats` | `updated_at` |
| `xbz_credentials` | `created_at`, `created_by`, `updated_at` |
| `xbz_pedidos` | `created_at`, `updated_at` |
| `xbz_pedido_status_history` | `created_at` |
| `xbz_produtos` | `created_at`, `updated_at` |
| `xbz_produto_fiscal` | `created_at`, `updated_at` |
| `xbz_cores` | `created_at`, `updated_at` |
| `xbz_carrinho_log` | `created_at` |
| `spot_produtos` | `created_at`, `updated_at` |
| `spot_skus` | `created_at`, `updated_at` |
| `spot_customization_options` | `created_at`, `updated_at` |
| `spot_estoque` | `created_at`, `updated_at` |
| `spot_api_sync_log` | `created_at` |
| `audit_logs_202605` | `created_at` |
| `audit_logs_202606` | `created_at` |
| `audit_logs_202607` | `created_at` |
| `audit_logs_202608` | `created_at` |
| `audit_logs_202609` | `created_at` |
| `geo_access_logs` | `created_at` |
| `qualification_history` | `created_at` |
| `qualification_requirements` | `created_at`, `updated_at` |
| `supplier_documents` | `created_at`, `updated_at` |
| `supplier_qualification_scores` | `created_at`, `updated_at` |
| `telemetry_logs_202605` | `created_at` |
| `telemetry_logs_202606` | `created_at` |
| `telemetry_logs_202607` | `created_at` |
| `telemetry_logs_202608` | `created_at` |
| `telemetry_logs_202609` | `created_at` |

## Dados pessoais / sensíveis (LGPD — cuidado em logs, exports, prompts de IA)

| Tabela | Coluna |
|---|---|
| `fornecedores` | `cnpj` |
| `fornecedores` | `email` |
| `fornecedores` | `telefone` |
| `fornecedores` | `endereco` |
| `fornecedores` | `cep` |
| `profiles` | `email` |
| `profiles` | `phone` |
| `login_attempts` | `email` |
| `login_attempts` | `ip_address` |
| `blocked_ips` | `ip_address` |
| `ip_whitelist` | `ip_address` |
| `rate_limit_logs` | `ip_address` |
| `active_sessions` | `ip_address` |
| `security_logs` | `ip_address` |
| `webauthn_challenges` | `email` |
| `password_reset_requests` | `email` |
| `password_reset_requests` | `ip_address` |
| `account_lockouts` | `email` |
| `financial_audit_logs` | `ip_address` |
| `tenants` | `cnpj` |
| `alert_subscriptions` | `email` |
| `audit_logs_legacy_20260712` | `ip_address` |
| `audit_logs` | `ip_address` |
| `xbz_credentials` | `cnpj` |
| `audit_logs_202605` | `ip_address` |
| `audit_logs_202606` | `ip_address` |
| `audit_logs_202607` | `ip_address` |
| `audit_logs_202608` | `ip_address` |
| `audit_logs_202609` | `ip_address` |
| `geo_access_logs` | `ip_address` |

## Colunas de dinheiro (tipo importa: numeric ✅ / float ❌)

| Tabela | Coluna | Tipo |
|---|---|---|
| `solicitacoes` | `valor_estimado` | `NUMERIC(12,2)` |
| `solicitacoes` | `valor_aprovado` | `NUMERIC(12,2)` |
| `cotacoes` | `valor_unitario` | `NUMERIC(12,2)` |
| `cotacoes` | `valor_total` | `NUMERIC(12,2)` |
| `cotacoes` | `valor_frete` | `NUMERIC(12,2)` |
| `cotacoes` | `desconto_percentual` | `NUMERIC(5,2)` |
| `cotacoes` | `taxa_conversao` | `NUMERIC` |
| `fornecedores` | `saldo_comprometido` | `numeric` |
| `contracts` | `total_value` | `DECIMAL(15,2)` |
| `contract_items` | `total_price` | `DECIMAL(15,2)` |
| `notification_preferences` | `price_alerts` | `BOOLEAN` |
| `produtos` | `preco_medio` | `NUMERIC(12,2)` |
| `produtos` | `preco_referencia` | `numeric` |
| `pedidos` | `valor_total` | `NUMERIC(12,2)` |
| `pedidos` | `valor_frete` | `NUMERIC(12,2)` |
| `pedidos` | `desconto` | `NUMERIC(12,2)` |
| `pedidos` | `taxa_conversao` | `NUMERIC` |
| `pedido_itens` | `valor_unitario` | `NUMERIC(12,2)` |
| `pedido_itens` | `valor_total` | `NUMERIC(12,2)` |
| `pagamentos` | `valor` | `NUMERIC(12,2)` |
| `pagamentos` | `valor_pago` | `NUMERIC(12,2)` |
| `approval_rules` | `valor_min` | `NUMERIC` |
| `approval_rules` | `valor_max` | `NUMERIC` |
| `approval_delegations` | `valor_maximo` | `NUMERIC` |
| `approval_workflows` | `total_etapas` | `INTEGER` |
| `approval_workflows` | `valor` | `NUMERIC` |
| `spot_pedidos` | `valor_total` | `numeric` |
| `department_budgets` | `valor_total` | `NUMERIC` |
| `department_budgets` | `valor_comprometido` | `NUMERIC` |
| `department_budgets` | `valor_utilizado` | `NUMERIC` |
| `fiscal_documents` | `valor_total` | `NUMERIC` |
| `fiscal_documents` | `valor_produtos` | `NUMERIC` |
| `fiscal_documents` | `valor_frete` | `NUMERIC` |
| `fiscal_documents` | `valor_desconto` | `NUMERIC` |
| `fiscal_documents` | `valor_impostos` | `NUMERIC` |
| `repurchase_suggestions` | `preco_estimado` | `NUMERIC` |
| `supplier_bonifications` | `total_deliveries` | `INTEGER` |
| `devolucoes` | `valor_total` | `NUMERIC` |
| `devolucao_itens` | `valor_unitario` | `NUMERIC` |
| `devolucao_itens` | `valor_total` | `NUMERIC` |
| `creditos_fornecedor` | `valor` | `NUMERIC` |
| `creditos_fornecedor` | `valor_utilizado` | `NUMERIC` |
| `creditos_fornecedor` | `saldo` | `NUMERIC` |
| `payment_history` | `valor_parcela` | `numeric` |
| `licitacoes` | `valor_estimado` | `NUMERIC` |
| `licitacoes` | `valor_vencedor` | `NUMERIC` |
| `licitacao_propostas` | `valor_proposta` | `NUMERIC` |
| `licitacao_propostas` | `desconto_percentual` | `NUMERIC` |
| `licitacao_lances` | `valor_lance` | `NUMERIC(15,2)` |
| `sourcing_event_lots` | `preco_referencia` | `numeric(15,2)` |
| `sourcing_responses` | `total_preco` | `numeric(15,2)` |
| `sourcing_responses` | `total_score` | `numeric(6,2)` |
| `sourcing_response_items` | `preco_unitario` | `numeric(15,2)` |
| `sourcing_response_items` | `preco_total` | `numeric(15,2)` |
| `auction_bids` | `amount` | `numeric(15,2)` |
| `sourcing_awards` | `valor_adjudicado` | `numeric(15,2)` |
| `cost_centers` | `total_budget` | `DECIMAL(15` |
| `budget_transactions` | `amount` | `DECIMAL(15,2)` |
| `produto_fornecedores` | `preco_custo` | `NUMERIC(15,` |
| `health_scan_runs` | `total_scanners` | `int` |
| `table_size_snapshots` | `total_bytes` | `BIGINT` |
| `xbz_pedidos` | `valor_produtos` | `NUMERIC(14,2)` |
| `xbz_pedidos` | `valor_impostos_taxas` | `NUMERIC(14,2)` |
| `xbz_pedidos` | `valor_total` | `NUMERIC(14,2)` |
| `xbz_pedido_status_history` | `valor_anterior` | `TEXT` |
| `xbz_pedido_status_history` | `valor_novo` | `TEXT` |
| `xbz_produtos` | `preco` | `NUMERIC(14,4)` |
| `xbz_produtos` | `preco_ipi` | `NUMERIC(14,4)` |
| `xbz_produto_fiscal` | `preco_venda` | `NUMERIC(14,4)` |
| `xbz_produto_fiscal` | `preco_base_calculo` | `NUMERIC(14,4)` |
| `xbz_produto_fiscal` | `valor_ipi` | `NUMERIC(14,4)` |
| `xbz_produto_fiscal` | `valor_st` | `NUMERIC(14,4)` |
| `xbz_produto_fiscal` | `valor_mva` | `NUMERIC(8,4)` |
| `spot_skus` | `price_tiers` | `JSONB` |
| `spot_customization_options` | `prices` | `JSONB` |

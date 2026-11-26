# 07 · REGRAS DE NEGÓCIO

> Gerado automaticamente por AI Context Sync v1.4.0 · commit `e18b65d5b5` · branch `main` · 2026-11-26 03:30 UTC
> Não edite à mão — regras humanas vão em `manual/`.

## A. Regras escritas por humanos (`manual/` — prioridade máxima, nunca sobrescrito)

_Nenhum arquivo em `manual/`. Copie `manual/TEMPLATE-regras-de-negocio.md` para `manual/regras.md` e preencha._

## B. Quem pode ver/alterar o quê (RLS — conforme migrations do repo; schema real: `context.json` → `schema` (derivado das migrations; snapshot do banco real ainda não gerado — NÃO VERIFICADO))

> ⚠️ **NÃO VERIFICADO:** 20 comando(s) em 5 migration(s) criam, removem ou reescrevem políticas com SQL que só existe em runtime (lê `pg_policies` ou depende de condição do banco). A lista abaixo pode trazer política já removida ou com a expressão antiga; tabelas citadas: `approval_rules`, `audit_logs`, `notifications`, `penalty_escalation_config`, `rate_limit_logs`, `receiving_checklists`, `security_logs`, `supplier_bonifications`, `supplier_qualification_scores`. Ex.: `EXECUTE format('DROP POLICY IF EXISTS %I ON public.audit_logs', pol.policyname);`. Arquivos: `supabase/migrations/20260317222336_b11455d7-3bed-421d-9f68-835d7ef26d66.sql`<br>`supabase/migrations/20260317225700_89f28570-4d8b-455a-8d44-8c36c454efd3.sql`<br>`supabase/migrations/20260317230002_e7619b9a-5a26-4d44-9023-1d986f965464.sql`<br>`supabase/migrations/20260619205841_08fc0043-6b1e-4ed9-9c1a-89440df3c816.sql`<br>`supabase/migrations/20260719000001_rls_using_true_cleanup.sql`. Confirme no banco real antes de assumir.

| Tabela | Política | Comando | Roles | Modo | USING | WITH CHECK |
|---|---|---|---|---|---|---|
| `saved_filters` | Users can view own filters | SELECT | public | permissive | `auth.uid() = user_id` |  |
| `saved_filters` | Users can insert own filters | INSERT | public | permissive |  | `auth.uid() = user_id` |
| `saved_filters` | Users can update own filters | UPDATE | public | permissive | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `saved_filters` | Users can delete own filters | DELETE | public | permissive | `auth.uid() = user_id` |  |
| `user_roles` | Users can view their own roles | SELECT | authenticated | permissive | `auth.uid() = user_id` |  |
| `user_roles` | Admins can manage all roles | ALL | authenticated | permissive | `public.has_role(auth.uid(), 'admin')` |  |
| `profiles` | Users can update their own profile | UPDATE | authenticated | permissive | `auth.uid() = user_id` |  |
| `profiles` | Users can insert their own profile | INSERT | authenticated | permissive |  | `auth.uid() = user_id` |
| `profiles` | Admins can view all profiles | SELECT | authenticated | permissive | `public.has_role(auth.uid(), 'admin')` |  |
| `profiles` | Admins can manage all profiles | ALL | authenticated | permissive | `public.has_role(auth.uid(), 'admin')` |  |
| `dashboard_filter_favorites` | Users can view their own filter favorites | SELECT | public | permissive | `auth.uid() = user_id` |  |
| `dashboard_filter_favorites` | Users can create their own filter favorites | INSERT | public | permissive |  | `auth.uid() = user_id` |
| `dashboard_filter_favorites` | Users can update their own filter favorites | UPDATE | public | permissive | `auth.uid() = user_id` |  |
| `dashboard_filter_favorites` | Users can delete their own filter favorites | DELETE | public | permissive | `auth.uid() = user_id` |  |
| `contracts` | Admins can delete contracts | DELETE | public | permissive | `has_role(auth.uid(), 'admin'::app_role)` |  |
| `push_subscriptions` | Users can manage their own subscriptions | ALL | public | permissive | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `notification_preferences` | Users can manage their own preferences | ALL | public | permissive | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `notifications` | Users can view their own notifications | SELECT | public | permissive | `auth.uid() = user_id` |  |
| `notifications` | Users can update their own notifications | UPDATE | public | permissive | `auth.uid() = user_id` |  |
| `categorias` | Admins can manage categories | ALL | public | permissive | `has_role(auth.uid(), 'admin'::app_role)` |  |
| `solicitacoes` | Users can view their own requests | SELECT | public | permissive | `auth.uid() = solicitante_id OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)` |  |
| `solicitacoes` | Users can create requests | INSERT | public | permissive |  | `auth.uid() = solicitante_id` |
| `solicitacoes` | Only admins can delete requests | DELETE | public | permissive | `has_role(auth.uid(), 'admin'::app_role)` |  |
| `permissions` | Admins can manage permissions | ALL | public | permissive | `has_role(auth.uid(), 'admin')` |  |
| `role_permissions` | Admins can manage role permissions | ALL | public | permissive | `has_role(auth.uid(), 'admin')` |  |
| `mfa_settings` | Users can manage their own MFA settings | ALL | public | permissive | `auth.uid() = user_id` |  |
| `blocked_ips` | Admins can manage blocked IPs | ALL | public | permissive | `has_role(auth.uid(), 'admin')` |  |
| `ip_whitelist` | Admins can manage IP whitelist | ALL | public | permissive | `has_role(auth.uid(), 'admin')` |  |
| `rate_limit_logs` | Admins can view rate limit logs | SELECT | public | permissive | `has_role(auth.uid(), 'admin')` |  |
| `active_sessions` | Users can view their own sessions | SELECT | public | permissive | `auth.uid() = user_id` |  |
| `active_sessions` | Users can delete their own sessions | DELETE | public | permissive | `auth.uid() = user_id` |  |
| `active_sessions` | Admins can view all sessions | SELECT | public | permissive | `has_role(auth.uid(), 'admin')` |  |
| `active_sessions` | Admins can delete any session | DELETE | public | permissive | `has_role(auth.uid(), 'admin')` |  |
| `security_logs` | Admins can view security logs | SELECT | public | permissive | `has_role(auth.uid(), 'admin')` |  |
| `webauthn_credentials` | Users can view their own credentials | SELECT | public | permissive | `auth.uid() = user_id` |  |
| `webauthn_credentials` | Users can create their own credentials | INSERT | public | permissive |  | `auth.uid() = user_id` |
| `webauthn_credentials` | Users can update their own credentials | UPDATE | public | permissive | `auth.uid() = user_id` |  |
| `webauthn_credentials` | Users can delete their own credentials | DELETE | public | permissive | `auth.uid() = user_id` |  |
| `allowed_countries` | Admins can manage allowed countries | ALL | public | permissive | `has_role(auth.uid(), 'admin'::app_role)` |  |
| `geo_settings` | Admins can manage geo settings | ALL | public | permissive | `has_role(auth.uid(), 'admin'::app_role)` |  |
| `geo_settings` | Authenticated users can view geo settings | SELECT | public | permissive | `auth.uid() IS NOT NULL` |  |
| `password_reset_requests` | Users can view their own reset requests | SELECT | public | permissive | `auth.uid() = user_id` |  |
| `password_reset_requests` | Users can create their own reset requests | INSERT | public | permissive |  | `auth.uid() = user_id` |
| `password_reset_requests` | Admins can view all reset requests | SELECT | public | permissive | `has_role(auth.uid(), 'admin'::app_role)` |  |
| `user_tour_preferences` | Users can view their own tour preferences | SELECT | public | permissive | `auth.uid() = user_id` |  |
| `user_tour_preferences` | Users can insert their own tour preferences | INSERT | public | permissive |  | `auth.uid() = user_id` |
| `user_tour_preferences` | Users can update their own tour preferences | UPDATE | public | permissive | `auth.uid() = user_id` |  |
| `user_tour_preferences` | Users can delete their own tour preferences | DELETE | public | permissive | `auth.uid() = user_id` |  |
| `active_sessions` | Users can create their own sessions | INSERT | public | permissive |  | `auth.uid() = user_id` |
| `active_sessions` | Users can update their own sessions | UPDATE | public | permissive | `auth.uid() = user_id` |  |
| `rate_limit_logs` | Authenticated can insert rate limit logs | INSERT | public | permissive |  | `(auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid())) OR user_id IS NULL` |
| `security_logs` | Authenticated can insert security logs | INSERT | public | permissive |  | `auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid())` |
| `geo_access_logs` | Authenticated can insert geo access logs | INSERT | public | permissive |  | `auth.uid() IS NOT NULL` |
| `webauthn_challenges` | Users can view their own challenges | SELECT | public | permissive | `(auth.uid() IS NOT NULL AND user_id = auth.uid()) OR (auth.email() IS NOT NULL AND email = auth.email())` |  |
| `webauthn_challenges` | Users can create their own challenges | INSERT | public | permissive |  | `(auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid())) OR (auth.email() IS NOT NULL AND (email IS NULL OR email = auth.email()))` |
| `webauthn_challenges` | Users can delete their own challenges | DELETE | public | permissive | `(auth.uid() IS NOT NULL AND user_id = auth.uid()) OR (auth.email() IS NOT NULL AND email = auth.email())` |  |
| `account_lockouts` | Admins can manage lockouts | ALL | public | permissive | `has_role(auth.uid(), 'admin'::app_role)` |  |
| `password_reset_requests` | Admins can update any reset request | UPDATE | public | permissive | `has_role(auth.uid(), 'admin'::app_role)` |  |
| `contact_notes` | Authenticated users can create contact notes | INSERT | public | permissive |  | `auth.uid() IS NOT NULL AND auth.uid() = author_id` |
| `contact_notes` | Users can update their own notes | UPDATE | public | permissive | `auth.uid() = author_id` |  |
| `contact_notes` | Users can delete their own notes or admins | DELETE | public | permissive | `auth.uid() = author_id OR has_role(auth.uid(), 'admin'::app_role)` |  |
| `approval_rules` | Authenticated users can view active approval rules | SELECT | public | permissive | `auth.uid() IS NOT NULL` |  |
| `approval_rules` | Admins can manage approval rules | ALL | public | permissive | `has_role(auth.uid(), 'admin'::app_role)` |  |
| `approval_delegations` | Users can view delegations they are part of | SELECT | public | permissive | `auth.uid() = delegante_id OR auth.uid() = delegado_id OR has_role(auth.uid(), 'admin'::app_role)` |  |
| `approval_delegations` | Users can create delegations from themselves | INSERT | public | permissive |  | `auth.uid() = delegante_id OR has_role(auth.uid(), 'admin'::app_role)` |
| `approval_delegations` | Users can update their own delegations | UPDATE | public | permissive | `auth.uid() = delegante_id OR has_role(auth.uid(), 'admin'::app_role)` |  |
| `approval_delegations` | Users can delete their own delegations | DELETE | public | permissive | `auth.uid() = delegante_id OR has_role(auth.uid(), 'admin'::app_role)` |  |
| `approval_steps` | Approvers can update their steps | UPDATE | public | permissive | `auth.uid() = aprovador_id OR auth.uid() = aprovador_efetivo_id OR has_role(auth.uid(), 'admin'::app_role)` |  |
| `profiles` | Users can view their own profile | SELECT | authenticated | permissive | `auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role)` |  |
| `notifications` | Users can create own notifications | INSERT | authenticated | permissive |  | `auth.uid() = user_id` |
| `blocked_ips` | Admins can view blocked IPs | SELECT | authenticated | permissive | `has_role(auth.uid(), 'admin'::app_role)` |  |
| `ip_whitelist` | Admins can view IP whitelist | SELECT | authenticated | permissive | `has_role(auth.uid(), 'admin'::app_role)` |  |
| `account_lockouts` | Users can check own lockout status | SELECT | authenticated | permissive | `(email = auth.email()) OR has_role(auth.uid(), 'admin'::app_role)` |  |
| `login_attempts` | Authenticated can insert login attempts | INSERT | authenticated | permissive |  | `(auth.uid() IS NOT NULL) AND (auth.email() = email)` |
| `login_attempts` | Admins can view login attempts | SELECT | authenticated | permissive | `has_role(auth.uid(), 'admin'::app_role)` |  |
| `approval_workflows` | Admins and coordinators can create workflows | INSERT | authenticated | permissive |  | `has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)` |
| `approval_workflows` | Admins and coordinators can update workflows | UPDATE | authenticated | permissive | `has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)` |  |
| `approval_steps` | Admins and coordinators can create steps | INSERT | authenticated | permissive |  | `has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)` |
| `contract_documents` | Admin coordinator finance can manage contract documents | ALL | authenticated | permissive | `has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'finance'::app_role)` | `has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'finance'::app_role)` |
| `contract_items` | Admin coordinator finance can manage contract items | ALL | authenticated | permissive | `has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'finance'::app_role)` | `has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'finance'::app_role)` |
| `order_contracts` | Buyers coordinators admins can manage order contracts | ALL | authenticated | permissive | `has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role)` | `has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role)` |
| `pedido_itens` | Buyers coordinators admins can manage order items | ALL | authenticated | permissive | `has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role)` | `has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role)` |
| `contract_history` | Users can create own contract history entries | INSERT | authenticated | permissive |  | `(auth.uid() IS NOT NULL) AND (performed_by IS NULL OR performed_by = auth.uid())` |
| `approval_steps` | Users can view assigned steps or admin | SELECT | authenticated | permissive | `auth.uid() = aprovador_id OR auth.uid() = aprovador_efetivo_id OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)` |  |
| `spot_pedidos` | Buyers coordinators admins can manage spot orders | ALL | authenticated | permissive | `has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role)` | `has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role)` |
| `spot_pedidos` | Allowed roles can view spot orders | SELECT | authenticated | permissive | `has_role(auth.uid(), 'admin'::public.app_role) OR has_role(auth.uid(), 'coordinator'::public.app_role) OR has_role(auth.uid(), 'buyer'::public.app_role)` |  |
| `spot_sessions` | No client access to spot sessions | ALL | authenticated | permissive | `false` | `false` |
| `department_budgets` | Admin and coordinator can manage budgets | ALL | authenticated | permissive | `has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)` | `has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)` |
| `department_budgets` | Finance can manage budgets | ALL | authenticated | permissive | `has_role(auth.uid(), 'finance'::app_role)` | `has_role(auth.uid(), 'finance'::app_role)` |
| `fiscal_documents` | Buyers coordinators admins can manage fiscal documents | ALL | authenticated | permissive | `has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role) OR has_role(auth.uid(), 'finance'::app_role)` | `has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role) OR has_role(auth.uid(), 'finance'::app_role)` |
| `negotiation_analyses` | Buyers coordinators admins can manage negotiation analyses | ALL | authenticated | permissive | `has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role)` | `has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role)` |
| `contract_penalties` | Admin coordinator finance can manage contract penalties | ALL | authenticated | permissive | `has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'finance'::app_role)` | `has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'finance'::app_role)` |
| `receiving_checklists` | Buyers coordinators admins can manage checklists | ALL | authenticated | permissive | `has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role)` | `has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role)` |
| `penalty_escalation_config` | Authenticated users can view escalation config | SELECT | public | permissive | `auth.uid() IS NOT NULL` |  |
| `penalty_escalation_config` | Admins coordinators can manage escalation config | ALL | authenticated | permissive | `has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)` | `has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)` |
| `supplier_bonifications` | Admins coordinators can manage bonifications | ALL | authenticated | permissive | `has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)` | `has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)` |
| `fiscal_documents` | Role-restricted fiscal document access | SELECT | authenticated | permissive | `public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'buyer') OR public.has_role(auth.uid(), 'finance')` |  |
| `department_budgets` | Role-restricted budget access | SELECT | authenticated | permissive | `public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'finance')` |  |
| `contract_history` | Role-restricted contract history access | SELECT | authenticated | permissive | `public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'finance')` |  |
| `approval_workflows` | Role-restricted workflow access | SELECT | authenticated | permissive | `public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'finance')` |  |
| `pedido_itens` | Role-restricted order items access | SELECT | authenticated | permissive | `public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'buyer') OR public.has_role(auth.uid(), 'finance')` |  |
| `negotiation_analyses` | Role-restricted negotiation analysis access | SELECT | authenticated | permissive | `public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'buyer')` |  |
| `contact_notes` | Author and privileged roles can view contact notes | SELECT | authenticated | permissive | `auth.uid() = author_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator')` |  |
| `security_logs` | Only admins can insert security logs | INSERT | authenticated | permissive |  | `public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator')` |
| `approval_history` | Restricted approval history insert | INSERT | authenticated | permissive |  | `auth.uid() = usuario_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator')` |
| `approval_history` | Role-restricted approval history select | SELECT | authenticated | permissive | `auth.uid() = usuario_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator')` |  |
| `qualification_history` | Role-restricted qualification history insert | INSERT | authenticated | permissive |  | `(public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator')) AND performed_by = auth.uid()` |
| `contract_items` | Role-restricted contract items select | SELECT | authenticated | permissive | `public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'finance')` |  |
| `contract_penalties` | Role-restricted contract penalties select | SELECT | authenticated | permissive | `public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'finance')` |  |
| `rate_limit_logs` | Authenticated insert rate limit logs | INSERT | authenticated | permissive |  | `auth.uid() IS NOT NULL` |
| `contract_documents` | Role-restricted contract documents select | SELECT | authenticated | permissive | `public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'finance')` |  |
| `approval_rules` | Role-restricted approval rules select | SELECT | authenticated | permissive | `public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator')` |  |
| `supplier_qualification_scores` | Role-restricted qualification scores select | SELECT | authenticated | permissive | `public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'buyer') OR public.has_role(auth.uid(), 'finance')` |  |
| `receiving_checklists` | Role-restricted checklists select | SELECT | authenticated | permissive | `public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'buyer') OR public.has_role(auth.uid(), 'finance')` |  |
| `qualification_history` | Role-restricted qualification history select | SELECT | authenticated | permissive | `public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'buyer')` |  |
| `supplier_bonifications` | Role-restricted bonifications select | SELECT | authenticated | permissive | `public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'finance') OR public.has_role(auth.uid(), 'buyer')` |  |
| `penalty_escalation_config` | Role-restricted escalation config select | SELECT | authenticated | permissive | `public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator')` |  |
| `devolucoes` | Buyers coordinators admins can manage returns | ALL | authenticated | permissive | `has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role)` | `has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role)` |
| `devolucoes` | Finance can view returns | SELECT | authenticated | permissive | `has_role(auth.uid(), 'finance'::app_role)` |  |
| `devolucao_itens` | Buyers coordinators admins can manage return items | ALL | authenticated | permissive | `has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role)` | `has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role)` |
| `devolucao_itens` | Finance can view return items | SELECT | authenticated | permissive | `has_role(auth.uid(), 'finance'::app_role)` |  |
| `creditos_fornecedor` | Authorized roles can manage credits | ALL | authenticated | permissive | `has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'finance'::app_role) OR has_role(auth.uid(), 'buyer'::app_role)` | `has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'finance'::app_role) OR has_role(auth.uid(), 'buyer'::app_role)` |
| `payment_history` | Finance admin can manage payment history | ALL | authenticated | permissive | `has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'finance'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role)` | `has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'finance'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role)` |
| `query_telemetry` | Admins can manage telemetry | ALL | authenticated | permissive | `public.has_role(auth.uid(), 'admin')` | `public.has_role(auth.uid(), 'admin')` |
| `licitacoes` | Admins and coordinators can manage licitacoes | ALL | authenticated | permissive | `public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator')` | `public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator')` |
| `licitacao_propostas` | Admins coordinators buyers can manage propostas | ALL | authenticated | permissive | `public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'buyer')` | `public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'buyer')` |
| `query_telemetry` | Authenticated users can insert own telemetry | INSERT | authenticated | permissive |  | `user_id = auth.uid()` |
| `dependency_health` | dependency_health_write_admin | ALL | authenticated | permissive | `public.has_role(auth.uid(), 'admin')` | `public.has_role(auth.uid(), 'admin')` |
| `dependency_health_history` | dependency_health_history_insert_admin | INSERT | authenticated | permissive |  | `has_role(auth.uid(), 'admin'::app_role)` |
| `user_filter_preferences` | ufp_own_select | SELECT | public | permissive | `auth.uid() = user_id` |  |
| `user_filter_preferences` | ufp_own_insert | INSERT | public | permissive |  | `auth.uid() = user_id` |
| `user_filter_preferences` | ufp_own_update | UPDATE | public | permissive | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `user_filter_preferences` | ufp_own_delete | DELETE | public | permissive | `auth.uid() = user_id` |  |
| `organizations` | Users can see their organizations | SELECT | public | permissive | `id IN (SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid())` |  |
| `user_organizations` | Users can see their own memberships | SELECT | public | permissive | `user_id = auth.uid()` |  |
| `solicitacoes` | Tenant isolation for solicitacoes | SELECT | public | permissive | `organization_id IN (SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid())` |  |
| `category_strategies` | Tenant isolation for category_strategies | SELECT | public | permissive | `organization_id IN (SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid())` |  |
| `spend_forecasts` | Tenant isolation for spend_forecasts | SELECT | public | permissive | `organization_id IN (SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid())` |  |
| `financial_audit_logs` | Admins can view all audit logs | SELECT | public | permissive | `EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text IN ('admin', 'coordinator'))` |  |
| `dashboard_layouts` | Users can view their own dashboard layouts | SELECT | public | permissive | `auth.uid() = user_id` |  |
| `dashboard_layouts` | Users can insert their own dashboard layouts | INSERT | public | permissive |  | `auth.uid() = user_id` |
| `dashboard_layouts` | Users can update their own dashboard layouts | UPDATE | public | permissive | `auth.uid() = user_id` |  |
| `approval_rules` | Users can view their organization rules | SELECT | public | permissive | `organization_id IN (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid())` |  |
| `approval_delegations` | Users can view their organization delegations | SELECT | public | permissive | `organization_id IN (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid())` |  |
| `approval_workflows` | Users can view their organization workflows | SELECT | public | permissive | `organization_id IN (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid())` |  |
| `approval_workflows` | Users can manage their organization workflows | ALL | public | permissive | `organization_id IN (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid())` |  |
| `categorias` | Users can view their organization categories | SELECT | public | permissive | `organization_id IN (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid())` |  |
| `department_budgets` | Users can view their organization budgets | SELECT | public | permissive | `organization_id IN (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid())` |  |
| `tenants` | tenants visible to members | SELECT | authenticated | permissive | `public.user_belongs_to_tenant(auth.uid(), id)` |  |
| `user_tenants` | user_tenants own rows | SELECT | authenticated | permissive | `user_id = auth.uid()` |  |
| `erp_field_mappings` | ERP field mappings are visible to tenant admins | ALL | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.erp_connections c WHERE c.id = connection_id AND c.tenant_id = public.current_tenant_id() )` |  |
| `cost_centers` | Apenas administradores podem inserir centros de custo | INSERT | authenticated | permissive |  | `has_role(auth.uid(), 'admin'::app_role)` |
| `telemetry_logs_legacy_20260712` | Admins can view telemetry logs | SELECT | public | permissive | `EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text = 'admin' )` |  |
| `fornecedor_categorias` | tenant_isolation | ALL | authenticated | permissive | `tenant_id = public.current_tenant_id()` | `tenant_id = public.current_tenant_id()` |
| `currencies` | Authenticated can read currencies | SELECT | authenticated | permissive | `true` |  |
| `exchange_rates` | Authenticated can read exchange_rates | SELECT | authenticated | permissive | `true` |  |
| `profiles` | Users can view profiles in their tenant | SELECT | authenticated | permissive | `tenant_id = public.current_tenant_id()` |  |
| `currencies` | currencies_authenticated_read | SELECT | authenticated | permissive | `true` |  |
| `exchange_rates` | exchange_rates_authenticated_read | SELECT | authenticated | permissive | `true` |  |
| `telemetry_logs_legacy_20260712` | authenticated_insert_telemetry_logs | INSERT | authenticated | permissive |  | `auth.uid() = user_id` |
| `budget_audit_logs` | admin_view_budget_audit_logs | SELECT | authenticated | permissive | `public.has_role(auth.uid(), 'admin')` |  |
| `dependency_health` | authenticated_read_dependency_health | SELECT | authenticated | permissive | `auth.uid() IS NOT NULL` |  |
| `dependency_health_history` | authenticated_read_dependency_health_history | SELECT | authenticated | permissive | `auth.uid() IS NOT NULL` |  |
| `produtos` | tenant_isolation_produtos | SELECT | authenticated | permissive | `tenant_id = (auth.jwt() ->> 'tenant_id')::uuid` |  |
| `unspsc_codes` | unspsc_codes_authenticated_read | SELECT | authenticated | permissive | `auth.uid() IS NOT NULL` |  |
| `estoque` | Estoque: ver da própria organização | SELECT | authenticated | permissive | `organization_id = (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid())` |  |
| `estoque_movimentacoes` | Movimentações: ver da própria organização | SELECT | authenticated | permissive | `organization_id = (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid())` |  |
| `estoque_movimentacoes` | Movimentações: inserir na própria organização | INSERT | authenticated | permissive |  | `organization_id = (SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid())` |
| `budget_transactions` | Budget transactions viewable by finance roles | SELECT | authenticated | permissive | `tenant_id = current_tenant_id() AND ( has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'finance'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) )` |  |
| `produto_fornecedores` | Users can view product suppliers within tenant | SELECT | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.tenant_id = produto_fornecedores.tenant_id )` |  |
| `repurchase_suggestions` | Users can view repurchase suggestions within tenant | SELECT | authenticated | permissive | `tenant_id = public.current_tenant_id()` |  |
| `repurchase_suggestions` | Buyers coordinators admins can manage repurchase suggestions within tenant | ALL | authenticated | permissive | `tenant_id = public.current_tenant_id() AND ( public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role) OR public.has_role(auth.uid(), 'buyer'::public.app_role) )` | `tenant_id = public.current_tenant_id() AND ( public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role) OR public.has_role(auth.uid(), 'buyer'::public.app_role) )` |
| `erp_connections` | Admins and coordinators manage ERP connections within tenant | ALL | authenticated | permissive | `tenant_id = public.current_tenant_id() AND ( public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role) )` | `tenant_id = public.current_tenant_id() AND ( public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role) )` |
| `punchout_catalogs` | Admins and coordinators manage PunchOut catalogs within tenant | ALL | authenticated | permissive | `tenant_id = public.current_tenant_id() AND ( public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role) )` | `tenant_id = public.current_tenant_id() AND ( public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role) )` |
| `aliquotas_tributarias` | Grupo ve suas aliquotas | SELECT | authenticated | permissive | `organization_id = public.get_user_grupo_id()` |  |
| `aliquotas_tributarias` | Admin coord gerencia aliquotas | ALL | authenticated | permissive | `organization_id = public.get_user_grupo_id() AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'coordinator'::app_role))` | `organization_id = public.get_user_grupo_id() AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'coordinator'::app_role))` |
| `webhook_events` | Admins can view webhook events | SELECT | authenticated | permissive | `public.has_role(auth.uid(), 'admin')` |  |
| `integration_outbox` | outbox_admin_read | SELECT | authenticated | permissive | `public.has_role(auth.uid(), 'admin')` |  |
| `integration_outbox` | outbox_authenticated_enqueue | INSERT | authenticated | permissive |  | `created_by = auth.uid()` |
| `integration_outbox` | outbox_service_role_all | ALL | service_role | permissive | `true` | `true` |
| `wal_rate_snapshots` | wal_snapshots_admin_read | SELECT | authenticated | permissive | `public.has_role(auth.uid(), 'admin')` |  |
| `checkpoint_snapshots` | ckpt_snapshots_admin_read | SELECT | authenticated | permissive | `public.has_role(auth.uid(), 'admin')` |  |
| `temp_file_snapshots` | admin_read_temp_file_snapshots | SELECT | authenticated | permissive | `public.has_role(auth.uid(), 'admin')` |  |
| `deadlock_snapshots` | Admins can view deadlock snapshots | SELECT | authenticated | permissive | `public.has_role(auth.uid(), 'admin')` |  |
| `health_scan_runs` | Admins can read health_scan_runs | SELECT | authenticated | permissive | `public.has_role(auth.uid(), 'admin')` |  |
| `alert_subscriptions` | Admins manage own alert subscriptions | ALL | authenticated | permissive | `auth.uid() = user_id AND public.has_role(auth.uid(), 'admin')` | `auth.uid() = user_id AND public.has_role(auth.uid(), 'admin')` |
| `security_definer_baseline` | Admins can view baseline | SELECT | authenticated | permissive | `public.has_role(auth.uid(), 'admin')` |  |
| `secret_rotation_schedule` | Admins manage secret rotation schedule | ALL | authenticated | permissive | `public.has_role(auth.uid(), 'admin')` | `public.has_role(auth.uid(), 'admin')` |
| `telemetry_logs` | Admins can view telemetry logs | SELECT | public | permissive | `EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text = 'admin' )` |  |
| `telemetry_logs` | authenticated_insert_telemetry_logs | INSERT | authenticated | permissive |  | `auth.uid() = user_id` |
| `telemetry_logs_legacy_20260712` | admins_read_legacy_telemetry | SELECT | public | permissive | `public.has_role(auth.uid(), 'admin')` |  |
| `audit_logs_legacy_20260712` | audit_logs_legacy_admin_read | SELECT | authenticated | permissive | `has_role(auth.uid(), 'admin'::app_role)` |  |
| `audit_logs` | Admins can view all audit logs | SELECT | authenticated | permissive | `has_role(auth.uid(), 'admin'::app_role)` |  |
| `audit_logs` | authenticated_insert_audit_logs | INSERT | authenticated | permissive |  | `tenant_in_my_group(tenant_id) AND auth.uid() IS NOT NULL` |
| `table_size_snapshots` | admins_read_table_size_snapshots | SELECT | authenticated | permissive | `public.has_role(auth.uid(), 'admin')` |  |
| `system_alerts` | Users view tenant alerts via verified mapping | SELECT | authenticated | permissive | `(tenant_id IS NOT NULL AND public.tenant_in_my_group(tenant_id)) OR (tenant_id IS NULL AND public.has_role(auth.uid(), 'admin'::app_role))` |  |
| `permissions` | Admins can view permissions | SELECT | authenticated | permissive | `public.has_role(auth.uid(), 'admin'::app_role)` |  |
| `role_permissions` | Admins can view role permissions | SELECT | authenticated | permissive | `public.has_role(auth.uid(), 'admin'::app_role)` |  |
| `qualification_requirements` | Procurement roles can view qualification requirements | SELECT | authenticated | permissive | `public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'coordinator'::app_role) OR public.has_role(auth.uid(), 'buyer'::app_role)` |  |
| `allowed_countries` | Admins can view allowed countries | SELECT | authenticated | permissive | `public.has_role(auth.uid(), 'admin'::app_role)` |  |
| `blocked_countries` | Admins can view blocked countries | SELECT | authenticated | permissive | `public.has_role(auth.uid(), 'admin'::app_role)` |  |
| `pedido_itens` | tenant_isolation | ALL | authenticated | permissive | `tenant_id = public.current_tenant_id()` | `tenant_id = public.current_tenant_id()` |
| `notifications` | Users can manage own notifications | ALL | authenticated | permissive | `user_id = auth.uid()` | `user_id = auth.uid()` |
| `cron_heartbeats` | Service role manages cron heartbeats | ALL | service_role | permissive | `true` | `true` |
| `cron_heartbeats` | Authenticated users can read cron heartbeats | SELECT | authenticated | permissive | `true` |  |
| `fornecedores` | supplier_select_own | SELECT | public | permissive | `auth.is_supplier() AND ( user_id = auth.uid() OR EXISTS ( SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.organization_id = fornecedores.organization_id ) )` |  |
| `cotacoes` | supplier_select_cotacoes | SELECT | public | permissive | `auth.is_supplier() AND fornecedor_id IN ( SELECT id FROM fornecedores WHERE user_id = auth.uid() )` |  |
| `pagamentos` | Finance and admin can view payments | SELECT | authenticated | permissive | `tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'finance'::app_role) OR has_role(auth.uid(),'coordinator'::app_role))` |  |
| `pagamentos` | Finance can manage payments | ALL | authenticated | permissive | `tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'finance'::app_role))` | `tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'finance'::app_role))` |
| `fornecedores` | Buyers coordinators admins can manage suppliers | ALL | authenticated | permissive | `tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'buyer'::app_role))` | `tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'buyer'::app_role))` |
| `fornecedores` | Role-restricted supplier access | SELECT | authenticated | permissive | `tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'buyer'::app_role) OR has_role(auth.uid(),'finance'::app_role))` |  |
| `cotacoes` | Buyers coordinators admins can manage quotations | ALL | authenticated | permissive | `tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'buyer'::app_role))` | `tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'buyer'::app_role))` |
| `cotacoes` | Role-restricted quotation access | SELECT | authenticated | permissive | `tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'buyer'::app_role) OR has_role(auth.uid(),'finance'::app_role))` |  |
| `contracts` | Admin coordinator finance can manage contracts | ALL | authenticated | permissive | `tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'finance'::app_role))` | `tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'finance'::app_role))` |
| `contracts` | Role-restricted contract access | SELECT | authenticated | permissive | `tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'finance'::app_role))` |  |
| `pedidos` | Buyers coordinators admins can manage orders | ALL | authenticated | permissive | `tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'buyer'::app_role))` | `tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'buyer'::app_role))` |
| `pedidos` | Role-restricted order access | SELECT | authenticated | permissive | `tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'buyer'::app_role) OR has_role(auth.uid(),'finance'::app_role))` |  |
| `produtos` | Admin coordinator can manage produtos | ALL | authenticated | permissive | `tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role))` | `tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role))` |
| `produtos` | Buyers coordinators admins can manage products | ALL | authenticated | permissive | `tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'buyer'::app_role))` | `tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'buyer'::app_role))` |
| `categorias` | Tenant users can view categories | SELECT | authenticated | permissive | `tenant_in_my_group(tenant_id)` |  |
| `supplier_documents` | Admin coordinator buyer can manage supplier documents | ALL | authenticated | permissive | `tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'buyer'::app_role))` | `tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'buyer'::app_role))` |
| `supplier_documents` | Role-restricted supplier document select | SELECT | authenticated | permissive | `tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'buyer'::app_role))` |  |
| `supplier_qualification_scores` | Admins and coordinators can manage qualification scores | ALL | authenticated | permissive | `tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role))` | `tenant_in_my_group(tenant_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role))` |
| `xbz_credentials` | xbz_credentials_admin_manage | ALL | authenticated | permissive | `public.tenant_in_my_group(tenant_id) AND public.has_role(auth.uid(), 'admin'::app_role)` | `public.tenant_in_my_group(tenant_id) AND public.has_role(auth.uid(), 'admin'::app_role)` |
| `xbz_pedidos` | xbz_pedidos_group_read | SELECT | authenticated | permissive | `public.tenant_in_my_group(tenant_id)` |  |
| `xbz_pedido_status_history` | xbz_status_history_group_read | SELECT | authenticated | permissive | `public.tenant_in_my_group(tenant_id)` |  |
| `xbz_produtos` | xbz_produtos_group_read | SELECT | authenticated | permissive | `public.tenant_in_my_group(tenant_id)` |  |
| `xbz_produto_fiscal` | xbz_produto_fiscal_group_read | SELECT | authenticated | permissive | `public.tenant_in_my_group(tenant_id)` |  |
| `xbz_cores` | xbz_cores_read_authenticated | SELECT | authenticated | permissive | `true` |  |
| `xbz_carrinho_log` | xbz_carrinho_log_group_read | SELECT | authenticated | permissive | `public.tenant_in_my_group(tenant_id)` |  |
| `spot_produtos` | Allowed roles can view spot produtos | SELECT | authenticated | permissive | `has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'buyer'::app_role)` |  |
| `spot_skus` | Allowed roles can view spot skus | SELECT | authenticated | permissive | `has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'buyer'::app_role)` |  |
| `spot_customization_options` | Allowed roles can view spot customization | SELECT | authenticated | permissive | `has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'buyer'::app_role)` |  |
| `spot_estoque` | Allowed roles can view spot estoque | SELECT | authenticated | permissive | `has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'buyer'::app_role)` |  |
| `spot_api_sync_log` | Allowed roles can view spot sync log | SELECT | authenticated | permissive | `has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'coordinator'::app_role) OR has_role(auth.uid(),'buyer'::app_role)` |  |
| `active_sessions` | tenant_isolation_active_sessions | ALL | authenticated | restrictive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `approval_delegations` | tenant_isolation_approval_delegations | ALL | authenticated | restrictive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `approval_history` | tenant_isolation_approval_history | ALL | authenticated | restrictive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `approval_rules` | tenant_isolation_approval_rules | ALL | authenticated | restrictive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `approval_workflows` | tenant_isolation_approval_workflows | ALL | authenticated | restrictive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `audit_logs` | tenant_isolation_audit_logs | ALL | authenticated | restrictive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `budget_transactions` | tenant_isolation_budget_transactions | ALL | authenticated | restrictive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `categorias` | tenant_isolation_categorias | ALL | authenticated | restrictive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `category_strategies` | tenant_isolation_category_strategies | ALL | authenticated | restrictive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `contact_notes` | tenant_isolation_contact_notes | ALL | authenticated | restrictive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `contract_documents` | tenant_isolation_contract_documents | ALL | authenticated | restrictive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `contract_history` | tenant_isolation_contract_history | ALL | authenticated | restrictive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `contract_items` | tenant_isolation_contract_items | ALL | authenticated | restrictive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `contract_penalties` | tenant_isolation_contract_penalties | ALL | authenticated | restrictive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `contracts` | tenant_isolation_contracts | ALL | authenticated | restrictive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `cotacoes` | tenant_isolation_cotacoes | ALL | authenticated | restrictive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `creditos_fornecedor` | tenant_isolation_creditos_fornecedor | ALL | authenticated | restrictive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `department_budgets` | tenant_isolation_department_budgets | ALL | authenticated | restrictive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `devolucao_itens` | tenant_isolation_devolucao_itens | ALL | authenticated | restrictive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `devolucoes` | tenant_isolation_devolucoes | ALL | authenticated | restrictive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `fiscal_documents` | tenant_isolation_fiscal_documents | ALL | authenticated | restrictive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `fornecedores` | tenant_isolation_fornecedores | ALL | authenticated | restrictive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `licitacao_propostas` | tenant_isolation_licitacao_propostas | ALL | authenticated | restrictive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `licitacoes` | tenant_isolation_licitacoes | ALL | authenticated | restrictive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `order_contracts` | tenant_isolation_order_contracts | ALL | authenticated | restrictive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `pagamentos` | tenant_isolation_pagamentos | ALL | authenticated | restrictive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `payment_history` | tenant_isolation_payment_history | ALL | authenticated | restrictive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `pedido_itens` | tenant_isolation_pedido_itens | ALL | authenticated | restrictive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `pedidos` | tenant_isolation_pedidos | ALL | authenticated | restrictive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `penalty_escalation_config` | tenant_isolation_penalty_escalation_config | ALL | authenticated | restrictive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `receiving_checklists` | tenant_isolation_receiving_checklists | ALL | authenticated | restrictive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `spend_forecasts` | tenant_isolation_spend_forecasts | ALL | authenticated | restrictive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `supplier_bonifications` | tenant_isolation_supplier_bonifications | ALL | authenticated | restrictive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `supplier_documents` | tenant_isolation_supplier_documents | ALL | authenticated | restrictive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `supplier_qualification_scores` | tenant_isolation_supplier_qualification_scores | ALL | authenticated | restrictive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `contracts` | buyer_le_contracts | SELECT | authenticated | permissive | `public.has_role(auth.uid(), 'buyer'::app_role)` |  |
| `contract_items` | buyer_le_contract_items | SELECT | authenticated | permissive | `public.has_role(auth.uid(), 'buyer'::app_role)` |  |
| `contract_documents` | buyer_le_contract_documents | SELECT | authenticated | permissive | `public.has_role(auth.uid(), 'buyer'::app_role)` |  |
| `profiles` | profiles_tenant_isolation | SELECT | authenticated | permissive | `public.tenant_in_my_group(tenant_id)` |  |
| `solicitacoes` | tenant_isolation_solicitacoes | ALL | authenticated | restrictive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `solicitacoes` | solicitacoes_select_grupo | SELECT | authenticated | permissive | `public.tenant_in_my_group(tenant_id)` |  |
| `solicitacoes` | solicitacoes_update_proprias_nao_aprovadas | UPDATE | authenticated | permissive | `solicitante_id = auth.uid() AND status IN ('pendente', 'rejeitada')` | `solicitante_id = auth.uid() AND status IN ('pendente', 'cancelada')` |
| `solicitacoes` | solicitacoes_update_admin_coord | UPDATE | authenticated | permissive | `public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'coordinator'::app_role)` | `public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'coordinator'::app_role)` |
| `solicitacoes` | solicitacoes_update_comprador_gera_ordem | UPDATE | authenticated | permissive | `public.has_role(auth.uid(), 'buyer'::app_role) AND status = 'aprovada'` | `public.has_role(auth.uid(), 'buyer'::app_role) AND status = 'em_andamento'` |
| `estoque` | estoque_insert_papeis | INSERT | authenticated | permissive |  | `organization_id = public.get_user_grupo_id() AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'coordinator'::app_role) OR public.has_role(auth.uid(), 'buyer'::app_role))` |
| `estoque` | estoque_update_papeis | UPDATE | authenticated | permissive | `organization_id = public.get_user_grupo_id() AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'coordinator'::app_role) OR public.has_role(auth.uid(), 'buyer'::app_role))` | `organization_id = public.get_user_grupo_id() AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'coordinator'::app_role) OR public.has_role(auth.uid(), 'buyer'::app_role))` |
| `estoque` | estoque_delete_admin_coord | DELETE | authenticated | permissive | `organization_id = public.get_user_grupo_id() AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'coordinator'::app_role))` |  |
| `categorias` | categorias_escrita_admin_coord | ALL | authenticated | permissive | `public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'coordinator'::app_role)` | `public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'coordinator'::app_role)` |
| `approval_rules` | approval_rules_escrita_admin_coord | ALL | authenticated | permissive | `public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'coordinator'::app_role)` | `public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'coordinator'::app_role)` |
| `approval_steps` | tenant_isolation_approval_steps | ALL | authenticated | restrictive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `approval_steps` | approval_steps_select_grupo | SELECT | authenticated | permissive | `public.tenant_in_my_group(tenant_id)` |  |
| `approval_steps` | approval_steps_escrita_admin_coord | ALL | authenticated | permissive | `public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'coordinator'::app_role)` | `public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'coordinator'::app_role)` |
| `approval_steps` | approval_steps_insert_workflow_proprio | INSERT | authenticated | permissive |  | `EXISTS ( SELECT 1 FROM public.approval_workflows w JOIN public.solicitacoes s ON s.id = w.solicitacao_id WHERE w.id = approval_steps.workflow_id AND s.solicitante_id = auth.uid() )` |
| `approval_steps` | approval_steps_skip_workflow_rejeitado | UPDATE | authenticated | permissive | `status = 'pending' AND EXISTS ( SELECT 1 FROM public.approval_workflows w WHERE w.id = approval_steps.workflow_id AND w.status = 'rejected' )` | `status = 'skipped'` |
| `cost_centers` | tenant_isolation_cost_centers | ALL | authenticated | restrictive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `cost_centers` | cost_centers_select_grupo | SELECT | authenticated | permissive | `public.tenant_in_my_group(tenant_id)` |  |
| `cost_centers` | cost_centers_escrita_admin_coord | ALL | authenticated | permissive | `public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'coordinator'::app_role)` | `public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'coordinator'::app_role)` |
| `produto_fornecedores` | produto_fornecedores_escrita_papeis | ALL | authenticated | permissive | `public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'coordinator'::app_role) OR public.has_role(auth.uid(), 'buyer'::app_role))` | `public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'coordinator'::app_role) OR public.has_role(auth.uid(), 'buyer'::app_role))` |
| `licitacoes` | licitacoes_select_comprador | SELECT | authenticated | permissive | `public.has_role(auth.uid(), 'buyer'::app_role)` |  |
| `pagamentos` | pagamentos_select_comprador | SELECT | authenticated | permissive | `public.has_role(auth.uid(), 'buyer'::app_role)` |  |
| `storage.objects` | storage_tenant_dono_select | SELECT | authenticated | permissive | `bucket_id IN ('documentos', 'comprovantes') AND (storage.foldername(name))[2] = (auth.uid())::text AND CASE WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN public.user_belongs_to_tenant(auth.uid(), ((storage.foldername(name))[1])::uuid) ELS …` |  |
| `storage.objects` | storage_tenant_dono_insert | INSERT | authenticated | permissive |  | `bucket_id IN ('documentos', 'comprovantes') AND (storage.foldername(name))[2] = (auth.uid())::text AND CASE WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN public.user_belongs_to_tenant(auth.uid(), ((storage.foldername(name))[1])::uuid) ELS …` |
| `storage.objects` | storage_tenant_dono_delete | DELETE | authenticated | permissive | `bucket_id IN ('documentos', 'comprovantes') AND (storage.foldername(name))[2] = (auth.uid())::text AND CASE WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN public.user_belongs_to_tenant(auth.uid(), ((storage.foldername(name))[1])::uuid) ELS …` |  |
| `storage.objects` | storage_tenant_gestor_select | SELECT | authenticated | permissive | `( (bucket_id = 'documentos' AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role))) OR (bucket_id = 'comprovantes' AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'finance'::public.app_role) …` |  |
| `storage.objects` | storage_tenant_admin_delete | DELETE | authenticated | permissive | `bucket_id IN ('documentos', 'comprovantes') AND public.has_role(auth.uid(), 'admin'::public.app_role) AND CASE WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN public.user_belongs_to_tenant(auth.uid(), ((storage.foldername(name))[1])::uuid) …` |  |
| `storage.objects` | storage_fiscal_dono_select | SELECT | authenticated | permissive | `bucket_id = 'fiscal-documents' AND (storage.foldername(name))[1] = 'uploads' AND (storage.foldername(name))[2] = (auth.uid())::text` |  |
| `storage.objects` | storage_fiscal_dono_insert | INSERT | authenticated | permissive |  | `bucket_id = 'fiscal-documents' AND (storage.foldername(name))[1] = 'uploads' AND (storage.foldername(name))[2] = (auth.uid())::text` |
| `storage.objects` | storage_fiscal_dono_delete | DELETE | authenticated | permissive | `bucket_id = 'fiscal-documents' AND (storage.foldername(name))[1] = 'uploads' AND (storage.foldername(name))[2] = (auth.uid())::text` |  |
| `storage.objects` | storage_fiscal_gestor_select | SELECT | authenticated | permissive | `bucket_id = 'fiscal-documents' AND (storage.foldername(name))[1] = 'uploads' AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'finance'::public.app_role)) AND EXISTS ( SELECT 1 FROM public.profiles p WHERE (p.user_id)::text = (storage.foldername(objects.name) …` |  |
| `storage.objects` | storage_produtos_leitura_publica | SELECT | anon, authenticated | permissive | `bucket_id = 'product-images'` |  |
| `storage.objects` | storage_produtos_insert | INSERT | authenticated | permissive |  | `bucket_id = 'product-images' AND (storage.foldername(name))[1] = 'products' AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role) OR public.has_role(auth.uid(), 'buyer'::public.app_role))` |
| `storage.objects` | storage_produtos_dono_delete | DELETE | authenticated | permissive | `bucket_id = 'product-images' AND (owner = auth.uid() OR owner_id = (auth.uid())::text)` |  |
| `entity_versions` | Authenticated can view versions | SELECT | authenticated | permissive | `true` |  |
| `entity_versions` | Authenticated can insert versions | INSERT | authenticated | permissive |  | `changed_by IS NULL OR auth.uid() = changed_by` |
| `notifications` | tenant_isolation_notifications | ALL | authenticated | permissive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `category_strategies` | tenant_isolation | ALL | authenticated | permissive | `organization_id = public.get_my_organization()` |  |
| `sso_configurations` | SSO configurations isolated by tenant | ALL | authenticated | permissive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `scim_provisioning_log` | SCIM logs isolated by tenant | ALL | authenticated | permissive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `workflow_templates` | Tenant isolation for workflow_templates | ALL | authenticated | permissive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `workflow_sod_rules` | tenant_isolation_workflow_sod_rules | ALL | authenticated | permissive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `workflow_nodes` | Tenant isolation for workflow_nodes | ALL | authenticated | permissive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `workflow_edges` | Tenant isolation for workflow_edges | ALL | authenticated | permissive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `workflow_instances` | Tenant isolation for workflow_instances | ALL | authenticated | permissive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `workflow_approvals` | Tenant isolation for workflow_approvals | ALL | authenticated | permissive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `workflow_logs` | Tenant isolation for workflow_logs | ALL | authenticated | permissive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `workflow_tasks` | tenant_isolation_workflow_tasks | ALL | authenticated | permissive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `workflow_audit_log` | tenant_isolation_workflow_audit_log | ALL | authenticated | permissive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `approval_hierarchy` | tenant_isolation_approval_hierarchy | ALL | authenticated | permissive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `erp_sync_log` | ERP sync logs are tenant-isolated | ALL | authenticated | permissive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `fornecedor_categorias` | tenant_isolation_fornecedor_categorias | ALL | authenticated | permissive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `sourcing_pipeline` | tenant isolation sourcing_pipeline | ALL | authenticated | permissive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `savings_tracker` | tenant_isolation_savings_tracker | ALL | authenticated | permissive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `sourcing_projects` | tenant_isolation_sourcing_projects | ALL | authenticated | permissive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `sourcing_events` | tenant_isolation_sourcing_events | ALL | authenticated | permissive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `sourcing_event_criteria` | tenant_isolation_sourcing_event_criteria | ALL | authenticated | permissive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `sourcing_event_lots` | tenant_isolation_sourcing_event_lots | ALL | authenticated | permissive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `sourcing_event_questions` | tenant_isolation_sourcing_event_questions | ALL | authenticated | permissive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `sourcing_invitations` | tenant_isolation_sourcing_invitations | ALL | authenticated | permissive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `sourcing_responses` | tenant_isolation_sourcing_responses | ALL | authenticated | permissive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `sourcing_response_items` | tenant_isolation_sourcing_response_items | ALL | authenticated | permissive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `sourcing_response_answers` | tenant_isolation_sourcing_response_answers | ALL | authenticated | permissive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `sourcing_awards` | tenant_isolation_sourcing_awards | ALL | authenticated | permissive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `licitacao_lances` | tenant_isolation_licitacao_lances | ALL | authenticated | permissive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `auction_bids` | tenant_isolation_auction_bids | ALL | authenticated | permissive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `punchout_sessions` | tenant isolation punchout_sessions | ALL | authenticated | permissive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |
| `fiscal_events` | fiscal_events tenant isolation | ALL | authenticated | permissive | `public.tenant_in_my_group(tenant_id)` | `public.tenant_in_my_group(tenant_id)` |

## C. Restrições de dados (obrigatório / único / default / CHECK / FK / calculada)

| Tabela | Coluna | Regra |
|---|---|---|
| `saved_filters` | `id` | PK; default gen_random_uuid() |
| `saved_filters` | `user_id` | obrigatório; FK → users.id ON DELETE CASCADE |
| `saved_filters` | `entity_type` | obrigatório |
| `saved_filters` | `name` | obrigatório |
| `saved_filters` | `filters` | default '{}'::jsonb |
| `saved_filters` | `is_default` | default false |
| `saved_filters` | `created_at` | default NOW() |
| `saved_filters` | `updated_at` | default NOW() |
| `saved_filters` | `(tabela)` | CONSTRAINT unique_filter_name_per_user_entity UNIQUE (user_id, entity_type, name) |
| `entity_versions` | `id` | PK; default gen_random_uuid() |
| `entity_versions` | `entity_type` | obrigatório |
| `entity_versions` | `entity_id` | obrigatório |
| `entity_versions` | `version_number` | obrigatório |
| `entity_versions` | `data` | default '{}'::jsonb |
| `entity_versions` | `changed_by` | FK → users.id |
| `entity_versions` | `changed_at` | default NOW() |
| `entity_versions` | `(tabela)` | CONSTRAINT unique_entity_version UNIQUE (entity_type, entity_id, version_number) |
| `solicitacoes` | `id` | PK; default gen_random_uuid() |
| `solicitacoes` | `numero` | obrigatório; único |
| `solicitacoes` | `titulo` | obrigatório |
| `solicitacoes` | `tipo` | default 'material'; CHECK tipo IN ('material', 'servico', 'equipamento', 'urgente', 'contrato') |
| `solicitacoes` | `status` | default 'pendente'; CHECK status IN ('pendente', 'em_cotacao', 'aprovada', 'rejeitada', 'em_andamento', 'concluida', 'cancelada') |
| `solicitacoes` | `prioridade` | default 'media'; CHECK prioridade IN ('baixa', 'media', 'alta', 'urgente') |
| `solicitacoes` | `quantidade` | default 1 |
| `solicitacoes` | `unidade` | default 'un' |
| `solicitacoes` | `solicitante_id` | FK → users.id |
| `solicitacoes` | `aprovador_id` | FK → users.id |
| `solicitacoes` | `fornecedor_id` | FK → fornecedores.id |
| `solicitacoes` | `categoria_id` | FK → categorias.id |
| `solicitacoes` | `anexos` | default '[]'::jsonb |
| `solicitacoes` | `created_at` | default now() |
| `solicitacoes` | `updated_at` | default now() |
| `solicitacoes` | `organization_id` | FK → organizations.id |
| `solicitacoes` | `cost_center_id` | FK → cost_centers.id |
| `solicitacoes` | `tenant_id` | obrigatório; FK → tenants.id |
| `solicitacoes` | `produto_id` | FK → produtos.id ON DELETE SET NULL |
| `cotacoes` | `id` | PK; default gen_random_uuid() |
| `cotacoes` | `numero` | obrigatório; único |
| `cotacoes` | `solicitacao_id` | FK → solicitacoes.id ON DELETE CASCADE |
| `cotacoes` | `fornecedor_id` | FK → fornecedores.id |
| `cotacoes` | `valor_unitario` | obrigatório |
| `cotacoes` | `quantidade` | default 1 |
| `cotacoes` | `valor_total` | obrigatório |
| `cotacoes` | `valor_frete` | default 0 |
| `cotacoes` | `desconto_percentual` | default 0 |
| `cotacoes` | `prazo_entrega` | default 7 |
| `cotacoes` | `status` | default 'pendente'; CHECK status IN ('pendente', 'analisando', 'aprovada', 'rejeitada', 'expirada') |
| `cotacoes` | `selecionada` | default false |
| `cotacoes` | `score_preco` | default 0 |
| `cotacoes` | `score_prazo` | default 0 |
| `cotacoes` | `score_qualidade` | default 0 |
| `cotacoes` | `score_total` | default 0 |
| `cotacoes` | `anexos` | default '[]'::jsonb |
| `cotacoes` | `avaliador_id` | FK → users.id |
| `cotacoes` | `created_at` | default now() |
| `cotacoes` | `updated_at` | default now() |
| `cotacoes` | `moeda` | default 'BRL' |
| `cotacoes` | `taxa_conversao` | default 1.0 |
| `cotacoes` | `organization_id` | FK → organizations.id |
| `cotacoes` | `tenant_id` | obrigatório; FK → tenants.id |
| `cotacoes` | `currency` | default 'BRL'; FK → currencies.code |
| `fornecedores` | `id` | PK; default gen_random_uuid() |
| `fornecedores` | `codigo` | obrigatório; único |
| `fornecedores` | `razao_social` | obrigatório |
| `fornecedores` | `cnpj` | único |
| `fornecedores` | `tipo` | default 'nacional'; CHECK tipo IN ('nacional', 'internacional', 'local') |
| `fornecedores` | `avaliacao` | default 0; CHECK avaliacao >= 0 AND avaliacao <= 5 |
| `fornecedores` | `prazo_medio_entrega` | default 7 |
| `fornecedores` | `integrado_api` | default false |
| `fornecedores` | `status` | default 'ativo'; CHECK status IN ('ativo', 'inativo', 'bloqueado', 'pendente') |
| `fornecedores` | `created_by` | FK → users.id |
| `fornecedores` | `created_at` | default now() |
| `fornecedores` | `updated_at` | default now() |
| `fornecedores` | `limite_credito` | default NULL |
| `fornecedores` | `saldo_comprometido` | default 0 |
| `fornecedores` | `organization_id` | FK → organizations.id |
| `fornecedores` | `tenant_id` | obrigatório; FK → tenants.id |
| `fornecedores` | `(tabela)` | constraint fornecedores_telefone_e164_chk CHECK (telefone IS NULL OR telefone ~ '^\+[1-9]\d{9,14}$') NOT VALID |
| `historico_compras` | `id` | PK; default gen_random_uuid() |
| `historico_compras` | `solicitacao_id` | FK → solicitacoes.id |
| `historico_compras` | `acao` | obrigatório |
| `historico_compras` | `created_at` | default NOW() |
| `user_roles` | `id` | PK; default gen_random_uuid() |
| `user_roles` | `user_id` | obrigatório; FK → users.id ON DELETE CASCADE |
| `user_roles` | `role` | obrigatório |
| `user_roles` | `created_at` | default now() |
| `user_roles` | `(tabela)` | UNIQUE (user_id, role) |
| `profiles` | `id` | PK; default gen_random_uuid() |
| `profiles` | `user_id` | obrigatório; único; FK → users.id ON DELETE CASCADE |
| `profiles` | `created_at` | default now() |
| `profiles` | `updated_at` | default now() |
| `profiles` | `current_organization_id` | FK → organizations.id |
| `profiles` | `tenant_id` | FK → tenants.id |
| `profiles` | `preferred_locale` | default 'pt-BR' |
| `profiles` | `empresa_default_id` | FK → tenants.id ON DELETE SET NULL |
| `profiles` | `(tabela)` | constraint profiles_phone_e164_chk CHECK (phone IS NULL OR phone ~ '^\+[1-9]\d{9,14}$') NOT VALID |
| `dashboard_filter_favorites` | `id` | PK; default gen_random_uuid() |
| `dashboard_filter_favorites` | `user_id` | obrigatório |
| `dashboard_filter_favorites` | `name` | obrigatório |
| `dashboard_filter_favorites` | `category_filter` | default 'all' |
| `dashboard_filter_favorites` | `supplier_filter` | default 'all' |
| `dashboard_filter_favorites` | `period_filter` | default '6m' |
| `dashboard_filter_favorites` | `show_comparison` | default true |
| `dashboard_filter_favorites` | `is_default` | default false |
| `dashboard_filter_favorites` | `created_at` | default now() |
| `dashboard_filter_favorites` | `updated_at` | default now() |
| `dashboard_filter_favorites` | `organization_id` | FK → organizations.id |
| `contracts` | `id` | PK; default gen_random_uuid() |
| `contracts` | `contract_number` | obrigatório; único |
| `contracts` | `title` | obrigatório |
| `contracts` | `supplier_id` | obrigatório |
| `contracts` | `supplier_name` | obrigatório |
| `contracts` | `contract_type` | default 'service' |
| `contracts` | `status` | default 'draft' |
| `contracts` | `start_date` | obrigatório |
| `contracts` | `end_date` | obrigatório |
| `contracts` | `total_value` | default 0 |
| `contracts` | `renewal_type` | default 'manual' |
| `contracts` | `renewal_notice_days` | default 30 |
| `contracts` | `created_at` | default now() |
| `contracts` | `updated_at` | default now() |
| `contracts` | `sla_delivery_days` | default 30 |
| `contracts` | `penalty_rate_per_day` | default 0.5 |
| `contracts` | `penalty_cap_percent` | default 20 |
| `contracts` | `min_quality_score` | default 3.0 |
| `contracts` | `quality_penalty_percent` | default 10 |
| `contracts` | `return_policy` | default 'Itens |
| `contracts` | `min_supplier_score` | default 3.0 |
| `contracts` | `auto_block_below_score` | default true |
| `contracts` | `penalty_clauses` | default '[]'::jsonb |
| `contracts` | `organization_id` | FK → organizations.id |
| `contracts` | `tenant_id` | default '00000000-0000-0000-0000-000000000000'; FK → tenants.id |
| `contracts` | `currency` | default 'BRL'; FK → currencies.code |
| `contract_items` | `id` | PK; default gen_random_uuid() |
| `contract_items` | `contract_id` | obrigatório; FK → contracts.id ON DELETE CASCADE |
| `contract_items` | `item_name` | obrigatório |
| `contract_items` | `unit` | obrigatório |
| `contract_items` | `quantity` | default 0 |
| `contract_items` | `unit_price` | default 0 |
| `contract_items` | `total_price` | default 0 |
| `contract_items` | `created_at` | default now() |
| `contract_items` | `tenant_id` | default '00000000-0000-0000-0000-000000000000'; FK → tenants.id |
| `contract_documents` | `id` | PK; default gen_random_uuid() |
| `contract_documents` | `contract_id` | obrigatório; FK → contracts.id ON DELETE CASCADE |
| `contract_documents` | `file_name` | obrigatório |
| `contract_documents` | `file_url` | obrigatório |
| `contract_documents` | `created_at` | default now() |
| `contract_documents` | `tenant_id` | default '00000000-0000-0000-0000-000000000000'; FK → tenants.id |
| `contract_history` | `id` | PK; default gen_random_uuid() |
| `contract_history` | `contract_id` | obrigatório; FK → contracts.id ON DELETE CASCADE |
| `contract_history` | `action_type` | obrigatório |
| `contract_history` | `created_at` | default now() |
| `contract_history` | `tenant_id` | default '00000000-0000-0000-0000-000000000000'; FK → tenants.id |
| `order_contracts` | `id` | PK; default gen_random_uuid() |
| `order_contracts` | `order_id` | obrigatório |
| `order_contracts` | `contract_id` | obrigatório; FK → contracts.id ON DELETE CASCADE |
| `order_contracts` | `created_at` | default now() |
| `order_contracts` | `tenant_id` | default '00000000-0000-0000-0000-000000000000'; FK → tenants.id |
| `order_contracts` | `(tabela)` | UNIQUE(order_id, contract_id) |
| `push_subscriptions` | `id` | PK; default gen_random_uuid() |
| `push_subscriptions` | `user_id` | obrigatório |
| `push_subscriptions` | `endpoint` | obrigatório |
| `push_subscriptions` | `p256dh` | obrigatório |
| `push_subscriptions` | `auth` | obrigatório |
| `push_subscriptions` | `created_at` | default now() |
| `push_subscriptions` | `updated_at` | default now() |
| `push_subscriptions` | `(tabela)` | UNIQUE(user_id, endpoint) |
| `notification_preferences` | `id` | PK; default gen_random_uuid() |
| `notification_preferences` | `user_id` | obrigatório; único |
| `notification_preferences` | `sla_warnings` | default true |
| `notification_preferences` | `sla_critical` | default true |
| `notification_preferences` | `order_updates` | default true |
| `notification_preferences` | `payment_alerts` | default true |
| `notification_preferences` | `supplier_alerts` | default true |
| `notification_preferences` | `price_alerts` | default true |
| `notification_preferences` | `email_notifications` | default false |
| `notification_preferences` | `push_notifications` | default true |
| `notification_preferences` | `sound_enabled` | default true |
| `notification_preferences` | `created_at` | default now() |
| `notification_preferences` | `updated_at` | default now() |
| `notifications` | `id` | PK; default gen_random_uuid() |
| `notifications` | `user_id` | obrigatório |
| `notifications` | `type` | obrigatório |
| `notifications` | `title` | obrigatório |
| `notifications` | `message` | obrigatório |
| `notifications` | `priority` | default 'medium' |
| `notifications` | `data` | default '{}' |
| `notifications` | `read` | default false |
| `notifications` | `sent_push` | default false |
| `notifications` | `sent_email` | default false |
| `notifications` | `created_at` | default now() |
| `notifications` | `tenant_id` | obrigatório; FK → tenants.id |
| `categorias` | `id` | PK; default gen_random_uuid() |
| `categorias` | `nome` | obrigatório |
| `categorias` | `cor` | default '#6366f1' |
| `categorias` | `ativo` | default true |
| `categorias` | `created_at` | default now() |
| `categorias` | `updated_at` | default now() |
| `categorias` | `organization_id` | FK → organizations.id |
| `categorias` | `tenant_id` | obrigatório; FK → tenants.id |
| `categorias` | `codigo_unspsc` | FK → unspsc_codes.code |
| `produtos` | `id` | PK; default gen_random_uuid() |
| `produtos` | `codigo` | obrigatório; único |
| `produtos` | `nome` | obrigatório |
| `produtos` | `unidade` | default 'un' |
| `produtos` | `categoria_id` | FK → categorias.id |
| `produtos` | `preco_medio` | default 0 |
| `produtos` | `estoque_minimo` | default 0 |
| `produtos` | `ativo` | default true |
| `produtos` | `created_at` | default now() |
| `produtos` | `updated_at` | default now() |
| `produtos` | `preco_referencia` | default 0 |
| `produtos` | `ultimo_preco` | default 0 |
| `produtos` | `fornecedor_preferencial_id` | FK → fornecedores.id |
| `produtos` | `tags` | default '{}' |
| `produtos` | `organization_id` | FK → organizations.id |
| `produtos` | `tenant_id` | obrigatório; FK → tenants.id |
| `produtos` | `tipo_produto` | default 'fabricado' |
| `produtos` | `lead_time_dias` | default 0 |
| `pedidos` | `id` | PK; default gen_random_uuid() |
| `pedidos` | `numero` | obrigatório; único |
| `pedidos` | `solicitacao_id` | FK → solicitacoes.id |
| `pedidos` | `cotacao_id` | FK → cotacoes.id |
| `pedidos` | `fornecedor_id` | obrigatório; FK → fornecedores.id |
| `pedidos` | `valor_total` | obrigatório |
| `pedidos` | `valor_frete` | default 0 |
| `pedidos` | `desconto` | default 0 |
| `pedidos` | `status` | default 'pendente'; CHECK status IN ('pendente', 'aprovado', 'enviado', 'em_transito', 'entregue', 'parcial', 'cancelado') |
| `pedidos` | `data_emissao` | default CURRENT_DATE |
| `pedidos` | `comprador_id` | FK → users.id |
| `pedidos` | `aprovador_id` | FK → users.id |
| `pedidos` | `created_at` | default now() |
| `pedidos` | `updated_at` | default now() |
| `pedidos` | `moeda` | default 'BRL' |
| `pedidos` | `taxa_conversao` | default 1.0 |
| `pedidos` | `organization_id` | FK → organizations.id |
| `pedidos` | `tenant_id` | obrigatório; FK → tenants.id |
| `pedidos` | `currency` | default 'BRL'; FK → currencies.code |
| `pedido_itens` | `id` | PK; default gen_random_uuid() |
| `pedido_itens` | `pedido_id` | FK → pedidos.id ON DELETE CASCADE |
| `pedido_itens` | `produto_id` | FK → produtos.id |
| `pedido_itens` | `descricao` | obrigatório |
| `pedido_itens` | `quantidade` | default 1 |
| `pedido_itens` | `unidade` | default 'un' |
| `pedido_itens` | `valor_unitario` | obrigatório |
| `pedido_itens` | `valor_total` | obrigatório |
| `pedido_itens` | `quantidade_recebida` | default 0 |
| `pedido_itens` | `created_at` | default now() |
| `pedido_itens` | `tenant_id` | obrigatório; FK → tenants.id |
| `pedido_itens` | `unspsc_code` | FK → unspsc_codes.code |
| `pedido_itens` | `status_producao` | default 'pendente' |
| `pagamentos` | `id` | PK; default gen_random_uuid() |
| `pagamentos` | `numero` | obrigatório; único |
| `pagamentos` | `pedido_id` | FK → pedidos.id |
| `pagamentos` | `fornecedor_id` | obrigatório; FK → fornecedores.id |
| `pagamentos` | `valor` | obrigatório |
| `pagamentos` | `valor_pago` | default 0 |
| `pagamentos` | `status` | default 'pendente'; CHECK status IN ('pendente', 'aprovado', 'agendado', 'pago', 'parcial', 'cancelado', 'atrasado') |
| `pagamentos` | `data_vencimento` | obrigatório |
| `pagamentos` | `forma_pagamento` | CHECK forma_pagamento IN ('boleto', 'pix', 'transferencia', 'cartao', 'cheque') |
| `pagamentos` | `aprovador_id` | FK → users.id |
| `pagamentos` | `created_by` | FK → users.id |
| `pagamentos` | `created_at` | default now() |
| `pagamentos` | `updated_at` | default now() |
| `pagamentos` | `organization_id` | FK → organizations.id |
| `pagamentos` | `cost_center_id` | FK → cost_centers.id |
| `pagamentos` | `tenant_id` | obrigatório; FK → tenants.id |
| `permissions` | `id` | PK; default gen_random_uuid() |
| `permissions` | `name` | obrigatório; único |
| `permissions` | `module` | obrigatório |
| `permissions` | `action` | obrigatório |
| `permissions` | `created_at` | default now() |
| `permissions` | `(tabela)` | UNIQUE(module, action) |
| `role_permissions` | `id` | PK; default gen_random_uuid() |
| `role_permissions` | `role` | obrigatório |
| `role_permissions` | `permission_id` | obrigatório; FK → permissions.id ON DELETE CASCADE |
| `role_permissions` | `created_at` | default now() |
| `role_permissions` | `created_by` | FK → users.id |
| `role_permissions` | `(tabela)` | UNIQUE(role, permission_id) |
| `mfa_settings` | `id` | PK; default gen_random_uuid() |
| `mfa_settings` | `user_id` | obrigatório; único; FK → users.id ON DELETE CASCADE |
| `mfa_settings` | `mfa_enabled` | default false |
| `mfa_settings` | `mfa_method` | default 'totp' |
| `mfa_settings` | `created_at` | default now() |
| `mfa_settings` | `updated_at` | default now() |
| `login_attempts` | `id` | PK; default gen_random_uuid() |
| `login_attempts` | `email` | obrigatório |
| `login_attempts` | `success` | default false |
| `login_attempts` | `created_at` | default now() |
| `blocked_ips` | `id` | PK; default gen_random_uuid() |
| `blocked_ips` | `ip_address` | obrigatório; único |
| `blocked_ips` | `reason` | obrigatório |
| `blocked_ips` | `blocked_by` | FK → users.id |
| `blocked_ips` | `blocked_at` | default now() |
| `blocked_ips` | `permanent` | default false |
| `blocked_ips` | `attempts_count` | default 0 |
| `ip_whitelist` | `id` | PK; default gen_random_uuid() |
| `ip_whitelist` | `ip_address` | obrigatório; único |
| `ip_whitelist` | `created_by` | FK → users.id |
| `ip_whitelist` | `created_at` | default now() |
| … +1082 linhas — lista completa em `context.json` | | |

## D. Automações no banco (triggers e funções — regras que rodam sozinhas)

| Trigger | Quando | Tabela | Executa | Condição |
|---|---|---|---|---|
| trigger_saved_filters_updated_at | BEFORE UPDATE | `saved_filters` | `update_saved_filters_updated_at` |  |
| trigger_single_default_filter | BEFORE INSERT OR UPDATE OF IS_DEFAULT | `saved_filters` | `ensure_single_default_filter` | `NEW.is_default = true` |
| solicitacoes_updated_at | BEFORE UPDATE | `solicitacoes` | `update_updated_at` |  |
| update_profiles_updated_at | BEFORE UPDATE | `profiles` | `update_updated_at_column` |  |
| update_push_subscriptions_updated_at | BEFORE UPDATE | `push_subscriptions` | `update_updated_at_column` |  |
| update_notification_preferences_updated_at | BEFORE UPDATE | `notification_preferences` | `update_updated_at_column` |  |
| update_categorias_updated_at | BEFORE UPDATE | `categorias` | `update_updated_at_column` |  |
| update_produtos_updated_at | BEFORE UPDATE | `produtos` | `update_updated_at_column` |  |
| update_mfa_settings_updated_at | BEFORE UPDATE | `mfa_settings` | `update_updated_at_column` |  |
| update_webauthn_credentials_updated_at | BEFORE UPDATE | `webauthn_credentials` | `update_updated_at_column` |  |
| update_user_tour_preferences_updated_at | BEFORE UPDATE | `user_tour_preferences` | `update_updated_at_column` |  |
| update_contact_notes_updated_at | BEFORE UPDATE | `contact_notes` | `update_updated_at_column` |  |
| update_approval_rules_updated_at | BEFORE UPDATE | `approval_rules` | `update_approval_updated_at` |  |
| update_approval_delegations_updated_at | BEFORE UPDATE | `approval_delegations` | `update_approval_updated_at` |  |
| update_approval_workflows_updated_at | BEFORE UPDATE | `approval_workflows` | `update_approval_updated_at` |  |
| validate_solicitacao_status | BEFORE UPDATE OF STATUS | `solicitacoes` | `validate_solicitacao_status_transition` |  |
| validate_pedido_status | BEFORE UPDATE OF STATUS | `pedidos` | `validate_pedido_status_transition` |  |
| update_department_budgets_updated_at | BEFORE UPDATE | `department_budgets` | `update_updated_at_column` |  |
| update_fiscal_documents_updated_at | BEFORE UPDATE | `fiscal_documents` | `update_updated_at_column` |  |
| update_repurchase_suggestions_updated_at | BEFORE UPDATE | `repurchase_suggestions` | `update_updated_at_column` |  |
| trg_auto_approve_low_value | BEFORE INSERT | `solicitacoes` | `auto_approve_low_value_solicitacao` |  |
| trg_auto_transition_on_cotacao_approval | AFTER UPDATE | `cotacoes` | `auto_transition_solicitacao_on_cotacao_approval` |  |
| trg_auto_create_pagamento_on_delivery | AFTER UPDATE | `pedidos` | `auto_create_pagamento_on_delivery` |  |
| trg_auto_update_supplier_score | AFTER UPDATE | `pedidos` | `auto_update_supplier_score_on_delivery` |  |
| trg_update_saldo_on_pedido | AFTER INSERT OR UPDATE OR DELETE | `pedidos` | `trigger_update_saldo_on_pedido` |  |
| trg_update_saldo_on_pagamento | AFTER INSERT OR UPDATE OR DELETE | `pagamentos` | `trigger_update_saldo_on_pagamento` |  |
| trg_validate_solicitacao_status | BEFORE UPDATE | `solicitacoes` | `validate_solicitacao_status_transition` |  |
| trg_validate_pagamento_status | BEFORE UPDATE | `pagamentos` | `validate_pagamento_status_transition` |  |
| trg_recalculate_qualification_score | AFTER INSERT OR UPDATE | `supplier_documents` | `trigger_recalculate_qualification_score` |  |
| trg_update_solicitacoes_updated_at | BEFORE UPDATE | `solicitacoes` | `update_updated_at_column` |  |
| trg_update_pedidos_updated_at | BEFORE UPDATE | `pedidos` | `update_updated_at_column` |  |
| trg_update_pagamentos_updated_at | BEFORE UPDATE | `pagamentos` | `update_updated_at_column` |  |
| trg_update_cotacoes_updated_at | BEFORE UPDATE | `cotacoes` | `update_updated_at_column` |  |
| trg_update_fornecedores_updated_at | BEFORE UPDATE | `fornecedores` | `update_updated_at_column` |  |
| trg_update_contracts_updated_at | BEFORE UPDATE | `contracts` | `update_updated_at_column` |  |
| trg_validate_cotacao_status | BEFORE UPDATE | `cotacoes` | `validate_cotacao_status_transition` |  |
| trg_update_contract_penalties_updated_at | BEFORE UPDATE | `contract_penalties` | `update_updated_at_column` |  |
| trg_auto_penalty_on_late_delivery | AFTER UPDATE | `pedidos` | `auto_calculate_delivery_penalty` |  |
| trg_auto_block_low_score | AFTER UPDATE | `fornecedores` | `auto_block_low_score_supplier` |  |
| trg_calc_checklist_score | BEFORE INSERT OR UPDATE | `receiving_checklists` | `calc_checklist_overall_score` |  |
| trg_apply_penalty_escalation | BEFORE INSERT | `contract_penalties` | `apply_penalty_escalation` |  |
| trg_cotacao_approved_status | AFTER UPDATE | `cotacoes` | `trg_cotacao_approved_transition` |  |
| trg_pedido_entregue_status | AFTER UPDATE | `pedidos` | `trg_pedido_entregue_transition` |  |
| set_devolucoes_updated_at | BEFORE UPDATE | `devolucoes` | `update_updated_at_column` |  |
| set_creditos_updated_at | BEFORE UPDATE | `creditos_fornecedor` | `update_updated_at_column` |  |
| update_licitacoes_updated_at | BEFORE UPDATE | `licitacoes` | `update_updated_at_column` |  |
| update_licitacao_propostas_updated_at | BEFORE UPDATE | `licitacao_propostas` | `update_updated_at_column` |  |
| trg_sanitize_session_token | BEFORE INSERT | `active_sessions` | `sanitize_session_token` |  |
| update_dependency_health_updated_at | BEFORE UPDATE | `dependency_health` | `update_updated_at_column` |  |
| trg_ufp_updated_at | BEFORE UPDATE | `user_filter_preferences` | `update_updated_at_column` |  |
| tr_update_best_bid | AFTER INSERT | `licitacao_lances` | `update_licitacao_best_bid` |  |
| trigger_log_budget_changes | AFTER INSERT OR UPDATE OR DELETE | `department_budgets` | `log_budget_changes` |  |
| trg_update_budget_on_solicitacao | AFTER INSERT OR UPDATE OR DELETE | `solicitacoes` | `update_budget_on_solicitacao_change` |  |
| trg_pedido_budget_sync | AFTER INSERT OR UPDATE | `pedidos` | `handle_pedido_budget_realization` |  |
| tr_budget_transaction_update | AFTER INSERT | `budget_transactions` | `update_cost_center_budget_totals` |  |
| update_dashboard_layouts_updated_at | BEFORE UPDATE | `dashboard_layouts` | `update_updated_at_column` |  |
| trg_dashboard_filter_favorites_updated_at | BEFORE UPDATE | `dashboard_filter_favorites` | `update_updated_at_column` |  |
| trg_calculate_cotacao_scores | BEFORE INSERT OR UPDATE OF VALOR_TOTAL, PRAZO_ENTREGA, FORNECEDOR_ID | `cotacoes` | `calculate_cotacao_scores` |  |
| trg_recalculate_all_cotacoes | AFTER INSERT OR UPDATE OF VALOR_TOTAL, PRAZO_ENTREGA OR DELETE | `cotacoes` | `recalculate_all_solicitacao_cotacoes` |  |
| tr_log_cotacao_selection | AFTER UPDATE OF SELECIONADA | `cotacoes` | `log_cotacao_action` |  |
| update_tenants_updated_at | BEFORE UPDATE | `tenants` | `update_updated_at_column` |  |
| update_sso_configurations_updated_at | BEFORE UPDATE | `sso_configurations` | `update_updated_at_column` |  |
| update_punchout_catalogs_updated_at | BEFORE UPDATE | `punchout_catalogs` | `update_updated_at_column` |  |
| update_erp_connections_updated_at | BEFORE UPDATE | `erp_connections` | `update_updated_at_column` |  |
| update_fiscal_events_updated_at | BEFORE UPDATE | `fiscal_events` | `update_updated_at_column` |  |
| update_sourcing_projects_updated_at | BEFORE UPDATE | `sourcing_projects` | `update_updated_at_column` |  |
| update_savings_tracker_updated_at | BEFORE UPDATE | `savings_tracker` | `update_updated_at_column` |  |
| trigger_update_estoque_saldo | AFTER INSERT | `estoque_movimentacoes` | `update_estoque_saldo` |  |
| trigger_set_estoque_timestamp | BEFORE UPDATE | `estoque` | `update_updated_at_column` |  |
| update_produto_fornecedores_updated_at | BEFORE UPDATE | `produto_fornecedores` | `update_updated_at_column` |  |
| trg_grant_tenant_access | AFTER INSERT OR UPDATE OF ORGANIZATION_ID | `tenants` | `grant_tenant_access_on_insert` |  |
| trg_aliquotas_updated_at | BEFORE UPDATE | `aliquotas_tributarias` | `update_updated_at_column` |  |
| trg_webhook_events_updated_at | BEFORE UPDATE | `webhook_events` | `update_updated_at_column` |  |
| trg_outbox_updated_at | BEFORE UPDATE | `integration_outbox` | `update_updated_at_column` |  |
| trg_alert_on_outbox_dead | AFTER UPDATE | `integration_outbox` | `alert_on_outbox_dead` |  |
| trg_normalize_email | BEFORE INSERT OR UPDATE OF EMAIL, PHONE | `profiles` | `normalize_email_lowercase` |  |
| trg_normalize_email | BEFORE INSERT OR UPDATE OF EMAIL | `login_attempts` | `normalize_email_lowercase` |  |
| trg_normalize_email | BEFORE INSERT OR UPDATE OF EMAIL | `password_reset_requests` | `normalize_email_lowercase` |  |
| trg_normalize_email | BEFORE INSERT OR UPDATE OF EMAIL | `account_lockouts` | `normalize_email_lowercase` |  |
| trg_normalize_email | BEFORE INSERT OR UPDATE OF EMAIL | `fornecedores` | `normalize_email_lowercase` |  |
| trg_normalize_email | BEFORE INSERT OR UPDATE OF EMAIL | `webauthn_challenges` | `normalize_email_lowercase` |  |
| trg_normalize_cnpj | BEFORE INSERT OR UPDATE OF CNPJ | `fornecedores` | `normalize_cnpj_digits` |  |
| trg_normalize_cnpj | BEFORE INSERT OR UPDATE OF CNPJ | `tenants` | `normalize_cnpj_digits` |  |
| trg_normalize_phone_fornecedores | BEFORE INSERT OR UPDATE OF TELEFONE | `fornecedores` | `tg_normalize_phone` |  |
| trg_normalize_phone_profiles | BEFORE INSERT OR UPDATE OF PHONE | `profiles` | `tg_normalize_phone` |  |
| trg_audit_user_roles | AFTER INSERT OR UPDATE OR DELETE | `user_roles` | `audit_user_roles_changes` |  |
| trg_alert_subs_updated | BEFORE UPDATE | `alert_subscriptions` | `update_updated_at_column` |  |
| trg_secret_rotation_maintain | BEFORE INSERT OR UPDATE | `secret_rotation_schedule` | `tg_secret_rotation_maintain` |  |
| trigger_check_telemetry_alerts | AFTER INSERT | `telemetry_logs` | `check_telemetry_alerts` |  |
| trg_xbz_credentials_updated | BEFORE UPDATE | `xbz_credentials` | `update_updated_at_column` |  |
| trg_xbz_pedidos_updated | BEFORE UPDATE | `xbz_pedidos` | `update_updated_at_column` |  |
| trg_xbz_produtos_updated | BEFORE UPDATE | `xbz_produtos` | `update_updated_at_column` |  |
| trg_xbz_produto_fiscal_updated | BEFORE UPDATE | `xbz_produto_fiscal` | `update_updated_at_column` |  |
| trg_xbz_cores_updated | BEFORE UPDATE | `xbz_cores` | `update_updated_at_column` |  |
| trg_spot_produtos_updated | BEFORE UPDATE | `spot_produtos` | `update_updated_at_column` |  |
| trg_spot_skus_updated | BEFORE UPDATE | `spot_skus` | `update_updated_at_column` |  |
| trg_spot_custom_updated | BEFORE UPDATE | `spot_customization_options` | `update_updated_at_column` |  |
| trg_spot_estoque_updated | BEFORE UPDATE | `spot_estoque` | `update_updated_at_column` |  |
| trg_pedido_created_status | AFTER INSERT | `pedidos` | `auto_transition_solicitacao_on_pedido_created` |  |
| trg_validate_cnpj | BEFORE INSERT OR UPDATE OF CNPJ | `fornecedores` | `tg_fornecedores_validate_cnpj` |  |
| a0_guard_profile_org_change | BEFORE INSERT OR UPDATE OF TENANT_ID, CURRENT_ORGANIZATION_ID | `profiles` | `guard_profile_org_change` |  |
| a0_guard_solicitacao_escrita | BEFORE INSERT OR UPDATE | `solicitacoes` | `guard_solicitacao_escrita` |  |
| on_auth_user_created | AFTER INSERT | `auth.users` | `handle_new_user` |  |
| trg_sanitize_audit_metadata | BEFORE INSERT | `audit_logs` | `sanitize_audit_metadata` |  |
| tr_enforce_audit_integrity | BEFORE INSERT | `audit_logs` | `enforce_audit_integrity` |  |
| trig_cleanup_telemetry | AFTER INSERT | `query_telemetry` | `cleanup_old_telemetry` |  |
| z_audit_logs_hash | BEFORE INSERT | `audit_logs` | `audit_logs_encadear_hash` |  |
| z_audit_logs_append_only | BEFORE UPDATE OR DELETE | `audit_logs` | `audit_logs_bloquear_alteracao` |  |
| z_audit_logs_no_truncate | BEFORE TRUNCATE | `audit_logs` | `audit_logs_bloquear_truncate` |  |
| trg_workflow_approved_promotes_solicitacao | AFTER UPDATE OF STATUS | `approval_workflows` | `auto_transition_solicitacao_on_workflow_approved` | `NEW.status = 'approved'` |
| trg_assign_numero_solicitacao | BEFORE INSERT | `solicitacoes` | `assign_numero_solicitacao` |  |

Erros lançados por funções SQL (`RAISE EXCEPTION` = regra de negócio no banco):

| Função | Mensagem | Origem |
|---|---|---|
| `validate_solicitacao_status_transition` | Transição de status inválida: % → % | `supabase/migrations/20260315150226_a87f820e-b073-45d2-8637-5fbb0dc5fbb9.sql` |
| `count_legacy_storage_urls` | Forbidden: admin only | `supabase/migrations/20260619192533_d21a4e4f-4249-4d39-9182-edb3f6ed11ce.sql` |
| `generate_sequential_number` | invalid table_name: % | `supabase/migrations/20260711192326_2436defe-a226-44fc-8966-5ba2ecdce7dc.sql` |
| `generate_sequential_number` | invalid prefix | `supabase/migrations/20260711192326_2436defe-a226-44fc-8966-5ba2ecdce7dc.sql` |
| `resolve_alert` | auth required | `supabase/migrations/20260712202749_bb709bc6-558f-4e7d-97d1-2e978797b632.sql` |
| `resolve_alert` | admin role required | `supabase/migrations/20260712202749_bb709bc6-558f-4e7d-97d1-2e978797b632.sql` |
| `resolve_alert` | alert not found or already resolved | `supabase/migrations/20260712202749_bb709bc6-558f-4e7d-97d1-2e978797b632.sql` |
| `get_db_health_snapshot` | access denied: admin role required | `supabase/migrations/20260713110420_3e5900b4-7895-405f-8107-826f60c20a6a.sql` |
| `execute_read_query` | Somente EXPLAIN é permitido | `supabase/migrations/20261107150000_execute_read_query.sql` |
| `execute_read_query` | EXPLAIN somente para SELECT/WITH (leitura) | `supabase/migrations/20261107150000_execute_read_query.sql` |
| `get_fornecedores_kpis` | forbidden | `supabase/migrations/20261112223649_security_papel_empresa_kpis.sql` |
| `get_pagamentos_kpis` | forbidden | `supabase/migrations/20261112223649_security_papel_empresa_kpis.sql` |
| `get_pedidos_kpis` | forbidden | `supabase/migrations/20261112223649_security_papel_empresa_kpis.sql` |
| `get_solicitacoes_kpis` | forbidden | `supabase/migrations/20261112223649_security_papel_empresa_kpis.sql` |
| `tg_fornecedores_validate_cnpj` | new row for relation "fornecedores" violates check constraint "fornecedores_cnpj_valid" | `supabase/migrations/20261113123212_fornecedores_cnpj_valida_so_no_cadastro.sql` |
| `get_compras_dashboard_metrics` | not authenticated | `supabase/migrations/20261113123531_compras_dashboard_backlog_rotulos.sql` |
| `get_compras_dashboard_metrics` | forbidden | `supabase/migrations/20261113123531_compras_dashboard_backlog_rotulos.sql` |
| `guard_profile_org_change` | Usuário sem vínculo com o tenant % | `supabase/migrations/20261113123738_comprador_nao_altera_dados_de_outros.sql` |
| `guard_profile_org_change` | Usuário sem vínculo com a organização % | `supabase/migrations/20261113123738_comprador_nao_altera_dados_de_outros.sql` |
| `guard_solicitacao_escrita` | Solicitação deve ser criada como pendente (recebido: %) | `supabase/migrations/20261113123738_comprador_nao_altera_dados_de_outros.sql` |
| `guard_solicitacao_escrita` | Organização da solicitação não é a do usuário | `supabase/migrations/20261113123738_comprador_nao_altera_dados_de_outros.sql` |
| `guard_solicitacao_escrita` | Sem permissão para alterar esta solicitação | `supabase/migrations/20261113123738_comprador_nao_altera_dados_de_outros.sql` |
| `audit_logs_bloquear_alteracao` | audit_logs e append-only: UPDATE bloqueado (ISO 27001 A.8.15 / LGPD art.16) | `supabase/migrations/20261117210000_audit_logs_append_only_hash_encadeado.sql` |
| `audit_logs_bloquear_alteracao` | audit_logs e append-only: DELETE permitido apenas pela retencao legal de 5 anos (apply_lgpd_retention) | `supabase/migrations/20261117210000_audit_logs_append_only_hash_encadeado.sql` |
| `audit_logs_bloquear_truncate` | audit_logs e append-only: TRUNCATE bloqueado (ISO 27001 A.8.15) | `supabase/migrations/20261117210000_audit_logs_append_only_hash_encadeado.sql` |
| `verificar_integridade_audit_logs` | Apenas administradores podem verificar a integridade da auditoria | `supabase/migrations/20261117210000_audit_logs_append_only_hash_encadeado.sql` |
| `get_compras_sla_metrics` | not authenticated | `supabase/migrations/20261123093000_sla_real_no_dashboard.sql` |
| `get_compras_sla_metrics` | forbidden | `supabase/migrations/20261123093000_sla_real_no_dashboard.sql` |
| `validate_cotacao_status_transition` | Transição de status de cotação inválida: % → % | `supabase/migrations/20261125170000_matriz_transicoes_alinhada.sql` |
| `validate_pagamento_status_transition` | Transição de status inválida: % → % | `supabase/rollbacks/20261126120000_revert_alinha_transicoes_pagamento_pedido.sql` |
| `validate_pedido_status_transition` | Transição de status inválida: % → % | `supabase/rollbacks/20261126120000_revert_alinha_transicoes_pagamento_pedido.sql` |

## E. Estados, máquinas de estado e transições

### E.1 Colunas de status no banco

| Tabela | Coluna | Valores permitidos (enum/CHECK) | Default |
|---|---|---|---|
| `solicitacoes` | `status` | `aprovada`, `cancelada`, `concluida`, `em_andamento`, `em_cotacao`, `pendente`, `rejeitada` | `pendente` |
| `cotacoes` | `status` | `analisando`, `aprovada`, `expirada`, `pendente`, `rejeitada` | `pendente` |
| `cotacoes` | `follow_up_status` | **livre (sem enum/CHECK)** |  |
| `fornecedores` | `status` | `ativo`, `bloqueado`, `inativo`, `pendente` | `ativo` |
| `contracts` | `status` | **livre (sem enum/CHECK)** | `draft` |
| `pedidos` | `status` | `aprovado`, `cancelado`, `em_transito`, `entregue`, `enviado`, `parcial`, `pendente` | `pendente` |
| `pedido_itens` | `status_producao` | `pendente`, `primeira_peca`, `em_producao`, `personalizando`, `concluido` | `pendente` |
| `pagamentos` | `status` | `agendado`, `aprovado`, `atrasado`, `cancelado`, `pago`, `parcial`, `pendente` | `pendente` |
| `password_reset_requests` | `status` | `approved`, `completed`, `expired`, `pending`, `rejected` | `pending` |
| `approval_workflows` | `status` | `approved`, `cancelled`, `escalated`, `pending`, `rejected` | `pending` |
| `approval_steps` | `etapa` | **livre (sem enum/CHECK)** | `1` |
| `approval_steps` | `status` | `approved`, `pending`, `rejected`, `skipped` | `pending` |
| `spot_pedidos` | `status` | **livre (sem enum/CHECK)** | `Submetida` |
| `fiscal_documents` | `status` | **livre (sem enum/CHECK)** | `pendente` |
| `fiscal_documents` | `reconciliation_status` | **livre (sem enum/CHECK)** | `pending` |
| `fiscal_documents` | `sefaz_status` | **livre (sem enum/CHECK)** |  |
| `repurchase_suggestions` | `status` | **livre (sem enum/CHECK)** | `sugerido` |
| `contract_penalties` | `status` | **livre (sem enum/CHECK)** | `pending` |
| `receiving_checklists` | `status` | **livre (sem enum/CHECK)** | `approved` |
| `devolucoes` | `status` | **livre (sem enum/CHECK)** | `rascunho` |
| `devolucao_itens` | `estado_item` | **livre (sem enum/CHECK)** | `pendente` |
| `creditos_fornecedor` | `status` | **livre (sem enum/CHECK)** | `ativo` |
| `licitacoes` | `status` | **livre (sem enum/CHECK)** | `rascunho` |
| `licitacao_propostas` | `status` | **livre (sem enum/CHECK)** | `submetida` |
| `sourcing_pipeline` | `status` | `baseline`, `cancelled`, `completed`, `execution`, `identification`, `negotiation`, `strategy` | `identification` |
| `sourcing_events` | `status` | `draft`, `published`, `in_progress`, `evaluation`, `awarded`, `cancelled` | `draft` |
| `sourcing_invitations` | `status` | `pending`, `viewed`, `declined`, `submitted`, `expired` | `pending` |
| `auction_bids` | `status` | `valid`, `rejected`, `withdrawn`, `winning` | `valid` |
| `tenants` | `status` | `active`, `suspended`, `trial`, `churned` | `trial` |
| `scim_provisioning_log` | `status` | **livre (sem enum/CHECK)** |  |
| `punchout_catalogs` | `last_test_status` | **livre (sem enum/CHECK)** |  |
| `punchout_sessions` | `status` | `cancelled`, `completed`, `error`, `opened` | `opened` |
| `erp_sync_log` | `status` | `error`, `pending`, `retry`, `success` |  |
| `fiscal_events` | `status` | **livre (sem enum/CHECK)** |  |
| `sourcing_projects` | `status` | `backlog`, `planning`, `execution`, `negotiation`, `implementation`, `completed`, `cancelled` | `backlog` |
| `workflow_instances` | `status` | `pending`, `running`, `completed`, `failed`, `cancelled` | `pending` |
| `workflow_approvals` | `status` | **livre (sem enum/CHECK)** | `pending` |
| `workflow_tasks` | `status` | `cancelled`, `completed`, `pending`, `rejected` | `pending` |
| `workflow_audit_log` | `old_state` | **livre (sem enum/CHECK)** |  |
| `workflow_audit_log` | `new_state` | **livre (sem enum/CHECK)** |  |
| `system_alerts` | `dispatch_status` | **livre (sem enum/CHECK)** |  |
| `webhook_events` | `status` | `failed`, `processed`, `processing` | `processed` |
| `integration_outbox` | `status` | `dead`, `delivered`, `pending`, `retrying` | `pending` |
| `health_scan_runs` | `status` | **livre (sem enum/CHECK)** |  |
| `cron_heartbeats` | `last_status` | `error`, `success`, `unknown` | `unknown` |
| `xbz_pedidos` | `id_status` | **livre (sem enum/CHECK)** |  |
| `xbz_pedidos` | `status_logistico` | **livre (sem enum/CHECK)** |  |
| `xbz_pedidos` | `id_lote_debito_status` | **livre (sem enum/CHECK)** |  |
| `xbz_pedidos` | `lote_debito_status_cliente` | **livre (sem enum/CHECK)** |  |
| `xbz_carrinho_log` | `response_status` | **livre (sem enum/CHECK)** |  |
| `spot_api_sync_log` | `status` | **livre (sem enum/CHECK)** | `success` |
| `supplier_documents` | `status` | **livre (sem enum/CHECK)** |  |
| `supplier_qualification_scores` | `qualification_status` | **livre (sem enum/CHECK)** |  |

### E.2 Mapas de transição declarados no código

- **fluxos** (`src/features/solicitacoes/fluxoAprovacao.ts`):
  ```ts
  
  ```
- **VALID_SOLICITACAO_TRANSITIONS** (`src/features/solicitacoes/hooks/useSolicitacoes.ts`):
  ```ts
  pendente: ['em_cotacao', 'aprovada', 'rejeitada', 'cancelada'], em_cotacao: ['aprovada', 'rejeitada', 'cancelada'], aprovada: ['em_andamento', 'cancelada'], em_andamento: ['concluida', 'cancelada'], rejeitada: ['pendente'], concluida: [], cancelada: [],
  ```
- **VALID_TRANSITIONS** (`src/hooks/useDevolucoes.ts`):
  ```ts
  rascunho: ['solicitada', 'cancelada'], solicitada: ['aprovada', 'rejeitada', 'cancelada'], aprovada: ['em_transito', 'cancelada'], em_transito: ['recebida_fornecedor'], recebida_fornecedor: ['credito_emitido', 'reposicao_enviada', 'concluida'], credito_emitido: ['concluida'], reposicao_enviada: ['concluida'], concluida: [], rejeitada: ['solicitada'], cancelada: [],
  ```
- **transitions** (`src/pages/devolucoes/DevolucoesModals.tsx`):
  ```ts
  solicitada: [{ label: "Aprovar", status: "aprovada", variant: "default" }, { label: "Rejeitar", status: "rejeitada", variant: "destructive" }], aprovada: [{ label: "Marcar em Trânsito", status: "em_transito", variant: "default" }], em_transito: [{ label: "Confirmar Recebimento", status: "recebida_fornecedor", variant: "default" }], recebida_fornecedor: [ { label: "Emitir Crédito", status: "credito_emitido", variant: "default" }, { label: "Confirmar Reposição", status: "reposicao_enviada", variant: "default" }, { label: "Concluir", status: "concluida", variant: "outline" }, ], credito_emitido: [{ label: "Concluir", status: "concluida", variant: "default" }], reposicao_enviada: [{ label: "Conc …
  ```
- **VALID_TRANSITIONS** (`src/pages/kanban/KanbanWorkflow.tsx`):
  ```ts
  pendente: ["em_cotacao", "aprovada", "rejeitada", "cancelada"], em_cotacao: ["aprovada", "rejeitada", "cancelada"], aprovada: ["em_andamento", "cancelada"], em_andamento: ["concluida", "cancelada"], rejeitada: ["pendente"], concluida: [], cancelada: [],
  ```

### E.3 Valores de status usados no código (escreve / compara / filtra)

| Campo | Valor | Uso | Onde |
|---|---|---|---|
| `type` | `ADD_TOAST` | compara, escreve | `src/hooks/use-toast.ts` |
| `type` | `Aprovação` | escreve | `src/hooks/useExecutiveDashboardData.ts` |
| `type` | `DISMISS_TOAST` | compara, escreve | `src/hooks/use-toast.ts` |
| `type` | `IA` | escreve | `src/components/compras/SourcingIntelligenceWidget.tsx` |
| `type` | `REAL` | compara, escreve | `src/components/compras/SourcingIntelligenceWidget.tsx` |
| `type` | `REMOVE_TOAST` | compara, escreve | `src/hooks/use-toast.ts` |
| `type` | `RFQ` | escreve | `src/pages/sourcing/RFxCreate.tsx` |
| `type` | `UPDATE_TOAST` | compara, escreve | `src/hooks/use-toast.ts` |
| `type` | `achievement` | escreve | `src/components/ui/celebration.tsx` |
| `type` | `active` | escreve | `src/features/layout/components/MainLayout.tsx` |
| `type` | `ai` | escreve | `src/stores/dashboardLayoutStore.ts` |
| `type` | `approve_step` | compara | `src/components/compras/approval/WorkflowDLQPanel.tsx`<br>`src/hooks/useApprovalWorkflow.ts` |
| `type` | `array` | escreve | `supabase/functions/ai-negotiation/index.ts` |
| `type` | `auction` | compara | `src/pages/sourcing/RFxDetails.tsx` |
| `type` | `authentication` | escreve, filtra | `supabase/functions/webauthn-authenticate/index.ts` |
| `type` | `buyer` | compara, escreve | `src/components/compras/ExecutiveDashboard.tsx`<br>`src/components/compras/executive/ExecutiveDrillDownModal.tsx` |
| `type` | `calendar` | escreve | `src/stores/dashboardLayoutStore.ts` |
| `type` | `category` | compara, escreve | `src/components/compras/executive/ExecutiveDrillDownModal.tsx`<br>`src/components/compras/executive/executiveDashboardData.ts` |
| `type` | `chart` | escreve | `src/stores/dashboardLayoutStore.ts` |
| `type` | `clear-filters` | escreve | `src/hooks/useClearFiltersFlow.tsx` |
| `type` | `context` | escreve | `supabase/functions/alert-dispatcher/index.ts` |
| `type` | `contract_expiring` | escreve | `supabase/functions/check-expiry-alerts/index.ts` |
| `type` | `contratos` | compara, escreve | `src/features/layout/components/AdvancedSearch.tsx`<br>`src/features/layout/components/search/SearchResultsList.tsx` |
| `type` | `cotacao_expiring` | escreve | `supabase/functions/check-expiry-alerts/index.ts` |
| `type` | `cotacao_followup` | escreve, filtra | `src/pages/pedidos/PedidoDetailsDialog.tsx`<br>`supabase/functions/check-cotacao-followup/index.ts`<br>`supabase/functions/check-expiry-alerts/index.ts` |
| `type` | `create` | compara, escreve | `src/hooks/useOfflineSync.ts` |
| `type` | `create_workflow` | compara | `src/hooks/useApprovalWorkflow.ts` |
| `type` | `critical` | compara | `src/components/compras/BuyerPerformanceAlerts.tsx`<br>`src/components/compras/SupplierAlertsPanel.tsx`<br>`src/hooks/useApprovalNotifications.ts` |
| `type` | `delegation` | escreve | `src/components/compras/DynamicApprovalMatrix.tsx` |
| `type` | `delete` | compara | `src/hooks/useOfflineSync.ts` |
| `type` | `delivery` | escreve | `src/components/compras/delivery-calendar/deliveryCalendarHelpers.ts` |
| `type` | `delivery_delay` | escreve | `src/types/contract.ts` |
| `type` | `error` | escreve | `src/components/ui/undo-toast.tsx` |
| `type` | `escalated` | compara | `src/hooks/useApprovalNotifications.ts` |
| `type` | `escalation` | compara, escreve | `src/hooks/useApprovalNotifications.ts`<br>`supabase/functions/check-approval-escalations/index.ts` |
| `type` | `file` | compara, escreve | `src/features/layout/components/chat/MessageBubble.tsx`<br>`supabase/functions/process-invoice-idp/index.ts` |
| `type` | `first-input` | escreve | `src/lib/performance.ts` |
| `type` | `first-time` | escreve | `src/components/ui/celebration.tsx` |
| `type` | `fornecedores` | compara, escreve | `src/features/layout/components/AdvancedSearch.tsx`<br>`src/features/layout/components/search/SearchResultsList.tsx` |
| `type` | `function` | escreve | `supabase/functions/ai-negotiation/index.ts` |
| `type` | `image_url` | escreve | `supabase/functions/process-invoice-idp/index.ts` |
| `type` | `info` | compara, escreve | `src/components/compras/DashboardInsights.tsx`<br>`src/components/compras/executive/ExecutiveAIInsights.tsx`<br>`src/components/ui/undo-toast.tsx` |
| `type` | `integration_failure` | escreve | `supabase/functions/check-sla-alerts/index.ts` |
| `type` | `kpi` | compara, escreve | `src/components/compras/DraggableDashboard.tsx`<br>`src/stores/dashboardLayoutStore.ts` |
| `type` | `largest-contentful-paint` | escreve | `src/lib/performance.ts` |
| `type` | `layout-shift` | escreve | `src/lib/performance.ts` |
| `type` | `level-up` | escreve | `src/components/ui/celebration.tsx` |
| `type` | `list` | escreve | `src/stores/dashboardLayoutStore.ts` |
| `type` | `magiclink` | escreve | `supabase/functions/webauthn-authenticate/index.ts` |
| `type` | `milestone` | escreve | `src/components/ui/celebration.tsx` |
| `type` | `month` | escreve | `src/pages/historico/HistoricoCompras.tsx` |
| `type` | `mrkdwn` | escreve | `supabase/functions/alert-dispatcher/index.ts` |
| `type` | `normal` | escreve | `supabase/functions/system-simulation/index.ts` |
| `type` | `number` | escreve | `supabase/functions/ai-negotiation/index.ts` |
| `type` | `numeric` | escreve | `src/pages/sourcing/RFxCreate.tsx` |
| `type` | `object` | escreve | `supabase/functions/ai-negotiation/index.ts` |
| `type` | `opportunity` | compara, escreve | `src/components/compras/DashboardInsights.tsx`<br>`src/components/compras/executive/ExecutiveAIInsights.tsx` |
| `type` | `order_created` | escreve | `supabase/functions/check-sla-alerts/index.ts` |
| `type` | `pagamentos` | compara, escreve | `src/features/layout/components/AdvancedSearch.tsx`<br>`src/features/layout/components/search/SearchResultsList.tsx` |
| `type` | `pages` | compara, escreve | `src/features/layout/components/search/SearchResultsList.tsx`<br>`src/features/layout/components/search/searchConfig.ts` |
| `type` | `paint` | escreve | `src/lib/performance.ts` |
| `type` | `panel` | escreve | `src/stores/dashboardLayoutStore.ts` |
| `type` | `payment_due` | escreve | `supabase/functions/check-expiry-alerts/index.ts` |
| `type` | `payment_overdue` | escreve | `supabase/functions/check-expiry-alerts/index.ts`<br>`supabase/functions/check-sla-alerts/index.ts` |
| `type` | `pedidos` | compara, escreve | `src/features/layout/components/AdvancedSearch.tsx`<br>`src/features/layout/components/search/SearchResultsList.tsx` |
| `type` | `pending` | compara | `src/components/compras/executive/ExecutiveDrillDownModal.tsx` |
| `type` | `positive` | compara, escreve | `src/components/compras/executive/ExecutiveAIInsights.tsx` |
| `type` | `public-key` | escreve | `src/hooks/useWebAuthn.ts`<br>`supabase/functions/webauthn-authenticate/index.ts`<br>`supabase/functions/webauthn-register/index.ts` |
| `type` | `purchase` | escreve | `src/components/ui/celebration.tsx` |
| `type` | `record` | escreve | `src/components/ui/celebration.tsx` |
| `type` | `registration` | escreve, filtra | `supabase/functions/webauthn-register/index.ts` |
| `type` | `reject_step` | compara | `src/components/compras/approval/WorkflowDLQPanel.tsx`<br>`src/hooks/useApprovalWorkflow.ts` |
| `type` | `reminder` | escreve | `supabase/functions/check-approval-escalations/index.ts` |
| `type` | `rule` | compara, escreve | `src/components/compras/DynamicApprovalMatrix.tsx` |
| `type` | `savings` | escreve | `src/components/ui/celebration.tsx` |
| `type` | `sawtooth` | escreve | `src/hooks/useFeedback.ts` |
| `type` | `scale_1_5` | escreve | `src/pages/sourcing/RFxCreate.tsx` |
| `type` | `section` | escreve | `supabase/functions/alert-dispatcher/index.ts` |
| `type` | `sine` | escreve | `src/hooks/useFeedback.ts` |
| `type` | `sla_warning` | escreve | `supabase/functions/check-sla-alerts/index.ts` |
| `type` | `solicitacao` | escreve | `src/components/ui/enhanced-search-helpers.ts`<br>`src/hooks/useRecentlyViewed.ts` |
| `type` | `solicitacoes` | compara, escreve | `src/features/layout/components/AdvancedSearch.tsx`<br>`src/features/layout/components/search/SearchResultsList.tsx` |
| `type` | `spring` | escreve | `src/components/animations/motionVariants.ts`<br>`src/components/compras/EnhancedPedidoTimeline.tsx`<br>`src/components/compras/StrategicQuoteTable.tsx`<br>`src/components/compras/VisualComparadorCotacoes.tsx`<br>`src/components/fornecedores/FornecedorMobileCard.tsx`<br>… +19 |
| `type` | `start` | filtra | `supabase/functions/workflow-engine/index.ts` |
| `type` | `string` | escreve | `supabase/functions/ai-negotiation/index.ts` |
| `type` | `success` | compara, escreve | `src/components/compras/BuyerPerformanceAlerts.tsx`<br>`src/components/compras/DashboardInsights.tsx`<br>`src/components/ui/celebration.tsx`<br>`src/components/ui/undo-toast.tsx` |
| `type` | `supplier` | compara, escreve | `src/components/compras/ExecutiveDashboard.tsx`<br>`src/components/compras/executive/ExecutiveDrillDownModal.tsx` |
| `type` | `system_alert` | escreve | `supabase/functions/alert-dispatcher/index.ts` |
| `type` | `text` | escreve | `src/features/layout/components/SupplierChat.tsx`<br>`src/features/layout/components/chat/ChatArea.tsx`<br>`src/features/layout/components/chat/MessageBubble.tsx`<br>`supabase/functions/process-invoice-idp/index.ts` |
| `type` | `triangle` | escreve | `src/hooks/useFeedback.ts` |
| `type` | `update` | compara | `src/hooks/useOfflineSync.ts` |
| `type` | `user-action` | escreve | `src/hooks/useGlobalUndo.ts` |
| `type` | `warning` | compara, escreve | `src/components/compras/BuyerPerformanceAlerts.tsx`<br>`src/components/compras/executive/ExecutiveAIInsights.tsx`<br>`src/components/ui/undo-toast.tsx`<br>`src/hooks/useApprovalNotifications.ts`<br>`src/stores/buyerAlertsStore.ts`<br>… +2 |
| `type` | `weekly_report` | escreve | `supabase/functions/weekly-report/index.ts`<br>`supabase/functions/weekly-summary-report/index.ts` |
| `type` | `window` | escreve | `public/push-handler.js` |
| `overall_status` | `COMPLIANT` | escreve | `src/services/rlsAuditService.ts` |
| `overall_status` | `NON_COMPLIANT` | compara | `src/components/auditoria/RlsCompliancePanel.tsx` |
| `status` | `AGUARDANDO_COTACAO` | compara, escreve | `src/components/compras/SolicitacaoCard.tsx`<br>`src/types/legacyTypes.ts` |
| `status` | `ALL` | escreve | `supabase/functions/spot-api/index.ts` |
| `status` | `Critico` | compara | `src/components/compras/SourcingHistoryConsole.tsx` |
| `status` | `EM_COTACAO` | compara | `src/components/compras/SolicitacaoCard.tsx` |
| `status` | `ENTREGUE` | compara | `src/components/compras/SolicitacaoCard.tsx`<br>`src/components/compras/SolicitacaoKanban.tsx` |
| `status` | `FORNECEDOR_SELECIONADO` | compara | `src/components/compras/SolicitacaoCard.tsx` |
| `status` | `Otimizado` | compara, escreve | `src/components/compras/SourcingHistoryConsole.tsx`<br>`src/lib/sourcingAnalytics.ts` |
| `status` | `PENDENTE` | escreve | `src/types/legacyTypes.ts` |
| `status` | `PROCESSING` | escreve | `supabase/functions/spot-api/index.ts` |
| `status` | `SUBSCRIBED` | compara | `src/features/layout/components/SupplierChat.tsx` |
| `status` | `aceito` | escreve | `src/pages/recompra/RecompraInteligente.tsx` |
| `status` | `active` | compara, escreve, filtra | `src/components/compras/ContractDetailsModal.tsx`<br>`src/hooks/useExecutiveDashboardData.ts`<br>`src/pages/contratos/Contratos.tsx`<br>`src/pages/portal-fornecedor/PortalFornecedor.tsx`<br>`supabase/functions/check-expiry-alerts/contractExpiry_test.ts`<br>… +2 |
| `status` | `agendado` | compara | `src/components/pagamentos/PagamentoMobileCard.tsx`<br>`src/pages/pagamentos/Pagamentos.tsx` |
| `status` | `applied` | compara | `src/components/compras/contract/ContractDetailsTabs.tsx`<br>`supabase/functions/generate-contract-pdf/index.ts` |
| `status` | `approved` | compara, escreve | `src/components/security/PasswordResetRequestsPanel.tsx`<br>`src/features/solicitacoes/fluxoAprovacao.ts`<br>`src/hooks/useApprovalWorkflow.ts`<br>`src/hooks/usePasswordResetRequests.ts`<br>`src/pages/aprovacoes/aprovacoesData.ts`<br>… +1 |
| `status` | `aprovada` | compara, escreve | `src/features/cotacoes/hooks/useCotacoes.ts`<br>`src/features/pedidos/hooks/usePedidos.ts`<br>`src/features/solicitacoes/fluxoAprovacao.ts`<br>`src/features/solicitacoes/hooks/useSolicitacoes.ts`<br>`src/pages/devolucoes/DevolucoesModals.tsx`<br>… +5 |
| `status` | `aprovado` | compara, escreve, filtra | `src/components/compras/OrderPreviewModal.tsx`<br>`src/components/pedidos/PedidoMobileCard.tsx`<br>`src/features/solicitacoes/fluxoAprovacao.ts`<br>`src/hooks/usePagamentos.ts`<br>`src/pages/documentos/DocumentosFiscais.tsx`<br>… +2 |
| `status` | `atencao` | compara, escreve | `src/pages/acompanhamento/Acompanhamento.tsx`<br>`src/pages/acompanhamento/AcompanhamentoHelpers.ts` |
| `status` | `ativo` | compara, escreve, filtra | `src/components/compras/ContractModal.tsx`<br>`src/components/compras/PriceComparator.tsx`<br>`src/components/compras/RiskHeatMap.tsx`<br>`src/components/compras/SupplierAlertsPanel.tsx`<br>`src/components/compras/SupplierBonificationsPanel.tsx`<br>… +15 |
| `status` | `atrasado` | compara, escreve | `src/pages/acompanhamento/Acompanhamento.tsx`<br>`src/pages/acompanhamento/AcompanhamentoHelpers.ts`<br>`src/pages/pedidos/pedidosHelpers.ts`<br>`supabase/functions/check-expiry-alerts/index.ts`<br>`supabase/functions/weekly-report/index.ts` |
| `status` | `atual` | compara | `src/components/compras/EnhancedPedidoTimeline.tsx`<br>`src/components/compras/PedidoTimeline.tsx` |
| `status` | `authorized` | compara | `src/pages/admin/FiscalDashboard.tsx` |
| `status` | `awarded` | compara | `src/pages/sourcing/RFxDetails.tsx`<br>`src/pages/sourcing/Sourcing.tsx` |
| `status` | `backlog` | compara | `src/pages/admin/SourcingPipeline.tsx` |
| `status` | `cancelada` | compara, escreve | `src/components/compras/PurchaseClimateWidget.tsx`<br>`src/pages/kanban/KanbanWorkflow.tsx`<br>`src/pages/licitacoes/LicitacaoDetailDialog.tsx`<br>`supabase/migrations/20260512142511_3e8db5bf-b32f-40a8-8fd9-7c7ddecc09de.sql`<br>`supabase/migrations/20261113122251_fix_gatilhos_solicitacao_pagamento_orcamento.sql` |
| `status` | `cancelado` | compara, filtra | `src/components/pagamentos/PagamentoFinancialDashboard.tsx`<br>`src/components/pedidos/PedidoMobileCard.tsx`<br>`src/pages/pagamentos/Pagamentos.tsx`<br>`src/pages/pedidos/PedidoDetailsDialog.tsx`<br>`supabase/functions/weekly-summary-report/index.ts` |
| `status` | `cancelled` | compara | `src/pages/admin/SourcingPipeline.tsx`<br>`src/pages/sourcing/Sourcing.tsx` |
| `status` | `completed` | compara, escreve | `src/components/compras/ProductionRoutingEngine.tsx`<br>`src/components/compras/StatusTimeline.tsx`<br>`src/components/settings/TourSettingsPanel.tsx`<br>`src/components/ui/indicators/StepAndHealth.tsx`<br>`src/hooks/usePasswordResetRequests.ts`<br>… +2 |
| `status` | `concluida` | compara, escreve | `src/components/compras/PurchaseClimateWidget.tsx`<br>`src/components/compras/SolicitacaoCard.tsx`<br>`src/hooks/useDevolucoes.ts`<br>`src/pages/devolucoes/DevolucoesModals.tsx`<br>`src/pages/kanban/KanbanWorkflow.tsx` |
| `status` | `concluido` | compara, escreve | `src/components/compras/EnhancedPedidoTimeline.tsx`<br>`src/components/compras/PedidoTimeline.tsx`<br>`src/components/compras/timeline/timelineConfig.ts` |
| `status` | `connecting` | compara | `src/components/ui/indicators/MiscIndicators.tsx` |
| `status` | `credito_emitido` | compara, escreve | `src/hooks/useDevolucoes.ts`<br>`src/pages/devolucoes/DevolucoesModals.tsx` |
| `status` | `critical` | compara, escreve | `src/components/compras/AdvancedProcurementKPIs.tsx`<br>`src/components/compras/BuyerPerformanceAlerts.tsx`<br>`src/components/compras/PendingApprovalsList.tsx`<br>`src/components/compras/PurchaseClimateWidget.tsx`<br>`src/components/compras/pending-approvals/pendingApprovalsData.ts`<br>… +4 |
| `status` | `critico` | compara, escreve | `src/pages/acompanhamento/Acompanhamento.tsx`<br>`src/pages/acompanhamento/AcompanhamentoHelpers.ts` |
| `status` | `current` | compara | `src/components/compras/StatusTimeline.tsx`<br>`src/components/ui/indicators/StepAndHealth.tsx` |
| `status` | `degraded` | compara | `src/components/ui/indicators/StepAndHealth.tsx` |
| `status` | `delayed` | compara | `src/components/compras/DeliveryCalendar.tsx`<br>`src/components/compras/delivery-calendar/deliveryCalendarHelpers.ts` |
| `status` | `delivered` | compara, escreve | `src/components/compras/SourcingHistoryConsole.tsx`<br>`src/components/compras/delivery-calendar/deliveryCalendarHelpers.ts`<br>`src/hooks/usePurchaseHistory.ts`<br>`src/pages/historico/HistoricoCompras.tsx`<br>`src/pages/historico/HistoricoFornecedoresTab.tsx`<br>… +4 |
| `status` | `denied` | compara | `src/pages/admin/FiscalDashboard.tsx` |
| `status` | `descartado` | escreve | `src/pages/recompra/RecompraInteligente.tsx` |
| `status` | `down` | compara | `src/components/ui/indicators/StepAndHealth.tsx` |
| `status` | `draft` | compara, escreve | `src/components/compras/ContractModal.tsx`<br>`src/pages/sourcing/RFxDetails.tsx`<br>`src/pages/sourcing/Sourcing.tsx` |
| `status` | `em_andamento` | compara, escreve | `src/pages/gerar-ordem/GerarOrdem.tsx`<br>`src/pages/licitacoes/LicitacaoDetailDialog.tsx` |
| `status` | `em_cotacao` | filtra | `src/pages/negociacao-ia/NegociacaoIA.tsx` |
| `status` | `em_transito` | compara, escreve | `src/components/compras/delivery-calendar/deliveryCalendarHelpers.ts`<br>`src/components/pedidos/PedidoMobileCard.tsx`<br>`src/hooks/useDevolucoes.ts`<br>`src/pages/devolucoes/DevolucoesModals.tsx` |
| `status` | `empty` | compara, escreve | `src/pages/admin/DependencyHealth.tsx`<br>`supabase/functions/dependency-health/index.ts` |
| `status` | `encerrada` | compara, escreve | `src/pages/licitacoes/LicitacaoDetailDialog.tsx` |
| `status` | `encontrado` | compara, escreve | `src/components/compras/BuscaAutomatica.tsx`<br>`src/pages/cotacao/cotacaoHelpers.ts` |
| `status` | `entregue` | compara, escreve, filtra | `src/components/compras/PurchaseClimateWidget.tsx`<br>`src/components/compras/RiskHeatMap.tsx`<br>`src/components/compras/SupplierAlertsPanel.tsx`<br>`src/components/compras/SupplierRankingPanel.tsx`<br>`src/components/compras/delivery-calendar/deliveryCalendarHelpers.ts`<br>… +13 |
| `status` | `enviado` | compara | `src/components/pedidos/PedidoMobileCard.tsx` |
| `status` | `erro` | compara | `src/components/compras/EnhancedPedidoTimeline.tsx` |
| `status` | `error` | compara, escreve | `src/components/ui/indicators/StepAndHealth.tsx`<br>`src/pages/admin/DependencyHealth.tsx`<br>`src/pages/admin/FiscalDashboard.tsx`<br>`src/pages/admin/ScanRunsSlaCard.tsx`<br>`supabase/functions/_shared/integrity_test.ts`<br>… +7 |
| `status` | `escalated` | escreve | `src/hooks/useApprovalWorkflow.ts`<br>`supabase/functions/check-approval-escalations/index.ts` |
| `status` | `evaluation` | compara | `src/pages/sourcing/RFxDetails.tsx`<br>`src/pages/sourcing/Sourcing.tsx` |
| `status` | `execution` | compara | `src/pages/admin/SourcingPipeline.tsx` |
| `status` | `expirada` | escreve | `supabase/functions/check-expiry-alerts/index.ts` |
| `status` | `expired` | compara | `src/pages/portal-fornecedor/PortalFornecedor.tsx` |
| `status` | `failed` | compara, escreve | `src/pages/admin/ScanRunsSlaCard.tsx`<br>`supabase/functions/_shared/idempotency.ts`<br>`supabase/functions/punchout-receive/index.ts` |
| `status` | `finalizada` | compara | `supabase/migrations/20260512142511_3e8db5bf-b32f-40a8-8fd9-7c7ddecc09de.sql`<br>`supabase/migrations/20261113122251_fix_gatilhos_solicitacao_pagamento_orcamento.sql` |
| `status` | `healthy` | compara, escreve | `src/components/compras/SupplierRiskAnalysis.tsx`<br>`src/components/ui/indicators/StepAndHealth.tsx` |
| `status` | `homologada` | compara, escreve | `src/hooks/useLicitacoes.ts`<br>`src/pages/licitacoes/Licitacoes.tsx` |
| `status` | `idle` | compara, escreve | `src/components/compras/BuscaAutomatica.tsx` |
| `status` | `in_progress` | compara | `src/components/compras/ActiveSourcingWidget.tsx`<br>`src/pages/admin/DependencyHealth.tsx`<br>`src/pages/sourcing/RFxDetails.tsx`<br>`src/pages/sourcing/Sourcing.tsx` |
| `status` | `in_transit` | compara | `src/components/compras/DeliveryCalendar.tsx`<br>`src/components/compras/delivery-calendar/deliveryCalendarHelpers.ts` |
| `status` | `matched` | compara, escreve | `src/pages/documentos/DocumentosFiscais.tsx`<br>`src/pages/documentos/conciliacaoFiscal.ts` |
| `status` | `negotiation` | compara | `src/pages/admin/SourcingPipeline.tsx` |
| `status` | `no_prazo` | compara, escreve | `src/pages/acompanhamento/Acompanhamento.tsx`<br>`src/pages/acompanhamento/AcompanhamentoHelpers.ts` |
| `status` | `normal` | escreve | `src/components/compras/pending-approvals/pendingApprovalsData.ts` |
| `status` | `number` | compara | `src/hooks/useXbzIntegration.ts` |
| `status` | `ok` | compara, escreve | `src/components/compras/SLADistributionChart.tsx`<br>`src/pages/admin/DependencyHealth.tsx`<br>`src/pages/admin/ScanRunsSlaCard.tsx`<br>`supabase/functions/dependency-health/index.ts`<br>`supabase/functions/external-db-bridge/index.ts` |
| `status` | `online` | compara, escreve | `src/components/ui/indicators/MiscIndicators.tsx` |
| `status` | `opened` | compara, escreve, filtra | `supabase/functions/punchout-receive/index.ts`<br>`supabase/functions/punchout-setup/index.ts` |
| `status` | `overdue` | compara, escreve | `src/components/compras/PendingApprovalsList.tsx`<br>`src/components/compras/pending-approvals/pendingApprovalsData.ts` |
| `status` | `pago` | compara | `src/components/pagamentos/PagamentoAdvancedFilters.tsx`<br>`src/components/pagamentos/PagamentoAdvancedKPIs.tsx`<br>`src/components/pagamentos/PagamentoDetailModal.tsx`<br>`src/components/pagamentos/PagamentoMobileCard.tsx`<br>`src/pages/catalogo-xbz/XbzPedidosTab.tsx`<br>… +4 |
| `status` | `parcial` | compara | `src/pages/recebimento/RecebimentoOffline.tsx` |
| `status` | `pendente` | compara, escreve, filtra | `src/components/compras/EnhancedPedidoTimeline.tsx`<br>`src/components/compras/PedidoTimeline.tsx`<br>`src/components/mobile/BottomNavigation.tsx`<br>`src/components/pagamentos/PagamentoDetailModal.tsx`<br>`src/components/pagamentos/PagamentoMobileCard.tsx`<br>… +12 |
| `status` | `pending` | compara, escreve, filtra | `src/components/compras/CriticalAlertsBar.tsx`<br>`src/components/compras/DigitalSignature.tsx`<br>`src/components/compras/ProductionRoutingEngine.tsx`<br>`src/components/compras/digital-signature/signatureHelpers.ts`<br>`src/components/security/PasswordResetRequestsPanel.tsx`<br>… +14 |
| `status` | `planning` | compara | `src/pages/admin/SourcingPipeline.tsx` |
| `status` | `processed` | compara, escreve, filtra | `supabase/functions/_shared/idempotency.ts`<br>`supabase/functions/receive-os-sync/index.ts` |
| `status` | `processing` | compara | `src/components/ui/indicators/StatusIndicator.tsx` |
| `status` | `publicada` | compara, escreve | `src/pages/licitacoes/LicitacaoDetailDialog.tsx` |
| `status` | `published` | compara, escreve | `src/components/compras/ActiveSourcingWidget.tsx`<br>`src/pages/sourcing/RFxCreate.tsx`<br>`src/pages/sourcing/RFxDetails.tsx`<br>`src/pages/sourcing/Sourcing.tsx` |
| `status` | `pulada` | compara | `src/features/solicitacoes/fluxoAprovacao.ts` |
| `status` | `pulado` | compara | `src/features/solicitacoes/fluxoAprovacao.ts` |
| `status` | `queued` | compara, escreve | `src/pages/admin/DependencyHealth.tsx`<br>`supabase/functions/dependency-health/index.ts` |
| `status` | `quota_blocked` | escreve | `supabase/functions/spot-api/index.ts` |
| `status` | `rascunho` | compara, escreve | `src/pages/licitacoes/LicitacaoDetailDialog.tsx`<br>`supabase/functions/punchout-receive/solicitation.ts` |
| `status` | `read` | compara, escreve | `src/features/layout/components/SupplierChat.tsx`<br>`src/features/layout/components/chat/MessageBubble.tsx` |
| `status` | `recebida_fornecedor` | escreve | `src/pages/devolucoes/DevolucoesModals.tsx` |
| `status` | `recebido` | compara | `src/components/compras/PurchaseClimateWidget.tsx`<br>`src/components/compras/delivery-calendar/deliveryCalendarHelpers.ts` |
| `status` | `rejected` | compara, escreve | `src/components/compras/digital-signature/signatureHelpers.ts`<br>`src/features/solicitacoes/fluxoAprovacao.ts`<br>`src/hooks/useApprovalWorkflow.ts`<br>`src/hooks/usePasswordResetRequests.ts`<br>`src/pages/aprovacoes/aprovacoesData.ts`<br>… +2 |
| `status` | `rejeitada` | compara, escreve | `src/features/solicitacoes/fluxoAprovacao.ts`<br>`src/hooks/useApprovalWorkflow.ts`<br>`src/pages/devolucoes/DevolucoesModals.tsx` |
| `status` | `rejeitado` | compara | `src/features/solicitacoes/fluxoAprovacao.ts` |
| `status` | `reposicao_enviada` | escreve | `src/pages/devolucoes/DevolucoesModals.tsx` |
| `status` | `returned` | compara | `src/hooks/usePurchaseHistory.ts` |
| `status` | `running` | escreve | `supabase/functions/workflow-engine/index.ts` |
| `status` | `scheduled` | compara, escreve | `src/components/compras/delivery-calendar/deliveryCalendarHelpers.ts` |
| `status` | `searching` | compara | `src/components/compras/BuscaAutomatica.tsx` |
| `status` | `sent` | escreve | `src/features/layout/components/chat/ChatArea.tsx`<br>`src/features/layout/components/chat/MessageBubble.tsx` |
| `status` | `signed` | escreve | `src/components/compras/DigitalSignature.tsx`<br>`src/components/compras/digital-signature/signatureHelpers.ts` |
| `status` | `skipped` | compara, escreve | `src/components/settings/TourSettingsPanel.tsx`<br>`src/features/solicitacoes/fluxoAprovacao.ts`<br>`src/hooks/useApprovalWorkflow.ts`<br>`src/pages/admin/DependencyHealth.tsx`<br>`supabase/functions/check-approval-escalations/index.ts`<br>… +1 |
| `status` | `slow` | compara | `supabase/functions/external-db-bridge/index.ts` |
| `status` | `solicitada` | escreve | `src/hooks/useDevolucoes.ts`<br>`src/pages/devolucoes/DevolucoesModals.tsx` |
| `status` | `succeeded` | compara | `supabase/migrations/20260711183343_43dc2b31-4f1c-4e2d-bea9-1da967fe29e5.sql` |
| `status` | `success` | compara, escreve | `src/components/compras/AdvancedProcurementKPIs.tsx`<br>`src/pages/acompanhamento/Acompanhamento.tsx`<br>`src/pages/admin-telemetria/AdminTelemetria.tsx`<br>`src/pages/admin/ERPConnections.tsx`<br>`src/pages/buyer/BuyerPerformanceDashboard.tsx`<br>… +11 |
| `status` | `sucess` | compara | `src/pages/acompanhamento/Acompanhamento.tsx` |
| `status` | `sucesso` | compara | `src/pages/acompanhamento/Acompanhamento.tsx` |
| `status` | `sugerido` | escreve, filtra | `src/pages/recompra/RecompraInteligente.tsx` |
| `status` | `todas` | compara | `src/features/solicitacoes/hooks/useSolicitacoes.ts` |
| `status` | `todos` | compara, escreve | `src/components/pagamentos/PagamentoAdvancedFilters.tsx`<br>`src/features/cotacoes/hooks/useCotacoes.ts`<br>`src/features/pedidos/hooks/usePedidos.ts`<br>`src/hooks/useDevolucoes.ts`<br>`src/hooks/useFornecedores.ts`<br>… +2 |
| `status` | `unknown` | compara | `src/pages/admin/DependencyHealth.tsx` |
| `status` | `unmatched` | escreve | `src/pages/documentos/conciliacaoFiscal.ts` |
| `status` | `upcoming` | compara, escreve | `src/components/compras/ProductionRoutingEngine.tsx`<br>`src/components/compras/StatusTimeline.tsx` |
| `status` | `utilizado` | escreve | `src/lib/creditoFornecedor.ts` |
| `status` | `validada` | compara, escreve | `src/pages/documentos/DocumentosFiscais.tsx` |
| `status` | `vencedora` | escreve | `src/hooks/useLicitacoes.ts` |
| `status` | `very_slow` | compara | `supabase/functions/external-db-bridge/index.ts` |
| `status` | `warning` | compara, escreve | `src/components/compras/AdvancedProcurementKPIs.tsx`<br>`src/components/compras/PurchaseClimateWidget.tsx`<br>`src/components/compras/SLADistributionChart.tsx`<br>`src/pages/buyer/BuyerPerformanceDashboard.tsx`<br>`src/pages/buyer/buyerDashboardHelpers.tsx`<br>… +2 |
| `tipo` | `DISTRIBUIDORA` | compara | `src/pages/fornecedores/Fornecedores.tsx` |
| `tipo` | `IMPORTADORA` | compara, escreve | `src/components/fornecedores/FornecedorMobileCard.tsx`<br>`src/pages/cotacao/cotacaoHelpers.ts`<br>`src/pages/fornecedores/Fornecedores.tsx`<br>`src/pages/fornecedores/fornecedorHelpers.ts`<br>`src/types/legacyTypes.ts` |
| `tipo` | `PE_LISO` | escreve | `src/components/compras/NovaSolicitacaoModal.tsx`<br>`src/types/legacyTypes.ts` |
| `tipo` | `credito_devolucao` | compara, escreve | `src/hooks/useDevolucoes.ts`<br>`src/pages/devolucoes/Devolucoes.tsx` |
| `tipo` | `devolucao` | escreve | `src/pages/devolucoes/DevolucoesModals.tsx` |
| `tipo` | `entrada` | compara, escreve | `src/hooks/useEstoque.ts`<br>`src/pages/estoque/GestaoEstoque.tsx` |
| `tipo` | `garantia` | compara | `src/pages/devolucoes/Devolucoes.tsx`<br>`src/pages/devolucoes/DevolucoesModals.tsx` |
| `tipo` | `internacional` | compara | `src/pages/cotacao/cotacaoHelpers.ts`<br>`src/pages/fornecedores/fornecedorHelpers.ts` |
| `tipo` | `local` | compara | `src/pages/cotacao/cotacaoHelpers.ts`<br>`src/pages/fornecedores/fornecedorHelpers.ts` |
| `tipo` | `material` | compara, escreve | `src/pages/solicitacoes/solicitacoesHelpers.ts`<br>`supabase/functions/punchout-receive/solicitation.ts`<br>`supabase/functions/receive-os-sync/mapping.ts` |
| `tipo` | `menor_preco` | escreve | `src/pages/licitacoes/Licitacoes.tsx` |
| `tipo` | `produto` | escreve | `src/pages/acompanhamento/Acompanhamento.tsx`<br>`src/pages/gerar-ordem/GerarOrdem.tsx` |
| `tipo` | `saida` | compara, escreve | `src/pages/estoque/GestaoEstoque.tsx` |
| `tipo` | `servico` | compara | `src/pages/solicitacoes/solicitacoesHelpers.ts` |
| `tipo` | `todos` | compara | `src/features/solicitacoes/hooks/useSolicitacoes.ts`<br>`src/hooks/useFornecedores.ts` |
| `tipo` | `troca` | compara | `src/pages/devolucoes/Devolucoes.tsx`<br>`src/pages/devolucoes/DevolucoesModals.tsx` |
| `qualification_status` | `approved` | compara | `src/pages/portal-fornecedor/PortalFornecedor.tsx` |
| `qualification_status` | `blocked` | compara | `src/components/compras/scorecard/supplierScorecardData.ts`<br>`src/pages/portal-fornecedor/PortalFornecedor.tsx` |
| `qualification_status` | `disqualified` | compara | `src/pages/qualificacao/QualificacaoFornecedores.tsx` |
| `qualification_status` | `pending` | compara | `src/pages/qualificacao/QualificacaoFornecedores.tsx` |
| `qualification_status` | `qualified` | compara | `src/pages/qualificacao/QualificacaoFornecedores.tsx` |
| `step` | `enroll` | compara | `src/components/security/MFASettings.tsx` |
| `role` | `admin` | compara, filtra | `src/components/security/PermissionMatrix.tsx`<br>`src/features/auth/hooks/useAuth.tsx`<br>`supabase/functions/check-expiry-alerts/index.ts`<br>`supabase/functions/check-sla-alerts/index.ts`<br>`supabase/functions/weekly-report/index.ts`<br>… +1 |
| `role` | `assistant` | escreve | `src/hooks/useGuidedBuying.ts` |
| `role` | `system` | escreve | `supabase/functions/ai-demand-prediction/index.ts`<br>`supabase/functions/ai-negotiation/index.ts`<br>`supabase/functions/ai-supplier-risk/index.ts`<br>`supabase/functions/ai-supplier-suggestion/index.ts`<br>`supabase/functions/guided-buying-ai/index.ts`<br>… +2 |
| `role` | `user` | compara, escreve | `src/features/layout/components/GuidedBuyingAssistant.tsx`<br>`src/hooks/useGuidedBuying.ts`<br>`supabase/functions/ai-demand-prediction/index.ts`<br>`supabase/functions/ai-negotiation/index.ts`<br>`supabase/functions/ai-supplier-risk/index.ts`<br>… +4 |
| `state` | `collapsed` | compara | `src/components/ui/sidebar.tsx` |
| `state` | `expanded` | escreve | `src/components/ui/sidebar.tsx` |
| `state` | `open` | compara | `supabase/functions/_shared/circuit_breaker.ts` |
| `state` | `suspended` | compara | `src/hooks/useFeedback.ts`<br>`src/lib/feedbackToast.ts` |
| `reconciliation_status` | `aprovado` | compara | `src/pages/acompanhamento/Acompanhamento.tsx` |
| `reconciliation_status` | `matched` | compara | `src/pages/documentos/DocumentosFiscais.tsx` |
| `reconciliation_status` | `pendente` | compara | `src/pages/acompanhamento/Acompanhamento.tsx` |
| `reconciliation_status` | `pending` | compara | `src/pages/documentos/DocumentosFiscais.tsx` |
| `reconciliation_status` | `reconciled` | compara | `src/hooks/useExecutiveDashboardData.ts` |
| `reconciliation_status` | `unmatched` | compara | `src/pages/documentos/DocumentosFiscais.tsx` |
| `bid_status` | `valid` | escreve | `src/integrations/supabase/types.ts` |
| `tenant_status` | `active` | escreve | `src/integrations/supabase/types.ts` |
| `supplier_status` | `bloqueado` | compara | `src/pages/compliance/complianceHelpers.ts` |
| `dispatch_status` | `suppressed_dedup` | escreve | `supabase/functions/alert-dispatcher/index.ts` |
| `follow_up_status` | `notificado` | escreve | `supabase/functions/check-cotacao-followup/index.ts` |
| `sefaz_status` | `dispatch_error` | compara, escreve | `supabase/functions/fiscal-orchestrator/index.ts` |
| `v_old_status` | `cancelada` | compara | `supabase/migrations/20260512142511_3e8db5bf-b32f-40a8-8fd9-7c7ddecc09de.sql`<br>`supabase/migrations/20261113122251_fix_gatilhos_solicitacao_pagamento_orcamento.sql` |
| `v_old_status` | `finalizada` | compara | `supabase/migrations/20260512142511_3e8db5bf-b32f-40a8-8fd9-7c7ddecc09de.sql`<br>`supabase/migrations/20261113122251_fix_gatilhos_solicitacao_pagamento_orcamento.sql` |
| `v_new_status` | `cancelada` | compara | `supabase/migrations/20260512142511_3e8db5bf-b32f-40a8-8fd9-7c7ddecc09de.sql`<br>`supabase/migrations/20261113122251_fix_gatilhos_solicitacao_pagamento_orcamento.sql` |
| `v_new_status` | `finalizada` | compara | `supabase/migrations/20260512142511_3e8db5bf-b32f-40a8-8fd9-7c7ddecc09de.sql`<br>`supabase/migrations/20261113122251_fix_gatilhos_solicitacao_pagamento_orcamento.sql` |

### E.4 Enums e listas de valores

| Nome | Valores | Onde |
|---|---|---|
| audit_action_type | `create`, `update`, `delete`, `view`, `export`, `login`, `logout`, `approve`, `reject`, `cancel` | banco |
| audit_entity_type | `solicitacao`, `cotacao`, `pedido`, `pagamento`, `fornecedor`, `usuario`, `configuracao`, `relatorio` | banco |
| app_role | `admin`, `coordinator`, `buyer`, `finance`, `viewer`, `supplier` | banco |
| sourcing_type | `rfi`, `rfp`, `rfq`, `auction` | banco |
| sourcing_status | `draft`, `published`, `in_progress`, `evaluation`, `awarded`, `cancelled` | banco |
| invitation_status | `pending`, `viewed`, `declined`, `submitted`, `expired` | banco |
| question_type | `text`, `number`, `single_choice`, `multi_choice`, `file`, `date` | banco |
| bid_status | `valid`, `rejected`, `withdrawn`, `winning` | banco |
| audit_event_type | `create`, `update`, `delete`, `approve`, `reject`, `auth`, `security`, `export` | banco |
| tenant_status | `active`, `suspended`, `trial`, `churned` | banco |
| sourcing_project_status | `backlog`, `planning`, `execution`, `negotiation`, `implementation`, `completed`, `cancelled` | banco |
| saving_type | `negotiated`, `avoidance`, `process`, `specification` | banco |
| workflow_node_type | `start`, `end`, `approval`, `condition`, `action`, `delay` | banco |
| workflow_status | `pending`, `running`, `completed`, `failed`, `cancelled` | banco |
| tipo_produto_enum | `importado`, `fabricado`, `personalizado` | banco |
| status_producao_enum | `pendente`, `primeira_peca`, `em_producao`, `personalizando`, `concluido` | banco |
| log_level | `info`, `warn`, `error`, `debug` | banco |
| regime_tributario | `simples_nacional`, `lucro_presumido`, `lucro_real`, `mei` | banco |
| KpiColor | emerald \| orange \| blue \| purple \| green \| cyan \| red \| indigo \| teal \| violet \| fuchsia | `src/components/compras/enhanced-kpi/EnhancedKpiHelpers.tsx` |
| SortOption | prazo \| valor \| data | `src/components/compras/pending-approvals/pendingApprovalsData.ts` |
| FilterStatus | all \| urgente \| escalado \| normal | `src/components/compras/pending-approvals/pendingApprovalsData.ts` |
| SlaPeriod | 3m \| 6m \| 12m | `src/components/compras/sla-analysis/useSupplierSlaData.ts` |
| CelebrationType | success \| achievement \| milestone \| streak \| level-up \| purchase \| savings \| record \| first-time | `src/components/ui/celebration-particles.tsx` |
| StatusType | pending \| processing \| approved \| completed \| cancelled \| error \| warning \| info \| draft \| active \| inactive \| success \| neutral | `src/components/ui/indicators/StatusIndicator.tsx` |
| AppRole | admin \| coordinator \| buyer \| finance \| viewer \| supplier | `src/features/auth/types/authRoles.ts` |
| SearchCategory | all \| pages \| solicitacoes \| pedidos \| fornecedores \| pagamentos \| contratos | `src/features/layout/components/search/searchConfig.ts` |
| TransitionName | fade \| slide-left \| slide-right \| slide-up \| slide-down \| zoom-in \| zoom-out \| flip-x \| flip-y \| parallax \| blur-scale \| none | `src/features/layout/transitions/presets.ts` |
| StatusEtapaAprovacao | concluida \| atual \| pendente \| rejeitada \| pulada | `src/features/solicitacoes/fluxoAprovacao.ts` |
| FeedbackType | success \| error \| warning \| info \| notification \| click \| approval \| rejection | `src/hooks/useFeedback.ts` |
| WorkflowDLQOperationType | create_workflow \| approve_step \| reject_step \| escalate | `src/hooks/useWorkflowDLQ.ts` |
| PrivateBucket | documentos \| comprovantes | `src/lib/storageFiles.ts` |
| SLAStatus | atrasado \| critico \| atencao \| no_prazo \| entregue | `src/pages/acompanhamento/AcompanhamentoHelpers.ts` |
| SeverityFilter | all \| slow \| very_slow \| error | `src/pages/admin-telemetria/telemetriaHelpers.ts` |
| TimeFilter | 1h \| 6h \| 24h \| 7d \| custom | `src/pages/admin-telemetria/telemetriaHelpers.ts` |
| SpotSyncAction | syncCatalog \| syncCustomization \| syncStock \| getOrders | `src/pages/catalogo-spot/useSpotCatalog.ts` |
| CacheFreshness | fresh \| stale \| missing | `src/pages/catalogo-spot/useSpotCatalog.ts` |
| PagamentoStatus | pago \| pendente \| desconhecido | `src/pages/catalogo-xbz/xbzHelpers.ts` |
| XBZ_PERIODOS | { value: 1, label: 'Recente (~2 meses)' }, { value: 2, label: 'Médio (~3 meses)' }, { value: 3, label: 'Longo (~6 meses)' }, | `src/pages/catalogo-xbz/xbzHelpers.ts` |
| XBZ_FILTROS_FINANCEIROS | { value: 0, label: 'Todos' }, { value: 2, label: 'Somente pagos' }, { value: 3, label: 'Somente pendentes' }, | `src/pages/catalogo-xbz/xbzHelpers.ts` |
| XbzNetworkLevel | collecting \| below \| warning \| healthy | `src/pages/catalogo-xbz/xbzNetworkHealth.ts` |
| XbzTrendDirection | unknown \| degrading \| stable \| improving | `src/pages/catalogo-xbz/xbzNetworkTrend.ts` |
| MotivoConciliacao | vinculo-unico \| sem-candidato \| valor-em-outro-fornecedor \| ambiguo \| fornecedor-desconhecido | `src/pages/documentos/conciliacaoFiscal.ts` |
| SaudeDoPrazoStatus | entregue \| atrasado \| critico \| atencao \| no_prazo \| sem_prazo | `src/pages/pedidos/pedidosHelpers.ts` |
| AuditActionType | create \| update \| delete \| view \| export \| login \| logout \| approve \| reject \| cancel | `src/services/auditTypes.ts` |
| AuditEntityType | solicitacao \| cotacao \| pedido \| pagamento \| fornecedor \| usuario \| configuracao \| relatorio | `src/services/auditTypes.ts` |
| RlsSeverity | CRITICAL \| INFO \| OK | `src/services/rlsAuditService.ts` |
| ALLOWED_OPERATIONS | "select" | `supabase/functions/_shared/external-bridge-allowlist.ts` |
| CanonicalLogLevel | info \| warn \| error \| debug | `supabase/functions/_shared/logLevel.ts` |
| LogLevel | info \| warn \| error \| debug | `supabase/functions/_shared/logger.ts` |
| Role | admin \| coordinator \| buyer \| approver \| viewer | `supabase/functions/_shared/xbz_auth.ts` |
| XBZ_PERMISSION_FLAGS | "WebHabilitarAcessoPortal", "WebExibePreco", "WebExibeQuantidade", "WebIgnoraRestricoes", "WebConsultaProdutos", "WebConsultaPedidos", "WebExibePrecosPedidos", "WebCarrinhoInserir", "WebCarrinhoVisualizar", "WebPedidoEnviar", | `supabase/functions/_shared/xbz_client.ts` |
| ContractRenewalType | automatic \| manual | `supabase/functions/check-expiry-alerts/contractExpiry.ts` |
| EscalationTarget | gerencia \| comprador | `supabase/functions/escalate-solicitacao/recipients.ts` |
| ACOES_APROVACAO_VALIDAS | "created", "approved", "rejected", "escalated", "delegated", "reminder_sent", "cancelled", | `supabase/functions/escalate-solicitacao/recipients.ts` |

## F. Validações de entrada

### F.1 Schemas Zod

- **UserProfileSchema** (`src/features/auth/schemas/auth.schemas.ts`, z.object):
  ```ts
  { id: z.string().uuid(), user_id: z.string().uuid(), full_name: z.string().nullable(), email: z.string().email().nullable(), avatar_url: z.string().url().nullable().or(z.literal('')), department: z.string().nullable(), phone: z.string().nullable(), current_organization_id: z.string().uuid().nullable(), empresa_default_id: z.string().uuid().nullable().optional(), }
  ```
- **RegimeTributarioSchema** (`src/features/auth/schemas/auth.schemas.ts`, z.enum):
  ```ts
  [ 'simples_nacional', 'lucro_presumido', 'lucro_real', 'mei', ]
  ```
- **TenantSchema** (`src/features/auth/schemas/auth.schemas.ts`, z.object):
  ```ts
  { id: z.string().uuid(), name: z.string(), slug: z.string(), cnpj: z.string().nullable().optional(), razao_social: z.string().nullable().optional(), nome_fantasia: z.string().nullable().optional(), uf: z.string().nullable().optional(), regime_tributario: RegimeTributarioSchema.nullable().optional(), cor_identificacao: z.string().nullable().optional(), empresa_codigo: z.string().nullable().optional(), organization_id: z.string().uuid().nullable().optional(), }
  ```
- **SolicitacaoStatusSchema** (`src/features/solicitacoes/schemas/solicitacao.schemas.ts`, z.enum):
  ```ts
  [ 'pendente', 'em_cotacao', 'aprovada', 'rejeitada', 'em_andamento', 'concluida', 'cancelada' ]
  ```
- **SolicitacaoPrioridadeSchema** (`src/features/solicitacoes/schemas/solicitacao.schemas.ts`, z.enum):
  ```ts
  ['baixa', 'media', 'alta', 'urgente']
  ```
- **CreateSolicitacaoSchema** (`src/features/solicitacoes/schemas/solicitacao.schemas.ts`, z.object):
  ```ts
  { titulo: z.string().min(3, "O título deve ter pelo menos 3 caracteres").max(200), descricao: z.string().optional().nullable(), tipo: z.string(), prioridade: SolicitacaoPrioridadeSchema.default('media'), valor_estimado: z.number().positive("O valor estimado deve ser positivo").optional().nullable(), quantidade: z.number().positive("A quantidade deve ser maior que zero").default(1), unidade: z.string().default('un'), data_necessidade: z.string().optional().nullable(), departamento: z.string().optional().nullable(), centro_custo: z.string().optional().nullable(), cost_center_id: z.string().uuid().optional().nullable(), justificativa: z.string().optional().nullable(), categoria_id: z.string().uuid().optional().nullable(), }
  ```
- **loginSchema** (`src/pages/auth/Auth.tsx`, z.object):
  ```ts
  { email: z.string().email('Email inválido'), password: z.string().min(1, 'Senha é obrigatória'), }
  ```
- **novaSenhaSchema** (`src/pages/auth/Auth.tsx`, z.object, encadeia refine):
  ```ts
  { password: z.string().min(8, 'A senha deve ter ao menos 8 caracteres'), confirm: z.string().min(1, 'Confirme a senha'), }
  ```
  - Regras cruzadas (refine): “As senhas não coincidem”
- **solicitacaoSchema** (`src/schemas/solicitacao.schema.ts`, z.object):
  ```ts
  { empresa: z.string().min(1, "Selecione a empresa"), vendedor: z.string().min(1, "Selecione o vendedor"), produto: z.string().min(2, "O nome do produto deve ter pelo menos 2 caracteres").max(200, "Nome do produto muito longo"), categoriaId: z.string().min(1, "Selecione a categoria"), quantidade: z.number().int().positive("A quantidade deve ser maior que zero"), tipo: z.enum(['PE_LISO', 'FAB_LISO', 'FAB_PERSONALIZADO']), prazoEntrega: z.string().min(1, "Informe o prazo de entrega").refine((val) => { const date = parseDateValue(val); const today = new Date(); today.setHours(0, 0, 0, 0); return !isNaN(date.getTime()) && date >= today; }, "O prazo de entrega deve ser uma data futura"), observacoes: z.string().max(2000, "As observações não podem exceder 2000 caracteres").optional().default(""), …
  ```
  - Regras cruzadas (refine): “O prazo de entrega deve ser uma data futura”
- **NegotiationContract** (`supabase/functions/_shared/contracts.ts`, z.object):
  ```ts
  { cotacoes: z.array(z.any()).min(1, "É necessário pelo menos uma cotação para análise"), solicitacao: z.object({ id: z.string().uuid(), titulo: z.string(), valor_estimado: z.number().optional().nullable(), quantidade: z.number().optional().nullable(), }), historico_precos: z.array(z.any()).optional().nullable(), }
  ```
- **WorkflowContract** (`supabase/functions/_shared/contracts.ts`, z.discriminatedUnion):
  ```ts
  "action", [ z.object({ action: z.literal('start_workflow'), template_id: z.string().uuid(), entity_type: z.string(), entity_id: z.string().uuid(), }), z.object({ action: z.literal('approve_step'), instance_id: z.string().uuid(), node_id: z.string().uuid(), /* QA-022: approver_id from body is ignored; server uses user.id from JWT. */ approver_id: z.string().uuid().optional(), comment: z.string().max(1000).optional() }), z.object({ action: z.literal('submit_decision'), instance_id: z.string().uuid(), node_id: z.string().uuid(), decision: ciEnum(['approve', 'reject']), /* QA-022: approver_id from body is ignored; server uses user.id from JWT. */ approver_id: z.string().uuid().optional(), comment: z.string().max(1000).optional() }) ]
  ```
- **ERPSyncContract** (`supabase/functions/_shared/contracts.ts`, z.object):
  ```ts
  { action: ciEnum(['push', 'pull', 'sync_po', 'sync_supplier', 'sync_invoice']), connectionId: z.string().uuid(), entity: z.string(), po_number: z.string().optional(), external_id: z.string().optional(), source: z.string().optional() }
  ```
- **FiscalContract** (`supabase/functions/_shared/contracts.ts`, z.object):
  ```ts
  { action: ciEnum(["send", "cancel", "query", "manifest"]), /* NFe/NFSe/CTe/MDFe são siglas com case fixo — mantemos preprocess p/ uppercase */ type: z.preprocess( (v: unknown) => (typeof v === "string" ? v.toUpperCase().trim() : v), z.enum(["NFE", "NFSE", "CTE", "MDFE"]).transform((v: string) => { const map: Record<string, string> = { NFE: "NFe", NFSE: "NFSe", CTE: "CTe", MDFE: "MDFe" }; return map[v] as "NFe" | "NFSe" | "CTe" | "MDFe"; }) ), document_id: z.string().uuid().optional(), payload: z.record(z.any()).optional(), }
  ```
- **TelemetryContract** (`supabase/functions/_shared/contracts.ts`, z.object):
  ```ts
  { /* Aceita variações (ERROR/WARNING/etc.) e normaliza para o enum log_level */ level: z.preprocess((v: unknown) => { const s = String(v ?? "info").toLowerCase().trim(); if (s === "warning") return "warn"; return ["info", "warn", "error", "debug"].includes(s) ? s : "info"; }, z.enum(["info", "warn", "error", "debug"])), message: z.string(), context: z.record(z.any()).optional(), requestId: z.string().optional(), tenantId: z.string().uuid().optional(), url: z.string().optional(), userAgent: z.string().optional(), }
  ```
- **DemandPredictionContract** (`supabase/functions/_shared/contracts.ts`, z.object):
  ```ts
  { historicalData: z.array(z.any()), category: z.string().optional(), timeframe: z.string().optional() }
  ```
- **SupplierSuggestionContract** (`supabase/functions/_shared/contracts.ts`, z.object):
  ```ts
  { productDescription: z.string().min(3), category: z.string().optional(), quantity: z.number().optional().nullable(), budget: z.number().optional().nullable(), purchaseHistory: z.array(z.any()).optional().nullable(), suppliers: z.array(z.any()).optional().nullable() }
  ```
- **SpotProxyContract** (`supabase/functions/_shared/contracts.ts`, z.object):
  ```ts
  { action: ciEnum(["create_session", "sync_pedidos", "verify_callback"]), session_id: z.string().uuid().optional(), payload: z.any().optional() }
  ```
- **requestSchema** (`supabase/functions/guided-buying-ai/index.ts`, z.object):
  ```ts
  { message: z.string().min(1), history: z.array(z.any()).optional().default([]), context: z.record(z.any()).optional().default({}), }
  ```
- **NeuralDraftContract** (`supabase/functions/process-solicitacao-neural/index.ts`, z.object):
  ```ts
  { input: z.string().min(3, "Descreva a necessidade (minimo 3 caracteres)").max(3000), }
  ```
- **ScimUserPostSchema** (`supabase/functions/scim-v2/index.ts`, z.object, encadeia refine):
  ```ts
  { emails: z.array(z.object({ value: z.string().email(), primary: z.boolean().optional() })).min(1), displayName: z.string().min(1).optional(), name: z.object({ formatted: z.string().min(1).optional() }).optional(), }
  ```
  - Regras cruzadas (refine): “displayName or name.formatted is required”
- **ScimPatchSchema** (`supabase/functions/scim-v2/index.ts`, z.object):
  ```ts
  { schemas: z.array(z.string()).optional(), Operations: z.array(z.object({ op: z.enum(["Add", "Remove", "Replace", "add", "remove", "replace"]), path: z.string().optional(), value: z.unknown().optional(), })).min(1), }
  ```

### F.2 react-hook-form (register/rules)

_nenhum item encontrado_

### F.3 Restrições em inputs HTML (required/min/max/pattern)

| Campo | Restrições | Arquivo |
|---|---|---|
| `renewal_notice_days` | type=number | `src/components/compras/ContractModal.tsx` |
| `cotacao-valor-unitario` | type=number, step=0.01, min=0.01 | `src/components/compras/CotacaoManualModal.tsx` |
| `cotacao-quantidade` | type=number, min=1 | `src/components/compras/CotacaoManualModal.tsx` |
| `cotacao-prazo` | type=number, min=1 | `src/components/compras/CotacaoManualModal.tsx` |
| `cotacao-frete` | type=number, step=0.01, min=0 | `src/components/compras/CotacaoManualModal.tsx` |
| `cotacao-validade` | type=date | `src/components/compras/CotacaoManualModal.tsx` |
| `signerEmail` | type=email | `src/components/compras/DigitalSignature.tsx` |
| `email` | type=email | `src/components/compras/FornecedorModal.tsx` |
| `qty` | type=number | `src/components/compras/PriceComparator.tsx` |
| `meta` | type=number | `src/components/compras/SavingsGoalPanel.tsx` |
| `alerta` | type=number, min=0, max=100 | `src/components/compras/SavingsGoalPanel.tsx` |
| `quantidade` | type=number, min=1 | `src/components/compras/solicitacao/SolicitacaoFormSteps.tsx` |
| `prazoEntrega` | type=date | `src/components/compras/solicitacao/SolicitacaoFormSteps.tsx` |
| `valorEstimado` | type=number, min=0, step=0.01 | `src/components/compras/solicitacao/SolicitacaoFormSteps.tsx` |
| `file-upload` | multiple, accept=image/*,.pdf,.doc,.docx,.xls,.xlsx, disabled=isCompressing | `src/components/compras/solicitacao/SolicitacaoFormSteps.tsx` |
| `expires` | type=number, min=1, max=8760 | `src/components/security/BlockedIPsPanel.tsx` |
| `inputId` | disabled, disabled | `src/components/ui/floating-input.tsx` |
| `warning` | type=number, min=1, max=30 | `src/features/layout/components/SLASettingsPanel.tsx` |
| `critical` | type=number, min=1, max=30 | `src/features/layout/components/SLASettingsPanel.tsx` |
| `interval` | type=number, min=1, max=60 | `src/features/layout/components/SLASettingsPanel.tsx` |
| `image-upload` | accept=image/* | `src/pages/catalogo-produtos/CatalogoProdutos.tsx` |
| `preco` | type=number, step=0.01 | `src/pages/catalogo-produtos/CatalogoProdutos.tsx` |
| `estoque_min` | type=number | `src/pages/catalogo-produtos/CatalogoProdutos.tsx` |
| `xbz-pass` | type=password | `src/pages/catalogo-xbz/XbzCredenciaisDialog.tsx` |

## G. Fórmulas e derivações (como valores são calculados)

### G.1 Colunas calculadas no banco

| Tabela | Coluna | Expressão |
|---|---|---|
| `savings_tracker` | `actual_saving` | `baseline_value - negotiated_value` |

### G.2 Views (consultas derivadas)

| View | SELECT |
|---|---|
| `supplier_compliance_summary` | `SELECT f.id AS fornecedor_id, f.razao_social, f.status, f.avaliacao, COALESCE(cp_agg.penalty_count, 0) AS penalty_count, COALESCE(cp_agg.total_penalty_value, 0) AS total_penalty_value, COALESCE(rc_agg.avg_quality_score, 0) AS avg_quality_score, COALESCE(sb_agg.bonus_count, 0) AS bonus_count, COALESC …` |
| `v_system_health_overview` | `SELECT alert_type, severity, count(*) AS total_open, count(*) FILTER (WHERE created_at > now() - interval '24h') AS last_24h, count(*) FILTER (WHERE created_at > now() - interval '1h') AS last_1h, min(created_at) AS oldest_open, max(created_at) AS most_recent FROM public.system_alerts WHERE resolved …` |
| `mv_dashboard_kpis` | `SELECT p.tenant_id, date_trunc('day', p.created_at)::date AS dia, COUNT(*)::bigint AS total_pedidos, COALESCE(SUM(p.valor_total), 0)::numeric AS valor_total, COALESCE(AVG(p.valor_total), 0)::numeric AS ticket_medio, COUNT(DISTINCT p.fornecedor_id)::bigint AS fornecedores_unicos, COUNT(*) FILTER (WHE …` |

### G.3 Funções de cálculo/decisão no código

- **shouldAutoRecoverVisualSettings(settings: AccessibilitySettings)** — `src/components/accessibility/accessibilityHelpers.ts`
  ```
  return ( settings.highContrast || settings.colorBlindMode !== 'none' || settings.reducedMotion );
  ```
- **computeStatus(snap: DepHealthSnapshot | null | undefined)** — `src/components/admin/DependencyHealthBadge.tsx`
  ```
  if (!snap) { return { tone: "unknown", label: "CI ?", dotClass: "bg-muted-foreground", reasons: ["Snapshot indisponível"] }; } const reasons: string[] = []; const driftedPkgs = (snap.packages ?? []).filter((p) => p.driftDetected); const lockDrift = snap.lockfileDrift?.detected === true; const risk = snap.treeShaking?.riskLevel; const smoke = snap.smokeTest?.status; const generatedAt = snap.generatedAt ? new Date(snap.generatedAt).getTime() : null; const ageMs = generatedAt ? Date.now() - generat …
  ```
- **formatCurrency(value: number)** — `src/components/compras/DynamicApprovalMatrix.tsx`
  ```
  value >= 999999999 ? "∞" : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  ```
- **calcularPrazo(prazo: string)** — `src/components/compras/EnhancedPedidoTimeline.tsx`
  ```
  const prazoDate = parseISO(prazo); const hoje = new Date(); const diasRestantes = differenceInDays(prazoDate, hoje); const horasRestantes = differenceInHours(prazoDate, hoje); const atrasado = isPast(prazoDate); if (atrasado) { return { label: `${Math.abs(diasRestantes)} dia(s) atrasado`, color: "text-destructive", bgColor: "bg-destructive/10", icon: AlertTriangle, }; } if (diasRestantes === 0) { return { label: `Vence hoje (${horasRestantes}h)`, color: "text-warning", bgColor: "bg-warning/10", …
  ```
- **applyFilter(filter: DashboardFilter)** — `src/components/compras/ExecutiveDashboard.tsx`
  ```
  setSelectedCategory(filter.category_filter ?? 'all'); setSelectedSupplier(filter.supplier_filter ?? 'all'); setSelectedPeriod(filter.period_filter ?? '6m'); setShowComparison(filter.show_comparison ?? true);
  ```
- **validateWithSchema(currentStep: number)** — `src/components/compras/NovaSolicitacaoModal.tsx`
  ```
  const result = solicitacaoSchema.safeParse(formData); if (result.success) return true; const newErrors: Partial<Record<keyof NovaSolicitacaoData, string>> = {}; result.error.issues.forEach(issue => { const path = issue.path[0] as keyof NovaSolicitacaoData; if (currentStep === 1 && (path === 'empresa' || path === 'vendedor')) { newErrors[path] = issue.message; } else if (currentStep === 2 && (path === 'produto' || path === 'quantidade' || path === 'prazoEntrega')) { newErrors[path] = issue.messag …
  ```
- **PriceComparator()** — `src/components/compras/PriceComparator.tsx`
  ```
  const { toast } = useToast(); const [open, setOpen] = useState(false); const [loading, setLoading] = useState(false); const [productName, setProductName] = useState(''); const [selectedProductId, setSelectedProductId] = useState<string | null>(null); const [quantity, setQuantity] = useState('100'); const [comparison, setComparison] = useState<ComparisonResult | null>(null); const [selectedQuotes, setSelectedQuotes] = useState<string[]>([]); const { data: fornecedores = [] } = useQuery({ queryKey …
  ```
- **PriceHistoryModal({ open, onOpenChange }: PriceHistoryModalProps)** — `src/components/compras/PriceHistoryModal.tsx`
  ```
  const [selectedFornecedor, setSelectedFornecedor] = useState<string>("all"); const [selectedSolicitacao, setSelectedSolicitacao] = useState<string>("all"); const { data: cotacoes = [] } = useQuery({ queryKey: ["price-history-cotacoes"], queryFn: () => fetchAllRows<CotacaoRecord>( "cotacoes", "id, numero, valor_unitario, valor_total, quantidade, fornecedor_id, solicitacao_id, created_at, status" ), enabled: open, }); const { data: fornecedores = [] } = useQuery({ queryKey: ["price-history-fornece …
  ```
- **formatCurrency(v: number | null)** — `src/components/compras/ProductSupplierManager.tsx`
  ```
  
  ```
- **RankingCotacoes({ cotacoes, quantidade, onSelecionar, selecionado }: RankingCotacoesProps)** — `src/components/compras/RankingCotacoes.tsx`
  ```
  const [weights, setWeights] = useState<ScoreWeights>({ preco: 60, prazo: 20, estoque: 20 }); const [justificativa, setJustificativa] = useState(""); const [showJustifyModal, setShowJustifyModal] = useState(false); const [pendingSelectionId, setPendingSelectionId] = useState<string | null>(null); const confirmSelection = () => { if (pendingSelectionId) { onSelecionar(pendingSelectionId, justificativa); setShowJustifyModal(false); setPendingSelectionId(null); setJustificativa(""); } }; const handl …
  ```
- **PriceTrendChart({ data }: { data: { date: string, price: number }[] })** — `src/components/compras/SourcingHistoryConsole.tsx`
  ```
  (
  ```
- **PriceVarianceAnalysis()** — `src/components/compras/executive/PriceVarianceAnalysis.tsx`
  ```
  return ( <Card className="h-full border-white/5 bg-white/[0.03] backdrop-blur-2xl rounded-[2.5rem] overflow-hidden transition-all duration-300 hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)]"> <CardHeader className="pb-2"> <CardTitle className="text-lg flex items-center gap-3 font-black text-white uppercase tracking-tight"> <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400"> <GitCompare className="h-5 w-5 animate-pulse" /> </div> Price Variance (SKU) </CardTitle> <p className="text-[10p …
  ```
- **calculateChange(current: number, previous: number)** — `src/components/compras/executive/executiveDashboardData.ts`
  ```
  if (!previous) return 0; return ((current - previous) / previous) * 100;
  ```
- **generateQuotesFromSuppliers(fornecedores: FornecedorLike[], productName: string, qty: number, linkedProductSuppliers: LinkedSupplierLike[] = [], quo)** — `src/components/compras/price-comparator/priceComparatorHelpers.ts`
  ```
  const quotes: PriceQuote[] = fornecedores.map((f) => { const linked = linkedProductSuppliers.find((ls) => ls.fornecedor_id === f.id); const quoted = quotedPrices.find((q) => q.fornecedor_id === f.id); const contracted = toNumber(linked?.preco_custo); const quotedPrice = toNumber(quoted?.valor_unitario); const unitPrice = contracted ?? quotedPrice; const priceSource: PriceQuote['priceSource'] = contracted !== null ? 'contratado' : quotedPrice !== null ? 'cotado' : 'ausente'; const totalPrice = un …
  ```
- **usePriceHistoryAnalysis(cotacoes: CotacaoRecord[], filtered: CotacaoRecord[], fornecedorMap: Map<string, string>, solicitacaoMap: Map<string, st)** — `src/components/compras/price-history/priceHistoryHelpers.ts`
  ```
  const trend = useMemo(() => { if (filtered.length < 2) return null; const half = Math.ceil(filtered.length / 2); const recent = filtered.slice(half); const older = filtered.slice(0, half); const avgRecent = recent.reduce((s, c) => s + c.valor_unitario, 0) / recent.length; const avgOlder = older.reduce((s, c) => s + c.valor_unitario, 0) / older.length; const change = avgOlder > 0 ? ((avgRecent - avgOlder) / avgOlder) * 100 : 0; return { avgRecent, avgOlder, change }; }, [filtered]); const monthly …
  ```
- **round(value: number, decimals = 0)** — `src/components/compras/procurement-kpis/deriveKpiSnapshot.ts`
  ```
  const factor = 10 ** decimals; return Math.round(value * factor) / factor;
  ```
- **ScoresTab({ selectedCotacoes, pieData, getScore }: Pick<ChartProps, 'selectedCotacoes' | 'pieData' | 'getScore'>)** — `src/components/compras/visual-comparador/ComparadorCharts.tsx`
  ```
  return ( <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="h-full"> <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full"> <Card> <CardHeader className="pb-2"> <CardTitle className="text-lg flex items-center gap-2"> <Star className="w-5 h-5 text-warning" /> Pontuação Geral </CardTitle> </CardHeader> <CardContent className="h-[calc(100%-60px)]"> <ResponsiveContainer width="100%" height="100%"> <RechartsPieChart> <Pie data={pieData} cx="50%" cy …
  ```
- **applyAdvancedFilters(pagamentos: Pagamento[], filters: PagamentoFiltersState)** — `src/components/pagamentos/PagamentoAdvancedFilters.tsx`
  ```
  let result = pagamentos; const hoje = new Date(); if (filters.search) { const term = filters.search.toLowerCase(); result = result.filter(p => p.numero.toLowerCase().includes(term) || p.fornecedor?.razao_social?.toLowerCase().includes(term) || p.numero_nf?.toLowerCase().includes(term) ); } if (filters.status !== "todos") { result = result.filter(p => p.status === filters.status); } if (filters.formaPagamento !== "todos") { result = result.filter(p => p.forma_pagamento === filters.formaPagamento) …
  ```
- **FeedbackSettingsPanel()** — `src/components/settings/FeedbackSettingsPanel.tsx`
  ```
  const { soundEnabled, hapticEnabled, volume, setSoundEnabled, setHapticEnabled, setVolume } = useFeedbackPreferences(); const feedback = useFeedback(); const testButtons = [ { label: "Sucesso", icon: Check, action: feedback.success, color: "text-success" }, { label: "Erro", icon: X, action: feedback.error, color: "text-destructive" }, { label: "Aviso", icon: AlertTriangle, action: feedback.warning, color: "text-warning" }, { label: "Info", icon: Info, action: feedback.info, color: "text-info" }, …
  ```
- **calculateTrend(current: number, previous: number)** — `src/hooks/useDashboardKPIs.ts`
  ```
  if (previous === 0) return 0; return ((current - previous) / previous) * 100;
  ```
- **generateSparkline(_base: number, _count: number = 7)** — `src/hooks/useDashboardKPIs.ts`
  ```
  [];
  ```
- **round1(value: number)** — `src/hooks/useExecutiveDashboardData.ts`
  ```
  Math.round(value * 10) / 10;
  ```
- **calc(str: string, weights: number[])** — `src/hooks/useFornecedores.ts`
  ```
  
  ```
- **canTransition(from: string, to: string)** — `src/hooks/usePagamentos.ts`
  ```
  return transicaoPermitidaNaTela(VALID_PAGAMENTO_TRANSITIONS, from, to);
  ```
- **generateId()** — `src/hooks/useWorkflowDLQ.ts`
  ```
  return `wdlq_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  ```
- **calcularAbatimentoCredito(credito: CreditoAtual, valorAplicado: number,)** — `src/lib/creditoFornecedor.ts`
  ```
  const valorUtilizadoAtual = Number(credito.valor_utilizado) || 0; const saldo = (Number(credito.saldo) || 0) - valorAplicado; return { valor_utilizado: valorUtilizadoAtual + valorAplicado, saldo: saldo < 0 ? 0 : saldo, status: saldo <= 0 ? 'utilizado' : 'ativo', };
  ```
- **formatCurrency(value: unknown)** — `src/lib/exportData.ts`
  ```
  const num = Number(value); if (isNaN(num)) return ''; return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  ```
- **triggerFeedback(type: FeedbackType)** — `src/lib/feedbackToast.ts`
  ```
  const { soundEnabled, hapticEnabled, volume } = useFeedbackPreferences.getState(); /* Haptic feedback */ if (hapticEnabled && 'vibrate' in navigator) { navigator.vibrate(hapticPatterns[type]); } /* Sound feedback */ if (soundEnabled) { try { const audioContext = getAudioContext(); if (!audioContext) return; const config = soundConfigs[type]; const oscillator = audioContext.createOscillator(); const gainNode = audioContext.createGain(); oscillator.type = config.type; oscillator.frequency.setValue …
  ```
- **calculateDimensions(originalWidth: number, originalHeight: number, maxWidth: number, maxHeight: number)** — `src/lib/imageCompression.ts`
  ```
  width: number; height: number
  ```
- **generateOrderPDF(data: OrderPDFData)** — `src/lib/pdfGenerator.ts`
  ```
  const company: OrderPDFCompany = { ...DEFAULT_COMPANY, ...data.company }; const doc = new jsPDF(); const pageWidth = doc.internal.pageSize.getWidth(); /* Branding Colors */ const primaryColor = [13, 148, 136]; /* Teal-600 (approx) */ const secondaryColor = [71, 85, 105]; /* Slate-600 */ /* Header Background */ doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]); doc.rect(0, 0, pageWidth, 40, 'F'); /* Title */ doc.setFontSize(24); doc.setTextColor(255, 255, 255); doc.setFont("helv …
  ```
- **round2(value: number)** — `src/lib/sourcingAnalytics.ts`
  ```
  Math.round(value * 100) / 100;
  ```
- **round1(value: number)** — `src/lib/sourcingAnalytics.ts`
  ```
  Math.round(value * 10) / 10;
  ```
- **rpcGenerateSequentialNumber(supabase: SupabaseClient, params: { prefix: string; table_name: string },)** — `src/lib/supabaseRpc.ts`
  ```
  return supabase.rpc("generate_sequential_number", params) as unknown as RpcResult<string>;
  ```
- **rpcIsAccountLocked(supabase: SupabaseClient, params: { _email: string },)** — `src/lib/supabaseRpc.ts`
  ```
  return supabase.rpc("is_account_locked", params) as unknown as RpcResult<AccountLockStatus>;
  ```
- **generateUniqueKey()** — `src/lib/utils.ts`
  ```
  const c = globalThis.crypto; if (c?.randomUUID) { try { return c.randomUUID(); } catch { /* fall through */ } } const rand = c?.getRandomValues(new Uint32Array(2)); if (rand) return `k-${Date.now().toString(36)}-${Array.from(rand, (n) => n.toString(36)).join("")}`; return `k-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  ```
- **formatCurrency(value: number | null | undefined)** — `src/lib/utils.ts`
  ```
  if (value === null || value === undefined) return 'R$ 0,00'; return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  ```
- **calcularSLA(prazoEntrega: string, statusPedido: string)** — `src/pages/acompanhamento/AcompanhamentoHelpers.ts`
  ```
  if (statusPedido === 'ENTREGUE') { return { status: 'entregue', diasRestantes: 0, label: 'Entregue', color: 'text-success', bgColor: 'bg-success/10', icon: CheckCircle2 }; } const prazo = parseISO(prazoEntrega); const hoje = new Date(); const diasRestantes = differenceInDays(prazo, hoje); const horasRestantes = differenceInHours(prazo, hoje); if (isPast(prazo) && !isToday(prazo)) { return { status: 'atrasado', diasRestantes, label: `${Math.abs(diasRestantes)} dia${Math.abs(diasRestantes) !== 1 ? …
  ```
- **gerarEtapasPipeline(status: string, marcos: MarcosDoPipeline = {})** — `src/pages/acompanhamento/AcompanhamentoHelpers.ts`
  ```
  const todasEtapas = [ { id: 'solicitacao', nome: 'Solicitação' }, { id: 'cotacao', nome: 'Cotação' }, { id: 'pedido', nome: 'Pedido' }, { id: 'pagamento', nome: 'Pagamento' }, { id: 'transito', nome: 'Em Trânsito' }, { id: 'entregue', nome: 'Entregue' }, ]; const statusOrdem: Record<string, number> = { AGUARDANDO_COTACAO: 0, EM_COTACAO: 1, FORNECEDOR_SELECIONADO: 2, PEDIDO_GERADO: 2, AGUARDANDO_PAGAMENTO: 3, PAGO: 4, EM_TRANSITO: 4, ENTREGUE: 5, }; const etapaAtual = statusOrdem[status] ?? 0; re …
  ```
- **gerarEtapasEnhanced(pedido: AcompanhamentoPedido)** — `src/pages/acompanhamento/AcompanhamentoHelpers.ts`
  ```
  const statusOrdem: Record<string, number> = { AGUARDANDO_COTACAO: 0, EM_COTACAO: 1, FORNECEDOR_SELECIONADO: 2, PEDIDO_GERADO: 2, AGUARDANDO_PAGAMENTO: 3, PAGO: 4, EM_TRANSITO: 4, ENTREGUE: 5, }; const etapaAtual = statusOrdem[pedido.status] ?? 0; const dataBase = new Date(pedido.createdAt); const todasEtapas: TimelineStep[] = [ { id: 'solicitacao', nome: 'Solicitação Criada', status: 'pendente', dataReal: pedido.createdAt, data: new Date(pedido.createdAt).toLocaleDateString('pt-BR'), descricao: …
  ```
- **generateScimToken()** — `src/pages/admin/SSOConfig.tsx`
  ```
  if (!tenantId) { toast.error('Empresa não identificada'); return; } const bytes = new Uint8Array(32); crypto.getRandomValues(bytes); const token = 'scim_' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(''); const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)); const hash = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join(''); const { error } = await supabase.from('sso_configurations').upsert({ tenant_id: tenantId, …
  ```
- **computeStats(rows: TelemetryRow[])** — `src/pages/admin-telemetria/telemetriaHelpers.ts`
  ```
  const verySlow = rows.filter(r => r.severity === "very_slow").length; const slow = rows.filter(r => r.severity === "slow").length; const errors = rows.filter(r => r.severity === "error").length; const avgDuration = rows.length > 0 ? Math.round(rows.reduce((s, r) => s + r.duration_ms, 0) / rows.length) : 0; const tableStats = new Map<string, { count: number; totalMs: number; maxMs: number }>(); for (const r of rows) { const key = r.rpc_name || r.table_name || "unknown"; const prev = tableStats.ge …
  ```
- **valorDoDetalhe(detalhes: Record<string, unknown> | null | undefined)** — `src/pages/aprovacoes/aprovacoesData.ts`
  ```
  const valor = detalhes?.valor; return typeof valor === "number" && Number.isFinite(valor) ? valor : 0;
  ```
- **formatCurrency(v: number | null)** — `src/pages/catalogo-produtos/CatalogoProdutos.tsx`
  ```
  
  ```
- **priceVariation(p: Produto)** — `src/pages/catalogo-produtos/CatalogoProdutos.tsx`
  ```
  if (!p.preco_referencia || !p.ultimo_preco || p.preco_referencia === 0) return null; return ((p.ultimo_preco - p.preco_referencia) / p.preco_referencia) * 100;
  ```
- **cpfValido(valor: unknown)** — `src/pages/catalogo-xbz/xbzHelpers.ts`
  ```
  const cpf = somenteDigitos(valor); if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false; const digito = (quantidade: number) => { let soma = 0; for (let i = 0; i < quantidade; i += 1) soma += Number(cpf[i]) * (quantidade + 1 - i); const resto = (soma * 10) % 11; return resto === 10 ? 0 : resto; }; return digito(9) === Number(cpf[9]) && digito(10) === Number(cpf[10]);
  ```
- **placaValida(valor: unknown)** — `src/pages/catalogo-xbz/xbzHelpers.ts`
  ```
  return /^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(normalizarPlaca(valor));
  ```
- **computeComplianceKPIs(data: ComplianceData[])** — `src/pages/compliance/complianceHelpers.ts`
  ```
  const infractors = data.filter(d => d.penalty_count > 0 || d.late_deliveries > 0 || d.rejected_count > 0); const compliant = data.filter(d => d.on_time_rate >= 95 && d.penalty_count === 0); const totalPenaltyValue = data.reduce((s, d) => s + Number(d.total_penalty_value), 0); const avgOnTimeRate = data.length > 0 ? data.reduce((s, d) => s + Number(d.on_time_rate), 0) / data.length : 0; return { infractors, compliant, totalPenaltyValue, avgOnTimeRate };
  ```
- **valorNumerico(valor: number | string | null | undefined)** — `src/pages/documentos/conciliacaoFiscal.ts`
  ```
  if (valor === null || valor === undefined || valor === "") return null; const numero = Number(valor); return Number.isFinite(numero) ? numero : null;
  ```
- **GerarOrdem()** — `src/pages/gerar-ordem/GerarOrdem.tsx`
  ```
  { const { user, tenantId, selectedEmpresaId } = useAuth(); const navigate = useNavigate(); const [searchParams] = useSearchParams(); const solicitacaoId = searchParams.get("solicitacao"); const cotacaoId = searchParams.get("cotacao"); const [copiado, setCopiado] = useState<string | null>(null); const [mensagemWhatsApp, setMensagemWhatsApp] = useState(""); const [mensagemEmail, setMensagemEmail] = useState(""); const [assuntoEm
  ```
- **gerarMensagemWhatsApp()** — `src/pages/gerar-ordem/GerarOrdem.tsx`
  ```
  setMensagemWhatsApp(buildWhatsAppMessage( { nome_fantasia: fornecedor.nome_fantasia || '', razao_social: fornecedor.razao_social }, solicitacao, ordemNumero, total, frete, desconto, observacoes, ));
  ```
- **gerarMensagemEmail()** — `src/pages/gerar-ordem/GerarOrdem.tsx`
  ```
  const { assunto, corpo } = buildEmailMessage( solicitacao, ordemNumero, subtotal, total, frete, desconto, observacoes, { empresa: empresaEntrega?.nome_fantasia || empresaEntrega?.razao_social || empresaEntrega?.name || null, endereco: formatarEnderecoEntrega(empresaEntrega?.endereco_fiscal), }, ); setAssuntoEmail(assunto); setMensagemEmail(corpo);
  ```
- **applyPeriodPreset(preset: string)** — `src/pages/historico/HistoricoCompras.tsx`
  ```
  setPeriodPreset(preset); const today = new Date(); switch (preset) { case "7d": setDateRange({ from: subDays(today, 7), to: today }); break; case "30d": setDateRange({ from: subDays(today, 30), to: today }); break; case "90d": setDateRange({ from: subDays(today, 90), to: today }); break; case "thisMonth": setDateRange({ from: startOfMonth(today), to: endOfMonth(today) }); break; case "lastMonth": { const lm = subMonths(today, 1); setDateRange({ from: startOfMonth(lm), to: endOfMonth(lm) }); brea …
  ```
- **aplicarStatusRecebimento(atualizarPedido: AtualizarPedido, pedidoId: string, statusAtual: string, alvo: 'entregue' | 'parcial', observacoes: stri)** — `src/pages/recebimento/recebimentoHelpers.ts`
  ```
  const caminho = caminhoDeStatus(statusAtual, alvo); if (!caminho) return `Transicao de status invalida: ${statusAtual} -> ${alvo}`; /* Sem transicao a aplicar, um UPDATE so para as observacoes do recebimento. */ const passos: (string | null)[] = caminho.length > 0 ? caminho : [null]; for (const [i, status] of passos.entries()) { const campos: CamposStatusPedido = {}; if (status) campos.status = status; if (i === 0 && observacoes !== null) campos.observacoes = observacoes; if (status === 'entregu …
  ```
- **canRequest()** — `supabase/functions/_shared/circuit_breaker.ts`
  ```
  if (this.state === "open") { if (Date.now() - this.openedAt >= this.opts.cooldownMs) { this.state = "half_open"; return true; } return false; } return true;
  ```
- **validate(schema: z.ZodSchema, payload: any)** — `supabase/functions/_shared/contracts.ts`
  ```
  const result = schema.safeParse(payload); if (!result.success) { return { isValid: false, errors: result.error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`) }; } return { isValid: true, data: result.data };
  ```
- **generateMutations(schema: any, validBase: any)** — `supabase/functions/_shared/fuzzer.ts`
  ```
  const mutations: any[] = []; /* Support Discriminated Unions and regular Objects */ const shape = schema instanceof z.ZodObject ? schema.shape : (schema._def?.options?.[0]?.shape || schema._def?.shape || {}); const keys = Object.keys(shape); /* 1. Missing required fields */ keys.forEach(key => { const mutation = { ...validBase }; delete mutation[key]; mutations.push({ type: `missing_${key}`, payload: mutation }); }); /* 2. Wrong types for fields */ keys.forEach(key => { const mutation = { ...val …
  ```
- **defaultShouldRetry(err: unknown)** — `supabase/functions/_shared/retry.ts`
  ```
  const msg = (err as Error)?.message?.toLowerCase() ?? ""; /* Timeouts, resets, 5xx e 429 são retryable */ return /timeout|timed out|econnreset|network|fetch failed|5\d\d|429/.test(msg);
  ```
- **validateAuth(req: Request)** — `supabase/functions/_shared/security.ts`
  ```
  const authHeader = req.headers.get('Authorization'); if (!authHeader) { throw new Error('Missing Authorization header'); } return authHeader;
  ```
- **validateTenant(_req: Request, _resourceTenantId?: string)** — `supabase/functions/_shared/security.ts`
  ```
  throw new Error( "validateTenant() está descontinuado (M-02). Use getAuthUser(req) + getTenantId(client, user) para resolver o tenant via user_tenants." );
  ```
- **extractPriceTiers(optional: Record<string, unknown>, maxTiers = 10)** — `supabase/functions/_shared/spot_api.ts`
  ```
  minQty: number; price: number
  ```
- **priceForQuantity(tiers: ReadonlyArray<{ minQty: number; price: number }>, quantity: number,)** — `supabase/functions/_shared/spot_api.ts`
  ```
  let selected: number | null = null; for (const tier of tiers) { if (quantity >= tier.minQty) selected = tier.price; } return selected ?? (tiers.length > 0 ? tiers[0].price : null);
  ```
- **validateMethod(req: Request, methods: string[])** — `supabase/functions/_shared/validation.ts`
  ```
  if (!methods.includes(req.method)) { throw new Error(`Method ${req.method} not allowed. Use: ${methods.join(', ')}`); }
  ```
- **cpfValido(valor: unknown)** — `supabase/functions/_shared/xbz_portador.ts`
  ```
  const cpf = somenteDigitos(valor); if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false; const digito = (quantidade: number) => { let soma = 0; for (let i = 0; i < quantidade; i += 1) soma += Number(cpf[i]) * (quantidade + 1 - i); const resto = (soma * 10) % 11; return resto === 10 ? 0 : resto; }; return digito(9) === Number(cpf[9]) && digito(10) === Number(cpf[10]);
  ```
- **placaValida(valor: unknown)** — `supabase/functions/_shared/xbz_portador.ts`
  ```
  return /^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(normalizarPlaca(valor));
  ```
- **shouldSendFollowUp(cotacao: StaleCotacaoRow, solicitanteId: string | null | undefined, ultimoFollowUpIso: string | null | undefined, now: D)** — `supabase/functions/check-cotacao-followup/cotacaoFollowUp.ts`
  ```
  if (!solicitanteId) return { shouldNotify: false, reason: "sem_destinatario" }; if (ultimoFollowUpIso) { const last = Date.parse(ultimoFollowUpIso); if (!Number.isNaN(last) && now.getTime() - last < dedupeHours * 60 * 60 * 1000) { return { shouldNotify: false, reason: "recente_duplicada" }; } } return { shouldNotify: true };
  ```
- **scanTreeShakingViaGitHub(rawBase: string,)** — `supabase/functions/dependency-health/index.ts`
  ```
  if (!GITHUB_DISPATCH_TOKEN) return null; const or = deriveOwnerRepo(rawBase); if (!or) return null; const q = encodeURIComponent( `from "date-fns" repo:${or.owner}/${or.repo} path:src`, ); const url = `https://api.github.com/search/code?q=${q}&per_page=50`; try { const res = await fetch(url, { headers: { Authorization: `Bearer ${GITHUB_DISPATCH_TOKEN}`, Accept: "application/vnd.github.text-match+json",
  ```
- **computePackageHealth(pkg: any, lockText: string, entry: TrackedEntry,)** — `supabase/functions/dependency-health/index.ts`
  ```
  let spec: string = pkg?.[entry.location]?.[entry.npmName] ?? ""; if (!spec) { const altLoc: TrackedEntry["location"] = entry.location === "dependencies" ? "devDependencies" : "dependencies"; spec = pkg?.[altLoc]?.[entry.npmName] ?? ""; } const locked = resolveLockedVersion(lockText, entry.npmName) ?? ""; const installed = locked; /* edge cannot read node_modules */ const exactPinned = /^\d+\.\d+\.\d+$/.test(spec); const normalizedSpec = spec.replace(/^[\^~]/, ""); const driftDetected = Boolean(s …
  ```
- **formatMoney(value: number, currency: string)** — `supabase/functions/punchout-receive/solicitation.ts`
  ```
  return `${currency} ${value.toFixed(2)}`;
  ```
- **validateOsPayload(payload: OsPayload)** — `supabase/functions/receive-os-sync/mapping.ts`
  ```
  osId: string; quantidade: number
  ```
- **computeIkm(authSecret: Bytes, ecdhSecret: Bytes, receiverPub: Bytes, senderPub: Bytes,)** — `supabase/functions/send-push-notification/webpush.ts`
  ```
  const info = concatBytes( new TextEncoder().encode("WebPush: info\0"), receiverPub, senderPub, ); const prk = await hmacSha256(authSecret, ecdhSecret); return hkdfExpand(prk, info, 32);
  ```
- **generateVapidAuth(endpoint: string, vapidPublicKey: string, vapidPrivateKey: string,)** — `supabase/functions/send-push-notification/webpush.ts`
  ```
  authorization: string; cryptoKey: string
  ```
- **validateSession(token: string)** — `supabase/functions/spot-api/index.ts`
  ```
  try { const res = await fetch(`${BASE_URL}/ValidateSession?token=${encodeURIComponent(token)}`, { signal: AbortSignal.timeout(15_000), }); const json = await res.json().catch(() => null); return Number(json?.Status) === 1; } catch { return false; }
  ```
- **parseTotalPages(html: string)** — `supabase/functions/spot-proxy/index.ts`
  ```
  const pageMatch = html.match(/\?p=(\d+)/g); if (pageMatch) { const pages = pageMatch.map(p => parseInt(p.replace("?p=", ""))); return Math.max(...pages, 1); } return 1;
  ```
- **formatCurrency(v: number)** — `supabase/functions/weekly-report/index.ts`
  ```
  
  ```

### G.4 Percentuais e multiplicadores no código

| Trecho | Arquivo |
|---|---|
| `0%` | `src/components/compras/AdvancedProcurementKPIs.tsx` |
| `<span>85% alcançado</span>` | `src/components/compras/BulkPlanningConsole.tsx` |
| `// Delivery time weight: 30%` | `src/components/compras/ComparadorCotacoes.tsx` |
| `// Price weight: 50%` | `src/components/compras/ComparadorCotacoes.tsx` |
| `// Stock availability weight: 20%` | `src/components/compras/ComparadorCotacoes.tsx` |
| `score += prazoScore * 0.3;` | `src/components/compras/ComparadorCotacoes.tsx` |
| `score += priceScore * 0.5;` | `src/components/compras/ComparadorCotacoes.tsx` |
| `score += stockScore * 0.2;` | `src/components/compras/ComparadorCotacoes.tsx` |
| `const potentialExtraSaving = Math.round(kpis.volumeMes * 0.03); // Assuming we can save 3% more` | `src/components/compras/DashboardInsights.tsx` |
| `previousValue: Math.max(1, rm.ordersThisMonth.value * 0.85),` | `src/components/compras/ExecutiveDashboard.tsx` |
| `Confiança da análise: 94%` | `src/components/compras/PriceHistoryModal.tsx` |
| `Sum must equal 100% for precise calculation.` | `src/components/compras/RankingCotacoes.tsx` |
| `const operationalRisk = Math.round(Math.max(15, deliveryRisk * 0.8 + qualityRisk * 0.2));` | `src/components/compras/RiskHeatMap.tsx` |
| `const overallRisk = Math.round(financialRisk * 0.15 + operationalRisk * 0.25 + qualityRisk * 0.2 + deliveryRisk * 0.2 + concentrationRisk * 0.1 + geopoliticalRi …` | `src/components/compras/RiskHeatMap.tsx` |
| `return qualidade * 0.4 + supplier.onTimeRate * 0.35 + preco * 0.25;` | `src/components/compras/SourcingHistoryConsole.tsx` |
| `.filter(f => f.limite_credito && f.saldo_comprometido && f.saldo_comprometido >= f.limite_credito * 0.8)` | `src/components/compras/SupplierAlertsPanel.tsx` |
| `deve subir 8% no próximo mês. Recomendamos antecipar pedidos com` | `src/components/compras/SupplierIntelligenceConsole.tsx` |
| `// Delivery time weight: 30%` | `src/components/compras/VisualComparadorCotacoes.tsx` |
| `// Price weight: 50%` | `src/components/compras/VisualComparadorCotacoes.tsx` |
| `// Stock availability weight: 20%` | `src/components/compras/VisualComparadorCotacoes.tsx` |
| `score += prazoScore * 0.3;` | `src/components/compras/VisualComparadorCotacoes.tsx` |
| `score += priceScore * 0.5;` | `src/components/compras/VisualComparadorCotacoes.tsx` |
| `score += stockScore * 0.2;` | `src/components/compras/VisualComparadorCotacoes.tsx` |
| `+12.4% vs LTM` | `src/components/compras/executive/ExecutiveChartsRow.tsx` |
| `communication * 0.08 +` | `src/components/compras/scorecard/supplierScorecardData.ts` |
| `deliveryTime * 0.20 +` | `src/components/compras/scorecard/supplierScorecardData.ts` |
| `flexibility * 0.07` | `src/components/compras/scorecard/supplierScorecardData.ts` |
| `pricing * 0.15 +` | `src/components/compras/scorecard/supplierScorecardData.ts` |
| `quality * 0.25 +` | `src/components/compras/scorecard/supplierScorecardData.ts` |
| `slaCompliance * 0.25 +` | `src/components/compras/scorecard/supplierScorecardData.ts` |
| `x: -380 + swipeState.deltaX * 0.4,` | `src/components/onboarding/OnboardingTour.tsx` |
| `x: 380 + swipeState.deltaX * 0.4,` | `src/components/onboarding/OnboardingTour.tsx` |
| `items.forEach(item => { if (!seenIds.has(item.id)) allResults.push({ ...item, score: weight * 0.3 }); });` | `src/features/layout/components/AdvancedSearch.tsx` |
| `// Snapshot dos KPIs avançados, 100% derivado do banco (sem baseline fictício).` | `src/hooks/useExecutiveDashboardData.ts` |
| `buckets[idx].savings += val * 0.08;` | `src/hooks/useExecutiveDashboardData.ts` |
| `const prev = c.value * 0.92;` | `src/hooks/useExecutiveDashboardData.ts` |
| `previousOrders: Math.max(1, Math.round(v.orders * 0.85)),` | `src/hooks/useExecutiveDashboardData.ts` |
| `previousSavings: Math.round(v.spend * 0.07),` | `src/hooks/useExecutiveDashboardData.ts` |
| `previousSpend: Math.round(v.spend * 0.9),` | `src/hooks/useExecutiveDashboardData.ts` |
| `savings: Math.round(v.spend * 0.08),` | `src/hooks/useExecutiveDashboardData.ts` |
| `savings: { value: savings, target: savings * 0.8 },` | `src/hooks/useExecutiveDashboardData.ts` |
| `gainNode.gain.linearRampToValueAtTime(volume * 0.3, startTime + 0.01);` | `src/hooks/useFeedback.ts` |
| `// Explicit columns: drops ~30% payload vs `*` on wide table.` | `src/hooks/useProdutos.ts` |
| `gainNode.gain.setValueAtTime(volume * 0.3, audioContext.currentTime);` | `src/lib/feedbackToast.ts` |
| `const indice = Math.max(0, Math.min(100, pontualidade * 0.45 + qualidade * 0.45 + (100 - devolucao) * 0.1));` | `src/lib/sourcingAnalytics.ts` |
| `const indice = round1(qualidade * 0.4 + s.onTimeRate * 0.35 + preco * 0.25);` | `src/lib/sourcingAnalytics.ts` |
| `* cada terceiro pedido a barra virava 40% ambar com o rotulo ATENCAO, sem` | `src/pages/pedidos/pedidosHelpers.ts` |
| `<span>Meta: 12%</span>` | `src/pages/relatorio-negociacoes/RelatorioNegociacoes.tsx` |
| `/** Janela de urgencia: ate 90 dias de folga cai de 100% para 0% do eixo. */` | `src/pages/solicitacoes/solicitacoesHelpers.ts` |
| `const delay = Math.min(max, base * 2 ** attempt) * (0.5 + Math.random() * 0.5);` | `supabase/functions/_shared/retry.ts` |
| `* `%#COT-1 %` N?O casa `#COT-12 `. Os curingas do usu?rio s?o escapados para` | `supabase/functions/check-cotacao-followup/cotacaoFollowUp.ts` |
| `assertEquals(dedupePattern("COT%1", "id-1"), "%#COT\\%1 %");` | `supabase/functions/check-cotacao-followup/cotacaoFollowUp_test.ts` |
| `assertEquals(p, "%#COT-1 %");` | `supabase/functions/check-cotacao-followup/cotacaoFollowUp_test.ts` |
| `const jitter = delay * (Math.random() * 0.5 - 0.25);` | `supabase/functions/dependency-health/index.ts` |

## H. Parâmetros de negócio (constantes, prazos, limites)

### H.1 Constantes

| Constante | Valor | Arquivo |
|---|---|---|
| `STALE_MS` | `7 * 24 * 60 * 60 * 1000` | `src/components/admin/DependencyHealthBadge.tsx` |
| `EMPTY` | `'—'` | `src/components/compras/SLABySupplierAnalysis.tsx` |
| `SIDEBAR_COOKIE_MAX_AGE` | `60 * 60 * 24 * 7` | `src/components/ui/sidebar.tsx` |
| `SIDEBAR_WIDTH` | `"16rem"` | `src/components/ui/sidebar.tsx` |
| `SIDEBAR_WIDTH_MOBILE` | `"18rem"` | `src/components/ui/sidebar.tsx` |
| `MAX_VISIBLE` | `3` | `src/features/layout/components/Breadcrumbs.tsx` |
| `CLEAR_FILTERS_DESCRIPTION` | `"Limpar filtros (tela atual)"` | `src/features/layout/components/KeyboardShortcutsDialog.tsx` |
| `MAX_HISTORY_ITEMS` | `10` | `src/features/layout/components/search/searchConfig.ts` |
| `DEFAULT_TRANSITION` | `"blur-scale"` | `src/features/layout/transitions/config.ts` |
| `SEM_PERMISSAO` | `'sem permissão para alterar esta(s) solicitação(ões)'` | `src/features/solicitacoes/hooks/useSolicitacoes.ts` |
| `MOBILE_BREAKPOINT` | `768` | `src/hooks/use-mobile.tsx` |
| `TOAST_LIMIT` | `1` | `src/hooks/use-toast.ts` |
| `TOAST_REMOVE_DELAY` | `1000000` | `src/hooks/use-toast.ts` |
| `DEBOUNCE_MS` | `800` | `src/hooks/useAccountFilters.ts` |
| `UNDO_TIMEOUT_MS` | `6000` | `src/hooks/useClearFiltersFlow.tsx` |
| `MAX_RETRIES` | `5` | `src/hooks/useOfflineSync.ts` |
| `PREFETCH_STALE_TIME` | `30 * 1000` | `src/hooks/usePrefetch.ts` |
| `PREFETCH_CACHE_TIME` | `5 * 60 * 1000` | `src/hooks/usePrefetch.ts` |
| `DEFAULT_MAX_ITEMS` | `30` | `src/hooks/useRecentlyViewed.ts` |
| `IDLE_TIMEOUT_MS` | `30 * 60 * 1000` | `src/hooks/useSessionIdleTimeout.ts` |
| `THROTTLE_MS` | `60_000` | `src/hooks/useSessionIdleTimeout.ts` |
| `MAX_RETRIES` | `3` | `src/hooks/useWorkflowDLQ.ts` |
| `XBZ_CLIENT_TIMEOUT_MS` | `45_000` | `src/hooks/useXbzIntegration.ts` |
| `RETRY_MAX_ATTEMPTS` | `2` | `src/hooks/useXbzIntegration.ts` |
| `RETRY_BASE_DELAY_MS` | `600` | `src/hooks/useXbzIntegration.ts` |
| `STATIC_CACHE_TTL_MS` | `5 * 60_000` | `src/hooks/useXbzIntegration.ts` |
| `XBZ_SLOW_MS` | `3_000` | `src/hooks/useXbzIntegration.ts` |
| `XBZ_VERY_SLOW_MS` | `8_000` | `src/hooks/useXbzIntegration.ts` |
| `CHANGE_EVENT` | `'clear-filters-shortcut-changed'` | `src/lib/clearFiltersShortcut.ts` |
| `BOM` | `'\uFEFF'` | `src/lib/exportData.ts` |
| `TELEMETRY_BATCH_INTERVAL_MS` | `5_000` | `src/lib/logger.ts` |
| `TELEMETRY_MAX_BATCH` | `20` | `src/lib/logger.ts` |
| `TELEMETRY_RATE_WINDOW_MS` | `60_000` | `src/lib/logger.ts` |
| `TELEMETRY_RATE_LIMIT` | `60` | `src/lib/logger.ts` |
| `DEFAULT_MAX_ROWS` | `50_000` | `src/lib/paginatedFetch.ts` |
| `DEFAULT_STALE_TIME` | `30_000` | `src/lib/query-client.ts` |
| `REFERENCE_STALE_TIME` | `5 * 60_000` | `src/lib/query-client.ts` |
| `STATIC_STALE_TIME` | `30 * 60_000` | `src/lib/query-client.ts` |
| `DEFAULT_GC_TIME` | `10 * 60_000` | `src/lib/query-client.ts` |
| `DAY_MS` | `86_400_000` | `src/lib/sourcingAnalytics.ts` |
| `CI_COOLDOWN_MS` | `30_000` | `src/pages/admin/DependencyHealth.tsx` |
| `VERDE` | `"#10b981"` | `src/pages/aprovacoes/aprovacoesData.ts` |
| `VERMELHO` | `"#ef4444"` | `src/pages/aprovacoes/aprovacoesData.ts` |
| `AMBAR` | `"#f59e0b"` | `src/pages/aprovacoes/aprovacoesData.ts` |
| `ROXO` | `"#8b5cf6"` | `src/pages/aprovacoes/aprovacoesData.ts` |
| `SPOT_CATALOG_PAGE_SIZE` | `60` | `src/pages/catalogo-spot/useSpotCatalog.ts` |
| `REFRESH_MS` | `5_000` | `src/pages/catalogo-xbz/XbzNetworkPanel.tsx` |
| `XBZ_BUSCA_MIN` | `3` | `src/pages/catalogo-xbz/xbzHelpers.ts` |
| `MIN_SAMPLE` | `10` | `src/pages/catalogo-xbz/xbzNetworkHealth.ts` |
| `WARN_RATIO` | `0.3` | `src/pages/catalogo-xbz/xbzNetworkHealth.ts` |
| `TARGET_RATIO` | `0.5` | `src/pages/catalogo-xbz/xbzNetworkHealth.ts` |
| `TREND_WINDOW` | `12` | `src/pages/catalogo-xbz/xbzNetworkTrend.ts` |
| `TREND_MIN_SAMPLES` | `6` | `src/pages/catalogo-xbz/xbzNetworkTrend.ts` |
| `TREND_DELTA` | `0.05` | `src/pages/catalogo-xbz/xbzNetworkTrend.ts` |
| `NON_PARENT` | `"__none__"` | `src/pages/configuracoes/ConfiguracoesCentroCusto.tsx` |
| `TOLERANCIA_VALOR_CONCILIACAO` | `0.01` | `src/pages/documentos/conciliacaoFiscal.ts` |
| `PEDIDOS_PAGE_SIZE` | `50` | `src/pages/pedidos/Pedidos.tsx` |
| `SOLICITACOES_PAGE_SIZE` | `100` | `src/pages/solicitacoes/Solicitacoes.tsx` |
| `SEM_GESTOR` | `'Sem gestor'` | `src/pages/solicitacoes/solicitacoesHelpers.ts` |
| `GESTOR_SEM_NOME` | `'Gestor nao identificado'` | `src/pages/solicitacoes/solicitacoesHelpers.ts` |
| `DIAS_DE_FOLGA_TOTAL` | `90` | `src/pages/solicitacoes/solicitacoesHelpers.ts` |
| `URGENCIA_SEM_PRAZO` | `0.35` | `src/pages/solicitacoes/solicitacoesHelpers.ts` |
| `DEFAULT_TTL_MS` | `5 * 60_000` | `src/stores/undoStore.ts` |
| `MAX_SELECT_LIMIT` | `500` | `supabase/functions/_shared/external-bridge-allowlist.ts` |
| `DEFAULT_LEVEL` | `"info"` | `supabase/functions/_shared/logLevel.ts` |
| `MAX_MESSAGE_LENGTH` | `4000` | `supabase/functions/_shared/logLevel.ts` |
| `MAX_CONTEXT_BYTES` | `8 * 1024` | `supabase/functions/_shared/logLevel.ts` |
| `MAX_USER_AGENT_LENGTH` | `512` | `supabase/functions/_shared/logLevel.ts` |
| `MAX_LOG_MESSAGE_LEN` | `45000` | `supabase/functions/_shared/logger.ts` |
| `MAX_ERR_MESSAGE_LEN` | `500` | `supabase/functions/_shared/logger.ts` |
| `MAX_SANITIZE_DEPTH` | `8` | `supabase/functions/_shared/logger.ts` |
| `ENC_LABEL` | `"enc"` | `supabase/functions/_shared/punchout_crypto.ts` |
| `ENC_VERSION` | `"v1"` | `supabase/functions/_shared/punchout_crypto.ts` |
| `KDF_ALGO` | `"aesgcm"` | `supabase/functions/_shared/punchout_crypto.ts` |
| `SPOT_QUOTA_RESERVE` | `2` | `supabase/functions/_shared/spot_api.ts` |
| `CHUNK` | `500` | `supabase/functions/_shared/xbz_catalog_cache.ts` |
| `XBZ_BASE` | `"https://api.minhaxbz.com.br:5001"` | `supabase/functions/_shared/xbz_client.ts` |
| `XBZ_TIMEOUT_MS` | `15_000` | `supabase/functions/_shared/xbz_client.ts` |
| `XBZ_NULL_DATE` | `"2000-01-01T00:00:00"` | `supabase/functions/_shared/xbz_client.ts` |
| `XBZ_BUSCA_MIN` | `3` | `supabase/functions/_shared/xbz_client.ts` |
| `ENC_VERSION` | `"v1"` | `supabase/functions/_shared/xbz_crypto.ts` |
| `FOLLOW_UP_AFTER_HOURS` | `48` | `supabase/functions/check-cotacao-followup/cotacaoFollowUp.ts` |
| `FOLLOW_UP_DEDUPE_HOURS` | `24` | `supabase/functions/check-cotacao-followup/cotacaoFollowUp.ts` |
| `DEFAULT_NOTICE_DAYS` | `30` | `supabase/functions/check-expiry-alerts/contractExpiry.ts` |
| `INTEGRATION_FAILURE_THRESHOLD` | `3` | `supabase/functions/check-sla-alerts/index.ts` |
| `INTEGRATION_LOOKBACK_MS` | `6 * 60 * 60 * 1000` | `supabase/functions/check-sla-alerts/index.ts` |
| `DISPATCH_WORKFLOW_FILE` | `"dependency-health.yml"` | `supabase/functions/dependency-health/index.ts` |
| `FORBIDDEN_MESSAGE` | `"Forbidden: admin role required"` | `supabase/functions/dependency-health/index.ts` |
| `ENC_LABEL` | `"erpcred"` | `supabase/functions/erp-credential-encrypt/index.ts` |
| `ENC_VERSION` | `"v1"` | `supabase/functions/erp-credential-encrypt/index.ts` |
| `KDF_ALGO` | `"aesgcm"` | `supabase/functions/erp-credential-encrypt/index.ts` |
| `SEFAZ_TIMEOUT_MS` | `20_000` | `supabase/functions/fiscal-orchestrator/index.ts` |
| `SEFAZ_RETRIES` | `4` | `supabase/functions/fiscal-orchestrator/index.ts` |
| `MAX_FILE_BYTES` | `10 * 1024 * 1024` | `supabase/functions/process-invoice-idp/index.ts` |
| `MODEL` | `"google/gemini-2.5-flash"` | `supabase/functions/process-invoice-idp/index.ts` |
| `MAX_RETRIES` | `5` | `supabase/functions/process-outbox/index.ts` |
| `BATCH_SIZE` | `20` | `supabase/functions/process-outbox/index.ts` |
| `ENC_LABEL` | `"enc"` | `supabase/functions/punchout-encrypt/index.ts` |
| `ENC_VERSION` | `"v1"` | `supabase/functions/punchout-encrypt/index.ts` |
| `KDF_ALGO` | `"aesgcm"` | `supabase/functions/punchout-encrypt/index.ts` |
| `SOURCE` | `"punchout"` | `supabase/functions/punchout-receive/index.ts` |
| `DEFAULT_TTL_MINUTES` | `1440` | `supabase/functions/punchout-receive/session.ts` |
| `MAX_TITULO` | `200` | `supabase/functions/punchout-receive/solicitation.ts` |
| `MAX_DESCRICAO` | `2000` | `supabase/functions/punchout-receive/solicitation.ts` |
| `MAX_TENTATIVAS_NUMERO` | `5` | `supabase/functions/receive-os-sync/create-solicitacao.ts` |
| `SOURCE` | `"receive-os-sync"` | `supabase/functions/receive-os-sync/index.ts` |
| `LANG` | `"PT"` | `supabase/functions/spot-api/index.ts` |
| `REQUEST_TIMEOUT_MS` | `120_000` | `supabase/functions/spot-api/index.ts` |
| `UPSERT_BATCH` | `500` | `supabase/functions/spot-api/index.ts` |
| `SESSION_TTL_MS` | `23 * 60 * 60 * 1000` | `supabase/functions/spot-api/index.ts` |
| `SESSION_TAG` | `"spot-api-token"` | `supabase/functions/spot-api/index.ts` |
| `SPOT_BASE` | `"https://www.spotgifts.com.br"` | `supabase/functions/spot-proxy/index.ts` |
| `LANG` | `"pt"` | `supabase/functions/spot-proxy/index.ts` |
| `SPOT_REQUEST_TIMEOUT_MS` | `15000` | `supabase/functions/spot-proxy/index.ts` |
| `PORTAL_SESSION_TAG` | `"spot-portal-cookie"` | `supabase/functions/spot-proxy/sessions.ts` |
| `PORTAL_SESSION_TTL_MS` | `30 * 60 * 1000` | `supabase/functions/spot-proxy/sessions.ts` |
| `MIN` | `60_000` | `supabase/functions/spot-proxy/sessions_test.ts` |
| `GERAR_PEDIDOS_DEDUP_SECONDS` | `30` | `supabase/functions/xbz-proxy/index.ts` |

### H.2 Prazos, expirações e janelas de tempo

| Trecho | Arquivo |
|---|---|
| `timeout: 120_000,` | `playwright.config.ts` |
| `maxAge: 1000 * 60 * 60 * 24, // 24 hours` | `src/App.tsx` |
| `const STALE_MS = 7 * 24 * 60 * 60 * 1000;` | `src/components/admin/DependencyHealthBadge.tsx` |
| `6 * 60 * 60 * 1000; // 6 hours (7d)` | `src/components/admin/telemetry/TelemetryCharts.tsx` |
| `timeFilter === "1h" ? 5 * 60 * 1000 : // 5 min` | `src/components/admin/telemetry/TelemetryCharts.tsx` |
| `timeFilter === "24h" ? 60 * 60 * 1000 : // 1 hour` | `src/components/admin/telemetry/TelemetryCharts.tsx` |
| `timeFilter === "6h" ? 30 * 60 * 1000 : // 30 min` | `src/components/admin/telemetry/TelemetryCharts.tsx` |
| `staleTime: 5 * 60 * 1000,` | `src/components/auditoria/RlsCompliancePanel.tsx` |
| `(new Date(sol.data_necessidade).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)` | `src/components/compras/CriticalAlertsBar.tsx` |
| `<Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>` | `src/components/compras/DeliveryCalendar.tsx` |
| `<Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>` | `src/components/compras/DeliveryCalendar.tsx` |
| `const date = subMonths(now, 6 - i);` | `src/components/compras/DemandPredictionPanel.tsx` |
| `await new Promise(resolve => setTimeout(resolve, 1000));` | `src/components/compras/DigitalSignature.tsx` |
| `await new Promise(resolve => setTimeout(resolve, 1500));` | `src/components/compras/DigitalSignature.tsx` |
| `expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),` | `src/components/compras/DigitalSignature.tsx` |
| `staleTime: 5 * 60 * 1000,` | `src/components/compras/DynamicApprovalMatrix.tsx` |
| `const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));` | `src/components/compras/SLADistributionChart.tsx` |
| `staleTime: 5 * 60 * 1000,` | `src/components/compras/approval/ApprovalDelegationModal.tsx` |
| `staleTime: 5 * 60 * 1000,` | `src/components/compras/approval/ApprovalRuleModal.tsx` |
| `const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));` | `src/components/compras/dashboard/UrgencyDetailsSheet.tsx` |
| `return new Date(anchor + 24 * 60 * 60 * 1000).toISOString();` | `src/components/compras/pending-approvals/deadlineFallback.ts` |
| `const diffHours = diffMs / (1000 * 60 * 60);` | `src/components/compras/pending-approvals/pendingApprovalsData.ts` |
| `data_solicitacao: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),` | `src/components/compras/pending-approvals/pendingApprovalsData.ts` |
| `data_solicitacao: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),` | `src/components/compras/pending-approvals/pendingApprovalsData.ts` |
| `data_solicitacao: new Date(Date.now() - 78 * 60 * 60 * 1000).toISOString(),` | `src/components/compras/pending-approvals/pendingApprovalsData.ts` |
| `prazo_limite: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),` | `src/components/compras/pending-approvals/pendingApprovalsData.ts` |
| `prazo_limite: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),` | `src/components/compras/pending-approvals/pendingApprovalsData.ts` |
| `prazo_limite: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),` | `src/components/compras/pending-approvals/pendingApprovalsData.ts` |
| `const cutoff = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();` | `src/components/compras/scorecard/supplierScorecardData.ts` |
| `const diff = (new Date(p.data_entrega!).getTime() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24);` | `src/components/compras/scorecard/supplierScorecardData.ts` |
| `const cutoff = new Date(today.getTime() - periodDays * 24 * 60 * 60 * 1000);` | `src/components/compras/sla-analysis/slaAnalysisData.ts` |
| `const cutoff = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000)` | `src/components/compras/sla-analysis/useSupplierSlaData.ts` |
| `const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));` | `src/components/compras/solicitacao/SolicitacaoFormSteps.tsx` |
| `setTimeout(() => setShowSuccess(false), 1500);` | `src/components/mobile/MobileRefreshWrapper.tsx` |
| `const fimMesAnterior = endOfMonth(subMonths(hoje, 1));` | `src/components/pagamentos/PagamentoAdvancedKPIs.tsx` |
| `const mesAnterior = startOfMonth(subMonths(hoje, 1));` | `src/components/pagamentos/PagamentoAdvancedKPIs.tsx` |
| `refetchInterval: 50 * 60 * 1000,` | `src/components/pagamentos/PagamentoDetailModal.tsx` |
| `staleTime: 30 * 60 * 1000,` | `src/components/pagamentos/PagamentoDetailModal.tsx` |
| `const weekEnd = addWeeks(weekStart, 1);` | `src/components/pagamentos/PagamentoFinancialDashboard.tsx` |
| `: new Date(Date.now() + parseInt(expiresHours, 10) * 60 * 60 * 1000).toISOString();` | `src/components/security/BlockedIPsPanel.tsx` |
| `typingTimeoutRef.current = setTimeout(() => { setIsTyping(false); updateTypingStatus(false); }, 2000);` | `src/features/layout/components/SupplierChat.tsx` |
| `staleTime: 5 * 60 * 1000,` | `src/features/solicitacoes/hooks/useNomesDeGestor.ts` |
| `staleTime: 5 * 60 * 1000,` | `src/features/solicitacoes/hooks/usePessoasDaEmpresa.ts` |
| `const diff = (new Date(p.data_entrega!).getTime() - new Date(p.data_emissao).getTime()) / (1000 * 60 * 60 * 24);` | `src/hooks/useBuyerPerformanceData.ts` |
| `const days = Math.max(0, Math.round((new Date().getTime() - new Date(w.created_at \|\| Date.now()).getTime()) / (1000 * 60 * 60 * 24)));` | `src/hooks/useExecutiveDashboardData.ts` |
| `const diff = (new Date().getTime() - new Date(p.data_previsao as string).getTime()) / (1000 * 60 * 60 * 24);` | `src/hooks/useExecutiveDashboardData.ts` |
| `const diff = (new Date().getTime() - new Date(p.data_previsao).getTime()) / (1000 * 60 * 60 * 24);` | `src/hooks/useExecutiveDashboardData.ts` |
| `const diff = (new Date(p.data_entrega!).getTime() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24);` | `src/hooks/useExecutiveDashboardData.ts` |
| `const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];` | `src/hooks/useExecutiveDashboardData.ts` |
| `const timer = setTimeout(() => { setShouldFlash(true); const resetTimer = setTimeout(() => setShouldFlash(false), 1500);` | `src/hooks/useFlashHighlight.ts` |
| `syncTimeoutRef.current = setTimeout(() => { syncPendingOperations(); }, 1000);` | `src/hooks/useOfflineSync.ts` |
| `syncTimeoutRef.current = setTimeout(syncPendingOperations, 2000);` | `src/hooks/useOfflineSync.ts` |
| `expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h from now` | `src/hooks/usePasswordResetRequests.ts` |
| `staleTime: 5 * 60 * 1000,` | `src/hooks/usePermissions.ts` |
| `const PREFETCH_CACHE_TIME = 5 * 60 * 1000;` | `src/hooks/usePrefetch.ts` |
| `const diff = (new Date(r.deliveryDate!).getTime() - new Date(r.purchaseDate).getTime()) / (1000 * 60 * 60 * 24);` | `src/hooks/usePurchaseHistory.ts` |
| `const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);` | `src/hooks/useSecurityLogs.ts` |
| `const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);` | `src/hooks/useSecurityLogs.ts` |
| `const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes` | `src/hooks/useSessionIdleTimeout.ts` |
| `}, { timeout: 2000 } as never);` | `src/lib/routePrefetch.ts` |
| `.gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())` | `src/pages/admin/HealthDashboard.tsx` |
| `const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();` | `src/pages/admin/ScanRunsSlaCard.tsx` |
| `const threshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();` | `src/pages/admin-telemetria/AdminTelemetria.tsx` |
| `const timer = setTimeout(async () => { const { data } = await supabase.auth.getSession(); if (!ativo) return; setEstadoSessao(data.session ? 'ok' : 'invalida'); …` | `src/pages/auth/Auth.tsx` |
| `staleTime: 5 * 60 * 1000,` | `src/pages/catalogo-spot/useSpotCatalog.ts` |
| `setTimeout(() => setCopiado(null), 2000);` | `src/pages/gerar-ordem/GerarOrdem.tsx` |
| `case "30d": setDateRange({ from: subDays(today, 30), to: today }); break;` | `src/pages/historico/HistoricoCompras.tsx` |
| `case "7d": setDateRange({ from: subDays(today, 7), to: today }); break;` | `src/pages/historico/HistoricoCompras.tsx` |
| `case "90d": setDateRange({ from: subDays(today, 90), to: today }); break;` | `src/pages/historico/HistoricoCompras.tsx` |
| `case "lastMonth": { const lm = subMonths(today, 1); setDateRange({ from: startOfMonth(lm), to: endOfMonth(lm) }); break; }` | `src/pages/historico/HistoricoCompras.tsx` |
| `return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];` | `src/pages/recebimento/recebimentoHelpers.ts` |
| `const diff = (new Date(emissao(sorted[i])!).getTime() - new Date(emissao(sorted[i - 1])!).getTime()) / (1000 * 60 * 60 * 24);` | `src/pages/recompra/RecompraInteligente.tsx` |
| `const nextDate = new Date(lastDate.getTime() + avgInterval * 24 * 60 * 60 * 1000);` | `src/pages/recompra/RecompraInteligente.tsx` |
| `if (nextDate <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) {` | `src/pages/recompra/RecompraInteligente.tsx` |
| `const h = Math.floor(diff / (1000 * 60 * 60));` | `src/pages/sourcing/AuctionRoom.tsx` |
| `const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));` | `src/pages/sourcing/AuctionRoom.tsx` |
| `if (!Number.isNaN(last) && now.getTime() - last < dedupeHours * 60 * 60 * 1000) {` | `supabase/functions/check-cotacao-followup/cotacaoFollowUp.ts` |
| `return new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();` | `supabase/functions/check-cotacao-followup/cotacaoFollowUp.ts` |
| `return now.getTime() - created >= hours * 60 * 60 * 1000;` | `supabase/functions/check-cotacao-followup/cotacaoFollowUp.ts` |
| `new Date(NOW.getTime() - (FOLLOW_UP_DEDUPE_HOURS + 1) * 60 * 60 * 1000).toISOString(),` | `supabase/functions/check-cotacao-followup/cotacaoFollowUp_test.ts` |
| `new Date(NOW.getTime() - 2 * 60 * 60 * 1000).toISOString(),` | `supabase/functions/check-cotacao-followup/cotacaoFollowUp_test.ts` |
| `(new Date(cotacao.validade_proposta!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)` | `supabase/functions/check-expiry-alerts/index.ts` |
| `(new Date(pag.data_vencimento).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)` | `supabase/functions/check-expiry-alerts/index.ts` |
| `const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();` | `supabase/functions/check-expiry-alerts/index.ts` |
| `const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);` | `supabase/functions/check-expiry-alerts/index.ts` |
| `assertEquals(detectConsecutiveFailures(rows, 3, 6 * 60 * 60 * 1000, Date.parse("2026-11-18T11:00:00Z")), []);` | `supabase/functions/check-sla-alerts/failures_test.ts` |
| `const result = detectConsecutiveFailures(rows, 3, 6 * 60 * 60 * 1000, Date.parse("2026-11-18T11:00:00Z"));` | `supabase/functions/check-sla-alerts/failures_test.ts` |
| `const INTEGRATION_LOOKBACK_MS = 6 * 60 * 60 * 1000; // 6h: só alerta falhas numa janela recente` | `supabase/functions/check-sla-alerts/index.ts` |
| `const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];` | `supabase/functions/check-sla-alerts/index.ts` |
| `const twoDays = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];` | `supabase/functions/check-sla-alerts/index.ts` |
| `.gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),` | `supabase/functions/health-dashboard/index.ts` |
| `exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,` | `supabase/functions/send-push-notification/webpush.ts` |
| `const SESSION_TTL_MS = 23 * 60 * 60 * 1000; // 24h com margem` | `supabase/functions/spot-api/index.ts` |
| `export const PORTAL_SESSION_TTL_MS = 30 * 60 * 1000;` | `supabase/functions/spot-proxy/sessions.ts` |
| `expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),` | `supabase/functions/webauthn-authenticate/index.ts` |
| `timeout: 60000,` | `supabase/functions/webauthn-authenticate/index.ts` |
| `expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),` | `supabase/functions/webauthn-register/index.ts` |
| `timeout: 60000,` | `supabase/functions/webauthn-register/index.ts` |
| `const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();` | `supabase/functions/weekly-report/index.ts` |
| `const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);` | `supabase/functions/weekly-summary-report/index.ts` |
| `return (end - start) / (1000 * 60 * 60 * 24); // days` | `supabase/functions/weekly-summary-report/index.ts` |
| `OR (resolved_at IS NULL AND created_at < now() - interval '180 days');` | `supabase/migrations/20260711183647_cb1ddb07-f7db-40d3-bb0e-d42adfb914a0.sql` |
| `WHERE (resolved_at IS NOT NULL AND resolved_at < now() - interval '60 days')` | `supabase/migrations/20260711183647_cb1ddb07-f7db-40d3-bb0e-d42adfb914a0.sql` |
| `WHERE alert_type = v_alert_type AND created_at > now() - interval '1 hour'` | `supabase/migrations/20260711183647_cb1ddb07-f7db-40d3-bb0e-d42adfb914a0.sql` |
| `WHERE alert_type = v_alert_type AND created_at > now() - interval '1 hour'` | `supabase/migrations/20260711183924_3acc4e45-ed15-45d8-b20d-15add5c34b87.sql` |
| `WHERE alert_type = v_alert_type AND created_at > now() - interval '1 hour'` | `supabase/migrations/20260711191946_872a6814-ab1c-4596-b6d7-c3e5c8379396.sql` |
| `AND created_at > now() - interval '24 hours'` | `supabase/migrations/20260712110143_e51c0b00-e688-4f8e-971f-74952f32cac7.sql` |
| `AND created_at > now() - interval '30 minutes'` | `supabase/migrations/20260712110815_762ad29c-b3f7-4e44-a0ec-f6b624174ca3.sql` |
| `AND now() - a.state_change > interval '5 minutes'` | `supabase/migrations/20260712110815_762ad29c-b3f7-4e44-a0ec-f6b624174ca3.sql` |
| `AND now() - query_start > interval '5 minutes'` | `supabase/migrations/20260712110815_762ad29c-b3f7-4e44-a0ec-f6b624174ca3.sql` |
| `AND created_at > now() - interval '7 days'` | `supabase/migrations/20260712112712_c0effbe6-98f7-4dc4-b115-df87582257b4.sql` |
| `AND created_at > now() - interval '24 hours'` | `supabase/migrations/20260712113011_18d493c9-b253-4988-abcd-8884e8753460.sql` |
| `IF v_last_vac IS NOT NULL AND v_last_vac > now() - interval '6 hours' THEN CONTINUE; END IF;` | `supabase/migrations/20260712113011_18d493c9-b253-4988-abcd-8884e8753460.sql` |
| `AND created_at > now() - interval '24 hours'` | `supabase/migrations/20260712113545_f0a64396-6f67-437e-bd31-255c48edac4d.sql` |
| `AND created_at > now() - interval '7 days'` | `supabase/migrations/20260712113809_4893d687-0207-4f7e-bec3-07d06dea7e7a.sql` |
| `AND created_at > now() - interval '7 days'` | `supabase/migrations/20260712115449_57e52849-ed52-4d53-b76d-0e9975e755d1.sql` |
| `AND created_at > now() - interval '30 days'` | `supabase/migrations/20260712141935_8b9bcc8b-e10f-4daf-9fff-34edf503ca62.sql` |
| `AND created_at > now() - interval '1 hour'` | `supabase/migrations/20260712142817_cb94f248-eabf-4053-bdd7-aa03f4bf09f1.sql` |
| `AND created_at > now() - interval '24 hours'` | `supabase/migrations/20260712161258_b21ccf6f-0300-4b08-a5a2-c4259aabcb90.sql` |
| `DELETE FROM public.wal_rate_snapshots WHERE captured_at < now() - interval '24 hours';` | `supabase/migrations/20260712184038_15ff4851-c1da-4274-bd6f-e50369c9ffe9.sql` |
| `WHERE captured_at < now() - interval '30 seconds'` | `supabase/migrations/20260712184038_15ff4851-c1da-4274-bd6f-e50369c9ffe9.sql` |
| `WHERE captured_at > now() - interval '2 hours'` | `supabase/migrations/20260712184038_15ff4851-c1da-4274-bd6f-e50369c9ffe9.sql` |
| `DELETE FROM public.checkpoint_snapshots WHERE captured_at < now() - interval '24 hours';` | `supabase/migrations/20260712184218_e45b548a-db1a-4050-9ba4-2dd1a490f896.sql` |
| `WHERE captured_at < now() - interval '30 seconds'` | `supabase/migrations/20260712184218_e45b548a-db1a-4050-9ba4-2dd1a490f896.sql` |
| `v_dedup_window interval := interval '24 hours';` | `supabase/migrations/20260712192008_74f174de-700f-4c1e-93fe-f8cea3ca8355.sql` |
| `DELETE FROM public.temp_file_snapshots WHERE captured_at < v_now - interval '24 hours';` | `supabase/migrations/20260712192153_2a9b74d6-8ba5-4308-ba55-87b4b9396331.sql` |
| `v_dedupe interval := interval '24 hours';` | `supabase/migrations/20260712192153_2a9b74d6-8ba5-4308-ba55-87b4b9396331.sql` |
| `'suggested_setting', 'ALTER TABLE ' \|\| v_rec.full_name \|\| ' SET (autovacuum_freeze_max_age = 100000000);'` | `supabase/migrations/20260712194304_ad9d9443-9507-4e9f-8751-193ff290401e.sql` |
| `v_min_stat_age interval := interval '7 days';` | `supabase/migrations/20260712194659_702ebacc-eef1-4a7a-a2fc-2a58f8ea316e.sql` |
| `AND (now() - a.xact_start) > interval '5 minutes'` | `supabase/migrations/20260712195030_ff90d369-cac2-4bc6-949e-efc30b3cb9f9.sql` |
| `AND s.created_at < now() - interval '24 hours'` | `supabase/migrations/20260712195408_36fb0763-69fd-42de-8270-201660eb8fe7.sql` |
| `DELETE FROM public.health_scan_runs WHERE started_at < now() - interval '30 days';` | `supabase/migrations/20260712195527_2f3ed84f-104a-4828-8d30-2e569a97d1e9.sql` |
| `AND s.created_at < now() - interval '24 hours'` | `supabase/migrations/20260712195709_f1641ac1-29fb-48cf-af64-04bc38fcc7ca.sql` |
| `interval '1 day'` | `supabase/migrations/20260712202305_7ead624d-983e-4fe3-80c8-ca36fd0a3f8d.sql` |
| `DELETE FROM public.audit_logs WHERE created_at < now() - interval '5 years';` | `supabase/migrations/20260712215341_6309002c-447e-4a28-8473-3fdc3c8fe92e.sql` |
| `DELETE FROM public.deadlock_snapshots WHERE created_at < now() - interval '90 days';` | `supabase/migrations/20260712215341_6309002c-447e-4a28-8473-3fdc3c8fe92e.sql` |
| `DELETE FROM public.financial_audit_logs WHERE created_at < now() - interval '5 years';` | `supabase/migrations/20260712215341_6309002c-447e-4a28-8473-3fdc3c8fe92e.sql` |
| `DELETE FROM public.geo_access_logs WHERE created_at < now() - interval '180 days';` | `supabase/migrations/20260712215341_6309002c-447e-4a28-8473-3fdc3c8fe92e.sql` |
| `DELETE FROM public.login_attempts WHERE created_at < now() - interval '180 days';` | `supabase/migrations/20260712215341_6309002c-447e-4a28-8473-3fdc3c8fe92e.sql` |
| `DELETE FROM public.query_telemetry WHERE created_at < now() - interval '90 days';` | `supabase/migrations/20260712215341_6309002c-447e-4a28-8473-3fdc3c8fe92e.sql` |
| `DELETE FROM public.rate_limit_logs WHERE created_at < now() - interval '180 days';` | `supabase/migrations/20260712215341_6309002c-447e-4a28-8473-3fdc3c8fe92e.sql` |
| `DELETE FROM public.security_logs WHERE created_at < now() - interval '5 years';` | `supabase/migrations/20260712215341_6309002c-447e-4a28-8473-3fdc3c8fe92e.sql` |
| `DELETE FROM public.telemetry_logs WHERE created_at < now() - interval '90 days';` | `supabase/migrations/20260712215341_6309002c-447e-4a28-8473-3fdc3c8fe92e.sql` |
| `DELETE FROM public.wal_rate_snapshots WHERE created_at < now() - interval '90 days';` | `supabase/migrations/20260712215341_6309002c-447e-4a28-8473-3fdc3c8fe92e.sql` |
| `WHERE created_at < now() - interval '180 days'` | `supabase/migrations/20260712215341_6309002c-447e-4a28-8473-3fdc3c8fe92e.sql` |
| `WHERE created_at < now() - interval '90 days'` | `supabase/migrations/20260712215341_6309002c-447e-4a28-8473-3fdc3c8fe92e.sql` |
| `DELETE FROM public.temp_file_snapshots WHERE captured_at < now() - interval '30 days';` | `supabase/migrations/20260712221049_be67ff27-0f0f-4271-9017-6ebe0acafe1b.sql` |
| `DELETE FROM public.wal_rate_snapshots WHERE captured_at < now() - interval '30 days';` | `supabase/migrations/20260712221049_be67ff27-0f0f-4271-9017-6ebe0acafe1b.sql` |
| `AND expires_at < now() - interval '30 days'` | `supabase/migrations/20260712222142_a253a878-d059-471c-bcd0-7a8f1ce178b9.sql` |
| `WHEN now() - latest.last_run_at > interval '24 hours' THEN 'warning'` | `supabase/migrations/20260712222142_a253a878-d059-471c-bcd0-7a8f1ce178b9.sql` |
| `WHEN now() - latest.last_run_at > interval '48 hours' THEN 'critical'` | `supabase/migrations/20260712222142_a253a878-d059-471c-bcd0-7a8f1ce178b9.sql` |
| `WHEN now() - latest.last_run_at > interval '24 hours' THEN 'warning'` | `supabase/migrations/20260712222207_ec8b6fba-2a46-417a-ad13-26580b85fcd7.sql` |
| `WHEN now() - latest.last_run_at > interval '48 hours' THEN 'critical'` | `supabase/migrations/20260712222207_ec8b6fba-2a46-417a-ad13-26580b85fcd7.sql` |
| `AND expires_at < now() - interval '30 days'` | `supabase/migrations/20260712222242_aba70476-937d-4012-9211-3ae2d08dee19.sql` |
| `WHERE next_due_at <= now() + interval '30 days'` | `supabase/migrations/20260712222404_4c5c4e92-d7a7-4548-9b05-5a5607c29869.sql` |
| `WHERE p.created_at >= (now() - interval '2 years')` | `supabase/migrations/20260712222620_110cc02b-1d32-42e6-a778-96d41f60eeb2.sql` |
| `_from date DEFAULT (now() - interval '90 days')::date,` | `supabase/migrations/20260712222620_110cc02b-1d32-42e6-a778-96d41f60eeb2.sql` |
| `_from date DEFAULT (now() - interval '90 days')::date,` | `supabase/migrations/20260712222645_719eb41d-0abd-43d2-82e9-8e0b30a01087.sql` |
| `$$SELECT public.ensure_telemetry_logs_partition((date_trunc('month', now()) + interval '1 month')::date);$$` | `supabase/migrations/20260712222930_cd4547af-7aac-44d8-8ac2-48991a40dfbf.sql` |
| `end_date date := (date_trunc('month', _month) + interval '1 month')::date;` | `supabase/migrations/20260712222930_cd4547af-7aac-44d8-8ac2-48991a40dfbf.sql` |
| `end_date date := (date_trunc('month', _month) + interval '1 month')::date;` | `supabase/migrations/20260712222955_b4a5410b-e095-4d45-860d-f754418c4d4f.sql` |
| `$$SELECT public.ensure_audit_logs_partition((date_trunc('month', now()) + interval '1 month')::date);$$` | `supabase/migrations/20260712223300_6f689f47-2c15-468b-b667-679e47facc11.sql` |
| `date_trunc('month', now()::date + interval '2 months'),` | `supabase/migrations/20260712223300_6f689f47-2c15-468b-b667-679e47facc11.sql` |
| `date_trunc('month', now()::date - interval '2 months'),` | `supabase/migrations/20260712223300_6f689f47-2c15-468b-b667-679e47facc11.sql` |
| `end_ts timestamptz := (date_trunc('month', _month) + interval '1 month');` | `supabase/migrations/20260712223300_6f689f47-2c15-468b-b667-679e47facc11.sql` |
| `interval '1 month'` | `supabase/migrations/20260712223300_6f689f47-2c15-468b-b667-679e47facc11.sql` |
| `AND created_at > now() - interval '1 hour'` | `supabase/migrations/20260713104844_2b93e809-e50c-42b3-8e4d-116073563946.sql` |
| `AND created_at > now() - interval '30 minutes') THEN` | `supabase/migrations/20260713105021_ef02f040-6e49-4cd8-b68f-8a9c06e9abdb.sql` |
| `AND query_start < now() - interval '5 minutes'` | `supabase/migrations/20260713105021_ef02f040-6e49-4cd8-b68f-8a9c06e9abdb.sql` |
| `AND created_at > now() - interval '24 hours') THEN` | `supabase/migrations/20260713105146_e80e0d55-eec6-4fb9-a279-49501a05bb70.sql` |
| `AND created_at > now() - interval '15 minutes'` | `supabase/migrations/20260713105330_daf01ebf-ca7d-477b-b37a-d968d74afc67.sql` |
| `AND captured_at <= now() - interval '10 minutes'` | `supabase/migrations/20260713105504_34c5b9f6-89bd-47ed-956a-449faeb0d993.sql` |
| `AND created_at > now() - interval '1 hour'` | `supabase/migrations/20260713105504_34c5b9f6-89bd-47ed-956a-449faeb0d993.sql` |
| `AND a.state_change < now() - interval '2 minutes'` | `supabase/migrations/20260713105624_e9839757-2d20-4362-9acb-6a4c4e20a482.sql` |
| `AND created_at > now() - interval '30 minutes'` | `supabase/migrations/20260713105624_e9839757-2d20-4362-9acb-6a4c4e20a482.sql` |
| `AND created_at > now() - interval '6 hours'` | `supabase/migrations/20260713105738_d761e68c-1321-43bc-b757-9ede7dc86517.sql` |
| `AND (resolved_at IS NULL OR resolved_at > now() - interval '12 hours')` | `supabase/migrations/20260713105907_4b197a0e-74a0-4812-9175-87b9ca7c56ba.sql` |
| `AND captured_at BETWEEN now() - interval '28 hours' AND now() - interval '20 hours'` | `supabase/migrations/20260713105907_4b197a0e-74a0-4812-9175-87b9ca7c56ba.sql` |
| `AND created_at > now() - interval '12 hours'` | `supabase/migrations/20260713105907_4b197a0e-74a0-4812-9175-87b9ca7c56ba.sql` |
| `DELETE FROM public.table_size_snapshots WHERE captured_at < now() - interval '30 days';` | `supabase/migrations/20260713105907_4b197a0e-74a0-4812-9175-87b9ca7c56ba.sql` |
| `) < now() - interval '14 days'` | `supabase/migrations/20260713110028_8ada5be7-193d-41f7-be83-9cd839c1ea56.sql` |
| `AND (resolved_at IS NULL OR resolved_at > now() - interval '7 days')` | `supabase/migrations/20260713110028_8ada5be7-193d-41f7-be83-9cd839c1ea56.sql` |
| `AND created_at > now() - interval '7 days'` | `supabase/migrations/20260713110028_8ada5be7-193d-41f7-be83-9cd839c1ea56.sql` |
| `now() - interval '30 days'` | `supabase/migrations/20260713110028_8ada5be7-193d-41f7-be83-9cd839c1ea56.sql` |
| `AND (resolved_at IS NULL OR resolved_at > now() - interval '14 days')` | `supabase/migrations/20260713110159_94ff935c-b0ce-41ae-8d40-bda6ca91f908.sql` |
| `AND created_at > now() - interval '14 days'` | `supabase/migrations/20260713110159_94ff935c-b0ce-41ae-8d40-bda6ca91f908.sql` |
| `AND (resolved_at IS NULL OR resolved_at > now() - interval '4 hours')` | `supabase/migrations/20260713110314_5a4d642f-daaa-45c3-903b-93a46d92bfa6.sql` |
| `AND created_at > now() - interval '4 hours'` | `supabase/migrations/20260713110314_5a4d642f-daaa-45c3-903b-93a46d92bfa6.sql` |
| `WHERE created_at > now() - interval '24 hours'` | `supabase/migrations/20260713110420_3e5900b4-7895-405f-8107-826f60c20a6a.sql` |
| `v_stale := v_last_success IS NULL OR v_last_success < now() - interval '2 hours';` | `supabase/migrations/20260726151043_a116a5d7-40e9-4e45-8824-3ad60a74dacc.sql` |
| `now() - interval '15 days',` | `supabase/migrations/20260806180000_seed_devolucoes_creditos.sql` |
| `now() - interval '2 days',` | `supabase/migrations/20260806180000_seed_devolucoes_creditos.sql` |
| `now() - interval '20 days',` | `supabase/migrations/20260806180000_seed_devolucoes_creditos.sql` |
| `now() - interval '5 days',` | `supabase/migrations/20260806180000_seed_devolucoes_creditos.sql` |
| `now() - interval '7 days'` | `supabase/migrations/20260806180000_seed_devolucoes_creditos.sql` |
| `WHERE next_due_at <= now() + interval '30 days'` | `supabase/migrations/20261113122251_fix_gatilhos_solicitacao_pagamento_orcamento.sql` |
| `$$delete from cron.job_run_details where end_time < now() - interval '7 days'$$` | `supabase/migrations/20261113124508_cron_limpa_historico_semanal.sql` |
| `DELETE FROM public.audit_logs WHERE created_at < now() - interval '5 years';` | `supabase/migrations/20261113180000_corrige_crons_lgpd_e_mv_kpis.sql` |
| `DELETE FROM public.deadlock_snapshots WHERE captured_at < now() - interval '90 days';` | `supabase/migrations/20261113180000_corrige_crons_lgpd_e_mv_kpis.sql` |
| `DELETE FROM public.financial_audit_logs WHERE created_at < now() - interval '5 years';` | `supabase/migrations/20261113180000_corrige_crons_lgpd_e_mv_kpis.sql` |
| `DELETE FROM public.geo_access_logs WHERE created_at < now() - interval '180 days';` | `supabase/migrations/20261113180000_corrige_crons_lgpd_e_mv_kpis.sql` |
| `DELETE FROM public.login_attempts WHERE created_at < now() - interval '180 days';` | `supabase/migrations/20261113180000_corrige_crons_lgpd_e_mv_kpis.sql` |
| `DELETE FROM public.query_telemetry WHERE created_at < now() - interval '90 days';` | `supabase/migrations/20261113180000_corrige_crons_lgpd_e_mv_kpis.sql` |
| `DELETE FROM public.rate_limit_logs WHERE created_at < now() - interval '180 days';` | `supabase/migrations/20261113180000_corrige_crons_lgpd_e_mv_kpis.sql` |
| `DELETE FROM public.security_logs WHERE created_at < now() - interval '5 years';` | `supabase/migrations/20261113180000_corrige_crons_lgpd_e_mv_kpis.sql` |
| `DELETE FROM public.telemetry_logs WHERE created_at < now() - interval '90 days';` | `supabase/migrations/20261113180000_corrige_crons_lgpd_e_mv_kpis.sql` |
| `DELETE FROM public.wal_rate_snapshots WHERE captured_at < now() - interval '90 days';` | `supabase/migrations/20261113180000_corrige_crons_lgpd_e_mv_kpis.sql` |
| `WHERE created_at < now() - interval '180 days'` | `supabase/migrations/20261113180000_corrige_crons_lgpd_e_mv_kpis.sql` |
| `WHERE created_at < now() - interval '90 days'` | `supabase/migrations/20261113180000_corrige_crons_lgpd_e_mv_kpis.sql` |
| `AND created_at > now() - interval '30 days'` | `supabase/migrations/20261117170000_corrige_alertas_sistema_e_agenda_scan_particoes.sql` |
| `OR v_last_data < now() - interval '2 hours';` | `supabase/migrations/20261122090000_corrige_watchdog_xbz_cego.sql` |
| `AND COALESCE((metadata->>'last_seen')::timestamptz, created_at) < now() - interval '24 hours'` | `supabase/migrations/20261122140000_dedupe_system_error_alerts.sql` |
| `await page.waitForSelector('input[type="email"]', { timeout: 15_000 });` | `tests-e2e/global-setup.ts` |
| `await page.waitForURL((url) => !url.pathname.startsWith('/auth'), { timeout: 15_000 });` | `tests-e2e/global-setup.ts` |

### H.3 Limites de paginação

| Limite | Arquivo |
|---|---|
| 100 | `src/components/admin/telemetry/AppLogsView.tsx` |
| 50 | `src/components/admin/telemetry/SystemAlertsView.tsx` |
| 200 | `src/components/compras/DynamicApprovalMatrix.tsx` |
| 100 | `src/components/compras/PriceComparator.tsx` |
| 50 | `src/components/compras/QualificationHistoryTimeline.tsx` |
| 3 | `src/components/compras/SourcingIntelligenceWidget.tsx` |
| 100 | `src/components/compras/SupplierBonificationsPanel.tsx` |
| 10 | `src/components/compras/SupplierRiskAnalysis.tsx` |
| 200 | `src/components/compras/approval/ApprovalDelegationModal.tsx` |
| 200 | `src/components/compras/approval/ApprovalRuleModal.tsx` |
| 200 | `src/components/security/GeoAccessLogsPanel.tsx` |
| 20 | `src/features/layout/components/AdvancedSearch.tsx` |
| 1000 | `src/features/solicitacoes/hooks/useFluxosAprovacao.ts` |
| 300 | `src/features/solicitacoes/hooks/useFluxosAprovacao.ts` |
| 500 | `src/features/solicitacoes/hooks/useFluxosAprovacao.ts` |
| 200 | `src/features/solicitacoes/hooks/useNomesDeGestor.ts` |
| 200 | `src/features/solicitacoes/hooks/usePessoasDaEmpresa.ts` |
| 100 | `src/hooks/useApprovalHistory.ts` |
| 500 | `src/hooks/useApprovalWorkflow.ts` |
| 1 | `src/hooks/useGeoRestriction.ts` |
| 100 | `src/hooks/usePasswordResetRequests.ts` |
| 100 | `src/hooks/usePrefetch.ts` |
| 50 | `src/hooks/usePrefetch.ts` |
| 100 | `src/hooks/useRealPushNotifications.ts` |
| 500 | `src/hooks/useSecurityLogs.ts` |
| 50 | `src/pages/acompanhamento/Acompanhamento.tsx` |
| 10 | `src/pages/admin/ERPConnections.tsx` |
| 50 | `src/pages/admin/ERPConnections.tsx` |
| 20 | `src/pages/admin/FiscalDashboard.tsx` |
| 10 | `src/pages/admin/HealthDashboard.tsx` |
| 50 | `src/pages/admin/HealthDashboard.tsx` |
| 10 | `src/pages/admin/ScanRunsSlaCard.tsx` |
| 20 | `src/pages/admin/ScanRunsSlaCard.tsx` |
| 500 | `src/pages/admin-telemetria/AdminTelemetria.tsx` |
| 40 | `src/pages/catalogo-spot/useSpotCatalog.ts` |
| 100 | `src/pages/documentos/DocumentosFiscais.tsx` |
| 200 | `src/pages/documentos/DocumentosFiscais.tsx` |
| 500 | `src/pages/documentos/DocumentosFiscais.tsx` |
| 200 | `src/pages/kanban/KanbanWorkflow.tsx` |
| 20 | `src/pages/negociacao-ia/NegociacaoIA.tsx` |
| 50 | `src/pages/negociacao-ia/NegociacaoIA.tsx` |
| 1 | `src/pages/pedidos/PedidoDetailsDialog.tsx` |
| 50 | `src/pages/portal-fornecedor/portalFornecedorData.ts` |
| 50 | `src/pages/recompra/RecompraInteligente.tsx` |
| 500 | `src/pages/recompra/RecompraInteligente.tsx` |
| 1 | `supabase/functions/_shared/notifications.ts` |
| 1 | `supabase/functions/_shared/xbz_auth.ts` |
| 50 | `supabase/functions/alert-dispatcher/index.ts` |
| 1 | `supabase/functions/check-cotacao-followup/index.ts` |
| 20 | `supabase/functions/check-sla-alerts/index.ts` |
| 200 | `supabase/functions/check-sla-alerts/index.ts` |
| 30 | `supabase/functions/dependency-health/index.ts` |
| 1 | `supabase/functions/escalate-solicitacao/recipients.ts` |
| 10 | `supabase/functions/guided-buying-ai/index.ts` |
| 20 | `supabase/functions/guided-buying-ai/index.ts` |
| 10 | `supabase/functions/health-dashboard/index.ts` |
| 20 | `supabase/functions/health-dashboard/index.ts` |
| 50 | `supabase/functions/health-dashboard/index.ts` |
| 1 | `supabase/functions/receive-os-sync/index.ts` |
| 2 | `supabase/functions/receive-os-sync/index.ts` |
| 1 | `supabase/functions/spot-api/index.ts` |
| 10 | `supabase/functions/spot-proxy/index.ts` |
| 1 | `supabase/functions/webauthn-authenticate/index.ts` |
| 1 | `supabase/functions/webauthn-register/index.ts` |
| 1 | `supabase/functions/xbz-proxy/index.ts` |

## I. Regras implícitas em mensagens de erro/validação

| Mensagem | Arquivo |
|---|---|
| falha fixture | `scripts/automation.unit.mjs` |
| ${rotulo} inválido:  | `scripts/db-explain-analyze.ts` |
| --out exige um diretório | `scripts/db-explain-analyze.ts` |
| EXPLAIN_RUNS inválido: mínimo 1 | `scripts/db-explain-analyze.ts` |
| argumento desconhecido: ${a} | `scripts/db-explain-analyze.ts` |
| plano sem tempo de execução | `scripts/db-explain-analyze.ts` |
| --dir exige um caminho | `scripts/realtime-audit.ts` |
| argumento desconhecido: ${a} | `scripts/realtime-audit.ts` |
| --allowlist exige um caminho | `scripts/rls-audit.ts` |
| allowlist ${arquivo} não é JSON válido | `scripts/rls-audit.ts` |
| allowlist ${arquivo}: excecoes[${i}] precisa de  | `scripts/rls-audit.ts` |
| allowlist ${arquivo}: falta o array  | `scripts/rls-audit.ts` |
| argumento desconhecido: ${a} | `scripts/rls-audit.ts` |
| nenhuma tabela encontrada em public — auditoria não comprovou nada | `scripts/rls-audit.ts` |
| resposta do banco fora do formato esperado (policies/tables) | `scripts/rls-audit.ts` |
| ${rotulo} inválido:  | `scripts/stress-test.ts` |
| --endpoint inválido:  | `scripts/stress-test.ts` |
| --endpoint precisa ser http(s):  | `scripts/stress-test.ts` |
| argumento desconhecido: ${a} | `scripts/stress-test.ts` |
| --timeout-ms exige inteiro >= 100 | `scripts/validate-bridge.ts` |
| argumento desconhecido: ${a} | `scripts/validate-bridge.ts` |
| ${msg}: esperado ${JSON.stringify(b)} obtido ${JSON.stringify(a)} | `scripts/ai-context/cenarios.mjs` |
| precisa ser um objeto JSON | `scripts/ai-context/gerar.mjs` |
| ><span role= | `scripts/ai-context/gerar.unit.mjs` |
| ${metodo} ${caminho} -> ${r.status} com corpo que nao e JSON (${e.message}) | `scripts/ci/actions-kpi.mjs` |
| ${metodo} ${caminho} -> sem resposta (${e.cause?.code ?? e.cause?.message ?? e.message}) | `scripts/ci/actions-kpi.mjs` |
| ${argv[index - 1]} exige um valor | `scripts/ci/audit-prod.mjs` |
| --level invalido: ${args.level} | `scripts/ci/audit-prod.mjs` |
| Argumento desconhecido: ${argv[index]} | `scripts/ci/audit-prod.mjs` |
| --limite-prs inválido (esperado inteiro positivo): ${JSON.stringify(saida[ | `scripts/ci/branch-podaveis.mjs` |
| PR sem headRefName | `scripts/ci/branch-podaveis.mjs` |
| a lista de PRs abertas não é um array | `scripts/ci/branch-podaveis.mjs` |
| a lista de PRs abertas veio cheia (${dados.length} >= limite ${limite}); pode haver PR que não veio | `scripts/ci/branch-podaveis.mjs` |
| argumento desconhecido: ${chave} | `scripts/ci/branch-podaveis.mjs` |
| argumento inválido: ${chave} | `scripts/ci/branch-podaveis.mjs` |
| falta --${obrigatorio} | `scripts/ci/branch-podaveis.mjs` |
| o conteúdo não é um objeto JSON | `scripts/ci/bump-toolchain.mjs` |
| ${argv[i - 1]} exige um valor | `scripts/ci/check-bundle-secrets.mjs` |
| Argumento desconhecido: ${argv[i]} | `scripts/ci/check-bundle-secrets.mjs` |
| campo repetido no bloco # docs: ${m[1]} | `scripts/ci/render-workflow-docs.mjs` |
| linha nao reconhecida no bloco # docs:  | `scripts/ci/render-workflow-docs.mjs` |
| relation  | `scripts/ci/scripts-operacionais.unit.mjs` |
| passo  | `scripts/ci/inventario-types/identidade.unit.mjs` |
| passo sem  | `scripts/ci/inventario-types/identidade.unit.mjs` |
| --entrada exige o caminho do arquivo com a resposta do banco.sql | `scripts/inventario/gerar-banco.mjs` |
| Management API ${caminho} respondeu HTTP ${res.status} | `scripts/inventario/gerar-banco.mjs` |
| a resposta nao parece ser do banco deste projeto: ${comuns} tabelas em comum com o manifesto  | `scripts/inventario/gerar-banco.mjs` |
| a resposta nao parece ser do banco deste projeto: ledger com ${registros} registros e maior versao ${max};  | `scripts/inventario/gerar-banco.mjs` |
| a resposta nao traz resumo.ledger_versao_max/ledger_registros; rode o banco.sql atual. | `scripts/inventario/gerar-banco.mjs` |
| a saida tem algo com cara de credencial; nada foi gravado. Revise banco.sql. | `scripts/inventario/gerar-banco.mjs` |
| entrada sem as chaves: ${faltando.join( | `scripts/inventario/gerar-banco.mjs` |
| entrada sem tabelas | `scripts/inventario/gerar-banco.mjs` |
| format_version ${dado.format_version} desconhecido (esperado 1) | `scripts/inventario/gerar-banco.mjs` |
| o banco consultado ${registros === null ?  | `scripts/inventario/gerar-banco.mjs` |
| sem --entrada e sem SUPABASE_ACCESS_TOKEN: nada para ler (veja o cabecalho do script). | `scripts/inventario/gerar-banco.mjs` |
| sem ref do projeto: defina SUPABASE_PROJECT_REF (ou VITE_SUPABASE_PROJECT_ID / VITE_SUPABASE_URL). | `scripts/inventario/gerar-banco.mjs` |
| sem supabase/migrations/ para conferir o ledger: nao da para garantir a origem da resposta. | `scripts/inventario/gerar-banco.mjs` |
| ripgrep (rg) falhou com exit ${status}; o inventário não foi gerado. | `scripts/inventario/gerar-repo.mjs` |
| ripgrep (rg) não encontrado; o inventário não pode ser gerado com segurança. | `scripts/inventario/gerar-repo.mjs` |
| ${arquivo}: <Route> sem fim (chaves desbalanceadas?) em  | `scripts/inventario/gerar-rotas.mjs` |
| ${arquivo}: nao achei o bloco <Routes>...</Routes> | `scripts/inventario/gerar-rotas.mjs` |
| SQL com mais de um comando ( | `scripts/lib/psql-leitura.mjs` |
| SQL vazio | `scripts/lib/psql-leitura.mjs` |
| SUPABASE_DB_URL aponta para outro projeto que não o oficial — nada foi executado | `scripts/lib/psql-leitura.mjs` |
| SUPABASE_DB_URL ausente | `scripts/lib/psql-leitura.mjs` |
| SUPABASE_DB_URL não identifica um projeto Supabase Cloud (esperado db.<ref>.supabase.co ou  | `scripts/lib/psql-leitura.mjs` |
| Somente comando de leitura (SELECT/WITH/EXPLAIN/SHOW/VALUES/TABLE) é aceito | `scripts/lib/psql-leitura.mjs` |
| psql não concluiu: ${motivo} | `scripts/lib/psql-leitura.mjs` |
| psql não devolveu nenhuma linha (esperado um documento JSON) | `scripts/lib/psql-leitura.mjs` |
| psql saiu com código ${resultado.status ?? resultado.signal}: ${detalhe \|\|  | `scripts/lib/psql-leitura.mjs` |
| saída do psql não é JSON válido (${bruto.length} bytes) | `scripts/lib/psql-leitura.mjs` |
| caminho de  | `scripts/lib/seguranca-processo.mjs` |
| comando nao encontrado no PATH:  | `scripts/lib/seguranca-processo.mjs` |
| links simbolicos em ciclo ou em cadeia longa demais:  | `scripts/lib/seguranca-processo.mjs` |
| nome de comando invalido para busca no PATH:  | `scripts/lib/seguranca-processo.mjs` |
| failed | `scripts/maintenance/lib.mjs` |
| missing_dependencies | `scripts/maintenance/lib.mjs` |
| skipped_busy | `scripts/maintenance/lib.mjs` |
| formatter fixture failed | `scripts/maintenance/maintenance.unit.mjs` |
| blocked_network_sandbox | `scripts/maintenance/run.mjs` |
| pending_patch | `scripts/maintenance/run.mjs` |
| falha ao consultar ${tabela} em ${baseUrl}: ${resp.status} ${resp.statusText} - ${await resp.text()} | `scripts/migracao/reconcilia-produtos-pim.mjs` |
| variaveis de ambiente ausentes: ${faltando.join( | `scripts/migracao/reconcilia-produtos-pim.mjs` |
| O teste offline não permite consultas ao banco | `scripts/supabase_snapshot/test_snapshot.py` |
| banco indisponível na fixture | `scripts/supabase_snapshot/test_snapshot.py` |
| catálogo indisponível na fixture | `scripts/supabase_snapshot/test_snapshot.py` |
| permission denied for schema auth | `scripts/supabase_snapshot/test_snapshot.py` |
| relation  | `scripts/supabase_snapshot/test_snapshot.py` |
| statement timeout simulado | `scripts/supabase_snapshot/test_snapshot.py` |
| view removida depois da consulta ao catálogo | `scripts/supabase_snapshot/test_snapshot.py` |
| view sem permissão na fixture | `scripts/supabase_snapshot/test_snapshot.py` |
| nenhum objeto reconhecido em ${arquivo}; formato inesperado | `scripts/types-sync/check-remocoes-destrutivas.mjs` |
| Parametros de conexao PostgreSQL invalidos ou nao suportados (detalhes omitidos) | `scripts/types-sync/identidade-banco.mjs` |
| tsc nao concluiu a medicao  | `scripts/types-sync/typecheck-ratchet.mjs` |
| useAccessibility must be used within AccessibilityProvider | `src/components/accessibility/AdvancedAccessibility.tsx` |
| HTTP ${res.status} | `src/components/admin/DateFnsUsagePanel.tsx` |
| HTTP ${res.status} | `src/components/admin/DependencyHealthBadge.tsx` |
| ; import { CheckCircle2, AlertTriangle, PackageCheck, FileLock2, RefreshCw } from  | `src/components/admin/InstallReportPanel.tsx` |
| Drift de instalação detectado | `src/components/admin/InstallReportPanel.tsx` |
| Falha ao atualizar relatório | `src/components/admin/InstallReportPanel.tsx` |
| HTTP ${res.status} | `src/components/admin/InstallReportPanel.tsx` |
| , { _alert_id: id });      if (error) {       toast.error( | `src/components/admin/telemetry/SystemAlertsView.tsx` |
| ; import { ShieldCheck, ShieldAlert, RefreshCw, Lock, Search } from  | `src/components/auditoria/RlsCompliancePanel.tsx` |
| Falha ao gerar sugestao de fornecedores:  | `src/components/compras/AISupplierSuggestion.tsx` |
| Resposta invalida da edge de sugestao | `src/components/compras/AISupplierSuggestion.tsx` |
| Erro ao desfazer a operacao | `src/components/compras/BulkOperationsPreview.tsx` |
| Erro ao executar ação em massa | `src/components/compras/BulkOperationsPreview.tsx` |
| Falha ao desfazer parte da operacao | `src/components/compras/BulkOperationsPreview.tsx` |
| Erro ao abrir o documento | `src/components/compras/ContractDetailsModal.tsx` |
| Erro ao enviar documento | `src/components/compras/ContractDetailsModal.tsx` |
| Erro ao gerar PDF do contrato | `src/components/compras/ContractDetailsModal.tsx` |
| Organização não identificada. Faça login novamente. | `src/components/compras/ContractDetailsModal.tsx` |
| Preencha todos os campos obrigatórios | `src/components/compras/ContractModal.tsx` |
| Informe o prazo de entrega em dias inteiros maior que zero. | `src/components/compras/CotacaoManualModal.tsx` |
| Informe um valor unitario maior que zero. | `src/components/compras/CotacaoManualModal.tsx` |
| Informe uma quantidade inteira maior que zero. | `src/components/compras/CotacaoManualModal.tsx` |
| O fornecedor selecionado nao esta na lista de ativos. | `src/components/compras/CotacaoManualModal.tsx` |
| Selecione um fornecedor cadastrado. Fornecedor novo precisa ser cadastrado em Fornecedores antes da cotacao. | `src/components/compras/CotacaoManualModal.tsx` |
| ; import { Button } from  | `src/components/compras/CriticalAlertsBar.tsx` |
| Erro na previsão | `src/components/compras/DemandPredictionPanel.tsx` |
| Sem dados suficientes | `src/components/compras/DemandPredictionPanel.tsx` |
| Assinatura necessária | `src/components/compras/DigitalSignature.tsx` |
| Campos obrigatórios | `src/components/compras/DigitalSignature.tsx` |
| A data final precisa ser depois da data inicial | `src/components/compras/DynamicApprovalMatrix.tsx` |
| Dê um nome à regra e escolha o aprovador de cada etapa | `src/components/compras/DynamicApprovalMatrix.tsx` |
| Preencha todos os campos obrigatórios | `src/components/compras/DynamicApprovalMatrix.tsx` |
| Não foi possível salvar o fornecedor. Tente novamente. | `src/components/compras/FornecedorModal.tsx` |
| A entrega é registrada na tela de Recebimento, com a conferência da mercadoria. | `src/components/compras/KanbanBoard.tsx` |
| Erro ao criar solicitação:  | `src/components/compras/NovaSolicitacaoModal.tsx` |
| Erro ao processar solicitação via IA. | `src/components/compras/NovaSolicitacaoModal.tsx` |
| Resposta IA sem campos preenchíveis | `src/components/compras/NovaSolicitacaoModal.tsx` |
| Você precisa estar logado em uma organização | `src/components/compras/NovaSolicitacaoModal.tsx` |
| Erro ao criar regra | `src/components/compras/PenaltyEscalationConfigPanel.tsx` |
|  className= | `src/components/compras/PendingApprovalsList.tsx` |
| Erro ao aprovar solicitação | `src/components/compras/PendingApprovalsList.tsx` |
| Erro ao rejeitar solicitação | `src/components/compras/PendingApprovalsList.tsx` |
| Erro na comparação | `src/components/compras/PriceComparator.tsx` |
| Produto necessário | `src/components/compras/PriceComparator.tsx` |
| Quantidade inválida | `src/components/compras/PriceComparator.tsx` |
| ; import { cn } from  | `src/components/compras/SavingsGoalPanel.tsx` |
| Request #${solicitacao.id} rejected | `src/components/compras/SolicitacaoCard.tsx` |
| Nada para exportar | `src/components/compras/SourcingHistoryConsole.tsx` |
| Sem base para análise | `src/components/compras/SourcingHistoryConsole.tsx` |
| Sem base para varredura | `src/components/compras/SourcingHistoryConsole.tsx` |
| Erro ao registrar bonificação | `src/components/compras/SupplierBonificationsPanel.tsx` |
| Usuário não autenticado | `src/components/compras/SupplierBonificationsPanel.tsx` |
| Erro na análise | `src/components/compras/SupplierRiskAnalysis.tsx` |
| Fornecedor não encontrado | `src/components/compras/SupplierRiskAnalysis.tsx` |
| Selecione um fornecedor | `src/components/compras/SupplierRiskAnalysis.tsx` |
| Erro ao atualizar status. | `src/components/compras/dashboard/UrgencyDetailsSheet.tsx` |
| Sem permissão para alterar esta solicitação. | `src/components/compras/dashboard/UrgencyDetailsSheet.tsx` |
| Solicitação não identificada. | `src/components/compras/dashboard/UrgencyDetailsSheet.tsx` |
|  className= | `src/components/compras/solicitacao/SolicitacaoFormSteps.tsx` |
| Erro ao enviar notificação de teste. | `src/components/notifications/NotificationSettingsPanel.tsx` |
| Erro ao verificar alertas. | `src/components/notifications/NotificationSettingsPanel.tsx` |
| Permissão para notificações foi negada. | `src/components/notifications/NotificationSettingsPanel.tsx` |
| Permita as notificações primeiro. | `src/components/notifications/NotificationSettingsPanel.tsx` |
| Crédito não aplicado | `src/components/pagamentos/PagamentoDetailModal.tsx` |
| Erro no upload | `src/components/pagamentos/PagamentoDetailModal.tsx` |
| Informe um valor entre R$ 0,01 e ${formatCurrency(saldoRestante)} | `src/components/pagamentos/PagamentoDetailModal.tsx` |
| Organização não identificada | `src/components/pagamentos/PagamentoDetailModal.tsx` |
| Selecione uma data | `src/components/pagamentos/PagamentoScheduleModal.tsx` |
| Sem Conexão | `src/components/pwa/PWAInstallPrompt.tsx` |
| Erro ao encerrar as outras sessões | `src/components/security/ActiveSessionsPanel.tsx` |
| Erro ao encerrar sessão | `src/components/security/ActiveSessionsPanel.tsx` |
| Erro ao bloquear país | `src/components/security/BlockedCountriesPanel.tsx` |
| Erro ao desbloquear | `src/components/security/BlockedCountriesPanel.tsx` |
| País já está bloqueado | `src/components/security/BlockedCountriesPanel.tsx` |
| Erro ao bloquear IP | `src/components/security/BlockedIPsPanel.tsx` |
| Erro ao desbloquear IP | `src/components/security/BlockedIPsPanel.tsx` |
| IP inválido | `src/components/security/BlockedIPsPanel.tsx` |
| Preencha todos os campos | `src/components/security/BlockedIPsPanel.tsx` |
| ; import { toast } from  | `src/components/security/GeoWhitelistPanel.tsx` |
| Erro ao adicionar país | `src/components/security/GeoWhitelistPanel.tsx` |
| Erro ao alterar configuração | `src/components/security/GeoWhitelistPanel.tsx` |
| Erro ao alterar status | `src/components/security/GeoWhitelistPanel.tsx` |
| Erro ao remover país | `src/components/security/GeoWhitelistPanel.tsx` |
| País já está na whitelist | `src/components/security/GeoWhitelistPanel.tsx` |
| Selecione um país | `src/components/security/GeoWhitelistPanel.tsx` |
| Erro ao adicionar IP | `src/components/security/IPWhitelistPanel.tsx` |
| Erro ao remover IP | `src/components/security/IPWhitelistPanel.tsx` |
| IP inválido | `src/components/security/IPWhitelistPanel.tsx` |
| Informe o endereço IP | `src/components/security/IPWhitelistPanel.tsx` |
| ; import { toast } from  | `src/components/security/MFASettings.tsx` |
| Código inválido. Tente novamente. | `src/components/security/MFASettings.tsx` |
| Erro ao iniciar configuração MFA | `src/components/security/MFASettings.tsx` |
| Erro ao criar solicitação | `src/components/security/PasswordResetRequestsPanel.tsx` |
| Erro ao processar solicitação | `src/components/security/PasswordResetRequestsPanel.tsx` |
| Erro ao salvar permissões | `src/components/security/PermissionMatrix.tsx` |
|  className={cn(alertVariants({ variant }), className)} {...props} /> )); Alert.displayName =  | `src/components/ui/alert.tsx` |
| useChart must be used within a <ChartContainer /> | `src/components/ui/chart.tsx` |
|                initial={{ opacity: 0, y: -10, height: 0 }}               animate={{ opacity: 1, y: 0, height:  | `src/components/ui/floating-input.tsx` |
| useFormField should be used within <FormField> | `src/components/ui/form.tsx` |
| useSidebar must be used within a SidebarProvider. | `src/components/ui/sidebar.tsx` |
|        aria-live= | `src/components/ui/undo-toast.tsx` |
| Acesso restrito. Você não tem permissão para acessar esta área. | `src/features/auth/components/ProtectedRoute.tsx` |
| Sua sessao expirou. Entre novamente para continuar. | `src/features/auth/hooks/useAuth.tsx` |
| Sua sessao foi encerrada em outra aba. | `src/features/auth/hooks/useAuth.tsx` |
| useAuth must be used within an AuthProvider | `src/features/auth/hooks/useAuthContext.ts` |
| Erro ao adicionar cotação:  | `src/features/cotacoes/hooks/useCotacoes.ts` |
| Erro ao atualizar:  | `src/features/cotacoes/hooks/useCotacoes.ts` |
| Erro ao excluir:  | `src/features/cotacoes/hooks/useCotacoes.ts` |
| Erro ao selecionar:  | `src/features/cotacoes/hooks/useCotacoes.ts` |
| Nada foi excluído: cotação inexistente ou sem permissão. | `src/features/cotacoes/hooks/useCotacoes.ts` |
| Nada foi gravado: cotação inexistente ou sem permissão. | `src/features/cotacoes/hooks/useCotacoes.ts` |
| Você precisa estar logado em uma organização | `src/features/cotacoes/hooks/useCotacoes.ts` |
| Atalho em uso | `src/features/layout/components/ClearFiltersShortcutEditor.tsx` |
| Combinação inválida | `src/features/layout/components/ClearFiltersShortcutEditor.tsx` |
| O intervalo de verificação deve ser pelo menos 1 minuto | `src/features/layout/components/SLASettingsPanel.tsx` |
| O threshold de SLA do fornecedor deve estar entre 50% e 100% | `src/features/layout/components/SLASettingsPanel.tsx` |
| O threshold de atenção deve ser maior que o crítico | `src/features/layout/components/SLASettingsPanel.tsx` |
| Os thresholds devem ser pelo menos 1 dia | `src/features/layout/components/SLASettingsPanel.tsx` |
| ${atualizados} de ${ids.length} pedido(s) atualizado(s). Os demais não foram alterados: sem permissão. | `src/features/pedidos/hooks/usePedidos.ts` |
| Erro ao atualizar pedidos:  | `src/features/pedidos/hooks/usePedidos.ts` |
| Erro ao atualizar:  | `src/features/pedidos/hooks/usePedidos.ts` |
| Erro ao criar pedido:  | `src/features/pedidos/hooks/usePedidos.ts` |
| Erro ao excluir pedidos:  | `src/features/pedidos/hooks/usePedidos.ts` |
| Erro ao excluir:  | `src/features/pedidos/hooks/usePedidos.ts` |
| Nenhum pedido foi atualizado: você não tem permissão para alterar estes pedidos. | `src/features/pedidos/hooks/usePedidos.ts` |
| Não foi possível conferir o recebimento do pedido. Exclusão cancelada. | `src/features/pedidos/hooks/usePedidos.ts` |
| Não foi possível conferir o recebimento dos pedidos. Exclusão cancelada. | `src/features/pedidos/hooks/usePedidos.ts` |
| Pedido não encontrado | `src/features/pedidos/hooks/usePedidos.ts` |
| Pedido não foi atualizado: você não tem permissão para alterar este pedido. | `src/features/pedidos/hooks/usePedidos.ts` |
| Só é possível gerar ordem de compra de uma solicitação aprovada | `src/features/pedidos/hooks/usePedidos.ts` |
| Transição inválida: ${pedido.status} → ${newStatus} | `src/features/pedidos/hooks/usePedidos.ts` |
| Você precisa estar logado em uma organização | `src/features/pedidos/hooks/usePedidos.ts` |
| ${excluidos} de ${ids.length} solicitação(ões) excluída(s). ${MOTIVO_DEPENDENTES_SOLICITACAO} | `src/features/solicitacoes/hooks/useSolicitacoes.ts` |
| Erro ao atualizar:  | `src/features/solicitacoes/hooks/useSolicitacoes.ts` |
| Erro ao criar solicitação:  | `src/features/solicitacoes/hooks/useSolicitacoes.ts` |
| Erro ao excluir:  | `src/features/solicitacoes/hooks/useSolicitacoes.ts` |
| Não foi possível conferir o histórico da solicitação. Exclusão cancelada. | `src/features/solicitacoes/hooks/useSolicitacoes.ts` |
| Não foi possível conferir o histórico das solicitações. Exclusão cancelada. | `src/features/solicitacoes/hooks/useSolicitacoes.ts` |
| Solicitação não encontrada | `src/features/solicitacoes/hooks/useSolicitacoes.ts` |
| Transição inválida: ${sol.status} → ${newStatus} | `src/features/solicitacoes/hooks/useSolicitacoes.ts` |
| Você precisa estar logado em uma organização | `src/features/solicitacoes/hooks/useSolicitacoes.ts` |
| Erro ao excluir delegação | `src/hooks/useApprovalRules.ts` |
| Erro ao excluir regra | `src/hooks/useApprovalRules.ts` |
| Erro ao salvar delegação | `src/hooks/useApprovalRules.ts` |
| Erro ao salvar regra | `src/hooks/useApprovalRules.ts` |
| Aprovação não gravada: você não tem permissão para aprovar esta etapa. | `src/hooks/useApprovalWorkflow.ts` |
| Etapa rejeitada, mas a solicitação não foi marcada como rejeitada: você não tem permissão para alterar esta solicitação. | `src/hooks/useApprovalWorkflow.ts` |
| Nenhuma regra de aprovação ou gestor de Centro de Custo encontrado | `src/hooks/useApprovalWorkflow.ts` |
| Rejeição não gravada: você não tem permissão para rejeitar esta etapa. | `src/hooks/useApprovalWorkflow.ts` |
| Erro ao atualizar orçamento | `src/hooks/useBudgetManagement.ts` |
| Erro ao criar orçamento | `src/hooks/useBudgetManagement.ts` |
| Erro ao remover orçamento | `src/hooks/useBudgetManagement.ts` |
| Já existe orçamento para este centro de custo/período | `src/hooks/useBudgetManagement.ts` |
| Resposta vazia do external-db-bridge | `src/hooks/useCatalogoPim.ts` |
| Erro ao adicionar nota:  | `src/hooks/useContactNotes.ts` |
| Erro ao atualizar nota:  | `src/hooks/useContactNotes.ts` |
| Erro ao excluir nota:  | `src/hooks/useContactNotes.ts` |
| Você precisa estar logado | `src/hooks/useContactNotes.ts` |
| Erro ao definir filtro padrão | `src/hooks/useDashboardFilters.ts` |
| Erro ao remover filtro | `src/hooks/useDashboardFilters.ts` |
| Erro ao salvar filtro favorito | `src/hooks/useDashboardFilters.ts` |
| Você precisa estar logado para salvar filtros | `src/hooks/useDashboardFilters.ts` |
| Devolucao com credito gerado nao pode ser excluida: o credito do fornecedor ficaria sem origem. | `src/hooks/useDevolucoes.ts` |
| Devolução não encontrada | `src/hooks/useDevolucoes.ts` |
| Erro ao criar devolução:  | `src/hooks/useDevolucoes.ts` |
| Erro:  | `src/hooks/useDevolucoes.ts` |
| Nada foi excluido: devolucao inexistente ou sem permissao para excluir. | `src/hooks/useDevolucoes.ts` |
| Nada foi gravado: credito inexistente ou sem permissao para utiliza-lo. | `src/hooks/useDevolucoes.ts` |
| Nada foi gravado: devolucao inexistente ou sem permissao para mudar o status. | `src/hooks/useDevolucoes.ts` |
| Nao foi possivel conferir o credito da devolucao. Exclusao cancelada. | `src/hooks/useDevolucoes.ts` |
| Os itens da devolucao ${numero} nao foram gravados (${itensError.message}) e a devolucao foi desfeita. | `src/hooks/useDevolucoes.ts` |
| Os itens da devolucao ${numero} nao foram gravados (${itensError.message}) e o cabecalho NAO foi removido: ${desfazerError.message} | `src/hooks/useDevolucoes.ts` |
| Saldo insuficiente | `src/hooks/useDevolucoes.ts` |
| Transição inválida: ${dev.status} → ${newStatus} | `src/hooks/useDevolucoes.ts` |
| Você precisa estar logado | `src/hooks/useDevolucoes.ts` |
| Erro ao registrar movimentação:  | `src/hooks/useEstoque.ts` |
| Erro ao vincular ao estoque:  | `src/hooks/useEstoque.ts` |
| Organization ID missing | `src/hooks/useEstoque.ts` |
| CNPJ inválido. Verifique os dígitos verificadores. | `src/hooks/useFornecedores.ts` |
| Email inválido. | `src/hooks/useFornecedores.ts` |
| Erro ao atualizar:  | `src/hooks/useFornecedores.ts` |
| Erro ao excluir:  | `src/hooks/useFornecedores.ts` |
| Fornecedor com historico nao pode ser excluido: ${dependentes             .map((item) =>  | `src/hooks/useFornecedores.ts` |
| Nao foi possivel conferir o historico do fornecedor. Exclusao cancelada. | `src/hooks/useFornecedores.ts` |
| Você precisa estar logado em uma organização | `src/hooks/useFornecedores.ts` |
| Configurações de geo-restrição ainda não carregaram. Aguarde e tente novamente. | `src/hooks/useGeoRestriction.ts` |
| Não foi possível desfazer a ação | `src/hooks/useGlobalUndo.ts` |
| Não foi possível refazer a ação | `src/hooks/useGlobalUndo.ts` |
| Erro no assistente:  | `src/hooks/useGuidedBuying.ts` |
| Resposta inválida do assistente | `src/hooks/useGuidedBuying.ts` |
| Erro ao enviar lance:  | `src/hooks/useLicitacoes.ts` |
| Erro:  | `src/hooks/useLicitacoes.ts` |
| Login necessário | `src/hooks/useLicitacoes.ts` |
| Código inválido:  | `src/hooks/useMFA.ts` |
| Erro ao configurar MFA:  | `src/hooks/useMFA.ts` |
| Erro ao desativar MFA:  | `src/hooks/useMFA.ts` |
| No TOTP factor found | `src/hooks/useMFA.ts` |
| User not authenticated | `src/hooks/useMFA.ts` |
| ${apagadosCount} de ${ids.length} pagamento(s) excluído(s). Os demais estão sem permissão. | `src/hooks/usePagamentos.ts` |
| ${atualizadosCount} de ${validIds.length} pagamento(s) atualizado(s). | `src/hooks/usePagamentos.ts` |
| ${blocked.length} pagamento(s) ficaram de fora (transição inválida): ${blocked.join( | `src/hooks/usePagamentos.ts` |
| ${liberados.length} de ${ids.length} pagamento(s) excluído(s). ${MOTIVO_HISTORICO_PAGAMENTO} | `src/hooks/usePagamentos.ts` |
| Erro ao atualizar pagamentos:  | `src/hooks/usePagamentos.ts` |
| Erro ao atualizar:  | `src/hooks/usePagamentos.ts` |
| Erro ao excluir pagamentos:  | `src/hooks/usePagamentos.ts` |
| Erro ao excluir:  | `src/hooks/usePagamentos.ts` |
| … +290 linhas — lista completa em `context.json` | |

## J. Controle de acesso no código (checagens de perfil/permissão)

| Valor comparado | Arquivo |
|---|---|
| `granted` | `src/components/notifications/NotificationSettingsPanel.tsx` |
| `admin` | `src/components/security/PermissionMatrix.tsx` |
| `admin` | `src/features/auth/hooks/useAuth.tsx` |
| `admin` | `src/features/layout/components/CommandPalette.tsx` |
| `user` | `src/features/layout/components/GuidedBuyingAssistant.tsx` |
| `denied` | `src/features/layout/components/RealNotificationCenter.tsx` |
| `granted` | `src/features/layout/components/RealNotificationCenter.tsx` |
| `denied` | `src/hooks/useApprovalNotifications.ts` |
| `granted` | `src/hooks/useApprovalNotifications.ts` |
| `granted` | `src/hooks/useRealPushNotifications.ts` |
| `user` | `supabase/functions/guided-buying-ai/index.ts` |

## K. Testes como especificação (3451 testes em 250 arquivos — nomes completos em `context.json`)

| Arquivo | Testes | Exemplos do que o sistema DEVE fazer |
|---|---|---|
| `src/components/accessibility/__tests__/accessibilityHelpers.test.ts` | 66 | defaultSettings · has fontSize of 100 · has lineSpacing of 1.5 · has letterSpacing of 0 … |
| `src/features/layout/components/search/__tests__/searchConfig.test.ts` | 61 | fuseOptions · isCaseSensitive is false · includeScore and includeMatches are true · threshold is 0.4 … |
| `src/lib/__tests__/dbMapping.test.ts` | 59 | dbMapping · nullToUndefined · converts null to undefined · passes through undefined … |
| `src/stores/__tests__/undoStore.test.ts` | 58 | undoStore · initial state · starts with empty stacks · has maxActions = 10 … |
| `src/pages/recebimento/__tests__/recebimentoHelpers.test.ts` | 56 | OFFLINE_STORAGE_KEY · is a non-empty string · equals  · uses kebab-case (no spaces, no underscores) … |
| `src/lib/__tests__/clearFiltersShortcut.test.ts` | 55 | DEFAULT_CLEAR_FILTERS_SHORTCUT · uses key  · requires ctrl · requires shift … |
| `src/stores/__tests__/kpiTargetsStore.test.ts` | 53 | kpiTargetsStore · initial state · has 8 default targets · all default targets are enabled … |
| `src/hooks/__tests__/hookConstants.test.ts` | 52 | solicitacoesStatusOptions · has 7 status options · covers all expected status values · every option has value, label, color … |
| `src/stores/__tests__/buyerAlertsStore.test.ts` | 49 | buyerAlertsStore · initial state · starts with empty targets · starts with empty alerts … |
| `src/pages/solicitacoes/__tests__/solicitacoesHelpers.test.ts` | 47 | mapDbStatusToLegacy · maps %s → %s · mapLegacyStatusToDb · maps %s → %s … |
| `src/pages/gerar-ordem/__tests__/gerarOrdemHelpers.test.ts` | 45 | getTipoLabel · maps %s → %s · returns the raw value for unknown tipo · buildWhatsAppMessage … |
| `src/lib/__tests__/exportData.test.ts` | 44 | formatCurrency · formats a positive number with R$ · formats zero · returns empty string for NaN … |
| `src/tests/spot/spotApi.test.ts` | 41 | parseSpotDecimal · converte vírgula decimal (HandlingCosts  · aceita número e string com espaços · devolve null para vazio ou inválido … |
| `src/components/animations/__tests__/motionVariants.test.ts` | 39 | fadeInVariants · has hidden state with opacity 0 and y offset · has visible state with opacity 1 and y 0 · scaleVariants … |
| `src/pages/acompanhamento/__tests__/AcompanhamentoHelpers.test.ts` | 39 | getStatusLabel · maps %s → %s · returns the raw status for unknown values · returns empty string for empty input … |
| `src/features/solicitacoes/schemas/__tests__/solicitacao.schemas.test.ts` | 37 | SolicitacaoStatusSchema · has exactly 7 valid status values · rejects unknown status · rejects empty string … |
| `src/pages/cotacao/__tests__/cotacaoHelpers.test.ts` | 37 | adaptFornecedoresToLegacy · maps a basic fornecedor row correctly · returns empty array for empty input · falls back to razao_social when nome_fantasia is null … |
| `src/pages/devolucoes/__tests__/devolucoesData.test.ts` | 37 | STATUS_MAP · has exactly 10 status keys · covers all expected status keys · every entry has a non-empty label string … |
| `src/components/pagamentos/__tests__/applyAdvancedFilters.test.ts` | 36 | applyAdvancedFilters — no filters · returns all items when all filters are default · returns empty array when input is empty · applyAdvancedFilters — search filter … |
| `src/pages/fornecedores/__tests__/fornecedorHelpers.test.ts` | 36 | fornecedorHelpers · adaptToLegacy · maps id correctly · uses nome_fantasia when present … |
| `src/pages/compliance/__tests__/complianceHelpers.test.ts` | 33 | actionTypeLabels · has entries for warning, standard_fine, double_fine, temp_block, permanent_block · each entry has label, color, and icon · warning label is  … |
| `src/features/auth/schemas/__tests__/auth.schemas.test.ts` | 32 | RegimeTributarioSchema · accepts simples_nacional · accepts lucro_presumido · accepts lucro_real … |
| `src/features/layout/transitions/__tests__/config.test.ts` | 32 | DEFAULT_TRANSITION · is  · is a string · ROUTE_OVERRIDES … |
| `src/lib/__tests__/filterClearReporter.test.ts` | 32 | buildClearReport · returns empty report when no fields provided · excludes field with null value · excludes field with undefined value … |
| `src/stores/__tests__/slaSettingsStore.test.ts` | 32 | initial state · has default warningThresholdDays of 3 · has default criticalThresholdDays of 1 · has default checkIntervalMinutes of 1 … |
| `src/schemas/__tests__/solicitacao.schema.test.ts` | 31 | solicitacaoSchema · accepts fully valid input · applies default observacoes as empty string · applies default centroCusto as empty string … |
| `src/stores/__tests__/dashboardLayoutStore.test.ts` | 31 | dashboardLayoutStore · initial state · has default widgets · all default widgets are visible … |
| `src/components/compras/pending-approvals/__tests__/pendingApprovalsData.test.ts` | 30 | mockPendingApprovals · has 3 items · each item has required string fields · each item has numeric fields … |
| `src/pages/relatorio-negociacoes/__tests__/relatorioNegociacoesData.test.ts` | 30 | historicoMensal · has 6 months of data · every item has mes, economia, volume, percentual, cotacoes · all economia values are positive … |
| `src/components/ui/__tests__/enhanced-search-helpers.test.ts` | 28 | typeLabels · covers all 5 result types · solicitacao →  · pedido →  … |
| `src/hooks/__tests__/keyboardShortcutsData.test.ts` | 28 | getShortcutsList · is a function · returns an array · returns 4 categories … |
| `src/lib/__tests__/feedbackToast.test.ts` | 28 | toast · is defined · exposes success, error, warning, info, dismiss, promise, loading, custom · toast.success … |
| `src/pages/admin-telemetria/__tests__/telemetriaHelpers.test.ts` | 28 | formatDuration · returns ms for durations below 1000 · returns seconds with one decimal for 1000ms · returns seconds with one decimal for values above 1000 … |
| `src/components/onboarding/__tests__/tourStepDefinitions.test.ts` | 27 | dashboardTourSteps · has 5 steps · cotacaoTourSteps · has 3 steps … |
| `src/lib/__tests__/performance.test.ts` | 27 | performanceMonitor · is defined and is an object · exposes mark, measure, trackLCP, trackCLS, trackFID, trackFCP, initAll · has exactly 7 methods (structural completeness) … |
| `src/services/__tests__/auditServiceConstants.test.ts` | 27 | actionTypeLabels · has exactly 10 action types · covers all 10 expected action types · every label is a non-empty string … |
| `src/components/compras/scorecard/__tests__/supplierScorecardData.test.ts` | 26 | getScoreColor · returns  · returns  · returns  … |
| `src/components/compras/sla-analysis/__tests__/slaAnalysisData.test.ts` | 26 | SUPPLIER_COLORS · has 6 supplier entries · all values are non-empty strings · SUPPLIER_PALETTE … |
| `src/lib/__tests__/logger.test.ts` | 26 | logger · is a singleton (same instance on re-import) · getRequestId() returns a non-empty string · getRequestId() returns the same value on repeated calls … |
| `src/lib/__tests__/secureStorage.test.ts` | 25 | secureStorage · setItem + getItem round-trip · stores and retrieves a plain string · stores an empty string and retrieves it … |
| `src/pages/catalogo-spot/__tests__/spotHelpers.test.ts` | 25 | STATUS_CONFIG · has 10 entries · has key  · each entry has a variant and label … |
| `src/types/__tests__/legacyTypes.test.ts` | 25 | getTipoLabel · returns  · returns  · returns  … |
| `src/components/compras/delivery-calendar/__tests__/deliveryCalendarHelpers.test.ts` | 24 | statusConfig · has 4 status entries · has entry for %s · each entry has label, color, textColor, and icon … |
| `src/components/compras/digital-signature/__tests__/signatureHelpers.test.ts` | 24 | statusConfig · has entries for all 4 statuses · each entry has label, color, and icon · pending label is  … |
| `src/components/compras/timeline/__tests__/timelineConfig.test.ts` | 24 | iconesPorEtapa · has 10 entries · includes solicitacao key · includes aprovacao key … |
| `src/components/ui/__tests__/chartColors.test.ts` | 24 | chartPalette · has 8 color entries · covers all expected palette keys · every entry has light and dark variants … |
| `src/hooks/__tests__/useToastReducer.test.ts` | 24 | reducer — ADD_TOAST · adds a toast to empty state · places new toast at the beginning · respects TOAST_LIMIT of 1 — oldest toast is dropped … |
| `src/lib/__tests__/utils.test.ts` | 24 | returns empty string for no arguments · joins class names · ignores falsy values · handles conditional object syntax … |
| `src/pages/portal-fornecedor/__tests__/portalFornecedorData.test.ts` | 24 | statusPedido · has 5 status keys · covers all expected status keys · every entry has a non-empty label … |
| `src/components/compras/__tests__/kanbanTypeGuards.test.ts` | 23 | isKanbanStatus · returns true for all valid statuses · returns false for unknown string · returns false for null … |
| `src/hooks/__tests__/permissionsConstants.test.ts` | 23 | moduleLabels · has 11 module entries · covers all expected module keys · every label is a non-empty string … |
| `src/lib/__tests__/queryClientConstants.test.ts` | 23 | DEFAULT_STALE_TIME · is 30 seconds in milliseconds · is a positive number · REFERENCE_STALE_TIME … |
| `src/lib/__tests__/supabaseRpc.test.ts` | 23 | supabaseRpc typed wrappers · rpcCurrentTenantId → rpc( · rpcGenerateSequentialNumber → correct name and params · rpcCheckBudgetAvailability → correct name and params … |
| `src/pages/aprovacoes/__tests__/aprovacoesData.test.ts` | 23 | inicioDaJanela · recua o numero de meses do periodo escolhido · cai em 6 meses quando o periodo nao e conhecido · dentroDaJanela recusa data vazia, invalida e anterior ao corte … |
| `src/components/compras/price-comparator/__tests__/priceComparatorHelpers.test.ts` | 22 | generateQuotesFromSuppliers · passes product name and quantity through · returns one quote per supplier · quotes are sorted by totalPrice ascending when prices exist … |
| `src/lib/__tests__/imageCompression.test.ts` | 22 | formatBytes · returns  · formats bytes under 1 KB as  · formats exactly 1 KB … |
| `src/lib/__tests__/queryClient.test.ts` | 22 | stale-time constants · DEFAULT_STALE_TIME is 30 seconds (30_000 ms) · REFERENCE_STALE_TIME is 5 minutes (300_000 ms) · STATIC_STALE_TIME is 30 minutes (1_800_000 ms) … |
| `src/pages/buyer/__tests__/buyerDashboardHelpers.test.ts` | 22 | COLORS · has 4 color values · all values are non-empty strings · first color is the CSS variable primary … |
| `src/components/compras/procurement-kpis/__tests__/deriveKpiSnapshot.test.ts` | 21 | deriveKpiSnapshot - sem dados · nao inventa valores quando o banco esta vazio · usa as metas do modulo, nao numeros fixos de tela · deriveKpiSnapshot - ROI … |
| `src/features/auth/types/__tests__/authRoles.test.ts` | 21 | roleLabels · covers all 6 roles · has exactly 6 entries · all labels are non-empty strings … |
| `src/lib/__tests__/pdfGenerator.test.ts` | 21 | generateOrderPDF · is a function · returns a jsPDF document instance · does not throw with valid data … |
| `src/pages/devolucoes/__tests__/devolucoesModals.test.ts` | 21 | MOTIVO_LABELS · has 7 motivo entries · covers all expected motivo keys · every label is a non-empty string … |
| `src/components/compras/price-history/__tests__/priceHistoryHelpers.test.ts` | 20 | CHART_COLORS · has 6 color entries · all entries are non-empty strings · first color uses CSS variable syntax … |
| `src/components/ui/indicators/__tests__/statusConfigs.test.ts` | 20 | statusConfigs · has 13 status entries · covers all expected StatusType values · every entry has a non-empty label string … |
| `src/lib/__tests__/security.test.ts` | 20 | security.isDangerous · detects <script tag · detects javascript: protocol · detects onerror= attribute … |
| `supabase/functions/_shared/external-bridge-allowlist.test.ts` | 20 | assertBridgeRequest: select em view do PIM na allowlist é permitido · assertBridgeRequest: tabela fora da allowlist retorna 403 · assertBridgeRequest: insert em view do PIM retorna 403 (operação não permitida) · assertBridgeRequest: limit acima de MAX_SELECT_LIMIT retorna 400 … |
| `src/components/compras/bulk-operations/__tests__/bulkOperationsTypes.test.ts` | 19 | entityConfig · has exactly 4 entity types · covers all required entity types · each entity has a non-empty label … |
| `src/components/compras/executive/__tests__/executiveDashboardData.test.ts` | 19 | calculateChange · returns positive value when current > previous · returns negative value when current < previous · returns 0 when current equals previous … |
| `src/components/compras/pending-approvals/__tests__/deadlineFallback.test.ts` | 19 | resolveApprovalDeadline · prioriza step.prazo_limite quando presente · cai para workflow.prazo_limite quando step é nulo · usa workflow.created_at + 24h quando ambos prazos são nulos … |
| `src/components/ui/__tests__/celebrationConfigs.test.ts` | 19 | celebrationConfigs · has 9 celebration type entries · covers all expected CelebrationType values · every entry has a defined icon … |
| `src/hooks/__tests__/useDevolucoes.test.tsx` | 19 | useDevolucoes · regra de transicao de status · recusa transicao fora da maquina de estados e nao grava nada · carimba a data de aprovacao ao aprovar · nao anuncia status atualizado quando o RLS barra o UPDATE … |
| `src/lib/__tests__/paginatedFetch.test.ts` | 19 | fetchAllRows · returns all rows from a single page · calls from() with the table name · calls select() with the select string … |
| `src/lib/__tests__/routePrefetch.test.ts` | 19 | prefetchRouteChunk · is a function · does not throw for a known route · does not throw for an unknown route … |
| `src/lib/__tests__/supabaseQuery.test.ts` | 19 | escapeIlike · returns empty string for empty string input · returns empty string for null-like falsy input · returns plain string unchanged … |
| `src/pages/admin/__tests__/alertRunbooks.test.ts` | 19 | getRunbook · returns generic runbook for null · returns generic runbook for undefined · returns generic runbook for empty string … |
| `src/components/compras/enhanced-kpi/__tests__/colorClasses.test.ts` | 18 | colorClasses · has 11 color entries · covers all KpiColor values · every entry has bg, text, border, gradient strings … |
| `src/lib/__tests__/safeTruncate.test.ts` | 18 | safeTruncate (frontend) · retorna a string original quando cabe no limite · respeita o limite em ASCII · nunca deixa lone high surrogate ao cortar entre surrogate pair … |
| `src/features/solicitacoes/__tests__/fluxoAprovacao.test.ts` | 17 | statusDaEtapa · traduz os status que o banco grava · a etapa pendente na etapa_atual do workflow e a atual · etapa com decidido_em conta como concluida mesmo sem status explicito … |
| `supabase/functions/receive-os-sync/mapping.test.ts` | 17 | tipo material e status pendente: unicos valores aceitos pelo schema vivo · external_ref = os_id: chave de idempotencia da origem · numero e tenant vem do chamador, nao do payload · titulo cita a OS e o produto … |
| `src/components/compras/__tests__/followUpReal.test.tsx` | 16 | descreverFollowUp · sem registro nao afirma envio · com registro usa o status e o atraso reais · sem atraso nao inventa  … |
| `src/features/layout/components/sla-settings/__tests__/knownSuppliers.test.ts` | 16 | KNOWN_SUPPLIERS · is an array · has 6 supplier entries · every entry has id and name strings … |
| `src/features/layout/transitions/__tests__/presets.test.ts` | 16 | PRESETS · has exactly 12 entries · covers all TransitionName values · every preset has initial, animate, exit, and transition … |
| `src/lib/__tests__/safeDisplay.test.ts` | 16 | safeDisplay · retorna string original quando cabe no limite · trunca com ellipsis padrão respeitando o limite total · aceita ellipsis customizado … |
| `supabase/functions/_shared/logLevel.test.ts` | 16 | normalizeLevel: matriz de entradas inválidas mapeia para DEFAULT_LEVEL · normalizeLevel: níveis canônicos aceitam variações case/whitespace · normalizeLevel: alias  · property: normalizeLevel é total e idempotente sobre 500 inputs aleatórios … |
| `scripts/lib/seguranca-processo.test.mjs` | 15 | resolverExecutavel devolve caminho absoluto existente igual ao do shell · resolverExecutavel lanca para comando inexistente · resolverExecutavel pula diretorio homonimo e arquivo sem permissao de execucao, como o shell · resolverExecutavel devolve caminho absoluto mesmo com entrada relativa no PATH … |
| `src/hooks/__tests__/useFuseSearch.test.ts` | 15 | normalizeText · lowercases and removes accents · strips special characters · collapses whitespace … |
| `src/lib/__tests__/creditoFornecedor.test.ts` | 15 | calcularAbatimentoCredito · acumula o valor utilizado em vez de substituir · marca o credito como utilizado quando o saldo zera · nunca deixa o saldo negativo … |
| `src/pages/pedidos/__tests__/followUpPedido.test.tsx` | 15 | montarInteracoesPedido · sem cotacao e sem notificacao devolve lista vazia, sem dialogo fabricado · cotacao sem last_follow_up_at nao gera registro de follow-up · usa a data e o status reais do follow-up gravado na cotacao … |
| `src/features/solicitacoes/__tests__/pessoasDaEmpresa.test.ts` | 14 | montarPessoas · usa o user_id como id, que e o valor de aprovador_id · cai para display_name e depois e-mail quando nao ha nome completo · descarta linha sem user_id: sem id nao ha o que gravar … |
| `src/lib/__tests__/haptics.test.ts` | 14 | haptics · light() calls navigator.vibrate(10) · medium() calls navigator.vibrate(25) · success() calls navigator.vibrate([10, 50, 10]) … |
| `src/i18n/__tests__/locales.test.ts` | 13 | chaves que a tela do catalogo usa existem de verdade · pt, en e es trazem catalog.title, catalog.subtitle e common.new com texto real · CatalogoProdutos.tsx chama exatamente essas chaves (senao elas ficam mortas) · pt, en e es cobrem as mesmas chaves … |
| `src/lib/__tests__/logger.fuzz.test.ts` | 13 | logger (frontend) — fuzz & property · não lança para mensagens exóticas em nenhum nível válido · não lança quando o nível é chamado com API válida mas contexto exótico · níveis inválidos não quebram — chamador não deve conseguir invocar … |
| `src/lib/__tests__/negotiationOutreach.test.ts` | 13 | normalizarTelefone · prefixa 55 em celular de 11 digitos · nao duplica o 55 quando ja veio com pais · rejeita telefone curto demais … |
| `src/lib/__tests__/statusTransitionsBanco.test.ts` | 13 | matriz de pagamentos (src/lib/statusTransitionsBanco.ts) · bate com a ultima migration que define o trigger · cobre os caminhos de pagamento parcial que o banco passou a aceitar · matriz de pedidos (src/lib/statusTransitionsBanco.ts) … |
| `src/pages/pedidos/__tests__/pedidosHelpers.test.ts` | 13 | prazoConsumido · mede o quanto da janela emissao -> previsao ja passou · devolve o piso de 5% quando o prazo acabou de comecar · nao mede nada sem as duas datas ou com janela invalida … |
| `src/lib/__tests__/sourcingAnalytics.test.ts` | 12 | sourcingAnalytics · calcula intervalo médio e próxima compra a partir das datas reais · não inventa previsão quando o item tem apenas uma compra · detecta tendência de preço unitário … |
| `supabase/functions/scim-v2/auth.test.ts` | 12 | timingSafeEqual: iguais e diferentes · sha256Hex e estavel e distingue tokens · token global correto passa quando a tabela de tenants esta vazia · token global correto passa mesmo com hashes de tenant presentes … |
| `tests-e2e/xbz-network-panel.spec.ts` | 12 | Painel de rede XBZ · amostra insuficiente mantém estado neutro de coleta · economia abaixo do mínimo dispara o alerta automático · economia entre o mínimo e a meta exibe atenção sem alerta … |
| `src/components/accessibility/__tests__/reducaoMovimento.test.tsx` | 11 | o interruptor Reduzir movimento chega no framer-motion · com o app recem-aberto o framer-motion usa o padrao (sem forcar reducao) · ligar o switch no painel muda o app inteiro na hora, sem recarregar · desligar o switch devolve a animacao do sistema … |
| `src/tests/contracts-elite.test.ts` | 11 | NegotiationContract: deve validar payloads reais · NegotiationContract: deve rejeitar cotacoes vazia · WorkflowContract: deve validar ação start_workflow · WorkflowContract: deve exigir entity_type em start_workflow … |
| `supabase/functions/punchout-receive/solicitation.test.ts` | 11 | usa apenas colunas reais de solicitacoes · organization_id vem do perfil, nunca do tenant_id · status respeita solicitacoes_status_check e o guard de escrita · preenche os NOT NULL sem default … |
| `src/components/accessibility/__tests__/painelAcessibilidade.test.tsx` | 10 | o corpo do painel de acessibilidade funciona fora do Sheet · mostra os controles e o botao de restaurar padroes · o switch de fonte para dislexia muda o documento pelo provider · restaurar padroes desliga o que foi ligado no documento … |
| `src/components/compras/approval/__tests__/alcadaListasReais.test.tsx` | 10 | ApprovalRuleModal usa pessoas e categorias reais · oferece profiles.user_id e nomes do banco, sem id ficticio · grava o user_id escolhido no aprovador da regra · sem pessoas visiveis avisa em vez de mostrar lista ficticia … |
| `src/features/layout/__tests__/menuMobile.test.tsx` | 10 | o menu do celular fechado nao fica na ordem de tabulacao · o estado fechado esconde e desliga o ponteiro, nao so desloca o drawer · o drawer fechado sai da arvore de acessibilidade · a solucao nao e tabIndex -1 no container, que nao alcanca os filhos focaveis … |
| `src/hooks/__tests__/useWorkflowDLQ.test.ts` | 10 | useWorkflowDLQ · starts with empty queue · pushToDLQ adds entry and persists to localStorage · hydrates from localStorage on mount … |
| `src/pages/catalogo-xbz/__tests__/xbzNetworkTrend.test.ts` | 10 | pushTrendSample · ignora leituras duplicadas (mesmo total) · reinicia a janela quando os contadores são zerados · respeita o tamanho máximo da janela … |
| `src/pages/recebimento/__tests__/pedidoComplementar.test.ts` | 10 | buildPendingLines · gera uma linha por item com saldo, com a quantidade restante · ignora itens totalmente recebidos · ignora item recebido acima do pedido, sem gerar saldo negativo … |
| `src/tests/integration/contract-validation.test.ts` | 10 | Edge Function Contract Tests · Negotiation Workflow · should pass with valid data · should reject payload without cotacoes … |
| `src/tests/integration/supabase-db.test.ts` | 10 | Supabase: schema versionado nas migrations (sem rede) · as tabelas do fluxo existem em supabase/migrations · approval_workflows declara as colunas esperadas · approval_steps declara as colunas esperadas … |
| `src/components/accessibility/__tests__/skipLinks.test.tsx` | 9 | os links de pular levam a alvos que existem · so oferece conteudo principal e navegacao, sem link morto de busca · todo href de pular aponta para um id que alguma tela declara · cada breakpoint tem exatamente uma navegacao alcancavel … |
| `src/components/compras/__tests__/cotacaoManualCampos.test.tsx` | 9 | CotacaoManualModal entrega os campos que coleta · grava a condicao escolhida por extenso, sem achatar 45 e 60 dias em  · leva validade e observacoes no payload, com o fornecedor do cadastro · nao manda string vazia de validade nem de observacoes … |
| `src/features/auth/__tests__/activeSession.test.ts` | 9 | registerActiveSession (QA 038) · grava o token curto que o trigger sanitize_session_token nao trunca e guarda o id · atualiza a linha existente em vez de criar outra sessao · cria linha nova quando a guardada nao pertence mais ao usuario … |
| `src/hooks/__tests__/useDashboardKPIs.test.tsx` | 9 | useDashboardKPIs — parâmetro da organização · envia organizationId (grupo) como p_organization_id, nunca o tenantId · não chama a RPC sem organização no perfil · useDashboardKPIs — SLA vem da RPC, não de literal … |
| `src/hooks/__tests__/usePagamentos.escrita.test.tsx` | 9 | usePagamentos - escrita negada pelo RLS nao vira sucesso · updatePagamento com 0 linhas afetadas retorna false e nao anuncia sucesso · updatePagamento com a linha gravada continua retornando true · updatePagamento recusa transicao invalida sem tocar o banco … |
| `src/lib/__tests__/exportData.csv.test.ts` | 9 | exportToCSV — números sem formatter · inteiro sai sem casas decimais · inteiro grande usa separador de milhar pt-BR · decimal sai com vírgula e no máximo 2 casas (caso real 67.46268656716418) … |
| `src/lib/__tests__/realtime.test.ts` | 9 | padrao antigo (controle) · supabase.channel com nome fixo quebra na segunda montagem · abrirCanalPostgres · nao reaproveita canal ja inscrito ao montar duas vezes … |
| `src/pages/cotacao/__tests__/cotacaoComparadores.test.ts` | 9 | fetchRegisteredQuotes · usa o mesmo recorte do hook: solicitacao + organizacao do usuario · sem organizacao nao consulta o banco, como o hook desabilitado · unirCotacoesPorId … |
| `src/pages/dashboard/__tests__/ComprasDashboard.vencimento.test.tsx` | 9 | ComprasDashboard — vencimento das urgências · roda no fuso do Brasil (pré-condição do teste) · data_necessidade  · ComprasDashboard — distribuição de SLA … |
| `src/pages/pedidos/__tests__/pedidosEstadosDeCarga.test.tsx` | 9 | Pedidos - falha de carga nao vira lista vazia (QA 250) · mostra o erro da consulta e o botao de nova tentativa no lugar da lista · o botao de nova tentativa chama o refetch do hook · sem erro a lista renderiza normalmente … |
| `supabase/functions/_shared/xbz_catalog_cache.test.ts` | 9 | mapProduto: lê os nomes reais do consultaEstoque · mapProduto: estoque usa QtdDisponivelExibicao quando QtdDisponivel vem 0 · mapProduto: aceita camelCase bruto do mxbzConsultaEstoque e o PascalCase normalizado · mapProduto: aceita a API /clientes/GetListaDeProdutos (cor e quantidade com outros nomes) … |
| `src/components/compras/__tests__/anexosNaoEnviados.test.ts` | 8 | resumoAnexosNaoEnviados · um anexo que falhou sai com nome, quantidade e sem plural · varios anexos somam a quantidade e listam os nomes · sem tenant de upload o motivo e o login, nao o storage … |
| `src/components/compras/__tests__/formulariosRotulos.test.tsx` | 8 | Campos de formulario com nome acessivel (etapa 237) · o modal de cotacao manual associa cada rotulo ao seu campo · nenhum rotulo do modal sobra sem destino · a etapa 1 nomeia os campos, o combobox de produto e o grupo de prioridade … |
| `src/components/compras/__tests__/matrizAlcadaListasReais.test.tsx` | 8 | DynamicApprovalMatrix mostra pessoas e categorias reais · resolve aprovador, escalação e categoria pelos dados do banco · id sem perfil aparece como nao encontrado, nao como uuid cru · categoria ausente e dita removida; regra sem categoria vale para todas … |
| `src/features/cotacoes/hooks/__tests__/useCotacoes.escrita.test.tsx` | 8 | useCotacoes - escrita negada pelo RLS nao vira sucesso · updateCotacao com 0 linhas afetadas retorna false e nao anuncia sucesso · updateCotacao com a linha gravada continua retornando true · deleteCotacao com 0 linhas afetadas retorna false e nao anuncia sucesso … |
| `src/features/layout/__tests__/AppSidebar.ativo.test.ts` | 8 | AppSidebar / isItemActive (AUT-10) · marca o Dashboard em /compras · marca o Dashboard tambem na raiz, antes do redirect · sobrevive ao href antigo  … |
| `src/features/solicitacoes/hooks/__tests__/useSolicitacoes.exclusao.test.tsx` | 8 | useSolicitacoes - exclusao guardada por historico · recusa excluir solicitacao que tem cotacao de fornecedor · recusa excluir solicitacao que so tem historico de aprovacao · erro na contagem cancela a exclusao em vez de apagar … |
| `src/features/solicitacoes/hooks/__tests__/useSolicitacoes.solicitante.test.ts` | 8 | filtro  · a consulta filtra por solicitante_id e nao por status · sem o recorte a consulta nao filtra solicitante_id · status e solicitante coexistem quando os dois vem preenchidos … |
| `src/lib/__tests__/unicidadeCadastro.test.ts` | 8 | unicidadeCadastro (VAL-09) · normaliza CNPJ mascarado para digitos · cita o fornecedor dono do CNPJ quando o nome e conhecido · explica o codigo de centro de custo com e sem o nome do dono … |
| `src/pages/documentos/__tests__/conciliacaoFiscal.test.ts` | 8 | conciliacao de NF-e com pedido · nao casa a nota com pedido de outro fornecedor so porque o valor e igual · deixa sem vinculo quando o valor so existe em pedido de outro fornecedor · nao escolhe quando dois pedidos do mesmo fornecedor tem o mesmo valor … |
| `supabase/functions/escalate-solicitacao/recipients.test.ts` | 8 | gerencia: notifica admin e coordinator do tenant, sem vazar outro tenant · gerencia: o proprio autor da acao nao recebe a notificacao · comprador: usa o comprador do pedido quando existe · comprador: sem pedido cai nos buyers do tenant, ignorando outro tenant … |
| `supabase/functions/scim-v2/conformance.test.ts` | 8 | SCIM POST /Users — 201 with SCIM schema and Location header · SCIM GET /Users/:id — 200 with full User representation · SCIM GET /Users — ListResponse envelope conforms to RFC 7644 §3.4.2 · SCIM PATCH /Users/:id — updates displayName via Operations array … |
| `tests-rls/rls-isolation.test.ts` | 8 | RLS · anon isolation (tabelas críticas) · anon não consegue ler linhas de public.%s · anon não consegue inserir em audit_logs · anon não consegue chamar RPC administrativa count_legacy_storage_urls … |
| `src/features/auth/__tests__/useAuth.test.tsx` | 7 | useAuth · should throw error when used outside AuthProvider · should provide initial loading state · should sign in successfully … |
| `src/features/pedidos/hooks/__tests__/transicaoDeStatus.test.ts` | 7 | transicaoDeStatusPermitida · usa a matriz do banco, sem copia propria · recusa pular etapas do fluxo de compra · aceita o caminho normal do pedido … |
| `src/hooks/__tests__/useApprovalWorkflow.escrita.test.tsx` | 7 | useApprovalWorkflow - escrita negada pelo RLS nao vira sucesso · approveStep com 0 linhas afetadas retorna false e nao comemora · approveStep com linha afetada registra a aprovacao · rejectStep com 0 linhas afetadas retorna false e nao comemora … |
| `src/lib/__tests__/storageFiles.test.ts` | 7 | storageFiles · monta o caminho {tenant}/{usuário}/... exigido pelas policies · aceita o caminho salvo (formato atual) · extrai o caminho da URL pública antiga do mesmo bucket … |
| `src/pages/historico/__tests__/historicoColors.test.ts` | 7 | COLORS · is an array · has 5 color entries · every entry is a non-empty string … |
| `supabase/functions/_shared/security.timing.test.ts` | 7 | timingSafeEqualStr: iguais, diferentes e comprimentos distintos · verifyCronSecret aceita so o CRON_SECRET exato · verifyCronSecret sem CRON_SECRET aceita a service role key exata · verifyCronSecret sem nenhum segredo configurado e fail-closed … |
| `supabase/functions/receive-os-sync/create-solicitacao.test.ts` | 7 | a entrega nao manda numero: quem gera e o trigger do banco · numero em colisao e retentado: a entrega nao morre em 500 · reenvio idempotente devolve a solicitacao existente sem inserir de novo · erro que nao e colisao sobe na primeira tentativa … |
| `src/components/compras/__tests__/contractFornecedorId.test.tsx` | 6 | ContractModal grava o fornecedor do cadastro · oferece so os fornecedores ativos, com id real e sem sufixo de status · sem fornecedor escolhido nao salva e avisa · salva supplier_id com o id do cadastro e supplier_name como copia congelada … |
| `src/components/compras/__tests__/formulariosRotulos2.test.tsx` | 6 | Campos de formulario com nome acessivel (etapa 238) · o modal de rejeicao associa o rotulo ao motivo · o modal de detalhes associa o rotulo ao comentario · o cadastro de fornecedor nomeia os campos, inclusive os dois selects e os ramos … |
| `src/components/compras/__tests__/kanbanEntregaBloqueada.test.tsx` | 6 | KanbanBoard — entrega só pelo Recebimento · não grava nada quando o card é arrastado para a coluna de entrega · marca a coluna como somente leitura na interface · continua gravando nas outras colunas … |
| `src/components/compras/__tests__/pendingApprovalsEstados.test.tsx` | 6 | PendingApprovalsList - falha e carga nao viram  · mostra o erro da consulta em vez de  · o botao de nova tentativa refaz as duas buscas da tela · enquanto carrega, nao afirma que nao ha nada pendente … |
| `src/components/pedidos/__tests__/pedidoMobileCardA11y.test.tsx` | 6 | PedidoMobileCard - cartao acessivel pelo teclado (etapa 235) · o cartao expoe papel de botao, nome e entra na tabulacao · Enter abre os detalhes · espaco abre os detalhes … |
| `src/features/auth/__tests__/ProtectedRoute.test.tsx` | 6 | ProtectedRoute · renderiza o conteudo quando o papel tem permissao · mostra acesso restrito em vez de redirecionar silenciosamente · redireciona para o login quando nao ha sessao … |
| `src/features/pedidos/hooks/__tests__/usePedidos.escrita.test.tsx` | 6 | usePedidos - escrita negada pelo RLS nao vira sucesso · updatePedido com 0 linhas afetadas retorna false e nao comemora · updatePedido com linha afetada continua atualizando · bulkUpdateStatus sem nenhuma linha afetada falha e explica … |
| `src/features/pedidos/hooks/__tests__/usePedidos.exclusao.test.tsx` | 6 | usePedidos - exclusao so em pedido pendente ou cancelado · bulkDelete manda o filtro de status junto com os ids · bulkDelete sem nenhuma linha removida falha e explica o motivo · bulkDelete parcial avisa quantos ficaram de fora e nao comemora … |
| `src/hooks/__tests__/useFornecedores.unicidade.test.tsx` | 6 | useFornecedores · createFornecedor (VAL-09) · consulta o CNPJ sem mascara e barra antes do insert quando ja existe · traduz o 23505 de CNPJ quando o conflito vem de outra empresa (RLS esconde) · mantem o cadastro funcionando quando nao ha duplicidade … |
| `src/hooks/__tests__/usePagamentos.exclusao.test.tsx` | 6 | usePagamentos - exclusao guardada pelo historico · recusa excluir pagamento que tem historico de alteracao · bulkDelete exclui so os pagamentos sem historico e avisa · bulkDelete com todo o lote com historico nao apaga nada … |
| `src/hooks/__tests__/useXbzIntegration.cache.test.tsx` | 6 | useXbzIntegration — coalescing e cache · coalesce chamadas idempotentes concorrentes em uma única requisição · serve tabelas estáticas do cache na segunda chamada · não cacheia nem coalesce ações de escrita … |
| `src/pages/acompanhamento/__tests__/acompanhamentoA11y.test.tsx` | 6 | Acompanhamento - filtros de SLA acessiveis pelo teclado (etapa 234) · cartao filtravel expoe papel de botao, nome e estado inicial do filtro · Enter aplica o filtro e espaco limpa de volta · cartoes que nao filtram continuam sem papel de botao … |
| `src/pages/acompanhamento/__tests__/acompanhamentoEstados.test.tsx` | 6 | Acompanhamento - falha de carga nao vira pipeline vazio nem KPI zerado (QA 252) · mostra o erro da consulta de pedidos e um botao de nova tentativa · o botao de nova tentativa refaz a busca · erro só nas tabelas de apoio (fornecedores) tambem nao passa por lista vazia … |
| `src/pages/auth/__tests__/Auth.novaSenha.test.tsx` | 6 | Auth: recuperacao de senha (etapa 035 / AUT-03) · sem email digitado, nao dispara o link e explica o que falta · com email digitado, envia o link apontando para a rota de nova senha · link expirado ou invalido avisa em vez de mostrar o formulario … |
| `src/pages/catalogo-xbz/__tests__/xbzNetworkHealth.test.ts` | 6 | evaluateXbzNetworkHealth · permanece neutro sem amostra suficiente · sinaliza crítico abaixo do mínimo · sinaliza atenção entre mínimo e meta … |
| `src/pages/catalogo-xbz/__tests__/xbzPortador.test.ts` | 6 | portador — CPF · valida pelo dígito verificador e rejeita sequências repetidas · formata e extrai dígitos · portador — placa … |
| `src/pages/catalogo-xbz/__tests__/xbzProdutoView.test.ts` | 6 | produtoView · lê os campos reais da API (IdProduto, CodigoXbz, PrecoVenda, CorPredominante, ImageLink) · usa QtdDisponivelExibicao ( · item sem IdProduto vira id 0 (botão  … |
| `src/pages/estoque/__tests__/gestaoEstoqueFiltros.test.tsx` | 6 | GestaoEstoque - Filtros Avancados deixam de ser botao morto (QA 253) · o botao abre o dialogo de filtros · as localizacoes do filtro saem dos itens reais do estoque · filtrar por localizacao reduz a tabela ao item daquela localizacao … |
| `src/pages/historico/__tests__/historicoHelpers.test.ts` | 6 | COLORS · has 5 color values · all values are non-empty strings · first color uses CSS variable primary … |
| `src/pages/solicitacoes/__tests__/solicitacoesEstadosDeCarga.test.tsx` | 6 | Solicitacoes - falha de carga nao vira lista vazia (QA 250) · mostra o erro da consulta no lugar do  · o botao de nova tentativa chama o refetch do hook · pede a pagina ao hook, em vez de aceitar a fatia padrao … |
| `supabase/functions/_shared/xbz_pedido_map.test.ts` | 6 | mapPedido: lê os nomes reais do consultaPedidos (80 campos) · mapPedido:  · mapPedido: sem pedidoNumero usa o prefixo de  · mapPedido: nota fiscal e transportadora quando preenchidas … |
| `supabase/functions/process-invoice-idp/extraction.test.ts` | 6 | normaliza numeros e datas do formato brasileiro · nao inventa campo ausente e reporta no campos_ausentes · chave de acesso incompleta vira null em vez de zero-padded · identifica campos obrigatorios faltantes … |
| `supabase/functions/punchout-receive/session.test.ts` | 6 | sessao recem-criada nao expira · sessao dentro do TTL nao expira · sessao mais velha que o TTL expira · limite exato do TTL ainda e valido … |
| `tests-e2e/production-ready.spec.ts` | 6 | Freight Quest Production Readiness · Public Access - Auth Redirection · Main Layout Components · Navigation to Support/Documentation if available … |
| `scripts/lib/psql-leitura.test.mjs` | 5 | montarAmbientePsql: loopback vira PG* com a senha decodificada e sem TLS forçado · montarAmbientePsql: projeto oficial (host direto e pooler) exige verify-full com a CA pinada · montarAmbientePsql: recusa outro projeto, host desconhecido e URL inválida — sem credencial na mensagem · criarMascara: tira a senha crua e a url-encoded; senha vazia não mascara nada … |
| `src/components/compras/__tests__/contratoAbasItensDocs.test.tsx` | 5 | ContractDetailsModal - abas Itens e Docs (etapa 292) · todo gatilho de aba tem um conteudo correspondente · lista os itens do contrato e as ordens de compra vinculadas · lista os documentos e expoe o input de anexo … |
| `src/components/compras/__tests__/contratoCamposRotulos.test.tsx` | 5 | ContractModal - nome acessivel dos campos (etapa 239) · associa os 3 rotulos de select ao gatilho certo · associa as duas janelas de data ao botao que as abre · todo label[for] do modal aponta para um elemento existente … |
| `src/features/layout/__tests__/AppSidebar.a11y.test.tsx` | 5 | AppSidebar acessibilidade (UX-04 1/4) · sidebar recolhida: os links de modulo continuam com nome acessivel · sidebar recolhida: os dois controles do rodape tem nome · sidebar expandida: o nome visivel continua sendo o nome acessivel, sem aria-label … |
| `src/features/layout/components/__tests__/CommandPalette.atalhos.test.tsx` | 5 | CommandPalette: atalhos e badges (etapa 044) · nao anuncia nenhum atalho ausente do registry de teclado · exibe a combinacao real do registry em cada item · le os badges do hook de contagens vivas, nao de literais … |
| `src/features/pedidos/hooks/__tests__/usePedidos.checklist.test.tsx` | 5 | usePedidos - exclusao guardada por checklist de recebimento · recusa excluir pedido com checklist de recebimento · bulkDelete recusa o lote inteiro quando algum pedido tem checklist · erro na contagem de checklist cancela a exclusao … |
| `src/features/solicitacoes/hooks/__tests__/useNomesDeGestor.test.tsx` | 5 | useNomesDeGestor · resolve o nome do perfil por profiles.user_id · cai no e-mail quando o perfil nao tem nome nem display_name · deduplica ids, descarta vazio e nao consulta sem id … |
| `src/hooks/__tests__/useApprovalHistory.test.ts` | 5 | useApprovalHistory · fetchHistory returns sorted history for a workflow · fetchHistory returns [] on error · fetchAllHistory populates allHistory state … |
| `src/hooks/__tests__/usePagamentos.bulkStatus.test.tsx` | 5 | usePagamentos · bulkUpdateStatus (UI-01) · nao agenda pagamento pendente: recusa o lote e nao grava nada · agenda apenas os aprovados e reporta os bloqueados · grava a data escolhida quando o agendamento tem data … |
| `src/hooks/__tests__/useWebAuthn.sessao.test.tsx` | 5 | useWebAuthn / authenticateWithPasskey (SEC-11) · nao anuncia sucesso quando o servidor nao devolve actionLink · nao anuncia sucesso quando o OTP falha · nao anuncia sucesso quando o OTP passa mas nao ha sessao … |
| `src/i18n/__tests__/config.test.ts` | 5 | i18n mantem o atributo lang do documento igual ao idioma ativo · o atributo nao fica no pt-BR fixo do index.html: ele segue o idioma resolvido · cada idioma suportado vira a tag BCP-47 correspondente no documento · idioma fora da lista ou ausente cai no pt-BR, nunca em tag invalida … |
| `src/lib/__tests__/pushHandler.test.ts` | 5 | service worker de push · registra listener do evento push · exibe a notificacao com titulo vindo do payload da edge · abre a acao no clique e respeita action_url … |
| `src/pages/acompanhamento/__tests__/statusKanban.test.ts` | 5 | avaliarAlteracaoStatusKanban · bloqueia a entrega feita pelo Kanban · traduz as colunas válidas para o status do banco · recusa transição que o banco rejeitaria, com mensagem de negócio … |
| `src/pages/auth/__tests__/Auth.destino.test.tsx` | 5 | Auth: destino pos-login (etapa 043 / AUT-08) · volta para a rota que o ProtectedRoute registrou, com a query string · sem origem registrada cai na raiz, que o AppRoutes manda para /compras · recusa origem protocol-relative (//evil.com) e cai na raiz … |
| `src/pages/documentos/__tests__/documentosFiscaisEstados.test.tsx` | 5 | DocumentosFiscais - falha e carga nao viram  · mostra o erro da consulta e um botao de nova tentativa · o botao de nova tentativa refaz a busca da lista · com a consulta em curso, mostra carregando e nao zera os contadores … |
| `src/pages/pagamentos/__tests__/pagamentosA11y.test.tsx` | 5 | Pagamentos - detalhe do pagamento acessivel pelo teclado (etapa 235) · a linha ganha um controle nomeado, focavel e nativo (Enter/espaco sao do navegador) · o acionamento do controle abre o detalhe do pagamento · o clique no controle abre o detalhe uma unica vez … |
| `src/pages/pagamentos/__tests__/pagamentosStatusBanco.test.tsx` | 5 | Pagamentos - os 7 status do CHECK aparecem na tela (J7-16 e J7-17) · pagamento  · pagamento  · a aba CANCELADOS lista o pagamento cancelado com o badge CANCELADO … |
| `src/pages/portal-fornecedor/__tests__/PortalFornecedor.convite.test.tsx` | 5 | PortalFornecedor: convite de fornecedor (etapa 039 / SEC-06) · mantem o convite desabilitado e explica o motivo · nao chama signInWithOtp, entao nao cria usuario no GoTrue · quando o convite for liberado, mantem shouldCreateUser: false e nao cria usuario novo … |
| `src/pages/recebimento/__tests__/recebimentoOfflineA11y.test.tsx` | 5 | RecebimentoOffline - selecao de pedido acessivel por teclado · seleciona o pedido no clique · seleciona o pedido com Enter · seleciona o pedido com a barra de espaco … |
| `src/tests/integration/contract-testing.test.ts` | 5 | Edge Function Contract Validation · should validate a correct negotiation payload · should reject negotiation payload without cotacoes · should reject solicitacao with a malformed UUID … |
| `supabase/functions/_shared/xbz_date_tz.test.ts` | 5 | parseXbzDate: sem offset -> UTC, em qualquer fuso do runtime · parseXbzDate: valor COM offset e respeitado como veio · parseXbzDate: sentinela, vazio e lixo continuam null · parsePagamentoLabel: determinístico e por ano … |
| `supabase/functions/_shared/xbz_fiscal_cache.test.ts` | 5 | fiscal: mapeia os campos reais do getSt · fiscal: aceita camelCase e numero em string pt-BR · fiscal: nao grava linha sem conteudo fiscal nem sem produto/tenant · cores: normaliza, deduplica por id e descarta invalidas … |
| `supabase/functions/_shared/xbz_portador.test.ts` | 5 | cpfValido: dígito verificador e sequências repetidas · placaValida: antiga (ABC1234) e Mercosul (ABC1D23), normalizada · montarPortador: normaliza para o formato da XBZ · montarPortador: rejeita nome curto, CPF e placa inválidos … |
| `supabase/functions/check-approval-escalations/index.test.ts` | 5 | nenhum status em portugues e usado como filtro ou como valor gravado · o filtro de passos vencidos usa pending · o guarda do workflow usa pending · todo status gravado pertence aos CHECK de approval_steps/approval_workflows … |
| `tests-e2e/auth-navigation.spec.ts` | 5 | Fluxos Críticos de Autenticação e Navegação · Deve redirecionar para /auth ao tentar acessar rota protegida sem login · Fluxo de Login: formulário e submissão · Navegação entre páginas principais (Protegidas) … |
| `src/components/compras/__tests__/PipelineChart.test.tsx` | 4 | PipelineChart · should render correct values for each stage · should calculate conversion rates correctly · should display narrative summary |
| `src/components/compras/__tests__/TrendAnalysisCharts.test.tsx` | 4 | TrendAnalysisCharts — título acompanha o período · usa o rótulo do período recebido · sem período:  · Card de volume — textos batem com o período |
| `src/components/compras/__tests__/enhancedBulkActionsA11y.test.tsx` | 4 | EnhancedBulkActionsBar - nome acess\u00edvel das a\u00e7\u00f5es · nomeia o gatilho s\u00f3-\u00edcone do menu de a\u00e7\u00f5es da sele\u00e7\u00e3o · nomeia o gatilho s\u00f3-\u00edcone que expande e recolhe a pr\u00e9via · n\u00e3o deixa nenhum bot\u00e3o da barra sem nome acess\u00edvel |
| `src/components/compras/__tests__/pendingApprovalsHistorico.test.tsx` | 4 | PendingApprovalsList -  · mostra os eventos do workflow da aprovacao, nao os de outro workflow · lista os eventos mais recentes primeiro · sem eventos, diz que nao ha historico em vez de abrir um dialogo vazio |
| `src/components/compras/__tests__/solicitacaoCardA11y.test.tsx` | 4 | SolicitacaoCard - nome acess\u00edvel dos controles · nomeia o gatilho s\u00f3-\u00edcone do fluxo de aprova\u00e7\u00e3o · mant\u00e9m o r\u00f3tulo textual do gatilho de contexto · n\u00e3o deixa nenhum bot\u00e3o do cart\u00e3o sem nome acess\u00edvel |
| `src/components/compras/__tests__/sourcingIntelligenceBanner.test.tsx` | 4 | SourcingIntelligenceBanner - LISTAR/CONECTAR deixa de ser botao morto (QA 253) · o CONECTAR leva o comprador a tela de catalogo de produtos · o LISTAR tambem navega quando o produto ja tem parceiros · sem produto vinculado, o bloco explica o vazio em vez de so mostrar o cabecalho |
| `src/components/compras/contract/__tests__/replaceContractItems.test.ts` | 4 | replaceContractItems · insere os novos antes de apagar e preserva os recém-inseridos · não apaga os itens antigos quando o insert falha · sem itens novos apaga todos os itens do contrato |
| `src/features/layout/components/chat/__tests__/chatAreaA11y.test.tsx` | 4 | ChatArea - nome acess\u00edvel dos controles s\u00f3-\u00edcone · nomeia as a\u00e7\u00f5es do cabe\u00e7alho do contato · nomeia as a\u00e7\u00f5es do compositor de mensagem · n\u00e3o deixa nenhum bot\u00e3o do chat sem nome acess\u00edvel |
| `src/features/pedidos/__tests__/exclusaoPedido.test.ts` | 4 | regra de exclusao de pedido · libera so o que ainda nao entrou no ciclo de recebimento · bloqueia a selecao inteira quando um pedido em andamento esta junto · a mensagem de exclusao parcial diz quantos sobraram e por que |
| `src/features/solicitacoes/hooks/__tests__/useSolicitacoes.rls.test.tsx` | 4 | useSolicitacoes — escrita negada pelo RLS · updateSolicitacao com 0 linhas afetadas retorna false e mostra erro · bulkUpdateStatus e bulkDelete com 0 linhas afetadas retornam false · updateSolicitacao com linha afetada continua retornando true |
| `src/hooks/__tests__/useApprovalWorkflow.alcadaFonteUnica.test.tsx` | 4 | useApprovalWorkflow · escolha de alcada (NEG-15) · usa a regra devolvida pela RPC quando ela e da empresa do usuario · ignora id devolvido pela RPC que nao esta na lista da empresa do usuario · nao escolhe regra por conta propria quando a RPC nao devolve nada |
| `src/hooks/__tests__/useDevolucoes.exclusao.test.tsx` | 4 | guarda de exclusao de devolucao · recusa excluir devolucao que ja gerou credito · recusa excluir devolucao marcada como credito_emitido mesmo sem contagem · exclui devolucao sem credito |
| `src/hooks/__tests__/useFornecedores.exclusao.test.tsx` | 4 | guarda de exclusao de fornecedor · recusa excluir fornecedor que tem credito de fornecedor · recusa excluir fornecedor com pagamento ou pedido e lista tudo o que bloqueia · exclui quando nao ha nenhum dependente |
| `src/hooks/__tests__/usePasswordResetRequests.sendLink.test.tsx` | 4 | usePasswordResetRequests: link nativo no lugar do token morto (etapa 036 / SEC-04) · envia o link do Supabase e marca o pedido como atendido, sem gravar reset_token · quando o GoTrue recusa, o pedido nao e marcado como atendido · o hook nao volta a gerar credencial propria (reset_token / randomUUID) |
| `src/hooks/__tests__/usePermissions.test.tsx` | 4 | usePermissions · should return default permissions for admin · should check user permissions correctly for non-admin · should return false if no role is present |
| `src/pages/catalogo-spot/__tests__/useSpotCatalog.search.test.tsx` | 4 | useSpotProducts / filtro de busca (SEC-10) · busca comum sai com o termo literal nas duas colunas · nao deixa  · busca em branco nao acrescenta clausula |
| `src/pages/catalogo-xbz/__tests__/xbzBusca.test.ts` | 4 | normalizeBusca / isBuscaValida · não substitui termo vazio pelo antigo hack  · apara espaços e limita a 100 caracteres · exige ao menos ${XBZ_BUSCA_MIN} caracteres após aparar |
| `src/pages/configuracoes/__tests__/centroCustoUnicidade.test.tsx` | 4 | ConfiguracoesCentroCusto · codigo unico (VAL-09) · barra o codigo ja usado e diz qual centro de custo o usa · traduz o 23505 quando o codigo existe em outra empresa · cria o centro de custo quando o codigo esta livre |
| `src/pages/pedidos/__tests__/exclusaoBloqueada.test.tsx` | 4 | acao de excluir na lista de pedidos · some quando o pedido selecionado ja entrou no ciclo de recebimento · continua disponivel para pedido pendente · some na selecao mista de pendente com entregue |
| `src/pages/pedidos/__tests__/pedidosA11y.test.tsx` | 4 | Pedidos - a\u00e7\u00e3o de linha acess\u00edvel por teclado · nomeia o bot\u00e3o s\u00f3-\u00edcone da linha com o pedido que ele abre · abre o detalhe do pedido ao clicar no bot\u00e3o da linha · preserva o clique na linha inteira para quem usa mouse |
| `src/pages/pedidos/__tests__/pedidosExportacao.test.ts` | 4 | exportacao de pedidos · usa o conjunto canonico de colunas em vez de lista vazia · o objeto exportado declara todas as chaves de pedidoColumns · nao anuncia sucesso quando nao ha pedido para exportar |
| `src/tests/contracts.test.ts` | 4 | NegotiationContract should validate correct payloads · NegotiationContract should reject invalid UUIDs · NegotiationContract should reject empty cotacoes · NegotiationContract should reject payload without solicitacao |
| `supabase/functions/_shared/cors-allowlist.test.ts` | 4 | sem ALLOWED_ORIGINS (dev/preview) libera qualquer origem · ALLOWED_ORIGINS exata: origem da lista passa, outra e bloqueada · curinga *.dominio casa subdominio e NAO casa sufixo sem o ponto · curinga nao casa o dominio raiz nem origem invalida |
| `supabase/functions/_shared/notifications.test.ts` | 4 | insertNotification resolve tenant por user_id, nao pela PK · insertNotification nao consulta profiles quando tenant_id vem na origem · insertNotification devolve sem_tenant quando o perfil nao tem tenant · insertNotificationsBatch resolve tenants por user_id |
| `supabase/functions/_shared/validation.error_response.test.ts` | 4 | errorResponse:  · errorResponse:  · errorResponse: unauthorized e sessao invalida virem 401 · errorResponse: demais categorias seguem iguais |
| `tests-e2e/critical-flows.spec.ts` | 4 | Freight Quest - Fluxos de Negócio · Processo de Compras e Dashboard · Validação de Contratos e Compliance · Resiliência da UI em Erros de Rede |
| `tests-e2e/dashboard-ui.spec.ts` | 4 | Dashboard & Compras Interface · Dashboard e widgets renderizam na rota raiz · System Theme Toggle · Mobile Responsiveness Check |
| `tests-e2e/workflow-advanced.spec.ts` | 4 | Advanced Workflow & Security Tests · Multi-step Solicitation Flow (abre o formulario, sem gravar) · Responsiveness & Mobile Viewport · Performance Gate: Dashboard Loading |
| `src/components/admin/telemetry/__tests__/SystemAlertsView.resolve.test.tsx` | 3 | resolver alerta de telemetria · resolve pelo RPC resolve_alert e nao por UPDATE direto na tabela · mostra o motivo real quando o RPC recusa (alerta ja resolvido) |
| `src/components/compras/__tests__/pendingApprovalsA11y.test.tsx` | 3 | PendingApprovalsList acessibilidade (UX-04 1/4) · o menu de acoes de cada aprovacao tem nome acessivel · nao sobra botao so-icone sem nome no cartao da aprovacao |
| `src/components/security/__tests__/PasskeyManager.pendente.test.tsx` | 3 | PasskeyManager / anuncio honesto (SEC-11) · nao promete login por biometria enquanto o servidor recusa · botao Adicionar Passkey fica desabilitado |
| `src/features/pedidos/hooks/__tests__/usePedidos.ordemDeAprovada.test.tsx` | 3 | usePedidos · ordem de compra so com solicitacao aprovada (NEG-06) · nao cria a ordem quando a solicitacao nao esta aprovada · cria a ordem quando a solicitacao esta aprovada |
| `src/features/solicitacoes/hooks/__tests__/useSolicitacoes.autoAprovacao.test.tsx` | 3 | createSolicitacao com auto aprovacao do banco · nao cria workflow quando o banco devolve a solicitacao ja aprovada · cria o workflow quando o banco devolve a solicitacao pendente |
| `src/features/solicitacoes/hooks/__tests__/useSolicitacoes.test.tsx` | 3 | useSolicitacoes Hook · should initialize with default states · should handle creation workflow |
| `src/hooks/__tests__/useApprovalWorkflow.escalation.test.tsx` | 3 | useApprovalWorkflow · checkEscalations (HK-04) · grava organization_id na etapa do aprovador escalado · nao cria etapa quando outro navegador ja escalou o mesmo workflow |
| `src/hooks/__tests__/useDevolucoes.credito.test.tsx` | 3 | useDevolucoes · credito do fornecedor (NEG-12) · nao deixa a devolucao em credito_emitido quando o credito nao grava · grava o credito com o valor da devolucao e so entao avisa sucesso |
| `src/hooks/__tests__/useImageCompression.test.ts` | 3 | useAutoImageCompression · should process image files when input changes · should ignore non-image files |
| `src/hooks/__tests__/useLicitacoes.createEvent.test.tsx` | 3 | useSourcingEvents.createEvent (VAL-01) · grava numero sequencial e owner_id junto do evento · usa fallback com prefixo SRC quando o RPC nao devolve numero |
| `src/hooks/__tests__/usePrefetch.solicitacoes.test.tsx` | 3 | usePrefetch · solicitacoes (HK-01) · preenche a chave que a listagem consome, com o formato { data, totalCount } · nao grava mais a chave curta de 13 posicoes |
| `src/hooks/__tests__/useRealPushNotifications.test.tsx` | 3 | useRealPushNotifications — aviso honesto de push (etapa 288) · sem VITE_VAPID_PUBLIC_KEY nao anuncia sucesso · com a chave publica e inscricao existente anuncia sucesso |
| `src/hooks/__tests__/useRealtimeSubscription.channel.test.tsx` | 3 | useRealtimeSubscription (HK-02) · nao reinscreve o canal quando o consumidor repassa um array novo com o mesmo conteudo · reinscreve quando a lista de tabelas muda de verdade |
| `src/hooks/__tests__/useSecurityLogs.terminateOthers.test.tsx` | 3 | terminateOtherSessions (QA 037) · revoga as outras sessoes no GoTrue e preserva a linha deste dispositivo · apaga todas as linhas do usuario quando este navegador nao tem registro |
| `src/hooks/__tests__/useSpotIntegration.checkout.test.tsx` | 3 | useSpotIntegration — checkout · chama spot-proxy com action=checkout e devolve o contrato tipado · propaga o erro da edge e não devolve info de checkout |
| `src/pages/admin/__tests__/FiscalDashboard.kpis.test.tsx` | 3 | KPIs do painel fiscal derivados de fiscal_events · mostra ausencia de dados sem inventar SEFAZ online nem latencia fixa · calcula autorizadas, pendentes, erros e latencia media real |
| `src/pages/admin/__tests__/HealthDashboard.test.tsx` | 3 | contratos do dashboard de saude · preserva dias no pivot e trata campos nullable/JSON sem conversoes ocultas · mostra alerta sem data no periodo completo e o exclui de periodo recente |
| `src/pages/admin/__tests__/SourcingPipeline.kpis.test.tsx` | 3 | KPIs do Sourcing Pipeline derivados do banco · nao exibe numeros fixos quando nao ha projeto · agrega estimated_spend dos projetos ativos ignorando concluidos |
| `src/pages/catalogo-xbz/__tests__/xbzPagamento.test.ts` | 3 | pagamentoStatusPedido · usa o boolean  · cai no idLoteDebitoStatus (0 pendente, 2/3 pago) quando  |
| `src/pages/historico/__tests__/HistoricoCompras.limparFiltros.test.tsx` | 3 | HistoricoCompras - Limpar filtros · descreve o filtro de busca ativo (o botao deixa de responder  · nao inventa filtro ativo quando tudo esta no padrao |
| `src/pages/pagamentos/__tests__/pagamentosAgendamentoData.test.tsx` | 3 | Pagamentos - agendamento grava a data escolhida (UI-12) · a data do calendario chega ao bulkUpdateStatus junto com o status agendado · a linha do pagamento agendado mostra a data gravada, nao so o rotulo |
| `src/pages/relatorio-negociacoes/__tests__/useRelatorioNegociacoes.test.tsx` | 3 | contratos do relatorio de negociacoes · consulta somente colunas existentes de profiles e inclui score_total na media · usa email quando full_name e nulo e Usuario quando perfil nao existe |
| `supabase/functions/_shared/cors-sem-constante.test.ts` | 3 | nenhuma edge importa a constante corsHeaders · as edges que respondem OPTIONS derivam o cors da requisicao · o teste cobre o diretorio de functions de verdade |
| `supabase/functions/erp-sync/idempotencia-escopo.test.ts` | 3 | erp-sync escopa a chave de idempotencia por usuario · erp-sync le e grava o cache sempre com o source escopado · erp-sync autentica antes de consultar o cache |
| `tests-e2e/elite-validation.spec.ts` | 3 | Freight Quest E2E Excellence · Fluxo Crítico: Login e Navegação Segura · Consistência de Dados: Painel Administrativo de Telemetria |
| `src/hooks/__tests__/useFornecedores.organization.test.tsx` | 2 | useFornecedores · createFornecedor (VAL-12) · grava organization_id com o id da ORGANIZACAO, nao o do tenant |
| `src/pages/historico/__tests__/HistoricoCompras.consoleTab.test.tsx` | 2 | HistoricoCompras - aba Console de Sourcing · monta o SourcingHistoryConsole quando a aba e selecionada |
| `src/tests/security/rls-tenant-isolation-restrictive.test.ts` | 2 | RLS · tenant_isolation_* é RESTRICTIVE (papel não pode ser furado por OR) · tenant_isolation_%s: última definição é AS RESTRICTIVE |
| `supabase/functions/_shared/idempotency.test.ts` | 2 | getIdempotentResponse so faz replay de operacao processada · withIdempotency continua registrando a falha para analise |
| `supabase/functions/_shared/logger-escopo.test.ts` | 2 | QA 069 ${edge} declara o logger antes do try · QA 069 ${edge} nao esconde o logger atras de typeof |
| `supabase/functions/_shared/validation.log_body.test.ts` | 2 | validateBody: corpo invalido nao vaza os valores para o log · validateBody: JSON malformado loga a causa e mantem a mensagem |
| `supabase/functions/punchout-receive/idempotencia-antes-da-autorizacao.test.ts` | 2 | punchout-receive consulta o cache depois de validar sessao e shared secret · punchout-receive mantem o proprio source de idempotencia |
| `supabase/functions/punchout-setup/seguranca.test.ts` | 2 | punchout-setup autentica antes de consultar o cache de idempotencia · punchout-setup escopa a chave de idempotencia por usuario |
| `supabase/functions/tests/fuzzing_suite.ts` | 1 | Fuzzing Suite: Global Edge Function Integrity |

## L. Eventos de webhook tratados (contratos com sistemas externos)

| Evento | Arquivo |
|---|---|
| `string` | `supabase/functions/receive-os-sync/index.ts` |

## M. Efeitos colaterais (e-mail, SMS, cobrança, fila — não são idempotentes por padrão)

| Chamada | Arquivo |
|---|---|
| `invoke(` | `src/components/compras/ContractDetailsModal.tsx` |
| `invoke(` | `src/components/compras/DemandPredictionPanel.tsx` |
| `invoke(` | `src/components/compras/NovaSolicitacaoModal.tsx` |
| `invoke(` | `src/components/compras/SupplierRiskAnalysis.tsx` |
| `invoke(` | `src/components/compras/dashboard/UrgencyDetailsSheet.tsx` |
| `invoke(` | `src/components/notifications/NotificationSettingsPanel.tsx` |
| `sendNotification` | `src/hooks/useApprovalNotifications.ts` |
| `invoke(` | `src/hooks/useSpotIntegration.ts` |
| `invoke(` | `src/hooks/useWebAuthn.ts` |
| `invoke(` | `src/lib/logger.ts` |
| `slack.com` | `src/pages/admin/AlertSubscriptionsPanel.tsx` |
| `invoke(` | `src/pages/admin/DependencyHealth.tsx` |
| `invoke(` | `src/pages/admin/DeveloperDocs.tsx` |
| `invoke(` | `src/pages/admin/ERPConnections.tsx` |
| `invoke(` | `src/pages/admin/PunchOutCatalogs.tsx` |
| `invoke(` | `src/pages/admin/StorageMigration.tsx` |
| `invoke(` | `src/pages/admin-telemetria/AdminTelemetria.tsx` |
| `invoke(` | `src/pages/catalogo-spot/useSpotCatalog.ts` |
| `invoke(` | `src/pages/negociacao-ia/NegociacaoIA.tsx` |
| `invoke(` | `src/services/rlsAuditService.ts` |
| `sendEmail` | `supabase/functions/alert-dispatcher/index.ts` |
| `notify` | `supabase/functions/send-push-notification/index.ts` |
| `sendPush` | `supabase/functions/send-push-notification/index.ts` |

## N. Regras citadas em comentários do código

| Comentário | Arquivo |
|---|---|
| Quality Gate nao pode ficar vermelho em toda PR. `^_` marca descarte intencional. | `eslint.config.js` |
| Forms & validation | `vite.config.ts` |
| ficavam invisíveis: "2024-06-15" exibido como 14/06 e "hoje" recusado no prazo | `vitest.config.ts` |
| Numeric validation: reject empty/NaN; reject decimals on integer fields | `src/components/compras/CotacaoManualModal.tsx` |
| Check solicitacoes near deadline | `src/components/compras/CriticalAlertsBar.tsx` |
| checagem a regra nascia com aprovador em branco e o insert em | `src/components/compras/DynamicApprovalMatrix.tsx` |
| * Status (de UI) cujas colunas apenas exibem cards: arrastar para elas não grava nada. | `src/components/compras/KanbanBoard.tsx` |
| * A solicitacao ja foi gravada e isso continua verdade: o aviso fala apenas dos | `src/components/compras/NovaSolicitacaoModal.tsx` |
| Anexo que nao sobe nao pode passar em silencio: antes o erro ia so para o | `src/components/compras/NovaSolicitacaoModal.tsx` |
| * Mostra apenas interacoes registradas de verdade (follow-up do agendador em | `src/components/compras/SupplierInteractionLog.tsx` |
| RLS filtra a linha em silêncio (0 linhas, sem erro) quando o usuário não pode alterá-la. | `src/components/compras/dashboard/UrgencyDetailsSheet.tsx` |
| * Resolves the effective deadline for a pending approval step. | `src/components/compras/pending-approvals/deadlineFallback.ts` |
| 1. `stepPrazoLimite`   — deadline set directly on the step | `src/components/compras/pending-approvals/deadlineFallback.ts` |
| 2. `workflowPrazoLimite` — deadline inherited from the parent workflow | `src/components/compras/pending-approvals/deadlineFallback.ts` |
| Prazo em dias: lead time contratado, prazo cadastrado ou media cotada. */ | `src/components/compras/price-comparator/priceComparatorHelpers.ts` |
| Prazo medio de entrega cadastrado no fornecedor. */ | `src/components/compras/price-comparator/priceComparatorHelpers.ts` |
| Conformidade de prazo ainda nao e coletada por este fluxo. */ | `src/components/compras/price-comparator/priceComparatorHelpers.ts` |
| Media apenas das cotacoes com preco conhecido. */ | `src/components/compras/price-comparator/priceComparatorHelpers.ts` |
| * Monta a comparacao de precos usando somente dado existente: preco contratado | `src/components/compras/price-comparator/priceComparatorHelpers.ts` |
| Entregues no prazo / entregues (null sem entrega registrada). */ | `src/components/compras/sla-analysis/slaAnalysisData.ts` |
| Entregues no prazo / pedidos com previsao ja vencida (null sem amostra). */ | `src/components/compras/sla-analysis/slaAnalysisData.ts` |
| Media de dias entre emissao e entrega; cai para o prazo cadastrado. */ | `src/components/compras/sla-analysis/slaAnalysisData.ts` |
| Conformidade media apenas dos fornecedores com amostra. */ | `src/components/compras/sla-analysis/slaAnalysisData.ts` |
| Permission Section */} | `src/components/notifications/NotificationSettingsPanel.tsx` |
| Vencimento/Pagamento e Valor */} | `src/components/pagamentos/PagamentoMobileCard.tsx` |
| Prazo e Valor */} | `src/components/pedidos/PedidoMobileCard.tsx` |
| Basic IP validation | `src/components/security/BlockedIPsPanel.tsx` |
| Basic IP validation | `src/components/security/IPWhitelistPanel.tsx` |
| Admin bypasses all permission checks | `src/components/security/PermissionGate.tsx` |
| Check single permission | `src/components/security/PermissionGate.tsx` |
| HOC for wrapping components with permission check | `src/components/security/PermissionGate.tsx` |
| Add permission | `src/components/security/PermissionMatrix.tsx` |
| Remove permission | `src/components/security/PermissionMatrix.tsx` |
| Subscribe to realtime rate limit alerts | `src/components/security/RateLimitDashboard.tsx` |
| * Regra de ciclo de vida da exclusao de pedido. | `src/features/pedidos/exclusaoPedido.ts` |
| * Regra única de transição de status de pedido. | `src/features/pedidos/statusTransitions.ts` |
| pedido cancelado seria mudança de regra de negócio e exigiria migration; não é | `src/features/pedidos/statusTransitions.ts` |
| Update status with transition validation | `src/features/pedidos/hooks/usePedidos.ts` |
| Validação de orçamento | `src/features/solicitacoes/hooks/useSolicitacoes.ts` |
| 'aprovada' (hoje por um limite fixo no banco); criar o workflow nesse caso deixa uma | `src/features/solicitacoes/hooks/useSolicitacoes.ts` |
| RLS filtra a linha em silêncio (0 linhas, sem erro) quando o usuário não pode alterá-la. | `src/features/solicitacoes/hooks/useSolicitacoes.ts` |
| * F-023 fix: replaced setInterval deadline-polling with Realtime subscription | `src/hooks/useApprovalNotifications.ts` |
| Business logic lives in focused sub-hooks: | `src/hooks/useApprovalWorkflow.ts` |
| Falha de leitura nao pode virar "nada pendente" (QA 251): os fetches abaixo | `src/hooks/useApprovalWorkflow.ts` |
| Rule/delegation mutations | `src/hooks/useApprovalWorkflow.ts` |
| Entregues no prazo | `src/hooks/useBuyerPerformanceData.ts` |
| null = faixa aberta (sem limite superior) */ | `src/hooks/useCatalogoPim.ts` |
| origem da regra, ex: 'spot_customization' */ | `src/hooks/useCatalogoPim.ts` |
| Baseado em deadline absoluto: imune a throttling de aba em background. | `src/hooks/useCooldown.ts` |
| SLA vem de RPC propria (get_compras_sla_metrics). Falha aqui nao pode | `src/hooks/useDashboardKPIs.ts` |
| Devolucao que ja gerou credito nao pode ser apagada: a FK de | `src/hooks/useDevolucoes.ts` |
| CNPJ validation helper | `src/hooks/useFornecedores.ts` |
| QA-034: geracao de backup codes removida. Era 8 caracteres com apenas 4 de | `src/hooks/useMFA.ts` |
| Check if MFA is required for this session | `src/hooks/useMFA.ts` |
| A RPC ainda não está em `types.ts` (migration própria, regra 8); o cast | `src/hooks/usePermissions.ts` |
| Check if user has specific permission | `src/hooks/usePermissions.ts` |
| * Prefetch keys must match the live query keys used by feature hooks so that | `src/hooks/usePrefetch.ts` |
| Check browser notification permission | `src/hooks/useRealPushNotifications.ts` |
| Devolve true SOMENTE quando ha subscription no navegador E ela foi | `src/hooks/useRealPushNotifications.ts` |
| Request browser notification permission | `src/hooks/useRealPushNotifications.ts` |
| tables MUST be scoped to the active tenant to prevent cross-tenant leakage. | `src/hooks/useRealtimeSubscription.ts` |
| Limit to maxItems | `src/hooks/useRecentlyViewed.ts` |
| Fetch rate limit logs (admin only) | `src/hooks/useSecurityLogs.ts` |
| * Tempo máximo (ms) que o cliente espera pelo `xbz-proxy`. O portal da XBZ é | `src/hooks/useXbzIntegration.ts` |
| * Ações seguras para repetir automaticamente: são somente-leitura na XBZ, logo | `src/hooks/useXbzIntegration.ts` |
| e aplica rate limit por conta. | `src/hooks/useXbzIntegration.ts` |
| uma chamada ao portal e aproximava o rate limit. | `src/hooks/useXbzIntegration.ts` |
| métrica direta de risco de rate limit e de latência percebida. | `src/hooks/useXbzIntegration.ts` |
| * Envolve `callXbz` com backoff exponencial, mas **apenas** para ações | `src/hooks/useXbzIntegration.ts` |
| Other shortcuts in the app that the user must NOT collide with. */ | `src/lib/clearFiltersShortcut.ts` |
| Must use at least one modifier — single letter shortcuts would fire while typing. | `src/lib/clearFiltersShortcut.ts` |
| * Regra unica de abatimento de credito de devolucao em pagamento. | `src/lib/creditoFornecedor.ts` |
| caso em que o abatimento deve ser abortado ANTES de debitar o credito. | `src/lib/creditoFornecedor.ts` |
| Somente transicoes diretas: quitar um pagamento `pendente` passa pela | `src/lib/creditoFornecedor.ts` |
| aprovacao, que e uma decisao de alcada e nao pode ser pulada aqui. | `src/lib/creditoFornecedor.ts` |
| * Fetch all rows from a Supabase table, bypassing the 1000-row default limit. | `src/lib/paginatedFetch.ts` |
| * Aqui o topico NAO pode mudar: ele e o endereco que une os participantes | `src/lib/realtime.ts` |
| - Acrescenta `ellipsis` (default: "…") somente quando houve truncamento. | `src/lib/safeDisplay.ts` |
| Se o ellipsis já não cabe, apenas trunca sem sufixo. | `src/lib/safeDisplay.ts` |
| * Trunca uma string em no máximo `maxUnits` UTF-16 code units SEM quebrar | `src/lib/safeTruncate.ts` |
| Handles sanitization, security validation and audit logging. | `src/lib/security.ts` |
| usada na pre-checagem e (b) a traducao do 23505 em frase de negocio. | `src/lib/unicidadeCadastro.ts` |
| exibia 14/06 para "2024-06-15" e recusava "hoje" no prazo de entrega. | `src/lib/utils.ts` |
| **Validação Rigorosa:** Shared utilities para validação de esquemas \`zod\` em Edge Functions e chamadas RPC. | `src/pages/admin/DeveloperDocs.tsx` |
| **Filtro por Tenant:** Cada query no banco de dados deve incluir implicitamente ou explicitamente o \`tenant_id\` do usuário logado. | `src/pages/admin/DeveloperDocs.tsx` |
| Dialog de Adicionar/Editar Regra SoD | `src/pages/admin/WorkflowAdmin.tsx` |
| Dialog Adicionar/Editar Regra SoD */} | `src/pages/admin/WorkflowAdmin.tsx` |
| Registra a visualização apenas para quem realmente enxerga a trilha (admin), | `src/pages/auditoria/Auditoria.tsx` |
| Validation schemas | `src/pages/auth/Auth.tsx` |
| automática: cada clique consome 1 requisição do limite. | `src/pages/catalogo-spot/useSpotCatalog.ts` |
| Tamanho mínimo de `busca` aceito pela XBZ (abaixo disso `consultaEstoque` devolve []). */ | `src/pages/catalogo-xbz/xbzHelpers.ts` |
| partir de um volume mínimo de chamadas; abaixo disso o painel exibe estado | `src/pages/catalogo-xbz/xbzNetworkHealth.ts` |
| Volume mínimo de chamadas antes de classificar a eficiência. */ | `src/pages/catalogo-xbz/xbzNetworkHealth.ts` |
| Tamanho máximo da janela deslizante de amostras. */ | `src/pages/catalogo-xbz/xbzNetworkTrend.ts` |
| Mínimo de amostras para classificar tendência (metade cheia de cada lado). */ | `src/pages/catalogo-xbz/xbzNetworkTrend.ts` |
| insert voltou erro/permissao negada (createCotacao -> null). | `src/pages/cotacao/Cotacao.tsx` |
| risco/prazo: so calcula o que os dados das cotacoes permitem afirmar. | `src/pages/cotacao/cotacaoHelpers.ts` |
| * Regra de conciliacao de NF-e com pedido. | `src/pages/documentos/conciliacaoFiscal.ts` |
| Somente os digitos do CNPJ, para comparar o emitente do XML com o cadastro. */ | `src/pages/documentos/conciliacaoFiscal.ts` |
| do solicitante, nao preco negociado, e servia apenas de fallback. | `src/pages/gerar-ordem/GerarOrdem.tsx` |
| Calculos financeiros — frete e desconto vem da cotacao vencedora; o `\|\| 12` | `src/pages/gerar-ordem/GerarOrdem.tsx` |
| Desconto Editável */} | `src/pages/gerar-ordem/GerarOrdem.tsx` |
| RLS filtra a linha em silêncio (0 linhas, sem erro) quando o usuário não pode alterá-la. | `src/pages/kanban/KanbanWorkflow.tsx` |
| * Monta o historico apenas com o que esta gravado: o follow-up do agendador na | `src/pages/pedidos/PedidoDetailsDialog.tsx` |
| * Saude do prazo de um pedido para a coluna da lista (QA 103, UI-06). | `src/pages/pedidos/pedidosHelpers.ts` |
| olhar prazo, status ou data. Aqui o estado vem do dado: a mesma `calcularSLA` | `src/pages/pedidos/pedidosHelpers.ts` |
| prazo (emissao -> previsao) ja foi consumido. Sem previsao nao ha medida - | `src/pages/pedidos/pedidosHelpers.ts` |
| % do prazo ja consumido - 100 quando estourou, 0 quando nao da para medir. */ | `src/pages/pedidos/pedidosHelpers.ts` |
| % do prazo consumido entre a emissao e a previsao; 0 quando nao da para medir. */ | `src/pages/pedidos/pedidosHelpers.ts` |
| * A regra foi escrita em `src/components/compras/ReceivingModal.tsx`, um | `src/pages/recebimento/pedidoComplementar.ts` |
| Rate Limit Tab */} | `src/pages/seguranca/Seguranca.tsx` |
| Posicao no eixo Y (urgencia pelo prazo), em %. */ | `src/pages/solicitacoes/solicitacoesHelpers.ts` |
| dias ou mais no rodape). Item sem prazo fica numa faixa neutra, no meio. | `src/pages/solicitacoes/solicitacoesHelpers.ts` |
| Validate: thresholds must be positive | `src/stores/slaSettingsStore.ts` |
| Warning must be >= critical | `src/stores/slaSettingsStore.ts` |
| * Registry of contracts per function name for automated testing/validation. | `supabase/functions/_shared/contracts.ts` |
| Used for automated permission validation. | `supabase/functions/_shared/contracts.ts` |
| Non-blocking — log but never throw; heartbeat failure must not kill the cron run. | `supabase/functions/_shared/cronHealth.ts` |
| * Regra de ouro (A-01 · AUDITORIA_BACKEND_V2): a bridge só executa contra | `supabase/functions/_shared/external-bridge-allowlist.ts` |
| O bridge é somente leitura — ver `ALLOWED_OPERATIONS` abaixo. | `supabase/functions/_shared/external-bridge-allowlist.ts` |
| vistas do PIM (Promo Gifts V4) — somente leitura via external-db-bridge | `supabase/functions/_shared/external-bridge-allowlist.ts` |
| Limite máximo por chamada — evita dump silencioso. */ | `supabase/functions/_shared/external-bridge-allowlist.ts` |
| Resultado da validação; se `ok=false`, `reason` explica o motivo. */ | `supabase/functions/_shared/external-bridge-allowlist.ts` |
| 1. Missing required fields | `supabase/functions/_shared/fuzzer.ts` |
| INT-08: so replay de operacao concluida. Linha `failed` nao pode ser | `supabase/functions/_shared/idempotency.ts` |
| Tamanho máximo do `context` serializado em JSON (bytes UTF-8). */ | `supabase/functions/_shared/logLevel.ts` |
| Tamanho máximo de `url` (UTF-16 code units). */ | `supabase/functions/_shared/logLevel.ts` |
| Tamanho máximo de `user_agent` (UTF-16 code units). */ | `supabase/functions/_shared/logLevel.ts` |
| * Trunca uma string em no máximo `maxUnits` UTF-16 code units SEM quebrar | `supabase/functions/_shared/logLevel.ts` |
| teto, descarta o conteúdo e grava apenas um marcador — preferimos perder o | `supabase/functions/_shared/logLevel.ts` |
| inválida (sem mensagem string não-vazia) — o chamador deve filtrar. | `supabase/functions/_shared/logLevel.ts` |
| M-02: o `tenantId` do corpo é apenas uma confirmação. Só é aceito se | `supabase/functions/_shared/logLevel.ts` |
| * Rate limit helper compartilhado para edge functions. | `supabase/functions/_shared/rate_limit.ts` |
| * Contrato estrutural mínimo do client Supabase usado pelas helpers de | `supabase/functions/_shared/security.ts` |
| (`user_tenants`) — o header, se presente, é apenas logado como aviso e | `supabase/functions/_shared/security.ts` |
| Fallback para `*` apenas em dev/preview quando o env não é definido. | `supabase/functions/_shared/security.ts` |
| Em produção com ALLOWED_ORIGINS configurado, emite wildcard apenas se a | `supabase/functions/_shared/security.ts` |
| Production: omit wildcard. callers that need origin-echo must use buildCorsHeaders(req). | `supabase/functions/_shared/security.ts` |
| Mantido apenas para não quebrar callers legados durante a migração. | `supabase/functions/_shared/security.ts` |
| minimo que usamos. O cast na fronteira evita casar tipos nominais (a classe | `supabase/functions/_shared/security.ts` |
| alternar entre múltiplas empresas do grupo, deve passar `preferredTenantId` | `supabase/functions/_shared/security.ts` |
| * Enhanced validation utility that automatically logs failures to telemetry. | `supabase/functions/_shared/validation.ts` |
| Somente a forma do corpo: `sanitizeContext` do logger so esconde chaves | `supabase/functions/_shared/validation.ts` |
| Extract validation details if available from Zod error message | `supabase/functions/_shared/validation.ts` |
| Garante que a flag de permissão do portal XBZ está habilitada para o cliente. */ | `supabase/functions/_shared/xbz_auth.ts` |
| - /api/clientes/  → header `cnpj` + `token`   (36 req/dia — apenas fallback) | `supabase/functions/_shared/xbz_client.ts` |
| Flags de permissão retornadas pelo getToken — a UI deve respeitá-las. */ | `supabase/functions/_shared/xbz_client.ts` |
| Tamanho mínimo de `busca` aceito pela XBZ; abaixo disso ela devolve [] silenciosamente. */ | `supabase/functions/_shared/xbz_client.ts` |
| são gravados em texto claro. A chave mestra vive apenas no secret | `supabase/functions/_shared/xbz_crypto.ts` |
| * Validação do portador (motorista/placa) para `/api/expedicaoautorizacao/Autorizar`. | `supabase/functions/_shared/xbz_portador.ts` |
| Rule-based fallback: return empty-but-valid structure with a warning | `supabase/functions/ai-demand-prediction/index.ts` |
| M-05: rate-limit — IA custa tokens; 20 req/min por usuário. | `supabase/functions/ai-negotiation/index.ts` |
| Standardized validation with auto-telemetry | `supabase/functions/ai-negotiation/index.ts` |
| M-05: rate-limit por usuário (AI = custo de token elevado). | `supabase/functions/ai-supplier-risk/index.ts` |
| Rule-based fallback: conservatively flag as medium risk with manual review required | `supabase/functions/ai-supplier-risk/index.ts` |
| Rule-based fallback: rank existing suppliers by name (alphabetical) as neutral suggestion | `supabase/functions/ai-supplier-suggestion/index.ts` |
| 4xx (exceto 429) não deve gerar retry — trata como erro terminal. | `supabase/functions/alert-dispatcher/index.ts` |
| Get pending steps that have exceeded their deadline | `supabase/functions/check-approval-escalations/index.ts` |
| Check for steps approaching deadline (send warning) | `supabase/functions/check-approval-escalations/index.ts` |
| 4 hours before deadline | `supabase/functions/check-approval-escalations/index.ts` |
| * Regras puras do alerta de vencimento de contrato. | `supabase/functions/check-expiry-alerts/contractExpiry.ts` |
| Dias inteiros entre hoje e o vencimento. Negativo = ja venceu. */ | `supabase/functions/check-expiry-alerts/contractExpiry.ts` |
| - `pending_approval` nao alerta: ainda nao vale nada para o negocio | `supabase/functions/check-expiry-alerts/contractExpiry.ts` |
| Regras do alerta de vencimento de contrato. | `supabase/functions/check-expiry-alerts/contractExpiry_test.ts` |
| minimo usado pelas helpers locais, a mesma convencao de _shared/notifications.ts. | `supabase/functions/check-sla-alerts/index.ts` |
| com segredos PunchOut ou XBZ. O front envia o plaintext (HTTPS) apenas no | `supabase/functions/erp-credential-encrypt/index.ts` |
| M-05: rate-limit 30 req/min por usuário (sync é operação pesada). | `supabase/functions/erp-sync/index.ts` |
| integration is a stub and must be implemented per connection.type. | `supabase/functions/erp-sync/index.ts` |
| Clamp de limit para evitar dump silencioso do DB externo. | `supabase/functions/external-db-bridge/index.ts` |
| Rate limit por usuário (60 req/min) — protege o DB externo de abuso. | `supabase/functions/external-db-bridge/index.ts` |
| Rate limit: geração de PDF é custosa (I/O + render). 20 req/min por usuário. | `supabase/functions/generate-contract-pdf/index.ts` |
| // Acesso: somente POST + usuário autenticado com role admin. | `supabase/functions/migrate-storage-paths/index.ts` |
| Dry-run: passe { dryRun: true } no body para apenas simular. | `supabase/functions/migrate-storage-paths/index.ts` |
| * Regra de ouro: nunca inventar valor. Quando o modelo não devolve um campo, | `supabase/functions/process-invoice-idp/extraction.ts` |
| Campos sem os quais o documento não pode ser dado como conciliável. */ | `supabase/functions/process-invoice-idp/extraction.ts` |
| Limite de 10 MB por documento — PDF/imagem de NF-e não passa disso. */ | `supabase/functions/process-invoice-idp/index.ts` |
| Prevent path traversal: filePath must be a relative path without .. | `supabase/functions/process-invoice-idp/index.ts` |
| no banco: este edge apenas preenche o formulario. | `supabase/functions/process-solicitacao-neural/index.ts` |
| * Mesmo padrao de auth/rate-limit/fallback do ai-supplier-suggestion (auth JWT | `supabase/functions/process-solicitacao-neural/index.ts` |
| de usuario autenticado, rate limit por usuario, fallback deterministico). | `supabase/functions/process-solicitacao-neural/index.ts` |
| Contrato de entrada: apenas o texto livre do usuario. | `supabase/functions/process-solicitacao-neural/index.ts` |
| browser em formato legivel. O front envia o plaintext (HTTPS) apenas no | `supabase/functions/punchout-encrypt/index.ts` |
| Deve estar no tenant corrente como admin ou coordinator (mesma regra da | `supabase/functions/punchout-encrypt/index.ts` |
| M-05: rate limit por IP (webhooks anônimos). | `supabase/functions/punchout-receive/index.ts` |
| The PunchOut shared secret must never be returned to the browser. | `supabase/functions/punchout-setup/index.ts` |
| erro transitorio nao pode envenenar a chave, senao o retry do dispatcher | `supabase/functions/receive-os-sync/index.ts` |
| * Regras de negocio que este arquivo garante: | `supabase/functions/receive-os-sync/mapping.ts` |
| - `prioridade` = 'alta' para OS ja fechada: o material tem prazo de entrega | `supabase/functions/receive-os-sync/mapping.ts` |
| without those secrets it would crash with "supabaseUrl is required" or | `supabase/functions/run-audit/rls_test.ts` |
| NAO habilite esta auditoria apenas cadastrando SUPABASE_SERVICE_ROLE_KEY: os passos abaixo | `supabase/functions/run-audit/rls_test.ts` |
| M-05: rate-limit por IP (SCIM é chamado por IdP externo, sem user.id). | `supabase/functions/scim-v2/index.ts` |
| RFC 7644 §3.3: 201 response MUST include a Location header | `supabase/functions/scim-v2/index.ts` |
| RFC 7644 §3.12: all errors must use the SCIM Error schema | `supabase/functions/scim-v2/index.ts` |
| SECURITY: Explicit token validation required when verify_jwt=false | `supabase/functions/spot-proxy/index.ts` |
| M-05: rate limit uniforme por usuário (60 req/min). | `supabase/functions/spot-proxy/index.ts` |
| Linha que deve ter `last_used_at` renovado. */ | `supabase/functions/spot-proxy/sessions.ts` |
| versões diferentes da lib; `SupabaseClientLike` é o mínimo usado). | `supabase/functions/telemetry/index.ts` |
| Rate limit: mitiga brute-force / enumeração por IP+email | `supabase/functions/webauthn-authenticate/index.ts` |
| SECURITY: fail-closed. A autenticação por passkey não pode ser | `supabase/functions/webauthn-authenticate/index.ts` |
| posse da chave privada. Reativar apenas quando a verificação de | `supabase/functions/webauthn-authenticate/index.ts` |
| Rate limit por usuário para evitar registro em massa/enumeração | `supabase/functions/webauthn-register/index.ts` |
| Contract Validation: Ensures type safety and catches malformed payloads before logic execution | `supabase/functions/workflow-engine/index.ts` |
| QA-022: approver_id must come from the verified JWT, never from the request body. | `supabase/functions/workflow-engine/index.ts` |
| - Credenciais decifradas apenas no servidor, nunca retornadas ao browser | `supabase/functions/xbz-proxy/index.ts` |
| Rate limit por ação: escritas críticas têm janela muito mais estreita. | `supabase/functions/xbz-proxy/index.ts` |
| - E2E_TEST_EMAIL / E2E_TEST_PASSWORD must be set in env (CI secrets) | `tests-e2e/global-setup.ts` |
| - The test user must exist in the Supabase project | `tests-e2e/global-setup.ts` |

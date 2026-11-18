# public.budget_audit_logs

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 1 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `budget_id` | `uuid` | sim |  |  |  |
| 3 | `user_id` | `uuid` | sim |  |  |  |
| 4 | `action` | `text` | não |  |  |  |
| 5 | `old_data` | `jsonb` | sim |  |  |  |
| 6 | `new_data` | `jsonb` | sim |  |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| budget_audit_logs_budget_id_fkey | FOREIGN KEY | `FOREIGN KEY (budget_id) REFERENCES department_budgets(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| budget_audit_logs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| budget_audit_logs_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| budget_audit_logs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX budget_audit_logs_pkey ON public.budget_audit_logs USING btree (id)` |
| idx_budget_audit_logs_budget_id | btree | budget_id | não | sim |  | `CREATE INDEX idx_budget_audit_logs_budget_id ON public.budget_audit_logs USING btree (budget_id)` |
| idx_budget_audit_logs_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_budget_audit_logs_user_id ON public.budget_audit_logs USING btree (user_id)` |


## Policies (RLS)

### `admin_view_budget_audit_logs`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_role(auth.uid(), 'admin'::app_role)` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |

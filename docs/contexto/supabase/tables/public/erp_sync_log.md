# public.erp_sync_log

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 3 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `tenant_id` | `uuid` | não |  |  |  |
| 3 | `connection_id` | `uuid` | não |  |  |  |
| 4 | `entity` | `text` | não |  |  |  |
| 5 | `direction` | `text` | não |  |  |  |
| 6 | `record_id` | `uuid` | sim |  |  |  |
| 7 | `external_id` | `text` | sim |  |  |  |
| 8 | `status` | `text` | não |  |  |  |
| 9 | `error_message` | `text` | sim |  |  |  |
| 10 | `request_payload` | `jsonb` | sim |  |  |  |
| 11 | `response_payload` | `jsonb` | sim |  |  |  |
| 12 | `duration_ms` | `integer` | sim |  |  |  |
| 13 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| erp_sync_log_connection_id_fkey | FOREIGN KEY | `FOREIGN KEY (connection_id) REFERENCES erp_connections(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| erp_sync_log_direction_check | CHECK | `CHECK (direction = ANY (ARRAY['inbound'::text, 'outbound'::text]))` |  |  | sim |
| erp_sync_log_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| erp_sync_log_status_check | CHECK | `CHECK (status = ANY (ARRAY['success'::text, 'error'::text, 'retry'::text, 'pending'::text]))` |  |  | sim |
| erp_sync_log_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| erp_sync_log_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX erp_sync_log_pkey ON public.erp_sync_log USING btree (id)` |
| idx_erp_sync_external_id | btree | external_id | não | sim |  | `CREATE INDEX idx_erp_sync_external_id ON public.erp_sync_log USING btree (external_id)` |
| idx_erp_sync_log_tenant_id | btree | tenant_id | não | sim |  | `CREATE INDEX idx_erp_sync_log_tenant_id ON public.erp_sync_log USING btree (tenant_id)` |
| idx_erp_sync_status_date | btree | connection_id, status, created_at | não | sim |  | `CREATE INDEX idx_erp_sync_status_date ON public.erp_sync_log USING btree (connection_id, status, created_at DESC)` |


## Policies (RLS)

### `erp_sync_log_escrita_gestao`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(tenant_in_my_group(tenant_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)))` |
| WITH CHECK | `(tenant_in_my_group(tenant_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)))` |

### `erp_sync_log_select_grupo`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `tenant_in_my_group(tenant_id)` |
| WITH CHECK |  |

### `tenant_isolation_erp_sync_log`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | RESTRICTIVE |
| roles | authenticated |
| USING | `tenant_in_my_group(tenant_id)` |
| WITH CHECK | `tenant_in_my_group(tenant_id)` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| a_fill_tenant_id | BEFORE | INSERT | ROW | enabled | public.fill_tenant_id_from_profile |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |

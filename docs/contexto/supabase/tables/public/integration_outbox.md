# public.integration_outbox

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
| 2 | `tenant_id` | `uuid` | sim |  |  |  |
| 3 | `target` | `text` | não |  |  |  |
| 4 | `endpoint` | `text` | não |  |  |  |
| 5 | `payload` | `jsonb` | não |  |  |  |
| 6 | `headers` | `jsonb` | sim |  |  |  |
| 7 | `status` | `text` | não | `'pending'::text` |  |  |
| 8 | `retries` | `integer` | não | `0` |  |  |
| 9 | `next_attempt_at` | `timestamp with time zone` | não | `now()` |  |  |
| 10 | `delivered_at` | `timestamp with time zone` | sim |  |  |  |
| 11 | `last_error` | `text` | sim |  |  |  |
| 12 | `created_by` | `uuid` | sim |  |  |  |
| 13 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 14 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| integration_outbox_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| integration_outbox_status_check | CHECK | `CHECK (status = ANY (ARRAY['pending'::text, 'retrying'::text, 'delivered'::text, 'dead'::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_outbox_tenant | btree | tenant_id, created_at | não | sim |  | `CREATE INDEX idx_outbox_tenant ON public.integration_outbox USING btree (tenant_id, created_at DESC)` |
| idx_outbox_worker | btree | status, next_attempt_at | não | sim | `(status = ANY (ARRAY['pending'::text, 'retrying'::text]))` | `CREATE INDEX idx_outbox_worker ON public.integration_outbox USING btree (status, next_attempt_at) WHERE (status = ANY (ARRAY['pending'::text, 'retrying'::text]))` |
| integration_outbox_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX integration_outbox_pkey ON public.integration_outbox USING btree (id)` |


## Policies (RLS)

### `outbox_admin_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_role(auth.uid(), 'admin'::app_role)` |
| WITH CHECK |  |

### `outbox_authenticated_enqueue`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(created_by = auth.uid())` |

### `outbox_service_role_all`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | service_role |
| USING | `true` |
| WITH CHECK | `true` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| a_fill_tenant_id | BEFORE | INSERT | ROW | enabled | public.fill_tenant_id_from_profile |
| trg_alert_on_outbox_dead | AFTER | UPDATE | ROW | enabled | public.alert_on_outbox_dead |
| trg_outbox_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |

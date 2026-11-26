# public.system_alerts

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 1 |
| realtime (publication) | sim |
| replica identity | default |
| vem de extensão | não |
| usada por views | public.v_system_health_overview |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 3 | `tenant_id` | `uuid` | sim |  |  |  |
| 4 | `alert_type` | `text` | não |  |  |  |
| 5 | `severity` | `text` | não |  |  |  |
| 6 | `message` | `text` | sim |  |  |  |
| 7 | `metadata` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 8 | `resolved_at` | `timestamp with time zone` | sim |  |  |  |
| 9 | `resolved_by` | `uuid` | sim |  |  |  |
| 10 | `dispatched_at` | `timestamp with time zone` | sim |  |  |  |
| 11 | `dispatch_status` | `text` | sim |  |  |  |
| 12 | `dispatch_error` | `text` | sim |  |  |  |
| 13 | `title` | `text` | sim |  |  |  |
| 14 | `description` | `text` | sim |  |  |  |
| 15 | `source` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| system_alerts_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_system_alerts_created_desc | btree | created_at | não | sim |  | `CREATE INDEX idx_system_alerts_created_desc ON public.system_alerts USING btree (created_at DESC)` |
| idx_system_alerts_pending_dispatch | btree | created_at | não | sim | `((dispatched_at IS NULL) AND (severity = ANY (ARRAY['HIGH'::text, 'CRITICAL'::text, 'EMERGENCY'::text, 'high'::text, 'critical'::text, 'emergency'::text])))` | `CREATE INDEX idx_system_alerts_pending_dispatch ON public.system_alerts USING btree (created_at) WHERE ((dispatched_at IS NULL) AND (severity = ANY (ARRAY['HIGH'::text, 'CRITICAL'::text, 'EMERGENCY'::text, 'high'::text, 'critical'::text, 'emergency'::text])))` |
| idx_system_alerts_type_created | btree | alert_type, created_at | não | sim |  | `CREATE INDEX idx_system_alerts_type_created ON public.system_alerts USING btree (alert_type, created_at DESC)` |
| system_alerts_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX system_alerts_pkey ON public.system_alerts USING btree (id)` |
| uq_system_alerts_open_scan_sla | btree | alert_type | sim | sim | `((resolved_at IS NULL) AND (alert_type = ANY (ARRAY['scan_sla_late'::text, 'scan_sla_critical'::text])) AND (metadata ? 'scan_name'::text))` | `CREATE UNIQUE INDEX uq_system_alerts_open_scan_sla ON public.system_alerts USING btree (alert_type, ((metadata ->> 'scan_name'::text))) WHERE ((resolved_at IS NULL) AND (alert_type = ANY (ARRAY['scan_sla_late'::text, 'scan_sla_critical'::text])) AND (metadata ? 'scan_name'::text))` |


## Policies (RLS)

### `Users view tenant alerts via verified mapping`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(((tenant_id IS NOT NULL) AND tenant_in_my_group(tenant_id)) OR ((tenant_id IS NULL) AND has_role(auth.uid(), 'admin'::app_role)))` |
| WITH CHECK |  |


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

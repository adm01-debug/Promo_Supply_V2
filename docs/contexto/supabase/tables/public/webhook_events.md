# public.webhook_events

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
| 2 | `source` | `text` | não |  |  |  |
| 3 | `idempotency_key` | `text` | não |  |  |  |
| 4 | `status` | `text` | não | `'processed'::text` |  |  |
| 5 | `response_payload` | `jsonb` | sim |  |  |  |
| 6 | `error_message` | `text` | sim |  |  |  |
| 7 | `request_headers` | `jsonb` | sim |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 9 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| webhook_events_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| webhook_events_source_idempotency_key_key | UNIQUE | `UNIQUE (source, idempotency_key)` |  |  | sim |
| webhook_events_status_check | CHECK | `CHECK (status = ANY (ARRAY['processing'::text, 'processed'::text, 'failed'::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_webhook_events_source_created | btree | source, created_at | não | sim |  | `CREATE INDEX idx_webhook_events_source_created ON public.webhook_events USING btree (source, created_at DESC)` |
| webhook_events_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX webhook_events_pkey ON public.webhook_events USING btree (id)` |
| webhook_events_source_idempotency_key_key | btree | source, idempotency_key | sim | sim |  | `CREATE UNIQUE INDEX webhook_events_source_idempotency_key_key ON public.webhook_events USING btree (source, idempotency_key)` |


## Policies (RLS)

### `Admins can view webhook events`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_role(auth.uid(), 'admin'::app_role)` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_webhook_events_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |

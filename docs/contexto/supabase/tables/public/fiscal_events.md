# public.fiscal_events

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
| 2 | `tenant_id` | `uuid` | não |  |  |  |
| 3 | `document_id` | `uuid` | sim |  |  |  |
| 4 | `external_id` | `text` | sim |  |  |  |
| 5 | `type` | `text` | não |  |  |  |
| 6 | `action` | `text` | não |  |  |  |
| 7 | `status` | `text` | não |  |  |  |
| 8 | `request_payload` | `jsonb` | sim |  |  |  |
| 9 | `response_payload` | `jsonb` | sim |  |  |  |
| 10 | `error_message` | `text` | sim |  |  |  |
| 11 | `protocol` | `text` | sim |  |  |  |
| 12 | `xml_url` | `text` | sim |  |  |  |
| 13 | `pdf_url` | `text` | sim |  |  |  |
| 14 | `processed_at` | `timestamp with time zone` | sim |  |  |  |
| 15 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 16 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| fiscal_events_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| fiscal_events_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| fiscal_events_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX fiscal_events_pkey ON public.fiscal_events USING btree (id)` |
| idx_fiscal_events_document | btree | document_id | não | sim |  | `CREATE INDEX idx_fiscal_events_document ON public.fiscal_events USING btree (document_id)` |
| idx_fiscal_events_status | btree | status | não | sim |  | `CREATE INDEX idx_fiscal_events_status ON public.fiscal_events USING btree (status)` |
| idx_fiscal_events_tenant | btree | tenant_id | não | sim |  | `CREATE INDEX idx_fiscal_events_tenant ON public.fiscal_events USING btree (tenant_id)` |


## Policies (RLS)

### `fiscal_events tenant isolation`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `tenant_in_my_group(tenant_id)` |
| WITH CHECK | `tenant_in_my_group(tenant_id)` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| update_fiscal_events_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |

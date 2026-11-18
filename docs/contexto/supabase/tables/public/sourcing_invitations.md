# public.sourcing_invitations

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
| 2 | `event_id` | `uuid` | não |  |  |  |
| 3 | `fornecedor_id` | `uuid` | não |  |  |  |
| 4 | `email_contato` | `text` | não |  |  |  |
| 5 | `nome_contato` | `text` | sim |  |  |  |
| 6 | `token` | `text` | não |  |  |  |
| 7 | `status` | `invitation_status` | não | `'pending'::invitation_status` |  |  |
| 8 | `invited_at` | `timestamp with time zone` | não | `now()` |  |  |
| 9 | `viewed_at` | `timestamp with time zone` | sim |  |  |  |
| 10 | `declined_at` | `timestamp with time zone` | sim |  |  |  |
| 11 | `declined_reason` | `text` | sim |  |  |  |
| 12 | `reminder_count` | `integer` | não | `0` |  |  |
| 13 | `last_reminder_at` | `timestamp with time zone` | sim |  |  |  |
| 14 | `tenant_id` | `uuid` | não | `'00000000-0000-0000-0000-000000000000'::uuid` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sourcing_invitations_event_id_fkey | FOREIGN KEY | `FOREIGN KEY (event_id) REFERENCES sourcing_events(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| sourcing_invitations_event_id_fornecedor_id_key | UNIQUE | `UNIQUE (event_id, fornecedor_id)` |  |  | sim |
| sourcing_invitations_fornecedor_id_fkey | FOREIGN KEY | `FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id)` | NO ACTION | NO ACTION | sim |
| sourcing_invitations_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| sourcing_invitations_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |
| sourcing_invitations_token_key | UNIQUE | `UNIQUE (token)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.auction_bids | auction_bids_invitation_id_fkey | invitation_id | NO ACTION |
| public.sourcing_responses | sourcing_responses_invitation_id_fkey | invitation_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_sourcing_invitations_fornecedor_id | btree | fornecedor_id | não | sim |  | `CREATE INDEX idx_sourcing_invitations_fornecedor_id ON public.sourcing_invitations USING btree (fornecedor_id)` |
| idx_sourcing_invitations_tenant_id | btree | tenant_id | não | sim |  | `CREATE INDEX idx_sourcing_invitations_tenant_id ON public.sourcing_invitations USING btree (tenant_id)` |
| sourcing_invitations_event_id_fornecedor_id_key | btree | event_id, fornecedor_id | sim | sim |  | `CREATE UNIQUE INDEX sourcing_invitations_event_id_fornecedor_id_key ON public.sourcing_invitations USING btree (event_id, fornecedor_id)` |
| sourcing_invitations_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sourcing_invitations_pkey ON public.sourcing_invitations USING btree (id)` |
| sourcing_invitations_token_key | btree | token | sim | sim |  | `CREATE UNIQUE INDEX sourcing_invitations_token_key ON public.sourcing_invitations USING btree (token)` |


## Policies (RLS)

### `tenant_isolation_sourcing_invitations`

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
| a_fill_tenant_id | BEFORE | INSERT | ROW | enabled | public.fill_tenant_id_from_profile |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |

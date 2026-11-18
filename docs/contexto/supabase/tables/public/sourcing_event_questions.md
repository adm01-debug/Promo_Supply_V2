# public.sourcing_event_questions

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
| 3 | `ordem` | `integer` | não | `1` |  |  |
| 4 | `type` | `question_type` | não |  |  |  |
| 5 | `pergunta` | `text` | não |  |  |  |
| 6 | `ajuda` | `text` | sim |  |  |  |
| 7 | `obrigatoria` | `boolean` | não | `true` |  |  |
| 8 | `peso` | `numeric(5,2)` | não | `0` |  |  |
| 9 | `opcoes` | `jsonb` | sim |  |  |  |
| 10 | `validacao` | `jsonb` | sim |  |  |  |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `tenant_id` | `uuid` | não | `'00000000-0000-0000-0000-000000000000'::uuid` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sourcing_event_questions_event_id_fkey | FOREIGN KEY | `FOREIGN KEY (event_id) REFERENCES sourcing_events(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| sourcing_event_questions_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| sourcing_event_questions_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.sourcing_response_answers | sourcing_response_answers_question_id_fkey | question_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_sourcing_event_questions_event_id | btree | event_id | não | sim |  | `CREATE INDEX idx_sourcing_event_questions_event_id ON public.sourcing_event_questions USING btree (event_id)` |
| idx_sourcing_event_questions_tenant_id | btree | tenant_id | não | sim |  | `CREATE INDEX idx_sourcing_event_questions_tenant_id ON public.sourcing_event_questions USING btree (tenant_id)` |
| sourcing_event_questions_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sourcing_event_questions_pkey ON public.sourcing_event_questions USING btree (id)` |


## Policies (RLS)

### `tenant_isolation_sourcing_event_questions`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `tenant_in_my_group(tenant_id)` |
| WITH CHECK | `tenant_in_my_group(tenant_id)` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |

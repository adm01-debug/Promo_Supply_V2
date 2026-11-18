# public.sourcing_response_answers

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
| 2 | `response_id` | `uuid` | não |  |  |  |
| 3 | `question_id` | `uuid` | não |  |  |  |
| 4 | `resposta_text` | `text` | sim |  |  |  |
| 5 | `resposta_number` | `numeric` | sim |  |  |  |
| 6 | `resposta_choice` | `jsonb` | sim |  |  |  |
| 7 | `resposta_file_url` | `text` | sim |  |  |  |
| 8 | `score_manual` | `numeric(5,2)` | sim |  |  |  |
| 9 | `tenant_id` | `uuid` | não | `'00000000-0000-0000-0000-000000000000'::uuid` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sourcing_response_answers_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| sourcing_response_answers_question_id_fkey | FOREIGN KEY | `FOREIGN KEY (question_id) REFERENCES sourcing_event_questions(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| sourcing_response_answers_response_id_fkey | FOREIGN KEY | `FOREIGN KEY (response_id) REFERENCES sourcing_responses(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| sourcing_response_answers_response_id_question_id_key | UNIQUE | `UNIQUE (response_id, question_id)` |  |  | sim |
| sourcing_response_answers_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_sourcing_response_answers_question_id | btree | question_id | não | sim |  | `CREATE INDEX idx_sourcing_response_answers_question_id ON public.sourcing_response_answers USING btree (question_id)` |
| idx_sourcing_response_answers_tenant_id | btree | tenant_id | não | sim |  | `CREATE INDEX idx_sourcing_response_answers_tenant_id ON public.sourcing_response_answers USING btree (tenant_id)` |
| sourcing_response_answers_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sourcing_response_answers_pkey ON public.sourcing_response_answers USING btree (id)` |
| sourcing_response_answers_response_id_question_id_key | btree | response_id, question_id | sim | sim |  | `CREATE UNIQUE INDEX sourcing_response_answers_response_id_question_id_key ON public.sourcing_response_answers USING btree (response_id, question_id)` |


## Policies (RLS)

### `tenant_isolation_sourcing_response_answers`

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

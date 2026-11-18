# public.security_definer_baseline

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
| 2 | `schema_name` | `text` | não |  |  |  |
| 3 | `function_name` | `text` | não |  |  |  |
| 4 | `function_signature` | `text` | não |  |  |  |
| 5 | `approved_by` | `text` | sim |  |  |  |
| 6 | `approved_at` | `timestamp with time zone` | não | `now()` |  |  |
| 7 | `justification` | `text` | sim |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| security_definer_baseline_function_signature_key | UNIQUE | `UNIQUE (function_signature)` |  |  | sim |
| security_definer_baseline_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| security_definer_baseline_function_signature_key | btree | function_signature | sim | sim |  | `CREATE UNIQUE INDEX security_definer_baseline_function_signature_key ON public.security_definer_baseline USING btree (function_signature)` |
| security_definer_baseline_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX security_definer_baseline_pkey ON public.security_definer_baseline USING btree (id)` |


## Policies (RLS)

### `Admins can view baseline`

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

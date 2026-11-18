# public.login_attempts

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 2 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `email` | `text` | não |  |  |  |
| 3 | `ip_address` | `text` | sim |  |  |  |
| 4 | `user_agent` | `text` | sim |  |  |  |
| 5 | `success` | `boolean` | não | `false` |  |  |
| 6 | `failure_reason` | `text` | sim |  |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| login_attempts_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| brin_login_attempts_created | brin | created_at | não | sim |  | `CREATE INDEX brin_login_attempts_created ON public.login_attempts USING brin (created_at)` |
| idx_login_attempts_created | btree | created_at | não | sim |  | `CREATE INDEX idx_login_attempts_created ON public.login_attempts USING btree (created_at DESC)` |
| idx_login_attempts_email | btree | email | não | sim |  | `CREATE INDEX idx_login_attempts_email ON public.login_attempts USING btree (email)` |
| idx_login_attempts_email_lower | btree |  | não | sim |  | `CREATE INDEX idx_login_attempts_email_lower ON public.login_attempts USING btree (lower(email))` |
| idx_login_attempts_ip | btree | ip_address | não | sim |  | `CREATE INDEX idx_login_attempts_ip ON public.login_attempts USING btree (ip_address)` |
| login_attempts_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX login_attempts_pkey ON public.login_attempts USING btree (id)` |


## Policies (RLS)

### `Admins can view login attempts`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_role(auth.uid(), 'admin'::app_role)` |
| WITH CHECK |  |

### `Authenticated can insert login attempts`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `((auth.uid() IS NOT NULL) AND (auth.email() = email))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_normalize_email | BEFORE | INSERT OR UPDATE | ROW | enabled | public.normalize_email_lowercase |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |

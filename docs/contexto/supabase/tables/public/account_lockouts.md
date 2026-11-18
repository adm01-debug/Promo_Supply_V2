# public.account_lockouts

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
| 3 | `failed_attempts` | `integer` | não | `0` |  |  |
| 4 | `lockout_count` | `integer` | não | `0` |  |  |
| 5 | `locked_until` | `timestamp with time zone` | sim |  |  |  |
| 6 | `last_failed_attempt` | `timestamp with time zone` | sim |  |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 8 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| account_lockouts_email_key | UNIQUE | `UNIQUE (email)` |  |  | sim |
| account_lockouts_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| account_lockouts_email_key | btree | email | sim | sim |  | `CREATE UNIQUE INDEX account_lockouts_email_key ON public.account_lockouts USING btree (email)` |
| account_lockouts_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX account_lockouts_pkey ON public.account_lockouts USING btree (id)` |
| idx_account_lockouts_email_lower | btree |  | não | sim |  | `CREATE INDEX idx_account_lockouts_email_lower ON public.account_lockouts USING btree (lower(email))` |
| idx_account_lockouts_locked_until | btree | locked_until | não | sim | `(locked_until IS NOT NULL)` | `CREATE INDEX idx_account_lockouts_locked_until ON public.account_lockouts USING btree (locked_until) WHERE (locked_until IS NOT NULL)` |


## Policies (RLS)

### `Admins can manage lockouts`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `has_role(auth.uid(), 'admin'::app_role)` |
| WITH CHECK |  |

### `Users can check own lockout status`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((email = auth.email()) OR has_role(auth.uid(), 'admin'::app_role))` |
| WITH CHECK |  |


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

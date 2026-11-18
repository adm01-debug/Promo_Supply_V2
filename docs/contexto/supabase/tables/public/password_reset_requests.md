# public.password_reset_requests

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 4 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `user_id` | `uuid` | não |  |  |  |
| 3 | `email` | `text` | não |  |  |  |
| 4 | `status` | `text` | não | `'pending'::text` |  |  |
| 5 | `reason` | `text` | sim |  |  |  |
| 6 | `admin_notes` | `text` | sim |  |  |  |
| 7 | `requested_at` | `timestamp with time zone` | não | `now()` |  |  |
| 8 | `reviewed_at` | `timestamp with time zone` | sim |  |  |  |
| 9 | `reviewed_by` | `uuid` | sim |  |  |  |
| 10 | `completed_at` | `timestamp with time zone` | sim |  |  |  |
| 11 | `expires_at` | `timestamp with time zone` | não | `(now() + '24:00:00'::interval)` |  |  |
| 12 | `reset_token` | `text` | sim |  |  |  |
| 13 | `ip_address` | `text` | sim |  |  |  |
| 14 | `user_agent` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| password_reset_requests_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| password_reset_requests_reset_token_key | UNIQUE | `UNIQUE (reset_token)` |  |  | sim |
| password_reset_requests_reviewed_by_fkey | FOREIGN KEY | `FOREIGN KEY (reviewed_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| password_reset_requests_status_check | CHECK | `CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'completed'::text, 'expired'::text]))` |  |  | sim |
| password_reset_requests_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_password_reset_requests_email | btree | email | não | sim |  | `CREATE INDEX idx_password_reset_requests_email ON public.password_reset_requests USING btree (email)` |
| idx_password_reset_requests_email_lower | btree |  | não | sim |  | `CREATE INDEX idx_password_reset_requests_email_lower ON public.password_reset_requests USING btree (lower(email))` |
| idx_password_reset_requests_reviewed_by | btree | reviewed_by | não | sim |  | `CREATE INDEX idx_password_reset_requests_reviewed_by ON public.password_reset_requests USING btree (reviewed_by)` |
| idx_password_reset_requests_status | btree | status | não | sim |  | `CREATE INDEX idx_password_reset_requests_status ON public.password_reset_requests USING btree (status)` |
| idx_password_reset_requests_token | btree | reset_token | não | sim | `(reset_token IS NOT NULL)` | `CREATE INDEX idx_password_reset_requests_token ON public.password_reset_requests USING btree (reset_token) WHERE (reset_token IS NOT NULL)` |
| idx_password_reset_requests_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_password_reset_requests_user_id ON public.password_reset_requests USING btree (user_id)` |
| password_reset_requests_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX password_reset_requests_pkey ON public.password_reset_requests USING btree (id)` |
| password_reset_requests_reset_token_key | btree | reset_token | sim | sim |  | `CREATE UNIQUE INDEX password_reset_requests_reset_token_key ON public.password_reset_requests USING btree (reset_token)` |


## Policies (RLS)

### `Admins can update any reset request`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `has_role(auth.uid(), 'admin'::app_role)` |
| WITH CHECK |  |

### `Admins can view all reset requests`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `has_role(auth.uid(), 'admin'::app_role)` |
| WITH CHECK |  |

### `Users can create their own reset requests`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `(auth.uid() = user_id)` |

### `Users can view their own reset requests`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(auth.uid() = user_id)` |
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

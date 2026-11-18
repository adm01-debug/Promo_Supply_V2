# public.webauthn_challenges

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 3 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `user_id` | `uuid` | sim |  |  |  |
| 3 | `email` | `text` | sim |  |  |  |
| 4 | `challenge` | `text` | não |  |  |  |
| 5 | `type` | `text` | não |  |  |  |
| 6 | `expires_at` | `timestamp with time zone` | não |  |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| webauthn_challenges_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| webauthn_challenges_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_webauthn_challenges_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_webauthn_challenges_user_id ON public.webauthn_challenges USING btree (user_id)` |
| webauthn_challenges_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX webauthn_challenges_pkey ON public.webauthn_challenges USING btree (id)` |


## Policies (RLS)

### `Users can create their own challenges`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `(((auth.uid() IS NOT NULL) AND ((user_id IS NULL) OR (user_id = auth.uid()))) OR ((auth.email() IS NOT NULL) AND ((email IS NULL) OR (email = auth.email()))))` |

### `Users can delete their own challenges`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(((auth.uid() IS NOT NULL) AND (user_id = auth.uid())) OR ((auth.email() IS NOT NULL) AND (email = auth.email())))` |
| WITH CHECK |  |

### `Users can view their own challenges`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(((auth.uid() IS NOT NULL) AND (user_id = auth.uid())) OR ((auth.email() IS NOT NULL) AND (email = auth.email())))` |
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

# public.secret_rotation_schedule

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
| 2 | `secret_name` | `text` | não |  |  |  |
| 3 | `description` | `text` | sim |  |  |  |
| 4 | `owner_user_id` | `uuid` | sim |  |  |  |
| 5 | `rotation_days` | `integer` | não |  |  |  |
| 6 | `last_rotated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 7 | `next_due_at` | `timestamp with time zone` | não | `now()` |  |  |
| 8 | `last_notified_at` | `timestamp with time zone` | sim |  |  |  |
| 9 | `last_notified_bucket` | `text` | sim |  |  |  |
| 10 | `notes` | `text` | sim |  |  |  |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| secret_rotation_schedule_owner_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| secret_rotation_schedule_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| secret_rotation_schedule_rotation_days_check | CHECK | `CHECK (rotation_days >= 7 AND rotation_days <= 730)` |  |  | sim |
| secret_rotation_schedule_secret_name_key | UNIQUE | `UNIQUE (secret_name)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_secret_rotation_next_due | btree | next_due_at | não | sim |  | `CREATE INDEX idx_secret_rotation_next_due ON public.secret_rotation_schedule USING btree (next_due_at)` |
| idx_secret_rotation_schedule_owner_user_id | btree | owner_user_id | não | sim |  | `CREATE INDEX idx_secret_rotation_schedule_owner_user_id ON public.secret_rotation_schedule USING btree (owner_user_id)` |
| secret_rotation_schedule_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX secret_rotation_schedule_pkey ON public.secret_rotation_schedule USING btree (id)` |
| secret_rotation_schedule_secret_name_key | btree | secret_name | sim | sim |  | `CREATE UNIQUE INDEX secret_rotation_schedule_secret_name_key ON public.secret_rotation_schedule USING btree (secret_name)` |


## Policies (RLS)

### `Admins manage secret rotation schedule`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_role(auth.uid(), 'admin'::app_role)` |
| WITH CHECK | `has_role(auth.uid(), 'admin'::app_role)` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_secret_rotation_maintain | BEFORE | INSERT OR UPDATE | ROW | enabled | public.tg_secret_rotation_maintain |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |

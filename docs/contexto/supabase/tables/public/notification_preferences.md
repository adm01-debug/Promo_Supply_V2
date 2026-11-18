# public.notification_preferences

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
| 2 | `user_id` | `uuid` | não |  |  |  |
| 3 | `sla_warnings` | `boolean` | sim | `true` |  |  |
| 4 | `sla_critical` | `boolean` | sim | `true` |  |  |
| 5 | `order_updates` | `boolean` | sim | `true` |  |  |
| 6 | `payment_alerts` | `boolean` | sim | `true` |  |  |
| 7 | `supplier_alerts` | `boolean` | sim | `true` |  |  |
| 8 | `price_alerts` | `boolean` | sim | `true` |  |  |
| 9 | `email_notifications` | `boolean` | sim | `false` |  |  |
| 10 | `push_notifications` | `boolean` | sim | `true` |  |  |
| 11 | `sound_enabled` | `boolean` | sim | `true` |  |  |
| 12 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 13 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| notification_preferences_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| notification_preferences_user_id_key | UNIQUE | `UNIQUE (user_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| notification_preferences_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX notification_preferences_pkey ON public.notification_preferences USING btree (id)` |
| notification_preferences_user_id_key | btree | user_id | sim | sim |  | `CREATE UNIQUE INDEX notification_preferences_user_id_key ON public.notification_preferences USING btree (user_id)` |


## Policies (RLS)

### `Users can manage their own preferences`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(auth.uid() = user_id)` |
| WITH CHECK | `(auth.uid() = user_id)` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| update_notification_preferences_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |

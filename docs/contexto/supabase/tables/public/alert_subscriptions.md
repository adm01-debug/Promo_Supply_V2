# public.alert_subscriptions

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
| 3 | `alert_type` | `text` | sim |  |  |  |
| 4 | `min_severity` | `text` | não | `'HIGH'::text` |  |  |
| 5 | `channel` | `text` | não | `'inapp'::text` |  |  |
| 6 | `enabled` | `boolean` | não | `true` |  |  |
| 7 | `snoozed_until` | `timestamp with time zone` | sim |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 9 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 10 | `slack_webhook_url` | `text` | sim |  |  |  |
| 11 | `email` | `text` | sim |  |  |  |
| 12 | `webhook_url` | `text` | sim |  |  |  |
| 13 | `webhook_secret` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| alert_subscriptions_channel_check | CHECK | `CHECK (channel = ANY (ARRAY['inapp'::text, 'email'::text, 'slack'::text]))` |  |  | sim |
| alert_subscriptions_min_severity_check | CHECK | `CHECK (min_severity = ANY (ARRAY['EMERGENCY'::text, 'CRITICAL'::text, 'HIGH'::text, 'MEDIUM'::text, 'LOW'::text, 'INFO'::text]))` |  |  | sim |
| alert_subscriptions_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| alert_subscriptions_user_id_alert_type_channel_key | UNIQUE | `UNIQUE (user_id, alert_type, channel)` |  |  | sim |
| alert_subscriptions_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| alert_subscriptions_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX alert_subscriptions_pkey ON public.alert_subscriptions USING btree (id)` |
| alert_subscriptions_user_id_alert_type_channel_key | btree | user_id, alert_type, channel | sim | sim |  | `CREATE UNIQUE INDEX alert_subscriptions_user_id_alert_type_channel_key ON public.alert_subscriptions USING btree (user_id, alert_type, channel)` |
| idx_alert_subs_type | btree | alert_type | não | sim | `(alert_type IS NOT NULL)` | `CREATE INDEX idx_alert_subs_type ON public.alert_subscriptions USING btree (alert_type) WHERE (alert_type IS NOT NULL)` |
| idx_alert_subs_user | btree | user_id | não | sim |  | `CREATE INDEX idx_alert_subs_user ON public.alert_subscriptions USING btree (user_id)` |


## Policies (RLS)

### `Admins manage own alert subscriptions`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((auth.uid() = user_id) AND has_role(auth.uid(), 'admin'::app_role))` |
| WITH CHECK | `((auth.uid() = user_id) AND has_role(auth.uid(), 'admin'::app_role))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_alert_subs_updated | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |

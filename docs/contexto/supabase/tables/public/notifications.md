# public.notifications

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 6 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `user_id` | `uuid` | não |  |  |  |
| 3 | `type` | `text` | não |  |  |  |
| 4 | `title` | `text` | não |  |  |  |
| 5 | `message` | `text` | não |  |  |  |
| 6 | `priority` | `text` | não | `'medium'::text` |  |  |
| 7 | `data` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 8 | `action_url` | `text` | sim |  |  |  |
| 9 | `action_label` | `text` | sim |  |  |  |
| 10 | `read` | `boolean` | sim | `false` |  |  |
| 11 | `sent_push` | `boolean` | sim | `false` |  |  |
| 12 | `sent_email` | `boolean` | sim | `false` |  |  |
| 13 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 14 | `tenant_id` | `uuid` | não |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| notifications_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| notifications_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_notifications_pending_email | btree | created_at | não | sim | `(sent_email = false)` | `CREATE INDEX idx_notifications_pending_email ON public.notifications USING btree (created_at) WHERE (sent_email = false)` |
| idx_notifications_pending_push | btree | created_at | não | sim | `(sent_push = false)` | `CREATE INDEX idx_notifications_pending_push ON public.notifications USING btree (created_at) WHERE (sent_push = false)` |
| idx_notifications_tenant | btree | tenant_id | não | sim |  | `CREATE INDEX idx_notifications_tenant ON public.notifications USING btree (tenant_id)` |
| idx_notifications_tenant_created | btree | tenant_id, created_at | não | sim |  | `CREATE INDEX idx_notifications_tenant_created ON public.notifications USING btree (tenant_id, created_at DESC)` |
| idx_notifications_user_created | btree | user_id, created_at | não | sim |  | `CREATE INDEX idx_notifications_user_created ON public.notifications USING btree (user_id, created_at DESC)` |
| idx_notifications_user_unread_created | btree | user_id, created_at | não | sim | `(read = false)` | `CREATE INDEX idx_notifications_user_unread_created ON public.notifications USING btree (user_id, created_at DESC) WHERE (read = false)` |
| notifications_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id)` |


## Policies (RLS)

### `Users can create own notifications`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(auth.uid() = user_id)` |

### `Users can delete their own notifications`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(auth.uid() = user_id)` |
| WITH CHECK |  |

### `Users can update their own notifications`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(auth.uid() = user_id)` |
| WITH CHECK |  |

### `Users can view their own notifications`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(auth.uid() = user_id)` |
| WITH CHECK |  |

### `notificacoes_thread_followup_cotacao`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((type = 'cotacao_followup'::text) AND tenant_in_my_group(tenant_id))` |
| WITH CHECK |  |

### `tenant_isolation_notifications`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | RESTRICTIVE |
| roles | authenticated |
| USING | `(tenant_in_my_group(tenant_id) OR (user_id = auth.uid()))` |
| WITH CHECK | `tenant_in_my_group(tenant_id)` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| a_fill_tenant_id | BEFORE | INSERT | ROW | enabled | public.fill_tenant_id_from_profile |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |

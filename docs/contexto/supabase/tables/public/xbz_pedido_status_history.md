# public.xbz_pedido_status_history

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
| 2 | `tenant_id` | `uuid` | não |  |  |  |
| 3 | `pedido_numero` | `text` | não |  |  |  |
| 4 | `campo` | `text` | não |  |  |  |
| 5 | `valor_anterior` | `text` | sim |  |  |  |
| 6 | `valor_novo` | `text` | sim |  |  |  |
| 7 | `detectado_em` | `timestamp with time zone` | não | `now()` |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| xbz_pedido_status_history_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_xbz_status_history_pedido | btree | tenant_id, pedido_numero, detectado_em | não | sim |  | `CREATE INDEX idx_xbz_status_history_pedido ON public.xbz_pedido_status_history USING btree (tenant_id, pedido_numero, detectado_em DESC)` |
| xbz_pedido_status_history_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX xbz_pedido_status_history_pkey ON public.xbz_pedido_status_history USING btree (id)` |


## Policies (RLS)

### `xbz_status_history_group_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `tenant_in_my_group(tenant_id)` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |

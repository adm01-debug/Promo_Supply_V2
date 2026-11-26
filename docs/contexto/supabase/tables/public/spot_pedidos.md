# public.spot_pedidos

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
| 2 | `spot_order_id` | `text` | não |  |  |  |
| 3 | `status` | `text` | não | `'Submetida'::text` |  |  |
| 4 | `status_color` | `text` | sim |  |  |  |
| 5 | `referencia_cliente` | `text` | sim |  |  |  |
| 6 | `data_pedido` | `timestamp with time zone` | sim |  |  |  |
| 7 | `valor_total` | `numeric` | sim | `0` |  |  |
| 8 | `transportadora` | `text` | sim |  |  |  |
| 9 | `codigo_rastreamento` | `text` | sim |  |  |  |
| 10 | `detalhes_url` | `text` | sim |  |  |  |
| 11 | `itens` | `jsonb` | sim | `'[]'::jsonb` |  |  |
| 12 | `last_synced_at` | `timestamp with time zone` | não | `now()` |  |  |
| 13 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 14 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 15 | `internal_reference` | `text` | sim |  |  |  |
| 16 | `estimated_ship_date` | `date` | sim |  |  |  |
| 17 | `status_synced_at` | `timestamp with time zone` | sim |  |  |  |
| 18 | `tenant_id` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| spot_pedidos_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| spot_pedidos_spot_order_id_key | UNIQUE | `UNIQUE (spot_order_id)` |  |  | sim |
| spot_pedidos_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_spot_pedidos_internal_ref | btree | internal_reference | sim | sim | `(internal_reference IS NOT NULL)` | `CREATE UNIQUE INDEX idx_spot_pedidos_internal_ref ON public.spot_pedidos USING btree (internal_reference) WHERE (internal_reference IS NOT NULL)` |
| idx_spot_pedidos_tenant | btree | tenant_id | não | sim |  | `CREATE INDEX idx_spot_pedidos_tenant ON public.spot_pedidos USING btree (tenant_id)` |
| spot_pedidos_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX spot_pedidos_pkey ON public.spot_pedidos USING btree (id)` |
| spot_pedidos_spot_order_id_key | btree | spot_order_id | sim | sim |  | `CREATE UNIQUE INDEX spot_pedidos_spot_order_id_key ON public.spot_pedidos USING btree (spot_order_id)` |


## Policies (RLS)

### `Allowed roles can view spot orders`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role))` |
| WITH CHECK |  |

### `Buyers coordinators admins can manage spot orders`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role))` |
| WITH CHECK | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role))` |

### `tenant_isolation_spot_pedidos`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | RESTRICTIVE |
| roles | authenticated |
| USING | `tenant_in_my_group(tenant_id)` |
| WITH CHECK | `tenant_in_my_group(tenant_id)` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |

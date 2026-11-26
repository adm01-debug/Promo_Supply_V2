# public.estoque_movimentacoes

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
| 2 | `organization_id` | `uuid` | não |  |  |  |
| 3 | `estoque_id` | `uuid` | não |  |  |  |
| 4 | `tipo` | `text` | não |  |  |  |
| 5 | `quantidade` | `numeric(15,3)` | não |  |  |  |
| 6 | `motivo` | `text` | sim |  |  |  |
| 7 | `referencia_tipo` | `text` | sim |  |  |  |
| 8 | `referencia_id` | `uuid` | sim |  |  |  |
| 9 | `usuario_id` | `uuid` | sim |  |  |  |
| 10 | `data_movimentacao` | `timestamp with time zone` | sim | `now()` |  |  |
| 11 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| estoque_movimentacoes_estoque_id_fkey | FOREIGN KEY | `FOREIGN KEY (estoque_id) REFERENCES estoque(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| estoque_movimentacoes_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| estoque_movimentacoes_tipo_check | CHECK | `CHECK (tipo = ANY (ARRAY['entrada'::text, 'saida'::text, 'ajuste'::text, 'transferencia'::text, 'reserva'::text]))` |  |  | sim |
| estoque_movimentacoes_usuario_id_fkey | FOREIGN KEY | `FOREIGN KEY (usuario_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| estoque_movimentacoes_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX estoque_movimentacoes_pkey ON public.estoque_movimentacoes USING btree (id)` |
| idx_estoque_movimentacoes_usuario_id | btree | usuario_id | não | sim |  | `CREATE INDEX idx_estoque_movimentacoes_usuario_id ON public.estoque_movimentacoes USING btree (usuario_id)` |
| idx_movimentacoes_estoque | btree | estoque_id | não | sim |  | `CREATE INDEX idx_movimentacoes_estoque ON public.estoque_movimentacoes USING btree (estoque_id)` |
| idx_movimentacoes_org | btree | organization_id | não | sim |  | `CREATE INDEX idx_movimentacoes_org ON public.estoque_movimentacoes USING btree (organization_id)` |


## Policies (RLS)

### `Movimentações: ver da própria organização`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(organization_id = ( SELECT profiles.current_organization_id    FROM profiles   WHERE (profiles.user_id = auth.uid())))` |
| WITH CHECK |  |

### `estoque_movimentacoes_insert_papeis`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `((organization_id = get_user_grupo_id()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role)) AND (EXISTS ( SELECT 1    FROM estoque e   WHERE ((e.id = estoque_movimentacoes.estoque_id) AND (e.organization_id = get_user_grupo_id())))))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trigger_update_estoque_saldo | AFTER | INSERT | ROW | enabled | public.update_estoque_saldo |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |

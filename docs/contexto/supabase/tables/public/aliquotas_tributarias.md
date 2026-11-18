# public.aliquotas_tributarias

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
| 3 | `regime` | `regime_tributario` | não |  |  |  |
| 4 | `uf_origem` | `text` | sim |  |  |  |
| 5 | `uf_destino` | `text` | sim |  |  |  |
| 6 | `ncm` | `text` | sim |  |  |  |
| 7 | `icms` | `numeric(6,4)` | sim | `0` |  |  |
| 8 | `pis` | `numeric(6,4)` | sim | `0` |  |  |
| 9 | `cofins` | `numeric(6,4)` | sim | `0` |  |  |
| 10 | `iss` | `numeric(6,4)` | sim | `0` |  |  |
| 11 | `ipi` | `numeric(6,4)` | sim | `0` |  |  |
| 12 | `vigencia_inicio` | `date` | não | `CURRENT_DATE` |  |  |
| 13 | `vigencia_fim` | `date` | sim |  |  |  |
| 14 | `observacoes` | `text` | sim |  |  |  |
| 15 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 16 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| aliquotas_tributarias_organization_id_fkey | FOREIGN KEY | `FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| aliquotas_tributarias_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| aliquotas_tributarias_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX aliquotas_tributarias_pkey ON public.aliquotas_tributarias USING btree (id)` |
| idx_aliquotas_lookup | btree | organization_id, regime, uf_destino, ncm | não | sim |  | `CREATE INDEX idx_aliquotas_lookup ON public.aliquotas_tributarias USING btree (organization_id, regime, uf_destino, ncm)` |


## Policies (RLS)

### `Admin coord gerencia aliquotas`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((organization_id = get_user_grupo_id()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)))` |
| WITH CHECK | `((organization_id = get_user_grupo_id()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role)))` |

### `Grupo ve suas aliquotas`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(organization_id = get_user_grupo_id())` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_aliquotas_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |

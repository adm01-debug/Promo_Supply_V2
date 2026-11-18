# public.unspsc_codes

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
| 1 | `code` | `text` | não |  |  |  |
| 2 | `parent_code` | `text` | sim |  |  |  |
| 3 | `level` | `integer` | não |  |  |  |
| 4 | `nome` | `text` | não |  |  |  |
| 5 | `nome_en` | `text` | sim |  |  |  |
| 6 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 7 | `tenant_id` | `uuid` | sim | `'00000000-0000-0000-0000-000000000000'::uuid` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| unspsc_codes_level_check | CHECK | `CHECK (level >= 1 AND level <= 4)` |  |  | sim |
| unspsc_codes_parent_code_fkey | FOREIGN KEY | `FOREIGN KEY (parent_code) REFERENCES unspsc_codes(code)` | NO ACTION | NO ACTION | sim |
| unspsc_codes_pkey | PRIMARY KEY | `PRIMARY KEY (code)` |  |  | sim |
| unspsc_codes_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id) NOT VALID` | NO ACTION | NO ACTION | não |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.categorias | categorias_codigo_unspsc_fkey | codigo_unspsc | NO ACTION |
| public.pedido_itens | pedido_itens_unspsc_code_fkey | unspsc_code | NO ACTION |
| public.unspsc_codes | unspsc_codes_parent_code_fkey | parent_code | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_unspsc_codes_parent_code | btree | parent_code | não | sim |  | `CREATE INDEX idx_unspsc_codes_parent_code ON public.unspsc_codes USING btree (parent_code)` |
| idx_unspsc_codes_tenant_id | btree | tenant_id | não | sim |  | `CREATE INDEX idx_unspsc_codes_tenant_id ON public.unspsc_codes USING btree (tenant_id)` |
| unspsc_codes_pkey | btree | code | sim | sim |  | `CREATE UNIQUE INDEX unspsc_codes_pkey ON public.unspsc_codes USING btree (code)` |


## Policies (RLS)

### `unspsc_codes_authenticated_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(auth.uid() IS NOT NULL)` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |

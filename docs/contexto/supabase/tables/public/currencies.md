# public.currencies

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
| 1 | `code` | `character(3)` | não |  |  |  |
| 2 | `name` | `text` | não |  |  |  |
| 3 | `symbol` | `text` | não |  |  |  |
| 4 | `decimal_places` | `smallint` | não | `2` |  |  |
| 5 | `is_active` | `boolean` | não | `true` |  |  |
| 6 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| currencies_pkey | PRIMARY KEY | `PRIMARY KEY (code)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.contracts | contracts_currency_fkey | currency | NO ACTION |
| public.cotacoes | cotacoes_currency_fkey | currency | NO ACTION |
| public.exchange_rates | exchange_rates_base_currency_fkey | base_currency | NO ACTION |
| public.exchange_rates | exchange_rates_quote_currency_fkey | quote_currency | NO ACTION |
| public.pedidos | pedidos_currency_fkey | currency | NO ACTION |
| public.tenants | tenants_default_currency_fkey | default_currency | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| currencies_pkey | btree | code | sim | sim |  | `CREATE UNIQUE INDEX currencies_pkey ON public.currencies USING btree (code)` |


## Policies (RLS)

### `currencies_authenticated_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `true` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |

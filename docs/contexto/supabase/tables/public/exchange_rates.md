# public.exchange_rates

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
| 2 | `base_currency` | `character(3)` | não |  |  |  |
| 3 | `quote_currency` | `character(3)` | não |  |  |  |
| 4 | `rate` | `numeric(18,8)` | não |  |  |  |
| 5 | `rate_date` | `date` | não |  |  |  |
| 6 | `source` | `text` | não | `'exchangerate.host'::text` |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| exchange_rates_base_currency_fkey | FOREIGN KEY | `FOREIGN KEY (base_currency) REFERENCES currencies(code) NOT VALID` | NO ACTION | NO ACTION | não |
| exchange_rates_base_currency_quote_currency_rate_date_sourc_key | UNIQUE | `UNIQUE (base_currency, quote_currency, rate_date, source)` |  |  | sim |
| exchange_rates_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| exchange_rates_quote_currency_fkey | FOREIGN KEY | `FOREIGN KEY (quote_currency) REFERENCES currencies(code) NOT VALID` | NO ACTION | NO ACTION | não |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| exchange_rates_base_currency_quote_currency_rate_date_sourc_key | btree | base_currency, quote_currency, rate_date, source | sim | sim |  | `CREATE UNIQUE INDEX exchange_rates_base_currency_quote_currency_rate_date_sourc_key ON public.exchange_rates USING btree (base_currency, quote_currency, rate_date, source)` |
| exchange_rates_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX exchange_rates_pkey ON public.exchange_rates USING btree (id)` |
| idx_exchange_rates_quote_currency | btree | quote_currency | não | sim |  | `CREATE INDEX idx_exchange_rates_quote_currency ON public.exchange_rates USING btree (quote_currency)` |
| idx_fx_lookup | btree | base_currency, quote_currency, rate_date | não | sim |  | `CREATE INDEX idx_fx_lookup ON public.exchange_rates USING btree (base_currency, quote_currency, rate_date DESC)` |


## Policies (RLS)

### `exchange_rates_authenticated_read`

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

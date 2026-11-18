# public.negotiation_analyses

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
| 2 | `cotacao_id` | `uuid` | sim |  |  |  |
| 3 | `solicitacao_id` | `uuid` | sim |  |  |  |
| 4 | `analise_texto` | `text` | sim |  |  |  |
| 5 | `sugestoes` | `jsonb` | sim | `'[]'::jsonb` |  |  |
| 6 | `economia_estimada` | `numeric` | sim | `0` |  |  |
| 7 | `score_negociacao` | `numeric` | sim | `0` |  |  |
| 8 | `modelo_ia` | `text` | sim |  |  |  |
| 9 | `created_by` | `uuid` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| negotiation_analyses_cotacao_id_fkey | FOREIGN KEY | `FOREIGN KEY (cotacao_id) REFERENCES cotacoes(id)` | NO ACTION | NO ACTION | sim |
| negotiation_analyses_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| negotiation_analyses_solicitacao_id_fkey | FOREIGN KEY | `FOREIGN KEY (solicitacao_id) REFERENCES solicitacoes(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_negotiation_analyses_cotacao_id | btree | cotacao_id | não | sim |  | `CREATE INDEX idx_negotiation_analyses_cotacao_id ON public.negotiation_analyses USING btree (cotacao_id)` |
| idx_negotiation_analyses_solicitacao_id | btree | solicitacao_id | não | sim |  | `CREATE INDEX idx_negotiation_analyses_solicitacao_id ON public.negotiation_analyses USING btree (solicitacao_id)` |
| negotiation_analyses_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX negotiation_analyses_pkey ON public.negotiation_analyses USING btree (id)` |


## Policies (RLS)

### `Buyers coordinators admins can manage negotiation analyses`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role))` |
| WITH CHECK | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role))` |

### `Role-restricted negotiation analysis access`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |

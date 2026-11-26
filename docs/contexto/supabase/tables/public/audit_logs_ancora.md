# public.audit_logs_ancora

> Ancora da cadeia de hash de audit_logs: ultimo registro apagado pela retencao legal de 5 anos. ISO 27001 A.8.15.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 0 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `boolean` | não | `true` |  |  |
| 2 | `sequencia` | `bigint` | não |  |  |  |
| 3 | `registro_hash` | `text` | não |  |  | registro_hash do ultimo registro expurgado; e o hash_anterior esperado do primeiro registro remanescente. |
| 4 | `atualizado_em` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| audit_logs_ancora_id_check | CHECK | `CHECK (id)` |  |  | sim |
| audit_logs_ancora_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| audit_logs_ancora_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX audit_logs_ancora_pkey ON public.audit_logs_ancora USING btree (id)` |


## Policies (RLS)

> ⚠️ RLS habilitado **sem policies**: nenhum acesso via API (anon/authenticated).



## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |

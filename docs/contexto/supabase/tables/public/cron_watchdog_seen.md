# public.cron_watchdog_seen

> Ancora de primeira observacao de cada job do pg_cron. Permite ao cron_watchdog distinguir job recem-agendado de job quebrado sem historico.

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
| 1 | `jobid` | `integer` | não |  |  |  |
| 2 | `jobname` | `text` | não |  |  |  |
| 3 | `first_seen` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| cron_watchdog_seen_pkey | PRIMARY KEY | `PRIMARY KEY (jobid)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| cron_watchdog_seen_pkey | btree | jobid | sim | sim |  | `CREATE UNIQUE INDEX cron_watchdog_seen_pkey ON public.cron_watchdog_seen USING btree (jobid)` |


## Policies (RLS)

> ⚠️ RLS habilitado **sem policies**: nenhum acesso via API (anon/authenticated).



## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |

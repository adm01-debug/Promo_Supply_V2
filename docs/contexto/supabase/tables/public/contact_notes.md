# public.contact_notes

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 5 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `contact_id` | `text` | não |  |  |  |
| 3 | `fornecedor_id` | `uuid` | sim |  |  |  |
| 4 | `author_id` | `uuid` | sim |  |  |  |
| 5 | `content` | `text` | não |  |  |  |
| 6 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 7 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 8 | `tenant_id` | `uuid` | não | `'00000000-0000-0000-0000-000000000000'::uuid` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| contact_notes_author_id_fkey | FOREIGN KEY | `FOREIGN KEY (author_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| contact_notes_fornecedor_id_fkey | FOREIGN KEY | `FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| contact_notes_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| contact_notes_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| contact_notes_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX contact_notes_pkey ON public.contact_notes USING btree (id)` |
| idx_contact_notes_author_id | btree | author_id | não | sim |  | `CREATE INDEX idx_contact_notes_author_id ON public.contact_notes USING btree (author_id)` |
| idx_contact_notes_contact_id | btree | contact_id | não | sim |  | `CREATE INDEX idx_contact_notes_contact_id ON public.contact_notes USING btree (contact_id)` |
| idx_contact_notes_fornecedor_id | btree | fornecedor_id | não | sim |  | `CREATE INDEX idx_contact_notes_fornecedor_id ON public.contact_notes USING btree (fornecedor_id)` |
| idx_contact_notes_tenant_id | btree | tenant_id | não | sim |  | `CREATE INDEX idx_contact_notes_tenant_id ON public.contact_notes USING btree (tenant_id)` |


## Policies (RLS)

### `Authenticated users can create contact notes`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `((auth.uid() IS NOT NULL) AND (auth.uid() = author_id))` |

### `Author and privileged roles can view contact notes`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((auth.uid() = author_id) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role))` |
| WITH CHECK |  |

### `Users can delete their own notes or admins`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `((auth.uid() = author_id) OR has_role(auth.uid(), 'admin'::app_role))` |
| WITH CHECK |  |

### `Users can update their own notes`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(auth.uid() = author_id)` |
| WITH CHECK |  |

### `tenant_isolation_contact_notes`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | RESTRICTIVE |
| roles | authenticated |
| USING | `tenant_in_my_group(tenant_id)` |
| WITH CHECK | `tenant_in_my_group(tenant_id)` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| a_fill_tenant_id | BEFORE | INSERT | ROW | enabled | public.fill_tenant_id_from_profile |
| update_contact_notes_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |

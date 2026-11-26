# public.fiscal_documents

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
| 2 | `pedido_id` | `uuid` | sim |  |  |  |
| 3 | `fornecedor_id` | `uuid` | sim |  |  |  |
| 4 | `numero_nf` | `text` | não |  |  |  |
| 5 | `serie` | `text` | sim |  |  |  |
| 6 | `chave_acesso` | `text` | sim |  |  |  |
| 7 | `data_emissao` | `date` | sim |  |  |  |
| 8 | `valor_total` | `numeric` | não | `0` |  |  |
| 9 | `valor_produtos` | `numeric` | sim | `0` |  |  |
| 10 | `valor_frete` | `numeric` | sim | `0` |  |  |
| 11 | `valor_desconto` | `numeric` | sim | `0` |  |  |
| 12 | `valor_impostos` | `numeric` | sim | `0` |  |  |
| 13 | `status` | `text` | não | `'pendente'::text` |  |  |
| 14 | `xml_url` | `text` | sim |  |  |  |
| 15 | `pdf_url` | `text` | sim |  |  |  |
| 16 | `reconciliation_status` | `text` | sim | `'pending'::text` |  |  |
| 17 | `reconciliation_notes` | `text` | sim |  |  |  |
| 18 | `uploaded_by` | `uuid` | sim |  |  |  |
| 19 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 20 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 21 | `source_type` | `text` | sim | `'xml'::text` |  |  |
| 22 | `file_path` | `text` | sim |  |  |  |
| 23 | `processing_id` | `text` | sim |  |  |  |
| 24 | `organization_id` | `uuid` | sim |  |  |  |
| 25 | `tenant_id` | `uuid` | não |  |  |  |
| 26 | `xml_content` | `text` | sim |  |  |  |
| 27 | `sefaz_status` | `text` | sim |  |  |  |
| 28 | `sefaz_protocol` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| fiscal_documents_fornecedor_id_fkey | FOREIGN KEY | `FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id)` | NO ACTION | NO ACTION | sim |
| fiscal_documents_organization_id_fkey | FOREIGN KEY | `FOREIGN KEY (organization_id) REFERENCES organizations(id)` | NO ACTION | NO ACTION | sim |
| fiscal_documents_pedido_id_fkey | FOREIGN KEY | `FOREIGN KEY (pedido_id) REFERENCES pedidos(id)` | NO ACTION | NO ACTION | sim |
| fiscal_documents_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| fiscal_documents_tenant_id_fkey | FOREIGN KEY | `FOREIGN KEY (tenant_id) REFERENCES tenants(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| fiscal_documents_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX fiscal_documents_pkey ON public.fiscal_documents USING btree (id)` |
| idx_fiscal_documents_fornecedor_id | btree | fornecedor_id | não | sim |  | `CREATE INDEX idx_fiscal_documents_fornecedor_id ON public.fiscal_documents USING btree (fornecedor_id)` |
| idx_fiscal_documents_organization_id | btree | organization_id | não | sim |  | `CREATE INDEX idx_fiscal_documents_organization_id ON public.fiscal_documents USING btree (organization_id)` |
| idx_fiscal_documents_pedido_id | btree | pedido_id | não | sim |  | `CREATE INDEX idx_fiscal_documents_pedido_id ON public.fiscal_documents USING btree (pedido_id)` |
| idx_fiscal_documents_tenant | btree | tenant_id | não | sim |  | `CREATE INDEX idx_fiscal_documents_tenant ON public.fiscal_documents USING btree (tenant_id)` |
| uq_fiscal_documents_chave | btree | chave_acesso | sim | sim | `((chave_acesso IS NOT NULL) AND (chave_acesso <> ''::text))` | `CREATE UNIQUE INDEX uq_fiscal_documents_chave ON public.fiscal_documents USING btree (chave_acesso) WHERE ((chave_acesso IS NOT NULL) AND (chave_acesso <> ''::text))` |
| uq_fiscal_documents_nf | btree | tenant_id, fornecedor_id, serie, numero_nf | sim | sim | `(fornecedor_id IS NOT NULL)` | `CREATE UNIQUE INDEX uq_fiscal_documents_nf ON public.fiscal_documents USING btree (tenant_id, fornecedor_id, serie, numero_nf) WHERE (fornecedor_id IS NOT NULL)` |


## Policies (RLS)

### `Buyers coordinators admins can manage fiscal documents`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role) OR has_role(auth.uid(), 'finance'::app_role))` |
| WITH CHECK | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role) OR has_role(auth.uid(), 'finance'::app_role))` |

### `Role-restricted fiscal document access`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'buyer'::app_role) OR has_role(auth.uid(), 'finance'::app_role))` |
| WITH CHECK |  |

### `tenant_isolation_fiscal_documents`

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
| update_fiscal_documents_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |

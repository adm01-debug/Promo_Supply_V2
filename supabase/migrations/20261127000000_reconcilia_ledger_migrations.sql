-- Etapa 135 do plano de QA (achado DB-05, parte 1 de 2): reconcilia o ledger de
-- migrations com os arquivos versionados neste repositorio.
--
-- POR QUE: o schema deste projeto foi construido por aplicacoes manuais
-- (Dashboard/SQL Editor/MCP) e nenhum canal do repositorio grava em
-- supabase_migrations.schema_migrations. Medido em 25/11/2026: 14 linhas no
-- ledger para 336 arquivos em supabase/migrations/ (docs/contexto/supabase/
-- migrations.md na branch contexto, regerado em 20/11 e ainda inalterado no run
-- de 25/11). Aplicar a proxima migration pelo caminho padrao do Supabase
-- tentaria reexecutar 321 arquivos ja aplicados -- entre eles 37 CREATE TABLE
-- sem IF NOT EXISTS, que abortam no primeiro.
--
-- O QUE ESTA MIGRATION FAZ: insere no ledger, uma vez cada, as versoes dos
-- arquivos ja aplicados, no mesmo formato de "supabase migration repair
-- --status applied <versao>" (version + name). ON CONFLICT DO NOTHING preserva
-- as linhas que ja existem, inclusive os statements das 3 que os tem. Nenhum
-- arquivo de migration e criado, alterado ou removido por esta etapa.
--
-- EVIDENCIA DE QUE OS ARQUIVOS JA FORAM APLICADOS:
-- 1. Paridade de objetos (.github/workflows/paridade-banco.yml, run 45420727345
--    de 24/11/2026 = success): o script reproduz as migrations em ordem
--    cronologica e compara o resultado com o banco vivo -- todo objeto
--    declarado que sobrevive a sequencia existe em producao. 272 dos 322
--    arquivos abaixo declaram objeto coberto por essa checagem.
-- 2. Os 4 arquivos deste conjunto que fazem DROP TABLE batem com o banco de
--    hoje: password_reset_tokens e as 6 tabelas orfas v_* sumiram do snapshot
--    (tables.md), e audit_logs existe porque 20260712223300 a recria na mesma
--    transacao em que derruba a antiga.
-- 3. Os 50 restantes sao DML/GRANT puro (nao declaram tabela, view, funcao,
--    indice, trigger nem policy) e nao sao verificaveis por objeto. Ficam
--    registrados porque a direcao segura do ledger e impedir reexecucao de DML
--    (24 dos 321 tem DELETE FROM), nao permitir.
--
-- ARMADILHA CONHECIDA: dois arquivos compartilham a versao 20261113180000
-- (corrige_crons_lgpd_e_mv_kpis e storage_policies_por_bucket). Como "version"
-- e a chave primaria do ledger, so uma linha e possivel; o nome gravado e o do
-- primeiro arquivo em ordem alfabetica. Um db push futuro nao consegue
-- distinguir os dois -- por isso o registro guardado e o mais conservador.
--
-- RESOLVIDO (25/11/2026): a colisao de arquivos foi desfeita renomeando
-- storage_policies_por_bucket para a versao 20261113180001. A ordem de
-- aplicacao (corrige_crons -> storage_policies) e a mesma, a linha abaixo
-- continua sendo a unica do par 180000 e o storage_policies passa a ser
-- aplicado uma vez pelo caminho padrao (arquivo idempotente, DROP POLICY IF
-- EXISTS antes de cada CREATE).
--
-- REVERTER: DOCS/qa/reverts/20261127000000_reconcilia_ledger_migrations_revert.sql
-- (nao aplicado automaticamente; apaga apenas as versoes registradas aqui).
--
-- Verificacao depois de aplicar, se o ledger ainda tinha as 14 linhas medidas:
--   select count(*) from supabase_migrations.schema_migrations;            -- 336
--   select count(*) from supabase_migrations.schema_migrations
--    where statements is null;                                             -- 333
--
do $$
declare
  v_backfill text[] := array[
    '20250102000000|compras_production',
    '20251216162747|c7d5b816-cc67-4a20-8eac-aeda17c1db98',
    '20251216163227|7109e99a-58a4-48de-8bce-f05daa6d8de3',
    '20251216163235|f88e3e2e-dbcc-4c94-825f-ba624bdf9699',
    '20251216175601|09bef357-a53c-430f-a804-87ffa2032908',
    '20251220142204|16a9bb4a-ce42-4aaf-9de3-10f0ad0e2343',
    '20251220145628|690ef073-d843-45ed-95d3-7b3158d2a0e9',
    '20251220181110|c3da115e-7cad-4dc4-b147-3b888d4c332e',
    '20251231120356|3ae6d121-b315-421d-a18c-f2155c8f692f',
    '20251231124623|0e87b288-4dd1-4c9f-a749-9521063fc8e9',
    '20251231124632|ea8bac6c-d56e-4396-8c99-c1eb772c63c6',
    '20251231131007|37368865-d1b2-49cf-b292-2d7eefd5842f',
    '20251231131344|91120ebc-5790-48f7-8136-586a54120751',
    '20251231132431|1b93121d-151b-4729-a7b4-31449aa836e9',
    '20260107172217|de06dea9-cebf-4340-afb0-58240cc1305f',
    '20260108121914|c65220f2-3087-4c98-8977-516da335701e',
    '20260108121940|53728049-5423-4b02-bbf0-c7933111258a',
    '20260108200215|37789714-fc43-4f82-bf80-ec23f5221216',
    '20260111025047|ef19eb03-bc15-4917-87a8-f230df328ef2',
    '20260305235141|fb0a94fe-0f86-4435-b5ef-211b31315d40',
    '20260305235259|6352128a-66c0-4236-b4ef-0533ffe26b4a',
    '20260306002711|53c14912-5d65-4bbb-bc3e-d9bca734770b',
    '20260314200210|522a5d31-0ebd-4623-a88a-386d4b76b4df',
    '20260314200709|bea0cf6c-6af4-4936-a667-9edc8d986d7b',
    '20260314201406|4a72b2f1-149a-4a09-a5f5-1f29b5ac9eb4',
    '20260314201641|3ab6905f-02a0-4547-8557-94be6328f16e',
    '20260315143051|bc8cf5e2-b51a-4c11-8f01-e3a59649063e',
    '20260315150226|a87f820e-b073-45d2-8637-5fbb0dc5fbb9',
    '20260315150651|927a71bc-ebad-480f-b1c4-efe83c949cc4',
    '20260315151013|dfff8719-f695-4626-98f6-1380350d5d9a',
    '20260315151408|8ffa629b-ebf8-41cd-a770-8b0d78746e04',
    '20260315151901|0b81998e-797d-4956-96dd-95829ea06c24',
    '20260315164635|39bb111c-4995-4b60-ab28-3f83a84b78e2',
    '20260315173730|7339fd92-4c67-404b-8051-3157db7a50bc',
    '20260315223230|eeba531f-0b98-4764-b2a4-213d214e6494',
    '20260315223242|169684f3-beec-4caa-9566-70e5fadf7676',
    '20260317185335|36f3a1e4-58fc-4edd-9d74-2716b579b366',
    '20260317192813|fdf8b9ee-e383-42f2-9b2c-ed0b62e83734',
    '20260317200943|0aa56f87-1df6-402d-8e21-1621b37baeb0',
    '20260317201619|b1fdf364-9772-43d4-a769-7e51c33cc5eb',
    '20260317202549|8a2518a2-563d-41b9-8f9b-dcd8fab34b7d',
    '20260317204838|15b0f235-e22e-45b4-ac0e-311a32d9e58b',
    '20260317204905|c74bbedc-a522-4b3c-9bfd-afb6bba08004',
    '20260317204914|1d6902be-d26e-4711-8282-9d9258da9364',
    '20260317213152|359c9d54-2f8b-4d82-a969-f8075e3fbd29',
    '20260317221930|6ff9ef15-fd95-46cf-a510-b191668eeadb',
    '20260317222336|b11455d7-3bed-421d-9f68-835d7ef26d66',
    '20260317223217|2be30d4f-a4a1-4d3e-96b6-39c505b2d293',
    '20260317225209|5fe1695f-34b6-4ef9-8e7f-f90782749d72',
    '20260317225700|89f28570-4d8b-455a-8d44-8c36c454efd3',
    '20260317230002|e7619b9a-5a26-4d44-9023-1d986f965464',
    '20260321004207|7804c1ec-1e9d-4651-85ea-6fdf82dd01ec',
    '20260321005134|bafead0e-8616-4b7f-81a3-b6688d79a7fb',
    '20260322181916|73698fc6-0011-4684-8f39-15d076f12193',
    '20260323120656|8f201ce2-2e5e-4351-8598-f677f245ede8',
    '20260323124653|a17c752f-2db7-4701-9261-2c8fef3405ab',
    '20260402112838|4be4ac6b-26f1-456a-bcef-440be6bd6565',
    '20260402113249|b5e59bf9-8946-423d-8295-96738436f121',
    '20260402113615|635bc5b6-1d4b-4db9-8225-037a807b2c82',
    '20260402113645|4002b984-1bcb-4fd7-a3f5-d305dfded8b3',
    '20260402114640|da3f3e68-f49b-4af1-8a41-32869d820cda',
    '20260403110938|5782b462-c82a-496a-aba2-991583f20442',
    '20260403111210|7999bdb1-dae5-4c74-aa00-3858bbc45d17',
    '20260403111349|889d2532-b2db-420f-b99b-bafc5ed23323',
    '20260421160810|7f1de1f2-e63f-48b4-926a-0e5834584e6d',
    '20260421163010|8e70fa6e-0bdc-4a31-8e1d-e89452f0dc45',
    '20260422191619|9240a0f1-728d-427a-a76f-44cf2be7c87d',
    '20260507194122|b32edeb5-a032-4132-8ee2-1fc234103852',
    '20260507194402|b30cf397-f164-4a9e-b0d1-bbe8d1ecc990',
    '20260507204452|130ec336-13e2-498e-8c1c-fd03ea038e07',
    '20260507204531|ef94a910-2bbe-499f-a57a-21185af571e5',
    '20260507204629|613f960b-b35e-4038-be10-871affc0a828',
    '20260507204732|0bb6c80f-2526-453e-9be9-4990561632e4',
    '20260507205217|c1daf575-4225-464d-98fa-da42f4a035ce',
    '20260507205950|2c5935a1-33c9-4058-a56f-1c2fad76969f',
    '20260507210200|2020b604-1f12-4648-a313-b5b75176bdb8',
    '20260511204847|6f957b62-bead-4b7a-88ba-8fc7f324e673',
    '20260512134300|9bc27bcd-84ba-46ee-8d21-50516ab9937f',
    '20260512134422|ddf91078-5cb3-46c2-9d91-064bc1c6ef88',
    '20260512135056|8dbe68fe-cb94-40a3-a8d1-8de6a89be017',
    '20260512135304|c8c6cfdb-8578-47cb-abdf-2534451a006f',
    '20260512140107|a7e1431e-e927-4569-aee5-b741111f27b1',
    '20260512140201|daa2cb1f-14a9-498c-85c7-1154b8c2a52a',
    '20260512140447|e400c3b4-3bd7-46e3-927b-7002ba410886',
    '20260512141452|3be6aedb-f8fa-4312-b1be-610e86b46974',
    '20260512142511|3e8db5bf-b32f-40a8-8fd9-7c7ddecc09de',
    '20260512142916|25d93055-daa9-4d2c-a22a-7bd283935021',
    '20260512143023|a7d5144d-ca29-4e85-ab25-ffc636aeeebf',
    '20260512143218|6a3c9f90-f3f0-47c5-acb6-3aa5ab4de6cd',
    '20260512143450|5e734e19-0c49-4b8b-ba15-dfc0d412b863',
    '20260512161439|6976a625-9baf-4336-ba08-1c3a43994384',
    '20260512175236|89c0a31c-3450-4494-8421-51b9299a6247',
    '20260512181740|68334adc-cb4f-445a-bf22-9a402dc1e758',
    '20260512181757|85893a2f-8ac1-498f-8b0b-fe0b8022083e',
    '20260512183840|05bf1a09-db78-43e7-8be3-d3aa452a3b9e',
    '20260512191322|3fb3cd30-d068-44fc-a3df-efcbda8de408',
    '20260512191725|886f1f1b-2960-4b94-8879-2a00183c438d',
    '20260512213055|36202e2f-536b-40e5-b250-c55988e1f3f6',
    '20260512213414|0607a750-ce7a-4453-bf59-25e2cbaf4f68',
    '20260512213555|f76282b1-3f3a-4b2d-a0f7-5e22efb9180c',
    '20260512213701|ac0cbaa5-8764-4dbb-b95f-e6d7226345b1',
    '20260513135802|c940fbf6-e3eb-494f-bddd-e3785494a5ed',
    '20260513165228|ce24b3df-6ba5-4047-b7c9-009bf31eaef1',
    '20260513165506|fb142a48-5f59-4910-aef8-e6e0ec4656f2',
    '20260513165732|bc77e691-6a3d-4549-b31b-33a4799f2bd5',
    '20260513170110|a07ce0c9-a5ee-4ef8-b14e-40d5f2cfd446',
    '20260513175034|c4470b61-387d-4981-9579-a5c48d489ec0',
    '20260513175129|654ecb58-11cc-4fcc-9edb-1dd53443f7a2',
    '20260513175245|11ef6ac9-80dd-488f-b352-d01021edafbc',
    '20260513175257|6b8b4baf-fe4e-416d-b20d-607fa2ef944c',
    '20260513175349|55a359a1-5530-4b7e-871c-5c853f1e29a2',
    '20260513175852|1a519f80-6495-479d-b1e3-db2533aa2b4b',
    '20260513180103|6594fc62-2b28-4adf-b34d-07c17d33f430',
    '20260513182736|ef4a16ea-2f80-4bd5-8f3e-65f6b9b69170',
    '20260513183822|e2d05f87-9e62-4ae9-8c2c-dba4017edca1',
    '20260513184438|97b3a914-55db-4559-9ca0-bb2e5f1af27a',
    '20260513190856|cd1b993a-ef56-42f9-9ee8-ae7fff0e715c',
    '20260513191304|f777d7e2-3bc7-42c3-b3a7-69a9e25a6a61',
    '20260513191456|ed2c760f-4644-4fc0-8822-bbc2306bf219',
    '20260514211518|fb82654a-c28c-421d-9421-8044e4397f39',
    '20260514211742|3b400e1b-5a7e-4c5b-8326-3f4a7ab9e309',
    '20260514211800|648e4d06-4b0d-4ca2-b3e3-5c682f7b6079',
    '20260516112846|a9e3ae85-1ab1-429c-a95f-890f7c110846',
    '20260517122216|8f7869f6-4624-45df-9418-cf2cdc965d73',
    '20260517122231|1506de3b-70b5-4922-9a44-64376e8087eb',
    '20260517123005|23dd31d1-6cda-4234-9f92-7307db517b26',
    '20260517131213|1f938e79-528c-40a9-bab0-190c9066cc2b',
    '20260517185423|66949339-509d-4cca-9b98-7a37cc39d11b',
    '20260517185548|61b0689c-f08c-42a6-bbb2-c36a188ac536',
    '20260517191414|1e4aaa29-68ed-4bff-aadc-8fb3604bbe40',
    '20260517194952|f4eef05d-f0e0-49fe-9ac3-55a96255612c',
    '20260519113828|695e1995-1455-40b1-a23e-ea80aa91e7db',
    '20260519113851|9c068ab2-2912-4ddb-b723-f5020502b9c2',
    '20260519114020|1546616d-be8d-4565-92a6-fb1303688550',
    '20260519114341|5c605c1c-3e11-476f-bf17-93055d515e77',
    '20260519164652|18fe7bbd-76ae-408f-9612-4dd1a3bebec9',
    '20260519164823|50032a10-9293-4477-97ff-ef206b3c290e',
    '20260519180721|8c46848d-565e-457c-8101-dee78dfb6c11',
    '20260521142029|security_hardening',
    '20260522142837|4f603e8f-e052-4752-af7f-a0f12fa8d05e',
    '20260522202740|6521e169-0e00-4dba-a144-aad68c528a8e',
    '20260522202821|45a255f6-b00b-40b9-a864-5f9e6abfca85',
    '20260523172546|56e915a3-098b-4310-b1f0-7ea3d1c96574',
    '20260523172611|af1bdfd9-5517-42da-a418-341ebd3cc94e',
    '20260529192540|87382966-9b4e-41cf-851a-a359e114d03b',
    '20260529192650|fc849ba0-cdfa-4a50-8c04-23fcee8f864d',
    '20260531123936|21233c39-85c5-494f-bf4e-599e7756bdc9',
    '20260531125027|8ce8e485-e1fa-4ff6-99d5-57dad22363eb',
    '20260619145543|83e16148-2ff1-4c86-b6d2-53457b71844f',
    '20260619145916|3be1d46e-fc58-4610-8bff-153a08a6e753',
    '20260619145946|74f608de-1d81-4356-aa44-2cc92e4c2f57',
    '20260619150041|7b38db62-4cf6-49b4-8d22-a736a3b785e2',
    '20260619150136|235c0606-737b-4472-b055-81d20360287f',
    '20260619153140|875e108b-9c27-4174-b791-831a0d83ad70',
    '20260619160553|4cd7818e-be67-4cba-a04b-10708fd47805',
    '20260619161254|feb9dc6d-ae96-4ca5-8962-230b4a264f99',
    '20260619161625|28e6d3ec-95d1-4637-801f-b1c79b8423fa',
    '20260619162046|3cbed543-933a-4566-aea6-651897e6162a',
    '20260619183456|c433d0f7-5470-40bc-beff-09fc9a60a41f',
    '20260619192533|d21a4e4f-4249-4d39-9182-edb3f6ed11ce',
    '20260619194754|f1a59f1a-7413-46ad-86f5-3e325c85da41',
    '20260619205841|08fc0043-6b1e-4ed9-9c1a-89440df3c816',
    '20260627190431|970735c8-5102-4ae8-a453-587c145a56e9',
    '20260711150417|cfbf98b4-0b2f-44cd-8366-85275e841d38',
    '20260711152814|5d801562-46af-4a92-8ffc-e32926159cc0',
    '20260711152841|6256e9f6-eac5-4ac3-a112-6213e9af0962',
    '20260711153129|a4440396-30a3-4ed9-ba97-23a2768e59b5',
    '20260711153258|f292f3e6-aff3-4382-9b85-99a3edd5224b',
    '20260711183148|8694a780-0861-49f9-a337-d565e5e15ef4',
    '20260711183343|43dc2b31-4f1c-4e2d-bea9-1da967fe29e5',
    '20260711183647|cb1ddb07-f7db-40d3-bb0e-d42adfb914a0',
    '20260711183924|3acc4e45-ed15-45d8-b20d-15add5c34b87',
    '20260711184927|97a53154-11f7-413b-94f9-1c197b00da03',
    '20260711191620|306c4cc6-83a9-48ba-a536-7ffe884e4a1b',
    '20260711191946|872a6814-ab1c-4596-b6d7-c3e5c8379396',
    '20260711192231|419bfc67-3a43-4857-b3f1-7301b8be6793',
    '20260711192326|2436defe-a226-44fc-8966-5ba2ecdce7dc',
    '20260711192530|71f3acda-5589-472d-8c39-ad29bb1bf9ce',
    '20260711192812|449d919a-1ecd-429f-be4d-e30686bd5a94',
    '20260711194343|57e8cfe2-7029-44a2-92c0-9ecdd09c5b4e',
    '20260711194627|205a170b-bb7f-4917-bdf9-338d1894770d',
    '20260712110143|e51c0b00-e688-4f8e-971f-74952f32cac7',
    '20260712110815|762ad29c-b3f7-4e44-a0ec-f6b624174ca3',
    '20260712112516|ce81b42a-3fba-4624-a9e4-984ccb2a5040',
    '20260712112712|c0effbe6-98f7-4dc4-b115-df87582257b4',
    '20260712113011|18d493c9-b253-4988-abcd-8884e8753460',
    '20260712113545|f0a64396-6f67-437e-bd31-255c48edac4d',
    '20260712113809|4893d687-0207-4f7e-bec3-07d06dea7e7a',
    '20260712115449|57e52849-ed52-4d53-b76d-0e9975e755d1',
    '20260712141935|8b9bcc8b-e10f-4daf-9fff-34edf503ca62',
    '20260712142817|cb94f248-eabf-4053-bdd7-aa03f4bf09f1',
    '20260712161258|b21ccf6f-0300-4b08-a5a2-c4259aabcb90',
    '20260712183533|c0604f62-7e1f-4720-a626-52317c79c454',
    '20260712184038|15ff4851-c1da-4274-bd6f-e50369c9ffe9',
    '20260712184218|e45b548a-db1a-4050-9ba4-2dd1a490f896',
    '20260712192008|74f174de-700f-4c1e-93fe-f8cea3ca8355',
    '20260712192153|2a9b74d6-8ba5-4308-ba55-87b4b9396331',
    '20260712193607|e90c84a9-d4eb-42b3-8564-899bacc01fa2',
    '20260712193915|b284d70d-8be1-40ea-bc27-9960670c2653',
    '20260712194040|3b7d19ab-d3dd-42ee-933b-4340975fe077',
    '20260712194304|ad9d9443-9507-4e9f-8751-193ff290401e',
    '20260712194423|2774c8d2-c16b-490e-baec-5530d857a2d8',
    '20260712194543|ce151ace-bcd7-41ef-a90a-45b137ebd495',
    '20260712194659|702ebacc-eef1-4a7a-a2fc-2a58f8ea316e',
    '20260712194806|16758af1-f0a3-4343-a5a2-e9a9dbde8234',
    '20260712194927|357b0d5b-8b64-42dd-8df1-0dcedef79735',
    '20260712195030|ff90d369-cac2-4bc6-949e-efc30b3cb9f9',
    '20260712195141|7ca09192-718b-4750-8fc4-0c2f7e582404',
    '20260712195253|10a16ba3-8b4a-424c-ba4b-2c3af454030a',
    '20260712195408|36fb0763-69fd-42de-8270-201660eb8fe7',
    '20260712195527|2f3ed84f-104a-4828-8d30-2e569a97d1e9',
    '20260712195624|e846749d-d114-4e3b-9515-25f8ea847d6e',
    '20260712195709|f1641ac1-29fb-48cf-af64-04bc38fcc7ca',
    '20260712200134|0821e431-e312-4e6a-b267-2bfed023fc71',
    '20260712202305|7ead624d-983e-4fe3-80c8-ca36fd0a3f8d',
    '20260712202451|2e39197f-4a28-4a0d-9cc8-6b27a0491d6a',
    '20260712202749|bb709bc6-558f-4e7d-97d1-2e978797b632',
    '20260712203402|8caedee0-72c7-46f6-a9de-d05ff1d8446b',
    '20260712212439|404b97e1-f9e2-43cd-8e71-1f2a8b0a3adf',
    '20260712212629|45959fd5-cf7e-40d8-812a-31d376153f29',
    '20260712212852|a41e3a17-0990-4bb9-9c19-2bf3ac217e5e',
    '20260712215017|2d413493-59cd-4813-8469-837902fe74b1',
    '20260712215341|6309002c-447e-4a28-8473-3fdc3c8fe92e',
    '20260712215445|fa61d650-a4b6-47dd-a6f9-ae51dec592ad',
    '20260712215549|fcc6489a-009e-4050-8955-9ac162d4f3dd',
    '20260712215640|2e033e53-9cc2-4714-b6df-e8f9c8031a0f',
    '20260712220900|0acbb93f-a555-4029-b872-43931abde9e3',
    '20260712221049|be67ff27-0f0f-4271-9017-6ebe0acafe1b',
    '20260712221545|8154e7d9-83f7-4b82-b8d8-d3a6bca15333',
    '20260712222142|a253a878-d059-471c-bcd0-7a8f1ce178b9',
    '20260712222207|ec8b6fba-2a46-417a-ad13-26580b85fcd7',
    '20260712222242|aba70476-937d-4012-9211-3ae2d08dee19',
    '20260712222404|4c5c4e92-d7a7-4548-9b05-5a5607c29869',
    '20260712222422|44054d27-6fe9-447b-a558-caa63a595592',
    '20260712222529|454030f1-7948-4f0d-a0ab-d56a46e1f994',
    '20260712222620|110cc02b-1d32-42e6-a778-96d41f60eeb2',
    '20260712222645|719eb41d-0abd-43d2-82e9-8e0b30a01087',
    '20260712222930|cd4547af-7aac-44d8-8ac2-48991a40dfbf',
    '20260712222955|b4a5410b-e095-4d45-860d-f754418c4d4f',
    '20260712223300|6f689f47-2c15-468b-b667-679e47facc11',
    '20260712223354|e00522cc-ebe6-4957-bfef-dd6d115c4f5b',
    '20260712223444|2608de7b-4f9c-4f50-a31a-d8f8834233e9',
    '20260712223608|27e977bb-634d-42c4-b07d-23cb5f25956a',
    '20260712223752|fd6e126e-ba1a-41f4-8f3f-051290babd9b',
    '20260712224134|ca41be74-9d7b-4676-9337-9ebbdecedab3',
    '20260712224333|79b486b5-2a6e-4128-add0-5ce69d615025',
    '20260712224444|48edc4e1-eb08-4768-957b-b95768be79bb',
    '20260712224724|25a38d4a-f36d-4b4d-b415-3b34c3189edf',
    '20260712224754|6020dc9d-0915-4d1a-980e-701183be1cb0',
    '20260713104708|ab7115f1-5aec-49b0-be5f-144818e192f0',
    '20260713104844|2b93e809-e50c-42b3-8e4d-116073563946',
    '20260713105021|ef02f040-6e49-4cd8-b68f-8a9c06e9abdb',
    '20260713105146|e80e0d55-eec6-4fb9-a279-49501a05bb70',
    '20260713105330|daf01ebf-ca7d-477b-b37a-d968d74afc67',
    '20260713105504|34c5b9f6-89bd-47ed-956a-449faeb0d993',
    '20260713105624|e9839757-2d20-4362-9acb-6a4c4e20a482',
    '20260713105738|d761e68c-1321-43bc-b757-9ede7dc86517',
    '20260713105907|4b197a0e-74a0-4812-9175-87b9ca7c56ba',
    '20260713110028|8ada5be7-193d-41f7-be83-9cd839c1ea56',
    '20260713110159|94ff935c-b0ce-41ae-8d40-bda6ca91f908',
    '20260713110314|5a4d642f-daaa-45c3-903b-93a46d92bfa6',
    '20260713110420|3e5900b4-7895-405f-8107-826f60c20a6a',
    '20260715175240|11392519-5518-48fd-b75e-a60802301ff3',
    '20260719000001|rls_using_true_cleanup',
    '20260719000002|cron_heartbeats',
    '20260719000003|realtime_replica_identity',
    '20260719000004|partition_maintenance',
    '20260719000005|supplier_role',
    '20260723131233|93fe8645-8354-464c-83ac-79d8b50ebbec',
    '20260726144435|a37d5b86-9ad7-4c72-abcb-fe538eaed177',
    '20260726150655|1f9cbe7a-16a8-4845-905b-e2a4f3e0848e',
    '20260726151043|a116a5d7-40e9-4e45-8824-3ad60a74dacc',
    '20260726151350|0ea0eb79-cca6-494d-8e97-faa5c5945f2c',
    '20260726184620|c68f43ce-7781-436c-a2f2-4473e66093d5',
    '20260805100000|promo_supply_v2_seed_and_fixes',
    '20260805160000|fix_frontend_comms',
    '20260806180000|seed_devolucoes_creditos',
    '20261107150000|execute_read_query',
    '20261112134500|execute_read_query_revoke_anon',
    '20261112135000|views_security_invoker',
    '20261112135500|drop_tabelas_v_orfas',
    '20261112165500|revoga_exec_sql_e_chaves_xbz',
    '20261112170347|rls_tenant_isolation_restrictive',
    '20261112171300|secdef_revoga_anon',
    '20261112171742|cron_edge_projeto_correto_vault',
    '20261112171900|compras_dashboard_metrics_fix',
    '20261112222817|moeda_char3_cotacao_pedido',
    '20261112222833|compras_dashboard_metrics_numeros',
    '20261112223246|fill_tenant_id_from_profile',
    '20261112223649|security_papel_empresa_kpis',
    '20261112223906|comprador_le_contratos',
    '20261113122251|fix_gatilhos_solicitacao_pagamento_orcamento',
    '20261113122616|compra_completa_scores_e_status',
    '20261113123212|fornecedores_cnpj_valida_so_no_cadastro',
    '20261113123531|compras_dashboard_backlog_rotulos',
    '20261113123738|comprador_nao_altera_dados_de_outros',
    '20261113124508|cron_limpa_historico_semanal',
    '20261113180000|corrige_crons_lgpd_e_mv_kpis',
    '20261113180500|gatilhos_duplicados_e_orcamento_do_pedido',
    '20261114095500|corrige_mojibake_nome_sourcing_event_lots',
    '20261120165300|versiona_job_xbz_sync_30min',
    '20261121153000|religa_crons_negocio_vault',
    '20261121160000|pim_refs_compras',
    '20261121180000|fix_owner_crons_negocio',
    '20261121225000|versiona_job_spot_sync_orders_30min',
    '20261121232500|corrige_quota_cron_spot_stock',
    '20261122090000|corrige_watchdog_xbz_cego',
    '20261122130000|corrige_cron_watchdog_nomes_mortos',
    '20261122140000|dedupe_system_error_alerts',
    '20261122150000|cron_watchdog_sla_granularidade_e_grace_period',
    '20261123090000|seed_permissions_e_role_permissions',
    '20261123093000|sla_real_no_dashboard',
    '20261123120000|get_my_permissions_rpc',
    '20261124144000|numero_solicitacao_atomico',
    '20261125140000|integracao_promo_design',
    '20261125150000|find_approval_rule_escopo_tenant',
    '20261125160000|remove_trigger_duplicado_pedidos',
    '20261125162000|rpc_orcamento_por_tenant',
    '20261125170000|matriz_transicoes_alinhada',
    '20261126120000|alinha_transicoes_pagamento_pedido',
    '20261126130000|pedido_cancelado_terminal',
    '20261127000000|reconcilia_ledger_migrations'
  ];
  v_antes     integer;
  v_inseridas integer;
  v_depois    integer;
  v_falta     integer;
begin
  if to_regclass('supabase_migrations.schema_migrations') is null then
    raise exception 'supabase_migrations.schema_migrations nao existe: backfill abortado sem alterar nada';
  end if;

  select count(*) into v_antes from supabase_migrations.schema_migrations;

  insert into supabase_migrations.schema_migrations (version, name)
  select split_part(t.par, '|', 1), split_part(t.par, '|', 2)
    from unnest(v_backfill) as t(par)
  on conflict (version) do nothing;

  get diagnostics v_inseridas = row_count;

  select count(*) into v_depois from supabase_migrations.schema_migrations;

  select count(*) into v_falta
    from unnest(v_backfill) as t(par)
   where not exists (
     select 1 from supabase_migrations.schema_migrations m
      where m.version = split_part(t.par, '|', 1)
   );

  raise notice 'ledger: % -> % linhas (% inseridas de % versoes enviadas)', v_antes, v_depois, v_inseridas, array_length(v_backfill, 1);

  if v_falta <> 0 then
    raise exception 'backfill incompleto: % de % versoes nao ficaram registradas', v_falta, array_length(v_backfill, 1);
  end if;

  if v_inseridas = 0 then
    raise notice 'ledger ja reconciliado: nenhuma linha nova (idempotente)';
  end if;
end $$;

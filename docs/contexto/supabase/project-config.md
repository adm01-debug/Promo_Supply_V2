# Configuração do projeto (Management API, segredos redigidos)

| campo | valor |
|---|---|
| projeto | Promo_Supply_V2 |
| região | us-west-2 |
| URL | https://lmypcdfsrgfftzhxawao.supabase.co |
| schemas expostos (PostgREST) | public,graphql_public |
| max_rows (PostgREST) | 1000 |
| extra_search_path | public, extensions |
| PITR | não |
| branches | 1 |

```json
{
  "backups_config": {
    "pitr_enabled": false,
    "region": "us-west-2",
    "walg_enabled": true
  },
  "branches": [
    {
      "git_branch": "main",
      "id": "599cd924-05e6-461d-9b1f-da8e24a2b9bd",
      "is_default": true,
      "name": "main",
      "persistent": false,
      "status": "MIGRATIONS_FAILED"
    }
  ],
  "custom_hostname": null,
  "network_restrictions": {
    "config": {
      "dbAllowedCidrs": [
        "0.0.0.0/0"
      ],
      "dbAllowedCidrsV6": [
        "::/0"
      ]
    },
    "entitlement": "allowed",
    "status": "applied"
  },
  "pooler_config": [
    {
      "connectionString": "postgresql://[REDACTED]@aws-1-us-west-2.pooler.supabase.com:6543/postgres",
      "connection_string": "[REDACTED]",
      "database_type": "PRIMARY",
      "db_host": "aws-1-us-west-2.pooler.supabase.com",
      "db_name": "postgres",
      "db_port": 6543,
      "db_user": "postgres.lmypcdfsrgfftzhxawao",
      "default_pool_size": null,
      "identifier": "lmypcdfsrgfftzhxawao",
      "is_using_scram_auth": true,
      "max_client_conn": null,
      "pool_mode": "transaction"
    }
  ],
  "postgres_config": {},
  "postgrest_config": {
    "db_extra_search_path": "public, extensions",
    "db_pool": null,
    "db_pool_acquisition_timeout": 10,
    "db_pool_max_idletime": 30,
    "db_pool_max_lifetime": 1800,
    "db_schema": "public,graphql_public",
    "jwt_secret": "[REDACTED]",
    "max_rows": 1000
  },
  "project": {
    "created_at": "2026-07-24T19:17:10.074216Z",
    "id": "lmypcdfsrgfftzhxawao",
    "name": "Promo_Supply_V2",
    "organization_id": "cbrlzjdoqdynorjnmmrg",
    "region": "us-west-2",
    "status": "ACTIVE_HEALTHY"
  },
  "ssl_enforcement": {
    "appliedSuccessfully": true,
    "currentConfig": {
      "database": false
    }
  },
  "url": "https://lmypcdfsrgfftzhxawao.supabase.co"
}
```

# Storage

Policies de `storage.objects`/`storage.buckets` em `policies.md`. Contagens em `stats.md`.

| bucket | público | limite por arquivo | mime permitidos | criado em |
|---|---|---|---|---|
| comprovantes | não |  |  | 2026-09-11 13:52:59.867103+00:00 |
| documentos | não | 10.0 MB |  | 2026-09-11 13:53:00.027510+00:00 |
| fiscal-documents | não |  |  | 2026-09-11 13:53:00.330793+00:00 |
| product-images | sim | 5.0 MB | image/png, image/jpeg, image/webp | 2026-09-11 13:53:00.632595+00:00 |

## Configuração (Management API)

```json
{
  "capabilities": {
    "iceberg_catalog": true,
    "list_v2": true,
    "object_versioning": false
  },
  "external": {
    "upstreamTarget": "canary"
  },
  "features": {
    "icebergCatalog": {
      "enabled": true,
      "maxCatalogs": 2,
      "maxNamespaces": 10,
      "maxTables": 10
    },
    "imageTransformation": {
      "enabled": true
    },
    "purgeCache": {
      "enabled": true
    },
    "s3Protocol": {
      "enabled": true
    },
    "vectorBuckets": {
      "enabled": true,
      "maxBuckets": 10,
      "maxIndexes": 5
    }
  },
  "fileSizeLimit": 52428800,
  "migrationVersion": "s3-multipart-uploads-parts-index"
}
```

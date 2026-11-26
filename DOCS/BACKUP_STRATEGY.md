# Backup & Recovery Strategy

> **F-053** — This document establishes the backup strategy for the promo-supply-v2 platform.  
> Owner: Engineering / DBA  
> Last updated: 2026-07-19

---

## 1. What We're Protecting

| Asset | Criticality | Sensitivity |
|---|---|---|
| Supabase PostgreSQL (all tables) | CRITICAL | Contains all business data |
| Supabase Storage (file uploads) | HIGH | Invoices, NF-e, contracts |
| Edge Function source code | MEDIUM | In Git — covered by VCS |
| Environment variables / secrets | HIGH | In Supabase Vault + `.env.production` |
| Frontend build artifacts | LOW | Reproducible from source |

---

## 2. Supabase Managed Backups (Platform Level)

Supabase Pro/Team plans include automated daily backups with **7-day retention** (PITR
available on Enterprise). This is the first layer of protection.

| Setting | Value |
|---|---|
| Backup type | Daily logical dump (pg_dump) |
| Retention | 7 days (Pro) / 30 days (Team) |
| Restore path | Supabase Dashboard → Settings → Backups |
| PITR (point-in-time recovery) | Enterprise plan only |

**Action required**: Verify the Supabase plan includes backups at  
`https://supabase.com/dashboard/project/<PROJECT_ID>/settings/general`.

---

## 3. Application-Level Backup Script

For long-retention or off-site copies, use the script at  
`scripts/backup-db.sh` (to be created — see §7).

```bash
# Export a full logical dump via psql
PGPASSWORD="$DB_PASSWORD" pg_dump \
  --host "$DB_HOST" \
  --port 5432 \
  --username postgres \
  --dbname postgres \
  --format=custom \
  --compress=9 \
  --file "backups/promo-supply-$(date +%Y%m%d_%H%M%S).pgdump"
```

Upload to a separate S3-compatible bucket with versioning enabled.

---

## 4. Supabase Storage Backup

Supabase Storage objects are stored in S3 internally. For an application-level copy:

```bash
# List all objects in a bucket (requires service-role key)
curl "https://<PROJECT_REF>.supabase.co/storage/v1/object/list/<BUCKET>" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

A nightly cron job should mirror critical buckets (`nf-e`, `contratos`, `receipts`) to
an external S3/R2 bucket using the Supabase Storage REST API or `rclone`.

---

## 5. Recovery Procedures

### 5.1 Restore from Supabase Dashboard
1. Go to Dashboard → Settings → Backups
2. Select the desired backup timestamp
3. Click "Restore" — downtime of ~5–15 minutes expected
4. Validate: run `SELECT count(*) FROM solicitacoes` to confirm row counts

### 5.2 Restore from pg_dump (application-level)
```bash
PGPASSWORD="$DB_PASSWORD" pg_restore \
  --host "$DB_HOST" \
  --port 5432 \
  --username postgres \
  --dbname postgres \
  --clean --if-exists \
  "backups/promo-supply-<timestamp>.pgdump"
```

### 5.3 Point-in-Time Recovery (Enterprise only)
Contact Supabase support with the target timestamp. Estimated RTO: 30–60 minutes.

---

## 6. RPO and RTO Targets

| Metric | Target | How we achieve it |
|---|---|---|
| RPO (data loss) | ≤ 24 h | Daily Supabase backup |
| RPO (data loss) — critical tables | ≤ 1 h | PITR on Enterprise; or hourly WAL shipping |
| RTO (restore time) | ≤ 2 h | Supabase dashboard restore |
| RTO — full recovery | ≤ 4 h | pg_dump restore + app redeploy |

---

## 7. Runbook: Backup Verification (Monthly)

Run this monthly to confirm backups are valid:

```bash
# 1. Download the most recent backup
# 2. Restore to a temporary database
# 3. Count critical tables
psql "$TEST_DB_URL" -c "SELECT 'solicitacoes' AS t, count(*) FROM solicitacoes
  UNION ALL SELECT 'pedidos', count(*) FROM pedidos
  UNION ALL SELECT 'approval_workflows', count(*) FROM approval_workflows;"
# 4. Confirm counts match production (approximate OK — within 5%)
# 5. Drop the test database
```

Document the result in the engineering changelog.

---

## 8. Secrets and Credential Backup

- `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, and other secrets are stored in:
  - **Supabase Vault** (recommended) — encrypted at rest
  - **CI/CD secrets** (GitHub Actions / Vercel environment variables)
- The plain-text values MUST NOT be committed to Git
- Keep an encrypted copy (e.g., 1Password / Bitwarden) for emergency access
- Rotate all keys after any suspected breach — follow `DOCS/SECURITY.md`

---

## 9. Gaps and Next Steps

| Gap | Priority | Owner |
|---|---|---|
| No automated off-site backup script (`scripts/backup-db.sh`) | HIGH | Engineering |
| Storage backup not automated | MEDIUM | Engineering |
| PITR not enabled (requires Enterprise plan) | MEDIUM | CTO decision |
| Monthly backup verification not on calendar | HIGH | Engineering Lead |
| Backup encryption key management undocumented | HIGH | Engineering |

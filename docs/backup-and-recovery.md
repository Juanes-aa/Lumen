# Backup and Recovery

## Overview

Lumen's persistence layer is entirely managed by **Supabase** (PostgreSQL hosted on AWS). This document describes what data exists, how it's protected, and how to recover from failure scenarios.

---

## What Data Exists

| Table | Description | Criticality |
|---|---|---|
| `auth.users` | Supabase-managed user identities | Critical |
| `user_profile` | Semantic profile (genres, themes, directors) | High |
| `movies_watched` | User's movie library | High |
| `analysis_sessions` | Chat session metadata | High |
| `analysis_messages` | Full conversation history | High |
| `semantic_tags` | LLM-extracted JSONB tags | Medium |
| `recommendations` | AI-generated recommendations | Low (regenerable) |
| `background_jobs` | Async job audit log | Low |
| `user_message_usage` | Daily LLM usage counters | Low |

---

## Supabase Built-in Protections

### Point-in-Time Recovery (PITR)
- Available on **Pro** plan and above.
- Supabase takes continuous WAL (Write-Ahead Log) backups.
- Recovery granularity: **any point in the last 7 days** (Pro) or **30 days** (Team/Enterprise).
- To restore: Dashboard → Project Settings → Backups → "Restore to a point in time".

### Daily Snapshots
- Supabase automatically takes a **daily full snapshot** of the database.
- Retained for **7 days** on Pro, **30 days** on Team.
- To restore a snapshot: Dashboard → Project Settings → Backups → select snapshot → Restore.

> **Note:** Restoring a snapshot replaces the entire database. Coordinate with users before doing this in production.

---

## Manual Export Strategy

For off-platform backups (hedge against Supabase outage), run periodic exports.

### Full schema + data dump

```bash
# Requires: psql installed, DATABASE_URL from Supabase Project Settings → Database
pg_dump "$DATABASE_URL" \
  --no-owner \
  --no-acl \
  --format=custom \
  --file="lumen_backup_$(date +%Y%m%d_%H%M%S).dump"
```

### Restore from dump

```bash
pg_restore \
  --no-owner \
  --no-acl \
  --dbname="$DATABASE_URL" \
  lumen_backup_YYYYMMDD_HHMMSS.dump
```

### Recommended frequency

| Environment | Frequency | Storage |
|---|---|---|
| Production | Daily (cron) | S3 / Backblaze B2 |
| Staging | Weekly | Local or S3 |

---

## Soft-Delete Recovery

`analysis_sessions` uses soft delete (`deleted_at` column). Sessions are never physically removed until explicitly purged.

To recover a soft-deleted session for a user:

```sql
-- Find recently soft-deleted sessions
SELECT id, user_id, started_at, deleted_at
FROM analysis_sessions
WHERE deleted_at IS NOT NULL
  AND user_id = '<user_uuid>'
ORDER BY deleted_at DESC
LIMIT 10;

-- Restore a specific session
UPDATE analysis_sessions
SET deleted_at = NULL
WHERE id = '<session_uuid>'
  AND user_id = '<user_uuid>';
```

---

## RLS and Auth Recovery

Row Level Security (RLS) is enabled on all user-facing tables. Service role access (used by the backend) bypasses RLS.

If a user loses access to their account:
1. Use Supabase Dashboard → Authentication → Users → find user by email.
2. Send a password reset email or manually update credentials.
3. Do **not** delete and re-create the user — this changes the `auth.users.id` UUID, breaking all FK references.

---

## Disaster Recovery Scenarios

### Scenario 1: Accidental data deletion by a user
- **Impact:** Soft-deleted sessions only (DELETE endpoint applies soft delete).
- **Recovery:** Run SQL above to set `deleted_at = NULL`.
- **Time to recover:** < 5 minutes.

### Scenario 2: Bug causes mass incorrect writes
- **Impact:** Data corruption in one or more tables.
- **Recovery:** Use PITR to restore the DB to the last known good state.
- **Time to recover:** 15–60 minutes depending on Supabase restore speed.
- **Action:** After restore, redeploy the fixed backend version.

### Scenario 3: Supabase regional outage
- **Impact:** Full service unavailability.
- **Recovery:** Wait for Supabase to restore service (check status.supabase.com).
- **Mitigation:** If SLA is critical, enable Supabase **read replicas** on Enterprise plan.

### Scenario 4: Supabase account compromise
- **Impact:** Potential data exfiltration or deletion.
- **Recovery:**
  1. Rotate all Supabase keys immediately (service_role, anon, JWT secret).
  2. Update env vars on Render (backend) and Vercel (frontend).
  3. Invalidate all active sessions via Supabase Dashboard.
  4. Audit `auth.audit_log_entries` for unauthorized actions.

---

## Key Rotation Checklist

When rotating credentials (Supabase keys, Groq API key, TMDB key):

1. Generate new key in the respective dashboard.
2. Update `SUPABASE_SERVICE_ROLE_KEY` / `GROQ_API_KEY` / `TMDB_API_KEY` in:
   - Render environment variables (backend).
   - `.env.local` locally (never committed to git).
3. Restart the backend service on Render.
4. Verify health endpoint responds: `GET /health`.
5. Revoke the old key after confirming the new one works.

---

## Monitoring

- **Supabase Dashboard → Logs:** Real-time query logs, error rates, slow queries.
- **Render Dashboard:** Backend crash logs, memory/CPU metrics.
- **Vercel Dashboard:** Frontend build and runtime logs.

No external monitoring (Datadog, Sentry, etc.) is configured as of this writing. Adding error tracking (e.g., Sentry) is recommended before scaling beyond 100 users.

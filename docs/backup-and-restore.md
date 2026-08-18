# Backup and restore

An attempt cannot be recreated. Once a trainer has sat the test, the record of
what they answered exists in one place, so this is the part of the system where
losing data costs the most and is noticed the latest.

## What runs

[`.github/workflows/backup.yml`](../.github/workflows/backup.yml) dumps the
`public` and `private` schemas once a day, at 19:40 UTC, and uploads the
gzipped result to Cloudflare R2. Supabase's own schemas are excluded: they belong to the platform
and only make the dump harder to replay elsewhere.

Objects land under two keys:

- `assessment/YYYY/MM/DD/YYYYMMDDTHHMMSSZ.sql.gz` — the history
- `assessment/latest.sql.gz` — overwritten each run, so a restore never has to
  hunt for the newest file

The job refuses to upload a dump that is implausibly small, fails its gzip
integrity check, or does not contain the `attempts` table. A backup that looks
like a backup but is not one is worse than no backup at all.

## What it protects against, and what it does not

| Failure | Covered |
|---|---|
| A table dropped, a bad migration, a mistaken reset | Yes — restore from the last daily dump |
| The Supabase project deleted or lost | Yes — restore into a new project |
| Supabase having an outage | **No.** The data is safe; the application is down |

R2 is object storage. It holds the data, it cannot serve it. During a Supabase
outage the assessment is unavailable, and the honest mitigation is to reschedule
sittings, not to fail over. See *Standby* below for what real failover would
cost.

**Recovery point:** up to a day of attempts. A sitting that runs after the last
dump and is lost before the next one has to be sat again, so run the workflow by
hand at the end of a sitting day, and before any migration or reset.

**Recovery time:** minutes to restore, plus the time to repoint
`NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY` and redeploy.

## Setting it up

Four repository secrets, under **Settings → Secrets and variables → Actions**:

| Secret | Where it comes from |
|---|---|
| `SUPABASE_DB_URL` | Supabase → Project Settings → Database → Connection string. Use the **direct** string, not the pooler: `pg_dump` over a pooled connection can produce an inconsistent snapshot |
| `R2_ACCOUNT_ID` | Cloudflare dashboard → R2 → account ID in the endpoint |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | R2 → Manage API tokens → a token with **Object Read & Write**, scoped to the backup bucket |
| `R2_BUCKET` | The bucket name |

Add a lifecycle rule on the bucket to expire objects after the retention you
want. At one dump a day, 90 days is 90 objects of a few megabytes — comfortably
inside R2's free 10 GB.

Two things about scheduled workflows on GitHub's free tier: a run can be delayed
when the platform is busy, and schedules stop firing after 60 days without
repository activity. Check the Actions tab occasionally, and treat the manual
run as the reliable one before anything risky.

Run the workflow once by hand (**Actions → Database backup → Run workflow**)
and confirm an object appears. A backup pipeline nobody has watched succeed is a
hypothesis.

## Restoring into Supabase

Into a fresh project, as the `postgres` role:

```bash
aws s3 cp "s3://$R2_BUCKET/assessment/latest.sql.gz" . \
  --endpoint-url "https://$R2_ACCOUNT_ID.r2.cloudflarestorage.com"
gunzip backup.sql.gz
psql "$NEW_SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f backup.sql
```

The dump carries its own `CREATE TABLE` and `GRANT` statements, so the target
needs no migrations applied first. It does need the Supabase roles the grants
name — `service_role`, `anon`, `authenticated` — which every Supabase project
already has.

Then point the deployment at the new project: `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`.

## Restoring anywhere else

Neon, RDS, or a local Postgres has no Supabase roles, so create stubs before
replaying the dump:

```sql
create role anon;
create role authenticated;
create role service_role;
```

`private.hash_password` resolves pgcrypto at migration time, so the target needs
the `pgcrypto` extension available. Everything else in these two schemas is
plain Postgres.

## Testing the restore

Restore `latest.sql.gz` into a scratch database once a quarter and check the
counts of `attempts`, `candidates`, and `questions` against production. The
first real restore should not be the first restore.

## Standby

A second live database — Neon or another Supabase project — with the dump
replayed into it would shorten an outage to a redeploy. It is not free:

- The permission model has to be rebuilt on the target, since the application
  authenticates as `service_role` and every RPC is granted to it.
- The copy is as old as the last dump, so anything since is lost on promotion.
- Someone has to decide to promote, and undo it afterwards.

For an assessment that runs in scheduled cycles rather than continuously, the
cheaper answer is usually to sit the affected trainers later. Revisit this if
assessments start running continuously across regions.

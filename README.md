# Shahi Trainer Assessment

Next.js App Router assessment application backed by Supabase PostgreSQL.
Candidates enter unverified profile and training-location details, receive a
randomized guest attempt, complete a timed assessment, and receive a
server-scored result. Administrators configure locations and tests, load the
question bank, and export reports.

## Backend setup

1. Create a Supabase project.
2. Apply every file in [`supabase/migrations/`](supabase/migrations) in filename
   order, through the SQL editor or a migration workflow. They must run as the
   `postgres` role: `service_role` holds no table grants, by design.
3. Create the first administrator with
   [`supabase/imports/create-admin.sql`](supabase/imports/create-admin.sql),
   after replacing the address and password in it.
4. Copy `.env.example` to `.env.local` and enter the project URL, publishable
   key, and server secret key.
5. Sign in at `/login/admin` and use **Settings** to add the states and centres
   trainers pick from, create the test, and upload its question sheet.

The repository ships with no data: there is no seed file and no bundled question
bank. Every state, centre, test, and question is created through Settings, so a
fresh deployment starts empty by construction.
[`supabase/imports/reset-data.sql`](supabase/imports/reset-data.sql) returns a
database to that state, keeping the schema and the administrator accounts.

The Supabase secret key is server-only. It must never be renamed with a
`NEXT_PUBLIC_` prefix or imported into a Client Component.

## Deployment

The app is a standard Next.js server: any host running Node 20.9 or later works,
and Vercel needs no configuration beyond the environment variables.

1. Apply every migration to the production Supabase project, then run
   `supabase/imports/create-admin.sql` with a real address and password.
2. Set three environment variables on the host: `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY`. The secret
   key is server-only and must never carry a `NEXT_PUBLIC_` prefix.
3. Build with `pnpm install --frozen-lockfile && pnpm build`, serve with
   `pnpm start`.
4. Serve over HTTPS. Session cookies are issued with `Secure` in production, so
   sign-in silently fails over plain HTTP.
5. When running more than one instance, set `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`
   to the same base64 32-byte value everywhere, or Server Actions encrypted by
   one instance fail on another.

Question sheets are posted to a Server Action, capped at 4 MB by the app to stay
under the request-body limit serverless platforms impose.

## Verification

The repository supports non-server checks with:

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm exec next build
```

The development server is intentionally not started as part of automated agent
work in this repository.

## Candidate flow

- Regions and hubs are loaded from Supabase on the server.
- Login input is validated in the browser and again in the Server Action.
- A random opaque guest token is stored in an HTTP-only cookie; only its
  SHA-256 hash is stored in PostgreSQL.
- The database selects and persists the configured number of randomized
  questions and randomized option orders per attempt.
- The database timer begins only after the candidate proceeds through the
  instruction modal.
- Answers, visited state, review flags, and attempt events are persisted against
  the guest session.
- Leaving the assessment is counted server-side. Past the test's allowance the
  attempt is submitted automatically, whatever the browser does.
- Where a test has translations, the candidate can switch language at any point;
  the choice is stored on the attempt and the questions keep their ids, so
  answers and the timer survive the switch.
- Submission and scoring are transactional and idempotent.
- Correct answer keys remain in a private database schema and are returned only
  for a submitted result.

## Admin sections

| Route | What it does |
|---|---|
| `/admin/dashboard` | Overview of attempts, scores, and recent activity |
| `/admin/states` | State-wise metrics and centre coverage |
| `/admin/trainers` | Every trainer with their attempt and score |
| `/admin/leaderboard` | Ranked results |
| `/admin/analytics` | Cohort analysis, timing, and item analysis |
| `/admin/reports` | Excel downloads: attempts, trainers, centres, questions |
| `/admin/settings` | Locations, tests, question bank, and languages |

Every administrator action runs through a security definer function gated on a
live admin session, so `service_role` never needs table access.

## Question bank

The expected workbook shape, the normalisation the importer applies, and the
rules for translated sheets are documented in
[`docs/question-bank-import.md`](docs/question-bank-import.md). Sheets are
uploaded through **Settings → Tests → Questions**, which previews what an import
would create before writing anything.

## Technical decisions

[`DECISIONS.md`](DECISIONS.md) records the decisions behind the data model, the
guest session boundary, the admin surface, and the anti-cheating rules.

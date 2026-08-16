# Shahi Trainer Assessment

Next.js App Router assessment application backed by Supabase PostgreSQL. Candidates enter unverified profile and training-location details, receive a randomized guest attempt, complete a timed assessment, and receive a server-scored result.

## Backend setup

1. Create a Supabase project.
2. Apply [`supabase/migrations/202608160001_initial_assessment_backend.sql`](supabase/migrations/202608160001_initial_assessment_backend.sql) through the Supabase SQL editor or migration workflow.
3. Apply [`supabase/seed.sql`](supabase/seed.sql) to create the initial regions, hubs, and assessment configuration.
4. Copy `.env.example` to `.env.local` and enter the project URL, publishable key, and server secret key.
5. Import at least 50 approved questions and their private answer keys before testing login.

The Supabase secret key is server-only. It must never be renamed with a `NEXT_PUBLIC_` prefix or imported into a Client Component.

## Verification

The repository supports non-server checks with:

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm exec next build --webpack
```

The development server is intentionally not started as part of automated agent work in this repository.

## Current backend flow

- Regions and hubs are loaded from Supabase on the server.
- Login input is validated in the browser and again in the Server Action.
- A random opaque guest token is stored in an HTTP-only cookie; only its SHA-256 hash is stored in PostgreSQL.
- The database selects and persists 50 randomized questions and randomized option orders per attempt.
- The database timer begins only after the candidate proceeds through the instruction modal.
- Answers, visited state, review flags, and attempt events are persisted against the guest session.
- Submission and scoring are transactional and idempotent.
- Correct answer keys remain in a private database schema and are returned only for a submitted result.

## Question bank

The expected workbook shape and validation rules are documented in [`docs/question-bank-import.md`](docs/question-bank-import.md). The actual approved workbook is required before the import adapter and production question data can be completed.

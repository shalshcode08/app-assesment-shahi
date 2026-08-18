# Running SQL by hand

`service_role` deliberately has no table grants, so anything that writes rows
directly has to run as the `postgres` role in the Supabase SQL Editor.

**Schema changes live in `supabase/migrations/`.** Paste the migration file
itself; this directory used to hold copies of them, which only created two
places to edit the same function.

| File | What it does |
|---|---|
| `create-admin.sql` | Creates or resets an administrator. Edit the address and password first |
| `reset-data.sql` | Empties every table of data, keeping the schema and the administrators. Destructive |
| `admin-setup.sql` | Admin auth objects, kept for a database that predates the migrations |
| `operations.sql` | Day-to-day queries the interface does not cover: readiness checks, stale attempts, bank health, admin recovery. Copy one block at a time |

There is no seed file and no bundled question bank: states, centres, tests, and
questions are all created through **Settings** in the admin interface.

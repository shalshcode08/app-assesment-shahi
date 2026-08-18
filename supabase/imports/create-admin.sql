-- Creates or resets an administrator account.
--
-- Run as the `postgres` role in the SQL Editor. Replace the address, name, and
-- password below before running: whatever is written here is what the account
-- will accept, and this file is committed to the repository.
--
-- Choose a password of real length. Sign-in hashes with bcrypt and locks the
-- account after repeated failures, but neither saves a guessable password.

insert into private.admins (email, password_hash, full_name)
values (
  'admin@example.com',
  private.hash_password('replace-this-password'),
  'Administrator'
)
on conflict (email) do update
set password_hash = excluded.password_hash,
    full_name = excluded.full_name,
    is_active = true,
    failed_attempt_count = 0,
    locked_until = null;

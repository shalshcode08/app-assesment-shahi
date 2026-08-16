-- DEV ONLY. Creates the development admin account.
-- Do not run this against production: the password is weak and public.
--
--   email:    admin@gmail.com
--   password: admin123

insert into private.admins (email, password_hash, full_name)
values (
  'admin@gmail.com',
  private.hash_password('admin123'),
  'Dev Admin'
)
on conflict (email) do update
set password_hash = excluded.password_hash,
    full_name = excluded.full_name,
    is_active = true,
    failed_attempt_count = 0,
    locked_until = null;

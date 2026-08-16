-- Admin authentication: identities, sessions, and the RPCs the app calls.
-- Mirrors the guest attempt model: everything lives behind security definer
-- functions, and service_role gets execute grants but no table access.

create table private.admins (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  full_name text,
  is_active boolean not null default true,
  failed_attempt_count integer not null default 0,
  locked_until timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admins_email_normalized check (email = lower(btrim(email))),
  constraint admins_failed_attempt_count_valid check (failed_attempt_count >= 0)
);

create table private.admin_sessions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references private.admins(id) on delete cascade,
  session_token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint admin_sessions_token_hash_format check (session_token_hash ~ '^[a-f0-9]{64}$')
);

create index admin_sessions_admin_id_idx on private.admin_sessions (admin_id);

create trigger admins_set_updated_at
  before update on private.admins
  for each row execute function private.set_updated_at();

alter table private.admins enable row level security;
alter table private.admin_sessions enable row level security;

-- pgcrypto may live in `public` or `extensions` depending on the environment,
-- so resolve its schema once and bake it into wrappers. This keeps the callers
-- on `search_path = ''` instead of trusting a mutable search path.
do $do$
declare
  v_schema text;
begin
  select n.nspname
  into v_schema
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where p.proname = 'crypt'
  limit 1;

  if v_schema is null then
    raise exception 'pgcrypto is not installed: crypt() not found';
  end if;

  execute format($f$
    create or replace function private.hash_password(p_password text)
    returns text
    language sql
    security definer
    set search_path = ''
    as $body$
      select %I.crypt(p_password, %I.gen_salt('bf', 12));
    $body$;
  $f$, v_schema, v_schema);

  execute format($f$
    create or replace function private.password_matches(p_password text, p_hash text)
    returns boolean
    language sql
    security definer
    set search_path = ''
    as $body$
      select %I.crypt(p_password, p_hash) = p_hash;
    $body$;
  $f$, v_schema);
end
$do$;

revoke all on function private.hash_password(text) from public, anon, authenticated, service_role;
revoke all on function private.password_matches(text, text) from public, anon, authenticated, service_role;

-- Verifies a password and opens a session.
--
-- Returns a status row rather than raising, because raising would roll back the
-- failed-attempt counter that the lockout depends on.
create or replace function public.authenticate_admin(
  p_email text,
  p_password text,
  p_session_token_hash text,
  p_session_ttl_seconds integer default 28800
)
returns table (
  status text,
  admin_id uuid,
  email text,
  full_name text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin private.admins%rowtype;
  v_now timestamptz := clock_timestamp();
  v_expires_at timestamptz;
  v_max_failed_attempts constant integer := 5;
  v_lockout_interval constant interval := interval '15 minutes';
begin
  if p_session_token_hash !~ '^[a-f0-9]{64}$' then
    raise exception using errcode = 'P0001', message = 'INVALID_SESSION_TOKEN';
  end if;

  select a.*
  into v_admin
  from private.admins a
  where a.email = lower(btrim(p_email))
  for update;

  -- Always spend a hash comparison so a missing account is not measurably
  -- faster to probe than a wrong password.
  if v_admin.id is null then
    perform private.hash_password(p_password);
    return query select 'invalid_credentials'::text, null::uuid, null::text, null::text, null::timestamptz;
    return;
  end if;

  if not v_admin.is_active then
    return query select 'inactive'::text, null::uuid, null::text, null::text, null::timestamptz;
    return;
  end if;

  if v_admin.locked_until is not null and v_admin.locked_until > v_now then
    return query select 'locked'::text, null::uuid, null::text, null::text, v_admin.locked_until;
    return;
  end if;

  if not private.password_matches(p_password, v_admin.password_hash) then
    update private.admins a
    set failed_attempt_count = a.failed_attempt_count + 1,
        locked_until = case
          when a.failed_attempt_count + 1 >= v_max_failed_attempts
            then v_now + v_lockout_interval
          else null
        end
    where a.id = v_admin.id;

    return query select 'invalid_credentials'::text, null::uuid, null::text, null::text, null::timestamptz;
    return;
  end if;

  v_expires_at := v_now + make_interval(secs => p_session_ttl_seconds);

  update private.admins a
  set failed_attempt_count = 0,
      locked_until = null,
      last_login_at = v_now
  where a.id = v_admin.id;

  delete from private.admin_sessions s where s.expires_at <= v_now;

  insert into private.admin_sessions (admin_id, session_token_hash, expires_at)
  values (v_admin.id, p_session_token_hash, v_expires_at);

  return query
  select 'ok'::text, v_admin.id, v_admin.email, v_admin.full_name, v_expires_at;
end;
$$;

create or replace function public.get_admin_session(
  p_session_token_hash text
)
returns table (
  admin_id uuid,
  email text,
  full_name text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
begin
  update private.admin_sessions s
  set last_seen_at = v_now
  where s.session_token_hash = p_session_token_hash
    and s.expires_at > v_now;

  return query
  select a.id, a.email, a.full_name, s.expires_at
  from private.admin_sessions s
  join private.admins a on a.id = s.admin_id
  where s.session_token_hash = p_session_token_hash
    and s.expires_at > v_now
    and a.is_active;
end;
$$;

create or replace function public.revoke_admin_session(
  p_session_token_hash text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  delete from private.admin_sessions s
  where s.session_token_hash = p_session_token_hash;

  get diagnostics v_deleted = row_count;

  return v_deleted;
end;
$$;

revoke all on function public.authenticate_admin(text, text, text, integer) from public, anon, authenticated;
revoke all on function public.get_admin_session(text) from public, anon, authenticated;
revoke all on function public.revoke_admin_session(text) from public, anon, authenticated;

grant execute on function public.authenticate_admin(text, text, text, integer) to service_role;
grant execute on function public.get_admin_session(text) to service_role;
grant execute on function public.revoke_admin_session(text) to service_role;

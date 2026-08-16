create extension if not exists pgcrypto;

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

alter default privileges in schema public
  revoke all on tables from anon, authenticated, service_role;
alter default privileges in schema public
  revoke all on sequences from anon, authenticated, service_role;
alter default privileges in schema public
  revoke execute on functions from public, anon, authenticated, service_role;

create table public.regions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint regions_code_format check (code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint regions_name_not_blank check (btrim(name) <> '')
);

create table public.hubs (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null references public.regions(id),
  code text not null,
  name text not null,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hubs_region_code_unique unique (region_id, code),
  constraint hubs_code_format check (code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint hubs_name_not_blank check (btrim(name) <> '')
);

create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  normalized_email text not null unique,
  region_id uuid not null references public.regions(id),
  hub_id uuid not null references public.hubs(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint candidates_full_name_not_blank check (btrim(full_name) <> ''),
  constraint candidates_email_normalized check (normalized_email = lower(btrim(email)))
);

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessments_code_format check (code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint assessments_title_not_blank check (btrim(title) <> '')
);

create table public.assessment_versions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id),
  version_number integer not null,
  title text not null,
  status text not null default 'draft',
  duration_seconds integer not null,
  questions_per_attempt integer not null,
  passing_percentage numeric(5, 2) not null,
  maximum_attempts_per_email integer not null default 1,
  available_from timestamptz,
  available_until timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessment_versions_number_unique unique (assessment_id, version_number),
  constraint assessment_versions_status_valid check (status in ('draft', 'published', 'archived')),
  constraint assessment_versions_duration_positive check (duration_seconds > 0),
  constraint assessment_versions_question_count_positive check (questions_per_attempt > 0),
  constraint assessment_versions_passing_percentage_valid check (passing_percentage between 0 and 100),
  constraint assessment_versions_maximum_attempts_positive check (maximum_attempts_per_email > 0),
  constraint assessment_versions_availability_valid check (
    available_from is null or available_until is null or available_from < available_until
  )
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  assessment_version_id uuid not null references public.assessment_versions(id),
  external_code text not null,
  question_text text not null,
  question_type text not null default 'single_choice',
  marks numeric(8, 2) not null default 1,
  category text,
  difficulty text,
  explanation text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint questions_version_code_unique unique (assessment_version_id, external_code),
  constraint questions_text_not_blank check (btrim(question_text) <> ''),
  constraint questions_type_supported check (question_type = 'single_choice'),
  constraint questions_marks_positive check (marks > 0),
  constraint questions_difficulty_valid check (
    difficulty is null or difficulty in ('easy', 'medium', 'hard')
  )
);

create table public.question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  option_code text not null,
  option_text text not null,
  display_order integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint question_options_question_code_unique unique (question_id, option_code),
  constraint question_options_question_order_unique unique (question_id, display_order),
  constraint question_options_id_question_unique unique (id, question_id),
  constraint question_options_text_not_blank check (btrim(option_text) <> ''),
  constraint question_options_display_order_positive check (display_order > 0)
);

create table private.question_answer_keys (
  question_id uuid primary key references public.questions(id) on delete cascade,
  correct_option_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint question_answer_keys_option_belongs_to_question
    foreign key (correct_option_id, question_id)
    references public.question_options(id, question_id)
);

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  assessment_version_id uuid not null references public.assessment_versions(id),
  candidate_id uuid not null references public.candidates(id),
  candidate_name_snapshot text not null,
  candidate_email_snapshot text not null,
  region_id_snapshot uuid not null references public.regions(id),
  hub_id_snapshot uuid not null references public.hubs(id),
  status text not null default 'ready',
  started_at timestamptz,
  expires_at timestamptz,
  submitted_at timestamptz,
  score_obtained numeric(10, 2),
  maximum_score numeric(10, 2),
  score_percentage numeric(5, 2),
  qualified boolean,
  correct_count integer,
  incorrect_count integer,
  unanswered_count integer,
  tab_warning_count integer not null default 0,
  attempt_token_hash text not null unique,
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attempts_status_valid check (
    status in ('ready', 'in_progress', 'submitted', 'expired', 'invalidated', 'abandoned')
  ),
  constraint attempts_timing_valid check (
    (status = 'ready' and started_at is null and expires_at is null)
    or (
      status in ('in_progress', 'submitted', 'expired', 'abandoned')
      and started_at is not null
      and expires_at is not null
    )
    or status = 'invalidated'
  ),
  constraint attempts_score_percentage_valid check (
    score_percentage is null or score_percentage between 0 and 100
  )
);

create unique index attempts_one_open_per_candidate_version
  on public.attempts (candidate_id, assessment_version_id)
  where status in ('ready', 'in_progress');

create table public.attempt_questions (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  question_id uuid not null references public.questions(id),
  display_order integer not null,
  is_visited boolean not null default false,
  is_flagged boolean not null default false,
  first_visited_at timestamptz,
  last_visited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attempt_questions_question_unique unique (attempt_id, question_id),
  constraint attempt_questions_order_unique unique (attempt_id, display_order),
  constraint attempt_questions_order_positive check (display_order > 0)
);

create table public.attempt_question_options (
  attempt_question_id uuid not null references public.attempt_questions(id) on delete cascade,
  option_id uuid not null references public.question_options(id),
  display_order integer not null,
  primary key (attempt_question_id, option_id),
  constraint attempt_question_options_order_unique unique (attempt_question_id, display_order),
  constraint attempt_question_options_order_positive check (display_order > 0)
);

create table public.attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  attempt_question_id uuid not null references public.attempt_questions(id) on delete cascade,
  selected_option_id uuid references public.question_options(id),
  revision integer not null default 1,
  answered_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attempt_answers_question_unique unique (attempt_id, attempt_question_id),
  constraint attempt_answers_revision_positive check (revision > 0)
);

create table public.attempt_events (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  event_type text not null,
  client_occurred_at timestamptz,
  received_at timestamptz not null default now(),
  dedupe_key text,
  metadata jsonb not null default '{}'::jsonb,
  constraint attempt_events_dedupe_unique unique (attempt_id, dedupe_key),
  constraint attempt_events_type_valid check (
    event_type in (
      'page_hidden',
      'window_blurred',
      'fullscreen_exited',
      'connection_lost',
      'connection_restored',
      'attempt_resumed'
    )
  )
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_type text not null,
  actor_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  request_id text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index hubs_active_region_order_idx
  on public.hubs (region_id, display_order)
  where is_active;

create index hubs_region_id_idx
  on public.hubs (region_id);

create index candidates_region_id_idx
  on public.candidates (region_id);

create index candidates_hub_id_idx
  on public.candidates (hub_id);

create index questions_active_version_idx
  on public.questions (assessment_version_id)
  where is_active;

create index question_answer_keys_correct_option_id_idx
  on private.question_answer_keys (correct_option_id);

create index attempts_assessment_version_id_idx
  on public.attempts (assessment_version_id);

create index attempts_candidate_id_idx
  on public.attempts (candidate_id);

create index attempts_region_id_snapshot_idx
  on public.attempts (region_id_snapshot);

create index attempts_hub_id_snapshot_idx
  on public.attempts (hub_id_snapshot);

create index attempt_questions_attempt_order_idx
  on public.attempt_questions (attempt_id, display_order);

create index attempt_questions_question_id_idx
  on public.attempt_questions (question_id);

create index attempt_question_options_option_id_idx
  on public.attempt_question_options (option_id);

create index attempt_answers_attempt_idx
  on public.attempt_answers (attempt_id);

create index attempt_answers_attempt_question_id_idx
  on public.attempt_answers (attempt_question_id);

create index attempt_answers_selected_option_id_idx
  on public.attempt_answers (selected_option_id)
  where selected_option_id is not null;

create index attempt_events_attempt_received_idx
  on public.attempt_events (attempt_id, received_at);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger regions_set_updated_at
before update on public.regions
for each row execute function private.set_updated_at();

create trigger hubs_set_updated_at
before update on public.hubs
for each row execute function private.set_updated_at();

create trigger candidates_set_updated_at
before update on public.candidates
for each row execute function private.set_updated_at();

create trigger assessments_set_updated_at
before update on public.assessments
for each row execute function private.set_updated_at();

create trigger assessment_versions_set_updated_at
before update on public.assessment_versions
for each row execute function private.set_updated_at();

create trigger questions_set_updated_at
before update on public.questions
for each row execute function private.set_updated_at();

create trigger question_options_set_updated_at
before update on public.question_options
for each row execute function private.set_updated_at();

create trigger question_answer_keys_set_updated_at
before update on private.question_answer_keys
for each row execute function private.set_updated_at();

create trigger attempts_set_updated_at
before update on public.attempts
for each row execute function private.set_updated_at();

create trigger attempt_questions_set_updated_at
before update on public.attempt_questions
for each row execute function private.set_updated_at();

create trigger attempt_answers_set_updated_at
before update on public.attempt_answers
for each row execute function private.set_updated_at();

create or replace function public.create_guest_attempt(
  p_full_name text,
  p_email text,
  p_region_id uuid,
  p_hub_id uuid,
  p_attempt_token_hash text
)
returns table (
  attempt_id uuid,
  attempt_status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_candidate_id uuid;
  v_version public.assessment_versions%rowtype;
  v_attempt_id uuid;
  v_attempt_status text;
  v_question_count integer;
  v_completed_attempt_count integer;
begin
  if not exists (
    select 1
    from public.hubs h
    join public.regions r on r.id = h.region_id
    where h.id = p_hub_id
      and h.region_id = p_region_id
      and h.is_active
      and r.is_active
  ) then
    raise exception using errcode = '22023', message = 'INVALID_TRAINING_LOCATION';
  end if;

  select av.*
  into v_version
  from public.assessment_versions av
  join public.assessments a on a.id = av.assessment_id
  where av.status = 'published'
    and a.is_active
    and (av.available_from is null or av.available_from <= now())
    and (av.available_until is null or av.available_until > now())
  order by av.published_at desc nulls last, av.version_number desc
  limit 1;

  if v_version.id is null then
    raise exception using errcode = 'P0001', message = 'NO_ACTIVE_ASSESSMENT';
  end if;

  select count(*)::integer
  into v_question_count
  from public.questions q
  where q.assessment_version_id = v_version.id
    and q.is_active
    and exists (
      select 1
      from private.question_answer_keys answer_key
      where answer_key.question_id = q.id
    )
    and (
      select count(*)
      from public.question_options qo
      where qo.question_id = q.id
        and qo.is_active
    ) >= 2;

  if v_question_count < v_version.questions_per_attempt then
    raise exception using errcode = 'P0001', message = 'QUESTION_BANK_INCOMPLETE';
  end if;

  insert into public.candidates (
    full_name,
    email,
    normalized_email,
    region_id,
    hub_id
  )
  values (
    btrim(p_full_name),
    lower(btrim(p_email)),
    lower(btrim(p_email)),
    p_region_id,
    p_hub_id
  )
  on conflict (normalized_email) do update
  set full_name = excluded.full_name,
      email = excluded.email,
      region_id = excluded.region_id,
      hub_id = excluded.hub_id
  returning id into v_candidate_id;

  perform 1
  from public.candidates
  where id = v_candidate_id
  for update;

  select a.id, a.status
  into v_attempt_id, v_attempt_status
  from public.attempts a
  where a.candidate_id = v_candidate_id
    and a.assessment_version_id = v_version.id
    and a.status in ('ready', 'in_progress')
  order by a.created_at desc
  limit 1
  for update;

  if v_attempt_id is not null then
    update public.attempts
    set attempt_token_hash = p_attempt_token_hash,
        candidate_name_snapshot = btrim(p_full_name),
        candidate_email_snapshot = lower(btrim(p_email)),
        region_id_snapshot = p_region_id,
        hub_id_snapshot = p_hub_id,
        last_activity_at = now()
    where id = v_attempt_id;

    return query select v_attempt_id, v_attempt_status;
    return;
  end if;

  select count(*)::integer
  into v_completed_attempt_count
  from public.attempts a
  where a.candidate_id = v_candidate_id
    and a.assessment_version_id = v_version.id
    and a.status = 'submitted';

  if v_completed_attempt_count >= v_version.maximum_attempts_per_email then
    raise exception using errcode = 'P0001', message = 'MAXIMUM_ATTEMPTS_REACHED';
  end if;

  insert into public.attempts (
    assessment_version_id,
    candidate_id,
    candidate_name_snapshot,
    candidate_email_snapshot,
    region_id_snapshot,
    hub_id_snapshot,
    attempt_token_hash
  )
  values (
    v_version.id,
    v_candidate_id,
    btrim(p_full_name),
    lower(btrim(p_email)),
    p_region_id,
    p_hub_id,
    p_attempt_token_hash
  )
  returning id, status into v_attempt_id, v_attempt_status;

  insert into public.attempt_questions (attempt_id, question_id, display_order)
  select
    v_attempt_id,
    selected_questions.id,
    row_number() over (order by selected_questions.random_order)::integer
  from (
    select q.id, random() as random_order
    from public.questions q
    where q.assessment_version_id = v_version.id
      and q.is_active
      and exists (
        select 1
        from private.question_answer_keys answer_key
        where answer_key.question_id = q.id
      )
    order by random_order
    limit v_version.questions_per_attempt
  ) selected_questions;

  insert into public.attempt_question_options (
    attempt_question_id,
    option_id,
    display_order
  )
  select
    option_rows.attempt_question_id,
    option_rows.option_id,
    row_number() over (
      partition by option_rows.attempt_question_id
      order by option_rows.random_order
    )::integer
  from (
    select
      aq.id as attempt_question_id,
      qo.id as option_id,
      random() as random_order
    from public.attempt_questions aq
    join public.question_options qo on qo.question_id = aq.question_id
    where aq.attempt_id = v_attempt_id
      and qo.is_active
  ) option_rows;

  insert into public.audit_logs (
    actor_type,
    actor_id,
    action,
    entity_type,
    entity_id,
    after_data
  )
  values (
    'guest_candidate',
    v_candidate_id,
    'attempt.created',
    'attempt',
    v_attempt_id,
    jsonb_build_object('assessmentVersionId', v_version.id)
  );

  return query select v_attempt_id, v_attempt_status;
end;
$$;

create or replace function public.begin_guest_attempt(
  p_attempt_token_hash text
)
returns table (
  attempt_id uuid,
  attempt_status text,
  started_at timestamptz,
  expires_at timestamptz,
  server_now timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt public.attempts%rowtype;
  v_duration_seconds integer;
  v_server_now timestamptz := clock_timestamp();
begin
  select a.*
  into v_attempt
  from public.attempts a
  where a.attempt_token_hash = p_attempt_token_hash
  for update;

  if v_attempt.id is null then
    raise exception using errcode = 'P0001', message = 'ATTEMPT_NOT_FOUND';
  end if;

  select av.duration_seconds
  into v_duration_seconds
  from public.assessment_versions av
  where av.id = v_attempt.assessment_version_id;

  if v_attempt.status = 'ready' then
    update public.attempts a
    set status = 'in_progress',
        started_at = v_server_now,
        expires_at = v_server_now + make_interval(secs => v_duration_seconds),
        last_activity_at = v_server_now
    where a.id = v_attempt.id
    returning a.* into v_attempt;

    update public.attempt_questions aq
    set is_visited = true,
        first_visited_at = coalesce(aq.first_visited_at, v_server_now),
        last_visited_at = v_server_now
    where aq.attempt_id = v_attempt.id
      and aq.display_order = 1;
  elsif v_attempt.status <> 'in_progress' then
    raise exception using errcode = 'P0001', message = 'ATTEMPT_NOT_ACTIVE';
  end if;

  return query
  select
    v_attempt.id,
    v_attempt.status,
    v_attempt.started_at,
    v_attempt.expires_at,
    v_server_now;
end;
$$;

create or replace function public.get_guest_attempt(
  p_attempt_token_hash text
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'attemptId', a.id,
    'status', a.status,
    'title', av.title,
    'durationSeconds', av.duration_seconds,
    'startedAt', a.started_at,
    'expiresAt', a.expires_at,
    'serverNow', now(),
    'candidate', jsonb_build_object(
      'name', a.candidate_name_snapshot,
      'email', a.candidate_email_snapshot,
      'region', r.name,
      'hub', h.name
    ),
    'questions', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', aq.id,
          'position', aq.display_order,
          'section', coalesce(q.category, 'General'),
          'prompt', q.question_text,
          'isVisited', aq.is_visited,
          'isFlagged', aq.is_flagged,
          'selectedOptionId', aa.selected_option_id,
          'answerRevision', coalesce(aa.revision, 0),
          'options', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', qo.id,
                'label', qo.option_text
              )
              order by aqo.display_order
            )
            from public.attempt_question_options aqo
            join public.question_options qo on qo.id = aqo.option_id
            where aqo.attempt_question_id = aq.id
          ), '[]'::jsonb)
        )
        order by aq.display_order
      )
      from public.attempt_questions aq
      join public.questions q on q.id = aq.question_id
      left join public.attempt_answers aa on aa.attempt_question_id = aq.id
      where aq.attempt_id = a.id
    ), '[]'::jsonb)
  )
  from public.attempts a
  join public.assessment_versions av on av.id = a.assessment_version_id
  join public.regions r on r.id = a.region_id_snapshot
  join public.hubs h on h.id = a.hub_id_snapshot
  where a.attempt_token_hash = p_attempt_token_hash;
$$;

create or replace function public.save_guest_answer(
  p_attempt_token_hash text,
  p_attempt_question_id uuid,
  p_selected_option_id uuid,
  p_revision integer
)
returns table (
  saved_option_id uuid,
  saved_revision integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt_id uuid;
  v_attempt_status text;
  v_expires_at timestamptz;
begin
  if p_revision <= 0 then
    raise exception using errcode = '22023', message = 'INVALID_ANSWER_REVISION';
  end if;

  select a.id, a.status, a.expires_at
  into v_attempt_id, v_attempt_status, v_expires_at
  from public.attempts a
  join public.attempt_questions aq on aq.attempt_id = a.id
  where a.attempt_token_hash = p_attempt_token_hash
    and aq.id = p_attempt_question_id
  for update of a;

  if v_attempt_id is null then
    raise exception using errcode = 'P0001', message = 'ATTEMPT_QUESTION_NOT_FOUND';
  end if;

  if v_attempt_status <> 'in_progress' or v_expires_at <= now() then
    raise exception using errcode = 'P0001', message = 'ATTEMPT_NOT_ACTIVE';
  end if;

  if p_selected_option_id is not null then
    if not exists (
      select 1
      from public.attempt_question_options aqo
      where aqo.attempt_question_id = p_attempt_question_id
        and aqo.option_id = p_selected_option_id
    ) then
      raise exception using errcode = '22023', message = 'INVALID_ANSWER_OPTION';
    end if;

  end if;

  insert into public.attempt_answers (
    attempt_id,
    attempt_question_id,
    selected_option_id,
    revision
  )
  values (
    v_attempt_id,
    p_attempt_question_id,
    p_selected_option_id,
    p_revision
  )
  on conflict (attempt_id, attempt_question_id) do update
  set selected_option_id = excluded.selected_option_id,
      revision = excluded.revision,
      answered_at = now()
  where public.attempt_answers.revision < excluded.revision;

  update public.attempt_questions aq
  set is_visited = true,
      first_visited_at = coalesce(aq.first_visited_at, now()),
      last_visited_at = now()
  where aq.id = p_attempt_question_id;

  update public.attempts a
  set last_activity_at = now()
  where a.id = v_attempt_id;

  return query
  select answer.selected_option_id, answer.revision
  from public.attempt_answers answer
  where answer.attempt_id = v_attempt_id
    and answer.attempt_question_id = p_attempt_question_id;
end;
$$;

create or replace function public.set_guest_question_state(
  p_attempt_token_hash text,
  p_attempt_question_id uuid,
  p_is_flagged boolean default null,
  p_is_visited boolean default true
)
returns table (
  is_flagged boolean,
  is_visited boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt_id uuid;
  v_attempt_status text;
  v_expires_at timestamptz;
begin
  select a.id, a.status, a.expires_at
  into v_attempt_id, v_attempt_status, v_expires_at
  from public.attempts a
  join public.attempt_questions aq on aq.attempt_id = a.id
  where a.attempt_token_hash = p_attempt_token_hash
    and aq.id = p_attempt_question_id
  for update of a;

  if v_attempt_id is null then
    raise exception using errcode = 'P0001', message = 'ATTEMPT_QUESTION_NOT_FOUND';
  end if;

  if v_attempt_status <> 'in_progress' or v_expires_at <= now() then
    raise exception using errcode = 'P0001', message = 'ATTEMPT_NOT_ACTIVE';
  end if;

  update public.attempt_questions aq
  set is_flagged = coalesce(p_is_flagged, aq.is_flagged),
      is_visited = p_is_visited or aq.is_visited,
      first_visited_at = case
        when p_is_visited then coalesce(aq.first_visited_at, now())
        else aq.first_visited_at
      end,
      last_visited_at = case
        when p_is_visited then now()
        else aq.last_visited_at
      end
  where aq.id = p_attempt_question_id
  returning aq.is_flagged, aq.is_visited
  into is_flagged, is_visited;

  update public.attempts a
  set last_activity_at = now()
  where a.id = v_attempt_id;

  return next;
end;
$$;

create or replace function public.submit_guest_attempt(
  p_attempt_token_hash text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt public.attempts%rowtype;
  v_passing_percentage numeric(5, 2);
  v_total_question_count integer;
  v_answered_count integer;
  v_correct_count integer;
  v_maximum_score numeric(10, 2);
  v_score_obtained numeric(10, 2);
  v_score_percentage numeric(5, 2);
begin
  select a.*
  into v_attempt
  from public.attempts a
  where a.attempt_token_hash = p_attempt_token_hash
  for update;

  if v_attempt.id is null then
    raise exception using errcode = 'P0001', message = 'ATTEMPT_NOT_FOUND';
  end if;

  select av.passing_percentage
  into v_passing_percentage
  from public.assessment_versions av
  where av.id = v_attempt.assessment_version_id;

  if v_attempt.status = 'submitted' then
    return v_attempt.id;
  end if;

  if v_attempt.status <> 'in_progress' then
    raise exception using errcode = 'P0001', message = 'ATTEMPT_NOT_SUBMITTABLE';
  end if;

  select
    count(*)::integer,
    count(aa.selected_option_id)::integer,
    count(*) filter (
      where aa.selected_option_id = answer_key.correct_option_id
    )::integer,
    coalesce(sum(q.marks), 0)::numeric(10, 2),
    coalesce(sum(
      case
        when aa.selected_option_id = answer_key.correct_option_id then q.marks
        else 0
      end
    ), 0)::numeric(10, 2)
  into
    v_total_question_count,
    v_answered_count,
    v_correct_count,
    v_maximum_score,
    v_score_obtained
  from public.attempt_questions aq
  join public.questions q on q.id = aq.question_id
  join private.question_answer_keys answer_key on answer_key.question_id = q.id
  left join public.attempt_answers aa on aa.attempt_question_id = aq.id
  where aq.attempt_id = v_attempt.id;

  if v_maximum_score <= 0 or v_total_question_count = 0 then
    raise exception using errcode = 'P0001', message = 'ATTEMPT_HAS_NO_SCORABLE_QUESTIONS';
  end if;

  v_score_percentage := round((v_score_obtained / v_maximum_score) * 100, 2);

  update public.attempts a
  set status = 'submitted',
      submitted_at = now(),
      score_obtained = v_score_obtained,
      maximum_score = v_maximum_score,
      score_percentage = v_score_percentage,
      qualified = v_score_percentage >= v_passing_percentage,
      correct_count = v_correct_count,
      incorrect_count = v_answered_count - v_correct_count,
      unanswered_count = v_total_question_count - v_answered_count,
      last_activity_at = now()
  where a.id = v_attempt.id;

  insert into public.audit_logs (
    actor_type,
    actor_id,
    action,
    entity_type,
    entity_id,
    after_data
  )
  values (
    'guest_candidate',
    v_attempt.candidate_id,
    'attempt.submitted',
    'attempt',
    v_attempt.id,
    jsonb_build_object(
      'scoreObtained', v_score_obtained,
      'maximumScore', v_maximum_score,
      'scorePercentage', v_score_percentage
    )
  );

  return v_attempt.id;
end;
$$;

create or replace function public.record_guest_attempt_event(
  p_attempt_token_hash text,
  p_event_type text,
  p_client_occurred_at timestamptz,
  p_dedupe_key text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt_id uuid;
  v_warning_count integer;
  v_inserted_event_id uuid;
begin
  if p_event_type not in (
    'page_hidden',
    'window_blurred',
    'fullscreen_exited',
    'connection_lost',
    'connection_restored',
    'attempt_resumed'
  ) then
    raise exception using errcode = '22023', message = 'INVALID_ATTEMPT_EVENT';
  end if;

  select a.id
  into v_attempt_id
  from public.attempts a
  where a.attempt_token_hash = p_attempt_token_hash
    and a.status = 'in_progress'
    and a.expires_at > now();

  if v_attempt_id is null then
    raise exception using errcode = 'P0001', message = 'ATTEMPT_NOT_ACTIVE';
  end if;

  insert into public.attempt_events (
    attempt_id,
    event_type,
    client_occurred_at,
    dedupe_key
  )
  values (
    v_attempt_id,
    p_event_type,
    p_client_occurred_at,
    p_dedupe_key
  )
  on conflict (attempt_id, dedupe_key) do nothing
  returning id into v_inserted_event_id;

  if v_inserted_event_id is not null and p_event_type = 'page_hidden' then
    update public.attempts a
    set tab_warning_count = a.tab_warning_count + 1,
        last_activity_at = now()
    where a.id = v_attempt_id;
  end if;

  select a.tab_warning_count
  into v_warning_count
  from public.attempts a
  where a.id = v_attempt_id;

  return v_warning_count;
end;
$$;

create or replace function public.get_guest_result(
  p_attempt_token_hash text
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'attemptId', a.id,
    'title', av.title,
    'candidate', jsonb_build_object(
      'name', a.candidate_name_snapshot,
      'email', a.candidate_email_snapshot,
      'region', r.name,
      'hub', h.name
    ),
    'durationSeconds', greatest(
      0,
      extract(epoch from (a.submitted_at - a.started_at))::integer
    ),
    'configuredDurationSeconds', av.duration_seconds,
    'correctCount', a.correct_count,
    'incorrectCount', a.incorrect_count,
    'unansweredCount', a.unanswered_count,
    'scoreObtained', a.score_obtained,
    'maximumScore', a.maximum_score,
    'scorePercentage', a.score_percentage,
    'passingPercentage', av.passing_percentage,
    'qualified', a.qualified,
    'tabWarningCount', a.tab_warning_count,
    'questions', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', aq.id,
          'position', aq.display_order,
          'prompt', q.question_text,
          'selectedOptionId', aa.selected_option_id,
          'correctOptionId', answer_key.correct_option_id,
          'options', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', qo.id,
                'label', qo.option_text
              )
              order by aqo.display_order
            )
            from public.attempt_question_options aqo
            join public.question_options qo on qo.id = aqo.option_id
            where aqo.attempt_question_id = aq.id
          ), '[]'::jsonb)
        )
        order by aq.display_order
      )
      from public.attempt_questions aq
      join public.questions q on q.id = aq.question_id
      join private.question_answer_keys answer_key on answer_key.question_id = q.id
      left join public.attempt_answers aa on aa.attempt_question_id = aq.id
      where aq.attempt_id = a.id
    ), '[]'::jsonb)
  )
  from public.attempts a
  join public.assessment_versions av on av.id = a.assessment_version_id
  join public.regions r on r.id = a.region_id_snapshot
  join public.hubs h on h.id = a.hub_id_snapshot
  where a.attempt_token_hash = p_attempt_token_hash
    and a.status = 'submitted';
$$;

alter table public.regions enable row level security;
alter table public.hubs enable row level security;
alter table public.candidates enable row level security;
alter table public.assessments enable row level security;
alter table public.assessment_versions enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.attempts enable row level security;
alter table public.attempt_questions enable row level security;
alter table public.attempt_question_options enable row level security;
alter table public.attempt_answers enable row level security;
alter table public.attempt_events enable row level security;
alter table public.audit_logs enable row level security;
alter table private.question_answer_keys enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all tables in schema public from service_role;
revoke all on all sequences in schema public from service_role;
revoke all on function public.create_guest_attempt(text, text, uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.begin_guest_attempt(text) from public, anon, authenticated;
revoke all on function public.get_guest_attempt(text) from public, anon, authenticated;
revoke all on function public.save_guest_answer(text, uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.set_guest_question_state(text, uuid, boolean, boolean) from public, anon, authenticated;
revoke all on function public.submit_guest_attempt(text) from public, anon, authenticated;
revoke all on function public.record_guest_attempt_event(text, text, timestamptz, text) from public, anon, authenticated;
revoke all on function public.get_guest_result(text) from public, anon, authenticated;

grant usage on schema public to service_role;
grant select on public.regions, public.hubs to service_role;
grant execute on function public.create_guest_attempt(text, text, uuid, uuid, text) to service_role;
grant execute on function public.begin_guest_attempt(text) to service_role;
grant execute on function public.get_guest_attempt(text) to service_role;
grant execute on function public.save_guest_answer(text, uuid, uuid, integer) to service_role;
grant execute on function public.set_guest_question_state(text, uuid, boolean, boolean) to service_role;
grant execute on function public.submit_guest_attempt(text) to service_role;
grant execute on function public.record_guest_attempt_event(text, text, timestamptz, text) to service_role;
grant execute on function public.get_guest_result(text) to service_role;

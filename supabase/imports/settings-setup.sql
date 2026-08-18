-- Admin settings: location catalogue (states and hubs) and test configuration
-- with question-bank import.
--
-- Everything an admin does goes through security definer functions gated on a
-- live admin session, mirroring the guest attempt model. service_role gets
-- execute grants only; it still has no direct table access, which is why the
-- question bank is loaded through import_admin_question_bank rather than an
-- insert from the application key.

-- Anti-cheating and presentation settings the admin configures per test.
alter table public.assessment_versions
  add column if not exists max_tab_switches integer,
  add column if not exists shuffle_questions boolean not null default true,
  add column if not exists shuffle_options boolean not null default true,
  add column if not exists instructions text;

alter table public.assessment_versions
  drop constraint if exists assessment_versions_max_tab_switches_valid;
alter table public.assessment_versions
  add constraint assessment_versions_max_tab_switches_valid
  check (max_tab_switches is null or max_tab_switches >= 0);

-- Turns an admin-typed name into the slug the `code` columns require. Falls
-- back to a random suffix when the name has no usable characters.
create or replace function private.slugify(p_value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    nullif(
      btrim(
        regexp_replace(
          regexp_replace(lower(coalesce(p_value, '')), '[^a-z0-9]+', '-', 'g'),
          '(^-+|-+$)', '', 'g'
        ),
        '-'
      ),
      ''
    ),
    'item-' || substr(md5(random()::text), 1, 8)
  );
$$;

create or replace function private.require_admin(p_session_token_hash text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid;
begin
  select s.admin_id
  into v_admin_id
  from private.admin_sessions s
  join private.admins a on a.id = s.admin_id
  where s.session_token_hash = p_session_token_hash
    and s.expires_at > clock_timestamp()
    and a.is_active;

  if v_admin_id is null then
    raise exception using errcode = 'P0001', message = 'ADMIN_SESSION_INVALID';
  end if;

  return v_admin_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Locations
-- ---------------------------------------------------------------------------

create or replace function public.get_admin_locations(
  p_session_token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  perform private.require_admin(p_session_token_hash);

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'code', r.code,
        'name', r.name,
        'isActive', r.is_active,
        'displayOrder', r.display_order,
        'trainerCount', (
          select count(*) from public.candidates c where c.region_id = r.id
        ),
        'attemptCount', (
          select count(*) from public.attempts a where a.region_id_snapshot = r.id
        ),
        'hubs', (
          select coalesce(
            jsonb_agg(
              jsonb_build_object(
                'id', h.id,
                'code', h.code,
                'name', h.name,
                'isActive', h.is_active,
                'displayOrder', h.display_order,
                'trainerCount', (
                  select count(*) from public.candidates c where c.hub_id = h.id
                ),
                'attemptCount', (
                  select count(*) from public.attempts a where a.hub_id_snapshot = h.id
                )
              )
              order by h.display_order, h.name
            ),
            '[]'::jsonb
          )
          from public.hubs h
          where h.region_id = r.id
        )
      )
      order by r.display_order, r.name
    ),
    '[]'::jsonb
  )
  into v_result
  from public.regions r;

  return v_result;
end;
$$;

create or replace function public.save_admin_region(
  p_session_token_hash text,
  p_region_id uuid,
  p_name text,
  p_is_active boolean default true,
  p_display_order integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_code text;
  v_order integer;
  v_region_id uuid;
begin
  perform private.require_admin(p_session_token_hash);

  if v_name = '' then
    return jsonb_build_object('status', 'invalid', 'message', 'A state name is required.');
  end if;

  if exists (
    select 1 from public.regions r
    where lower(r.name) = lower(v_name)
      and (p_region_id is null or r.id <> p_region_id)
  ) then
    return jsonb_build_object('status', 'duplicate', 'message', 'That state already exists.');
  end if;

  if p_region_id is null then
    v_code := private.slugify(v_name);

    -- Names can collide on their slug even when they differ; keep codes unique.
    if exists (select 1 from public.regions r where r.code = v_code) then
      v_code := v_code || '-' || substr(md5(random()::text), 1, 4);
    end if;

    select coalesce(max(r.display_order), 0) + 10
    into v_order
    from public.regions r;

    insert into public.regions (code, name, is_active, display_order)
    values (v_code, v_name, coalesce(p_is_active, true), coalesce(p_display_order, v_order))
    returning id into v_region_id;
  else
    update public.regions r
    set name = v_name,
        is_active = coalesce(p_is_active, r.is_active),
        display_order = coalesce(p_display_order, r.display_order)
    where r.id = p_region_id
    returning r.id into v_region_id;

    if v_region_id is null then
      return jsonb_build_object('status', 'not_found', 'message', 'That state no longer exists.');
    end if;
  end if;

  return jsonb_build_object('status', 'ok', 'regionId', v_region_id);
end;
$$;

create or replace function public.delete_admin_region(
  p_session_token_hash text,
  p_region_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hub_count integer;
begin
  perform private.require_admin(p_session_token_hash);

  if exists (
    select 1 from public.candidates c where c.region_id = p_region_id
    union all
    select 1 from public.attempts a where a.region_id_snapshot = p_region_id
  ) then
    return jsonb_build_object(
      'status', 'in_use',
      'message', 'Trainers have already registered under this state. Turn it off instead of deleting it.'
    );
  end if;

  select count(*)::integer into v_hub_count
  from public.hubs h
  where h.region_id = p_region_id;

  delete from public.hubs h where h.region_id = p_region_id;
  delete from public.regions r where r.id = p_region_id;

  if not found then
    return jsonb_build_object('status', 'not_found', 'message', 'That state no longer exists.');
  end if;

  return jsonb_build_object('status', 'ok', 'deletedHubs', v_hub_count);
end;
$$;

create or replace function public.save_admin_hub(
  p_session_token_hash text,
  p_hub_id uuid,
  p_region_id uuid,
  p_name text,
  p_is_active boolean default true,
  p_display_order integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_code text;
  v_order integer;
  v_hub_id uuid;
begin
  perform private.require_admin(p_session_token_hash);

  if v_name = '' then
    return jsonb_build_object('status', 'invalid', 'message', 'A centre name is required.');
  end if;

  if not exists (select 1 from public.regions r where r.id = p_region_id) then
    return jsonb_build_object('status', 'not_found', 'message', 'That state no longer exists.');
  end if;

  if exists (
    select 1 from public.hubs h
    where h.region_id = p_region_id
      and lower(h.name) = lower(v_name)
      and (p_hub_id is null or h.id <> p_hub_id)
  ) then
    return jsonb_build_object(
      'status', 'duplicate',
      'message', 'That centre already exists in this state.'
    );
  end if;

  if p_hub_id is null then
    v_code := private.slugify(v_name);

    if exists (
      select 1 from public.hubs h where h.region_id = p_region_id and h.code = v_code
    ) then
      v_code := v_code || '-' || substr(md5(random()::text), 1, 4);
    end if;

    select coalesce(max(h.display_order), 0) + 10
    into v_order
    from public.hubs h
    where h.region_id = p_region_id;

    insert into public.hubs (region_id, code, name, is_active, display_order)
    values (p_region_id, v_code, v_name, coalesce(p_is_active, true), coalesce(p_display_order, v_order))
    returning id into v_hub_id;
  else
    update public.hubs h
    set region_id = p_region_id,
        name = v_name,
        is_active = coalesce(p_is_active, h.is_active),
        display_order = coalesce(p_display_order, h.display_order)
    where h.id = p_hub_id
    returning h.id into v_hub_id;

    if v_hub_id is null then
      return jsonb_build_object('status', 'not_found', 'message', 'That centre no longer exists.');
    end if;
  end if;

  return jsonb_build_object('status', 'ok', 'hubId', v_hub_id);
end;
$$;

create or replace function public.delete_admin_hub(
  p_session_token_hash text,
  p_hub_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin(p_session_token_hash);

  if exists (
    select 1 from public.candidates c where c.hub_id = p_hub_id
    union all
    select 1 from public.attempts a where a.hub_id_snapshot = p_hub_id
  ) then
    return jsonb_build_object(
      'status', 'in_use',
      'message', 'Trainers have already registered at this centre. Turn it off instead of deleting it.'
    );
  end if;

  delete from public.hubs h where h.id = p_hub_id;

  if not found then
    return jsonb_build_object('status', 'not_found', 'message', 'That centre no longer exists.');
  end if;

  return jsonb_build_object('status', 'ok');
end;
$$;

-- ---------------------------------------------------------------------------
-- Tests
-- ---------------------------------------------------------------------------

-- One test is one assessment plus its newest version. Version rows still exist
-- so history and attempts stay pinned to the settings they ran under, but the
-- admin edits a single live configuration rather than managing versions.
create or replace function public.get_admin_tests(
  p_session_token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  perform private.require_admin(p_session_token_hash);

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', t.assessment_id,
        'code', t.code,
        'title', t.title,
        'isActive', t.is_active,
        'versionId', t.version_id,
        'versionNumber', t.version_number,
        'status', t.status,
        'durationSeconds', t.duration_seconds,
        'questionsPerAttempt', t.questions_per_attempt,
        'passingPercentage', t.passing_percentage,
        'maximumAttemptsPerEmail', t.maximum_attempts_per_email,
        'maxTabSwitches', t.max_tab_switches,
        'shuffleQuestions', t.shuffle_questions,
        'shuffleOptions', t.shuffle_options,
        'instructions', t.instructions,
        'availableFrom', t.available_from,
        'availableUntil', t.available_until,
        'publishedAt', t.published_at,
        'updatedAt', t.updated_at,
        'questionCount', (
          select count(*) from public.questions q
          where q.assessment_version_id = t.version_id
        ),
        'readyQuestionCount', (
          select count(*)
          from public.questions q
          where q.assessment_version_id = t.version_id
            and q.is_active
            and exists (
              select 1 from private.question_answer_keys k where k.question_id = q.id
            )
            and (
              select count(*) from public.question_options o
              where o.question_id = q.id and o.is_active
            ) >= 2
        ),
        'attemptCount', (
          select count(*) from public.attempts a
          where a.assessment_version_id = t.version_id
        )
      )
      order by t.published_at desc nulls last, t.created_at desc
    ),
    '[]'::jsonb
  )
  into v_result
  from (
    select
      a.id as assessment_id,
      a.code,
      a.title,
      a.is_active,
      a.created_at,
      av.id as version_id,
      av.version_number,
      av.status,
      av.duration_seconds,
      av.questions_per_attempt,
      av.passing_percentage,
      av.maximum_attempts_per_email,
      av.max_tab_switches,
      av.shuffle_questions,
      av.shuffle_options,
      av.instructions,
      av.available_from,
      av.available_until,
      av.published_at,
      av.updated_at
    from public.assessments a
    join lateral (
      select v.*
      from public.assessment_versions v
      where v.assessment_id = a.id
      order by v.version_number desc
      limit 1
    ) av on true
  ) t;

  return v_result;
end;
$$;

create or replace function public.save_admin_test(
  p_session_token_hash text,
  p_assessment_id uuid,
  p_title text,
  p_duration_seconds integer,
  p_questions_per_attempt integer,
  p_passing_percentage numeric,
  p_maximum_attempts_per_email integer,
  p_max_tab_switches integer,
  p_shuffle_questions boolean,
  p_shuffle_options boolean,
  p_instructions text,
  p_available_from timestamptz,
  p_available_until timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text := btrim(coalesce(p_title, ''));
  v_code text;
  v_assessment_id uuid;
  v_version_id uuid;
begin
  perform private.require_admin(p_session_token_hash);

  if v_title = '' then
    return jsonb_build_object('status', 'invalid', 'message', 'A test name is required.');
  end if;

  if p_duration_seconds is null or p_duration_seconds <= 0 then
    return jsonb_build_object('status', 'invalid', 'message', 'Total time must be at least one minute.');
  end if;

  if p_questions_per_attempt is null or p_questions_per_attempt <= 0 then
    return jsonb_build_object('status', 'invalid', 'message', 'Questions per candidate must be at least 1.');
  end if;

  if p_passing_percentage is null or p_passing_percentage < 0 or p_passing_percentage > 100 then
    return jsonb_build_object('status', 'invalid', 'message', 'The passing threshold must be between 0 and 100.');
  end if;

  if p_maximum_attempts_per_email is null or p_maximum_attempts_per_email <= 0 then
    return jsonb_build_object('status', 'invalid', 'message', 'Attempts per trainer must be at least 1.');
  end if;

  if p_max_tab_switches is not null and p_max_tab_switches < 0 then
    return jsonb_build_object('status', 'invalid', 'message', 'Tab-switch allowance cannot be negative.');
  end if;

  if p_available_from is not null and p_available_until is not null
    and p_available_from >= p_available_until then
    return jsonb_build_object('status', 'invalid', 'message', 'The window must open before it closes.');
  end if;

  if exists (
    select 1 from public.assessments a
    where lower(a.title) = lower(v_title)
      and (p_assessment_id is null or a.id <> p_assessment_id)
  ) then
    return jsonb_build_object('status', 'duplicate', 'message', 'A test with that name already exists.');
  end if;

  if p_assessment_id is null then
    v_code := private.slugify(v_title);

    if exists (select 1 from public.assessments a where a.code = v_code) then
      v_code := v_code || '-' || substr(md5(random()::text), 1, 4);
    end if;

    insert into public.assessments (code, title)
    values (v_code, v_title)
    returning id into v_assessment_id;

    insert into public.assessment_versions (
      assessment_id, version_number, title, status, duration_seconds,
      questions_per_attempt, passing_percentage, maximum_attempts_per_email,
      max_tab_switches, shuffle_questions, shuffle_options, instructions,
      available_from, available_until
    )
    values (
      v_assessment_id, 1, v_title, 'draft', p_duration_seconds,
      p_questions_per_attempt, p_passing_percentage, p_maximum_attempts_per_email,
      p_max_tab_switches, coalesce(p_shuffle_questions, true), coalesce(p_shuffle_options, true),
      nullif(btrim(coalesce(p_instructions, '')), ''),
      p_available_from, p_available_until
    )
    returning id into v_version_id;
  else
    update public.assessments a
    set title = v_title
    where a.id = p_assessment_id
    returning a.id into v_assessment_id;

    if v_assessment_id is null then
      return jsonb_build_object('status', 'not_found', 'message', 'That test no longer exists.');
    end if;

    update public.assessment_versions av
    set title = v_title,
        duration_seconds = p_duration_seconds,
        questions_per_attempt = p_questions_per_attempt,
        passing_percentage = p_passing_percentage,
        maximum_attempts_per_email = p_maximum_attempts_per_email,
        max_tab_switches = p_max_tab_switches,
        shuffle_questions = coalesce(p_shuffle_questions, true),
        shuffle_options = coalesce(p_shuffle_options, true),
        instructions = nullif(btrim(coalesce(p_instructions, '')), ''),
        available_from = p_available_from,
        available_until = p_available_until
    where av.assessment_id = v_assessment_id
      and av.version_number = (
        select max(v.version_number) from public.assessment_versions v
        where v.assessment_id = v_assessment_id
      )
    returning av.id into v_version_id;
  end if;

  return jsonb_build_object(
    'status', 'ok',
    'assessmentId', v_assessment_id,
    'versionId', v_version_id
  );
end;
$$;

-- Publishing archives whatever was live before, so create_guest_attempt always
-- has exactly one candidate test to pick.
create or replace function public.set_admin_test_status(
  p_session_token_hash text,
  p_assessment_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version public.assessment_versions%rowtype;
  v_ready integer;
begin
  perform private.require_admin(p_session_token_hash);

  if p_status not in ('draft', 'published', 'archived') then
    return jsonb_build_object('status', 'invalid', 'message', 'Unsupported test status.');
  end if;

  select av.*
  into v_version
  from public.assessment_versions av
  where av.assessment_id = p_assessment_id
  order by av.version_number desc
  limit 1;

  if v_version.id is null then
    return jsonb_build_object('status', 'not_found', 'message', 'That test no longer exists.');
  end if;

  if p_status = 'published' then
    select count(*)::integer
    into v_ready
    from public.questions q
    where q.assessment_version_id = v_version.id
      and q.is_active
      and exists (
        select 1 from private.question_answer_keys k where k.question_id = q.id
      )
      and (
        select count(*) from public.question_options o
        where o.question_id = q.id and o.is_active
      ) >= 2;

    if v_ready < v_version.questions_per_attempt then
      return jsonb_build_object(
        'status', 'not_enough_questions',
        'message', format(
          'This test serves %s questions but the bank only has %s ready. Upload more questions or lower the count.',
          v_version.questions_per_attempt, v_ready
        )
      );
    end if;

    update public.assessment_versions av
    set status = 'archived'
    where av.status = 'published'
      and av.id <> v_version.id;

    update public.assessment_versions av
    set status = 'published',
        published_at = coalesce(av.published_at, now())
    where av.id = v_version.id;

    update public.assessments a
    set is_active = true
    where a.id = p_assessment_id;
  else
    update public.assessment_versions av
    set status = p_status
    where av.id = v_version.id;
  end if;

  return jsonb_build_object('status', 'ok');
end;
$$;

create or replace function public.delete_admin_test(
  p_session_token_hash text,
  p_assessment_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin(p_session_token_hash);

  if exists (
    select 1
    from public.attempts a
    join public.assessment_versions av on av.id = a.assessment_version_id
    where av.assessment_id = p_assessment_id
  ) then
    return jsonb_build_object(
      'status', 'in_use',
      'message', 'Trainers have already taken this test. Archive it instead of deleting it.'
    );
  end if;

  delete from private.question_answer_keys k
  where k.question_id in (
    select q.id
    from public.questions q
    join public.assessment_versions av on av.id = q.assessment_version_id
    where av.assessment_id = p_assessment_id
  );

  delete from public.question_options o
  where o.question_id in (
    select q.id
    from public.questions q
    join public.assessment_versions av on av.id = q.assessment_version_id
    where av.assessment_id = p_assessment_id
  );

  delete from public.questions q
  where q.assessment_version_id in (
    select av.id from public.assessment_versions av
    where av.assessment_id = p_assessment_id
  );

  delete from public.assessment_versions av where av.assessment_id = p_assessment_id;
  delete from public.assessments a where a.id = p_assessment_id;

  if not found then
    return jsonb_build_object('status', 'not_found', 'message', 'That test no longer exists.');
  end if;

  return jsonb_build_object('status', 'ok');
end;
$$;

-- ---------------------------------------------------------------------------
-- Question bank
-- ---------------------------------------------------------------------------

-- The uploaded workbook is validated in the application layer and arrives here
-- as a normalised array. The whole array lands in one transaction: a failing
-- constraint on question 40 rolls back the other 99.
create or replace function public.import_admin_question_bank(
  p_session_token_hash text,
  p_assessment_id uuid,
  p_questions jsonb,
  p_replace boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version_id uuid;
  v_row jsonb;
  v_question_id uuid;
  v_correct text;
  v_correct_option_id uuid;
  v_option_id uuid;
  v_option jsonb;
  v_order integer;
  v_imported integer := 0;
  v_replaced integer := 0;
begin
  perform private.require_admin(p_session_token_hash);

  if jsonb_typeof(p_questions) <> 'array' or jsonb_array_length(p_questions) = 0 then
    return jsonb_build_object('status', 'invalid', 'message', 'The workbook had no questions to import.');
  end if;

  select av.id
  into v_version_id
  from public.assessment_versions av
  where av.assessment_id = p_assessment_id
  order by av.version_number desc
  limit 1;

  if v_version_id is null then
    return jsonb_build_object('status', 'not_found', 'message', 'That test no longer exists.');
  end if;

  if p_replace then
    if exists (
      select 1
      from public.attempt_questions aq
      join public.questions q on q.id = aq.question_id
      where q.assessment_version_id = v_version_id
    ) then
      return jsonb_build_object(
        'status', 'in_use',
        'message', 'Questions from this test have already been served to trainers, so the bank cannot be replaced.'
      );
    end if;

    delete from private.question_answer_keys k
    where k.question_id in (
      select q.id from public.questions q where q.assessment_version_id = v_version_id
    );
    delete from public.question_options o
    where o.question_id in (
      select q.id from public.questions q where q.assessment_version_id = v_version_id
    );

    with removed as (
      delete from public.questions q
      where q.assessment_version_id = v_version_id
      returning 1
    )
    select count(*)::integer into v_replaced from removed;
  end if;

  for v_row in select * from jsonb_array_elements(p_questions)
  loop
    insert into public.questions (
      assessment_version_id, external_code, question_text, marks,
      category, difficulty, explanation, is_active
    )
    values (
      v_version_id,
      v_row->>'code',
      v_row->>'question',
      coalesce((v_row->>'marks')::numeric, 1),
      nullif(btrim(coalesce(v_row->>'category', '')), ''),
      nullif(btrim(coalesce(v_row->>'difficulty', '')), ''),
      nullif(btrim(coalesce(v_row->>'explanation', '')), ''),
      coalesce((v_row->>'active')::boolean, true)
    )
    returning id into v_question_id;

    v_order := 0;
    v_correct := upper(btrim(coalesce(v_row->>'correct', '')));
    v_correct_option_id := null;

    for v_option in select * from jsonb_array_elements(v_row->'options')
    loop
      v_order := v_order + 1;

      insert into public.question_options (
        question_id, option_code, option_text, display_order
      )
      values (v_question_id, v_option->>'code', v_option->>'text', v_order)
      returning id into v_option_id;

      if upper(btrim(coalesce(v_option->>'code', ''))) = v_correct then
        v_correct_option_id := v_option_id;
      end if;
    end loop;

    if v_correct_option_id is null then
      raise exception using
        errcode = '22023',
        message = format('Question %s has no option matching its correct answer.', v_row->>'code');
    end if;

    insert into private.question_answer_keys (question_id, correct_option_id)
    values (v_question_id, v_correct_option_id);

    v_imported := v_imported + 1;
  end loop;

  return jsonb_build_object(
    'status', 'ok',
    'imported', v_imported,
    'removed', v_replaced,
    'versionId', v_version_id
  );
exception
  when unique_violation then
    return jsonb_build_object(
      'status', 'duplicate',
      'message', 'Some question codes are already in this test''s bank. Use "Replace the bank" or renumber the rows.'
    );
end;
$$;

create or replace function public.get_admin_test_questions(
  p_session_token_hash text,
  p_assessment_id uuid,
  p_limit integer default 25,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version_id uuid;
  v_total integer;
  v_rows jsonb;
begin
  perform private.require_admin(p_session_token_hash);

  select av.id
  into v_version_id
  from public.assessment_versions av
  where av.assessment_id = p_assessment_id
  order by av.version_number desc
  limit 1;

  if v_version_id is null then
    return jsonb_build_object('total', 0, 'questions', '[]'::jsonb);
  end if;

  select count(*)::integer
  into v_total
  from public.questions q
  where q.assessment_version_id = v_version_id;

  select coalesce(jsonb_agg(row_to_json(page)::jsonb order by page."externalCode"), '[]'::jsonb)
  into v_rows
  from (
    select
      q.id,
      q.external_code as "externalCode",
      q.question_text as "questionText",
      q.marks,
      q.category,
      q.difficulty,
      q.is_active as "isActive",
      (
        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'code', o.option_code,
              'text', o.option_text,
              'isCorrect', k.correct_option_id = o.id
            )
            order by o.display_order
          ),
          '[]'::jsonb
        )
        from public.question_options o
        left join private.question_answer_keys k on k.question_id = q.id
        where o.question_id = q.id
      ) as options
    from public.questions q
    where q.assessment_version_id = v_version_id
    order by q.external_code
    limit greatest(1, least(coalesce(p_limit, 25), 200))
    offset greatest(0, coalesce(p_offset, 0))
  ) page;

  return jsonb_build_object('total', v_total, 'questions', v_rows);
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

do $do$
declare
  v_signature text;
begin
  foreach v_signature in array array[
    'public.get_admin_locations(text)',
    'public.save_admin_region(text, uuid, text, boolean, integer)',
    'public.delete_admin_region(text, uuid)',
    'public.save_admin_hub(text, uuid, uuid, text, boolean, integer)',
    'public.delete_admin_hub(text, uuid)',
    'public.get_admin_tests(text)',
    'public.save_admin_test(text, uuid, text, integer, integer, numeric, integer, integer, boolean, boolean, text, timestamptz, timestamptz)',
    'public.set_admin_test_status(text, uuid, text)',
    'public.delete_admin_test(text, uuid)',
    'public.import_admin_question_bank(text, uuid, jsonb, boolean)',
    'public.get_admin_test_questions(text, uuid, integer, integer)'
  ]
  loop
    execute format('revoke all on function %s from public, anon, authenticated', v_signature);
    execute format('grant execute on function %s to service_role', v_signature);
  end loop;
end
$do$;

-- ---------------------------------------------------------------------------
-- Exam flow: honour the new per-test settings
-- ---------------------------------------------------------------------------

-- Sampling stays random so every trainer gets a different subset; the shuffle
-- flags decide only the order that subset is presented in. With shuffling off,
-- the `case` yields null for every row and the tie breaks on the authored
-- order, which is what an admin who turned it off expects to see.
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
    row_number() over (
      order by
        case when v_version.shuffle_questions then selected_questions.random_order end,
        selected_questions.external_code
    )::integer
  from (
    select q.id, q.external_code, random() as random_order
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
      order by
        case when v_version.shuffle_options then option_rows.random_order end,
        option_rows.display_order
    )::integer
  from (
    select
      aq.id as attempt_question_id,
      qo.id as option_id,
      qo.display_order,
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


-- The tab-switch allowance is enforced here rather than in the browser: the
-- attempt is submitted server-side the moment the limit is passed, so closing
-- the tab or blocking the response cannot dodge it. The return type gains the
-- limit and the auto-submit flag, which is why the old signature is dropped.
drop function if exists public.record_guest_attempt_event(text, text, timestamptz, text);

create or replace function public.record_guest_attempt_event(
  p_attempt_token_hash text,
  p_event_type text,
  p_client_occurred_at timestamptz,
  p_dedupe_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt_id uuid;
  v_max_tab_switches integer;
  v_warning_count integer;
  v_inserted_event_id uuid;
  v_auto_submitted boolean := false;
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

  select a.id, av.max_tab_switches
  into v_attempt_id, v_max_tab_switches
  from public.attempts a
  join public.assessment_versions av on av.id = a.assessment_version_id
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

  if v_max_tab_switches is not null and v_warning_count > v_max_tab_switches then
    perform public.submit_guest_attempt(p_attempt_token_hash);
    v_auto_submitted := true;
  end if;

  return jsonb_build_object(
    'autoSubmitted', v_auto_submitted,
    'maxTabSwitches', v_max_tab_switches,
    'tabWarningCount', v_warning_count
  );
end;
$$;

revoke all on function public.record_guest_attempt_event(text, text, timestamptz, text)
  from public, anon, authenticated;
grant execute on function public.record_guest_attempt_event(text, text, timestamptz, text)
  to service_role;

-- Surfaces the admin's own instructions and the tab-switch allowance to the
-- pre-start dialog, so a trainer is told the rule before the timer runs.
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
    'instructions', av.instructions,
    'maxTabSwitches', av.max_tab_switches,
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

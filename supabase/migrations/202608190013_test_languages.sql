-- Languages for a test.
--
-- A language is a translation layer over the question bank, never a second
-- bank: the answer key, the marks, and the sampling all stay on the original
-- questions, so a translated attempt is scored by exactly the same rules. Rows
-- are matched to the original by question code, which is what makes "the same
-- sheet in another language" a safe thing to upload.

create table if not exists public.assessment_languages (
  id uuid primary key default gen_random_uuid(),
  assessment_version_id uuid not null references public.assessment_versions(id) on delete cascade,
  code text not null,
  name text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessment_languages_version_code_unique unique (assessment_version_id, code),
  constraint assessment_languages_code_format check (code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint assessment_languages_name_not_blank check (btrim(name) <> '')
);

create table if not exists public.question_translations (
  question_id uuid not null references public.questions(id) on delete cascade,
  language_id uuid not null references public.assessment_languages(id) on delete cascade,
  question_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (question_id, language_id),
  constraint question_translations_text_not_blank check (btrim(question_text) <> '')
);

create table if not exists public.question_option_translations (
  option_id uuid not null references public.question_options(id) on delete cascade,
  language_id uuid not null references public.assessment_languages(id) on delete cascade,
  option_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (option_id, language_id),
  constraint question_option_translations_text_not_blank check (btrim(option_text) <> '')
);

create index if not exists question_translations_language_idx
  on public.question_translations (language_id);
create index if not exists question_option_translations_language_idx
  on public.question_option_translations (language_id);

drop trigger if exists assessment_languages_set_updated_at on public.assessment_languages;
create trigger assessment_languages_set_updated_at
  before update on public.assessment_languages
  for each row execute function private.set_updated_at();

drop trigger if exists question_translations_set_updated_at on public.question_translations;
create trigger question_translations_set_updated_at
  before update on public.question_translations
  for each row execute function private.set_updated_at();

drop trigger if exists question_option_translations_set_updated_at on public.question_option_translations;
create trigger question_option_translations_set_updated_at
  before update on public.question_option_translations
  for each row execute function private.set_updated_at();

alter table public.assessment_languages enable row level security;
alter table public.question_translations enable row level security;
alter table public.question_option_translations enable row level security;

-- ---------------------------------------------------------------------------
-- Admin functions
-- ---------------------------------------------------------------------------

create or replace function public.save_admin_test_language(
  p_session_token_hash text,
  p_assessment_id uuid,
  p_language_id uuid,
  p_name text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_version_id uuid;
  v_code text;
  v_order integer;
  v_language_id uuid;
begin
  perform private.require_admin(p_session_token_hash);

  if v_name = '' then
    return jsonb_build_object('status', 'invalid', 'message', 'Enter a language name.');
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

  if exists (
    select 1 from public.assessment_languages l
    where l.assessment_version_id = v_version_id
      and lower(l.name) = lower(v_name)
      and (p_language_id is null or l.id <> p_language_id)
  ) then
    return jsonb_build_object(
      'status', 'duplicate',
      'message', 'This test already has that language.'
    );
  end if;

  if p_language_id is null then
    v_code := private.slugify(v_name);

    if exists (
      select 1 from public.assessment_languages l
      where l.assessment_version_id = v_version_id and l.code = v_code
    ) then
      v_code := v_code || '-' || substr(md5(random()::text), 1, 4);
    end if;

    select coalesce(max(l.display_order), 0) + 10
    into v_order
    from public.assessment_languages l
    where l.assessment_version_id = v_version_id;

    insert into public.assessment_languages (assessment_version_id, code, name, display_order)
    values (v_version_id, v_code, v_name, v_order)
    returning id into v_language_id;
  else
    update public.assessment_languages l
    set name = v_name
    where l.id = p_language_id
      and l.assessment_version_id = v_version_id
    returning l.id into v_language_id;

    if v_language_id is null then
      return jsonb_build_object('status', 'not_found', 'message', 'That language no longer exists.');
    end if;
  end if;

  return jsonb_build_object('status', 'ok', 'languageId', v_language_id);
end;
$$;

create or replace function public.delete_admin_test_language(
  p_session_token_hash text,
  p_language_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin(p_session_token_hash);

  -- Translations cascade; the original questions are untouched.
  delete from public.assessment_languages l where l.id = p_language_id;

  if not found then
    return jsonb_build_object('status', 'not_found', 'message', 'That language no longer exists.');
  end if;

  return jsonb_build_object('status', 'ok');
end;
$$;

-- Matches the uploaded rows to the original questions by code, and each option
-- by its letter. A row that names no known question, or whose correct answer
-- disagrees with the original, is reported rather than written: both mean the
-- sheet is not the same question set.
create or replace function public.import_admin_question_translations(
  p_session_token_hash text,
  p_language_id uuid,
  p_questions jsonb
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
  v_option jsonb;
  v_option_id uuid;
  v_correct_code text;
  v_imported integer := 0;
  v_unmatched text[] := '{}';
  v_mismatched text[] := '{}';
begin
  perform private.require_admin(p_session_token_hash);

  if jsonb_typeof(p_questions) <> 'array' or jsonb_array_length(p_questions) = 0 then
    return jsonb_build_object('status', 'invalid', 'message', 'The sheet had no questions to import.');
  end if;

  select l.assessment_version_id
  into v_version_id
  from public.assessment_languages l
  where l.id = p_language_id;

  if v_version_id is null then
    return jsonb_build_object('status', 'not_found', 'message', 'That language no longer exists.');
  end if;

  for v_row in select * from jsonb_array_elements(p_questions)
  loop
    select q.id
    into v_question_id
    from public.questions q
    where q.assessment_version_id = v_version_id
      and q.external_code = v_row->>'code';

    if v_question_id is null then
      v_unmatched := v_unmatched || (v_row->>'code');
      continue;
    end if;

    -- The translated sheet must agree with the original about which letter is
    -- correct, otherwise its options have been reordered and the letters no
    -- longer describe the same answers.
    select o.option_code
    into v_correct_code
    from private.question_answer_keys k
    join public.question_options o on o.id = k.correct_option_id
    where k.question_id = v_question_id;

    if v_correct_code is distinct from upper(btrim(coalesce(v_row->>'correct', ''))) then
      v_mismatched := v_mismatched || (v_row->>'code');
      continue;
    end if;

    insert into public.question_translations (question_id, language_id, question_text)
    values (v_question_id, p_language_id, v_row->>'question')
    on conflict (question_id, language_id) do update
    set question_text = excluded.question_text;

    for v_option in select * from jsonb_array_elements(v_row->'options')
    loop
      select o.id
      into v_option_id
      from public.question_options o
      where o.question_id = v_question_id
        and o.option_code = upper(btrim(coalesce(v_option->>'code', '')));

      if v_option_id is not null then
        insert into public.question_option_translations (option_id, language_id, option_text)
        values (v_option_id, p_language_id, v_option->>'text')
        on conflict (option_id, language_id) do update
        set option_text = excluded.option_text;
      end if;
    end loop;

    v_imported := v_imported + 1;
  end loop;

  return jsonb_build_object(
    'status', 'ok',
    'imported', v_imported,
    'unmatched', to_jsonb(v_unmatched),
    'mismatched', to_jsonb(v_mismatched)
  );
end;
$$;

-- Tests now carry their languages, so the settings page still loads in one call.
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
        ),
        'languages', (
          select coalesce(
            jsonb_agg(
              jsonb_build_object(
                'id', l.id,
                'code', l.code,
                'name', l.name,
                'translatedCount', (
                  select count(*)
                  from public.question_translations tr
                  join public.questions q on q.id = tr.question_id
                  where tr.language_id = l.id
                    and q.assessment_version_id = t.version_id
                )
              )
              order by l.display_order, l.name
            ),
            '[]'::jsonb
          )
          from public.assessment_languages l
          where l.assessment_version_id = t.version_id
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

revoke all on function public.save_admin_test_language(text, uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.delete_admin_test_language(text, uuid)
  from public, anon, authenticated;
revoke all on function public.import_admin_question_translations(text, uuid, jsonb)
  from public, anon, authenticated;

grant execute on function public.save_admin_test_language(text, uuid, uuid, text) to service_role;
grant execute on function public.delete_admin_test_language(text, uuid) to service_role;
grant execute on function public.import_admin_question_translations(text, uuid, jsonb) to service_role;

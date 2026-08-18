-- Letting the candidate read the test in another language.
--
-- The choice sits on the attempt, so a reload keeps it and the admin can see
-- which language an attempt was taken in. Text is resolved per question with a
-- fallback to the original, which means a partly translated language is still
-- usable rather than showing blanks.

alter table public.attempts
  add column if not exists language_id uuid references public.assessment_languages(id);

create index if not exists attempts_language_id_idx
  on public.attempts (language_id)
  where language_id is not null;

create or replace function public.set_guest_attempt_language(
  p_attempt_token_hash text,
  p_language_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt public.attempts%rowtype;
begin
  select a.*
  into v_attempt
  from public.attempts a
  where a.attempt_token_hash = p_attempt_token_hash
    and a.status in ('ready', 'in_progress');

  if v_attempt.id is null then
    raise exception using errcode = 'P0001', message = 'ATTEMPT_NOT_ACTIVE';
  end if;

  -- A null id is the original language of the question bank.
  if p_language_id is not null and not exists (
    select 1
    from public.assessment_languages l
    where l.id = p_language_id
      and l.assessment_version_id = v_attempt.assessment_version_id
  ) then
    raise exception using errcode = '22023', message = 'INVALID_LANGUAGE';
  end if;

  update public.attempts a
  set language_id = p_language_id,
      last_activity_at = now()
  where a.id = v_attempt.id;

  return jsonb_build_object('status', 'ok');
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
    'instructions', av.instructions,
    'maxTabSwitches', av.max_tab_switches,
    'tabWarningCount', a.tab_warning_count,
    'languageId', a.language_id,
    'languages', coalesce((
      -- Only languages that actually carry text for this bank are offered.
      select jsonb_agg(
        jsonb_build_object('id', l.id, 'code', l.code, 'name', l.name)
        order by l.display_order, l.name
      )
      from public.assessment_languages l
      where l.assessment_version_id = a.assessment_version_id
        and exists (
          select 1
          from public.question_translations tr
          join public.questions q on q.id = tr.question_id
          where tr.language_id = l.id
            and q.assessment_version_id = a.assessment_version_id
        )
    ), '[]'::jsonb),
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
          'prompt', coalesce(qt.question_text, q.question_text),
          'isVisited', aq.is_visited,
          'isFlagged', aq.is_flagged,
          'selectedOptionId', aa.selected_option_id,
          'answerRevision', coalesce(aa.revision, 0),
          'options', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', qo.id,
                'label', coalesce(ot.option_text, qo.option_text)
              )
              order by aqo.display_order
            )
            from public.attempt_question_options aqo
            join public.question_options qo on qo.id = aqo.option_id
            left join public.question_option_translations ot
              on ot.option_id = qo.id and ot.language_id = a.language_id
            where aqo.attempt_question_id = aq.id
          ), '[]'::jsonb)
        )
        order by aq.display_order
      )
      from public.attempt_questions aq
      join public.questions q on q.id = aq.question_id
      left join public.question_translations qt
        on qt.question_id = q.id and qt.language_id = a.language_id
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

-- The review after submitting reads in the language the attempt was taken in.
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
          'prompt', coalesce(qt.question_text, q.question_text),
          'selectedOptionId', aa.selected_option_id,
          'correctOptionId', answer_key.correct_option_id,
          'options', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', qo.id,
                'label', coalesce(ot.option_text, qo.option_text)
              )
              order by aqo.display_order
            )
            from public.attempt_question_options aqo
            join public.question_options qo on qo.id = aqo.option_id
            left join public.question_option_translations ot
              on ot.option_id = qo.id and ot.language_id = a.language_id
            where aqo.attempt_question_id = aq.id
          ), '[]'::jsonb)
        )
        order by aq.display_order
      )
      from public.attempt_questions aq
      join public.questions q on q.id = aq.question_id
      join private.question_answer_keys answer_key on answer_key.question_id = q.id
      left join public.question_translations qt
        on qt.question_id = q.id and qt.language_id = a.language_id
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

revoke all on function public.set_guest_attempt_language(text, uuid)
  from public, anon, authenticated;
grant execute on function public.set_guest_attempt_language(text, uuid) to service_role;

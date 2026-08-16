-- Per-attempt report for admins. Same payload as get_guest_result, but keyed
-- by attempt id and gated on an admin session rather than the attempt cookie.

create or replace function public.get_admin_attempt_report(
  p_session_token_hash text,
  p_attempt_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid;
  v_now timestamptz := clock_timestamp();
  v_result jsonb;
begin
  select s.admin_id
  into v_admin_id
  from private.admin_sessions s
  join private.admins a on a.id = s.admin_id
  where s.session_token_hash = p_session_token_hash
    and s.expires_at > v_now
    and a.is_active;

  if v_admin_id is null then
    raise exception using errcode = 'P0001', message = 'ADMIN_SESSION_INVALID';
  end if;

  select jsonb_build_object(
    'attemptId', a.id,
    'title', av.title,
    'status', a.status,
    'candidate', jsonb_build_object(
      'name', a.candidate_name_snapshot,
      'email', a.candidate_email_snapshot,
      'region', r.name,
      'hub', h.name
    ),
    'startedAt', a.started_at,
    'submittedAt', a.submitted_at,
    'durationSeconds', case
      when a.submitted_at is null or a.started_at is null then null
      else greatest(0, extract(epoch from (a.submitted_at - a.started_at))::integer)
    end,
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
          'code', q.external_code,
          'selectedOptionId', aa.selected_option_id,
          'correctOptionId', answer_key.correct_option_id,
          'options', coalesce((
            select jsonb_agg(
              jsonb_build_object('id', qo.id, 'label', qo.option_text)
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
  into v_result
  from public.attempts a
  join public.assessment_versions av on av.id = a.assessment_version_id
  join public.regions r on r.id = a.region_id_snapshot
  join public.hubs h on h.id = a.hub_id_snapshot
  where a.id = p_attempt_id;

  return v_result;
end;
$$;

revoke all on function public.get_admin_attempt_report(text, uuid) from public, anon, authenticated;
grant execute on function public.get_admin_attempt_report(text, uuid) to service_role;

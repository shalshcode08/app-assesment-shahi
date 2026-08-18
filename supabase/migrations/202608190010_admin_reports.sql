-- Reports. One function per report keeps each query readable, and a thin
-- dispatcher gives the export route a single call. Every report answers for a
-- date window applied to the attempt (submitted where there is a submission,
-- created otherwise) so the windows agree across reports.

create or replace function private.report_window(
  p_from timestamptz,
  p_to timestamptz,
  p_at timestamptz
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select (p_from is null or p_at >= p_from)
     and (p_to is null or p_at < p_to);
$$;

create or replace function public.get_admin_report(
  p_session_token_hash text,
  p_report text,
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rows jsonb;
begin
  perform private.require_admin(p_session_token_hash);

  if p_report = 'attempts' then
    select coalesce(jsonb_agg(row_to_json(r)::jsonb order by r."submittedAt" desc nulls last), '[]'::jsonb)
    into v_rows
    from (
      select
        a.candidate_name_snapshot as "name",
        a.candidate_email_snapshot as "email",
        reg.name as "state",
        hub.name as "centre",
        av.title as "test",
        case a.status
          when 'submitted' then 'Submitted'
          when 'in_progress' then 'In progress'
          when 'ready' then 'Not started'
          when 'expired' then 'Expired'
          when 'abandoned' then 'Abandoned'
          else initcap(a.status)
        end as "status",
        case
          when a.qualified is null then null
          when a.qualified then 'Qualified'
          else 'Not qualified'
        end as "outcome",
        a.score_obtained as "score",
        a.maximum_score as "maximumScore",
        a.score_percentage as "percentage",
        a.correct_count as "correct",
        a.incorrect_count as "incorrect",
        a.unanswered_count as "unanswered",
        a.tab_warning_count as "tabSwitches",
        case
          when a.submitted_at is null or a.started_at is null then null
          else round(extract(epoch from (a.submitted_at - a.started_at)) / 60.0, 1)
        end as "minutesTaken",
        a.started_at as "startedAt",
        a.submitted_at as "submittedAt"
      from public.attempts a
      join public.assessment_versions av on av.id = a.assessment_version_id
      join public.regions reg on reg.id = a.region_id_snapshot
      join public.hubs hub on hub.id = a.hub_id_snapshot
      where private.report_window(p_from, p_to, coalesce(a.submitted_at, a.created_at))
    ) r;

  elsif p_report = 'trainers' then
    select coalesce(jsonb_agg(row_to_json(r)::jsonb order by r."name"), '[]'::jsonb)
    into v_rows
    from (
      select
        c.full_name as "name",
        c.email as "email",
        reg.name as "state",
        hub.name as "centre",
        count(a.id) filter (where a.id is not null) as "attempts",
        count(a.id) filter (where a.status = 'submitted') as "submitted",
        max(a.score_percentage) as "bestPercentage",
        bool_or(coalesce(a.qualified, false)) as "everQualified",
        max(a.submitted_at) as "lastSubmittedAt",
        c.created_at as "registeredAt"
      from public.candidates c
      join public.regions reg on reg.id = c.region_id
      join public.hubs hub on hub.id = c.hub_id
      left join public.attempts a
        on a.candidate_id = c.id
       and private.report_window(p_from, p_to, coalesce(a.submitted_at, a.created_at))
      group by c.id, c.full_name, c.email, reg.name, hub.name, c.created_at
    ) r;

  elsif p_report = 'centres' then
    select coalesce(jsonb_agg(row_to_json(r)::jsonb order by r."state", r."centre"), '[]'::jsonb)
    into v_rows
    from (
      select
        reg.name as "state",
        hub.name as "centre",
        count(distinct c.id) as "trainers",
        count(a.id) filter (where a.status = 'submitted') as "submitted",
        count(a.id) filter (where a.qualified) as "qualified",
        count(a.id) filter (where a.status = 'submitted' and not a.qualified) as "notQualified",
        round(avg(a.score_percentage) filter (where a.status = 'submitted'), 1) as "averagePercentage",
        round(
          100.0 * count(a.id) filter (where a.qualified)
            / nullif(count(a.id) filter (where a.status = 'submitted'), 0),
          1
        ) as "passRate",
        coalesce(sum(a.tab_warning_count), 0) as "tabSwitches"
      from public.hubs hub
      join public.regions reg on reg.id = hub.region_id
      left join public.candidates c on c.hub_id = hub.id
      left join public.attempts a
        on a.hub_id_snapshot = hub.id
       and private.report_window(p_from, p_to, coalesce(a.submitted_at, a.created_at))
      group by reg.name, hub.name
    ) r;

  elsif p_report = 'questions' then
    select coalesce(jsonb_agg(row_to_json(r)::jsonb order by r."code"), '[]'::jsonb)
    into v_rows
    from (
      with served as (
        select
          q.id,
          q.external_code,
          q.question_text,
          q.category,
          q.difficulty,
          aq.id as attempt_question_id,
          key.correct_option_id,
          ans.selected_option_id
        from public.attempt_questions aq
        join public.questions q on q.id = aq.question_id
        join public.attempts a on a.id = aq.attempt_id
        left join private.question_answer_keys key on key.question_id = q.id
        left join public.attempt_answers ans on ans.attempt_question_id = aq.id
        where a.status = 'submitted'
          and private.report_window(p_from, p_to, coalesce(a.submitted_at, a.created_at))
      )
      select
        s.external_code as "code",
        s.question_text as "question",
        s.category as "category",
        s.difficulty as "difficulty",
        count(*) as "timesServed",
        count(*) filter (where s.selected_option_id = s.correct_option_id) as "correct",
        count(*) filter (
          where s.selected_option_id is not null
            and s.selected_option_id is distinct from s.correct_option_id
        ) as "incorrect",
        count(*) filter (where s.selected_option_id is null) as "unanswered",
        round(
          100.0 * count(*) filter (where s.selected_option_id = s.correct_option_id)
            / nullif(count(*), 0),
          1
        ) as "correctRate"
      from served s
      group by s.external_code, s.question_text, s.category, s.difficulty
    ) r;

  else
    raise exception using errcode = '22023', message = 'UNKNOWN_REPORT';
  end if;

  return jsonb_build_object(
    'generatedAt', now(),
    'report', p_report,
    'rows', v_rows
  );
end;
$$;

revoke all on function public.get_admin_report(text, text, timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function public.get_admin_report(text, text, timestamptz, timestamptz)
  to service_role;

-- The reports page only needs to know how big each download would be. Counting
-- server-side keeps it from pulling every row of four reports on page load.
create or replace function public.get_admin_report_counts(
  p_session_token_hash text,
  p_from timestamptz default null,
  p_to timestamptz default null
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

  select jsonb_build_object(
    'attempts', (
      select count(*)
      from public.attempts a
      where private.report_window(p_from, p_to, coalesce(a.submitted_at, a.created_at))
    ),
    'trainers', (select count(*) from public.candidates),
    'centres', (select count(*) from public.hubs),
    'questions', (
      select count(distinct q.id)
      from public.attempt_questions aq
      join public.questions q on q.id = aq.question_id
      join public.attempts a on a.id = aq.attempt_id
      where a.status = 'submitted'
        and private.report_window(p_from, p_to, coalesce(a.submitted_at, a.created_at))
    )
  )
  into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_admin_report_counts(text, timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function public.get_admin_report_counts(text, timestamptz, timestamptz)
  to service_role;

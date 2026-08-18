-- Assessment analytics. Item analysis uses the classic psychometrics pair:
-- difficulty index (share answering correctly, unanswered counted as wrong)
-- and discrimination index (top score quartile correct rate minus bottom).
-- A low discrimination on a hard question means the question is faulty rather
-- than demanding, so both numbers are reported together.

create or replace function public.get_admin_analytics(
  p_session_token_hash text,
  p_trend_days integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid;
  v_now timestamptz := clock_timestamp();
  v_passing numeric(5, 2);
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

  select av.passing_percentage
  into v_passing
  from public.assessment_versions av
  where av.status = 'published'
  order by av.version_number desc
  limit 1;

  with submitted as (
    select
      a.id,
      a.score_percentage,
      a.correct_count,
      a.unanswered_count,
      a.qualified,
      a.tab_warning_count,
      a.submitted_at,
      greatest(0, extract(epoch from (a.submitted_at - a.started_at))::integer) as duration_seconds
    from public.attempts a
    where a.status = 'submitted' and a.score_percentage is not null
  ),
  quartiles as (
    select s.id, s.score_percentage,
      ntile(4) over (order by s.score_percentage) as score_quartile
    from submitted s
  ),
  presented as (
    -- Every question actually served to a submitted attempt.
    select
      aq.id as attempt_question_id,
      aq.attempt_id,
      aq.question_id,
      aq.display_order,
      q.question_text,
      q.external_code,
      k.correct_option_id,
      aa.selected_option_id,
      (aa.selected_option_id is not null and aa.selected_option_id = k.correct_option_id) as is_correct,
      (aa.selected_option_id is null) as is_unanswered,
      qt.score_quartile
    from public.attempt_questions aq
    join quartiles qt on qt.id = aq.attempt_id
    join public.questions q on q.id = aq.question_id
    join private.question_answer_keys k on k.question_id = aq.question_id
    left join public.attempt_answers aa on aa.attempt_question_id = aq.id
  ),
  item_stats as (
    select
      p.question_id,
      p.external_code,
      p.question_text,
      count(*) as presented_count,
      count(*) filter (where p.is_correct) as correct_count,
      count(*) filter (where p.is_unanswered) as unanswered_count,
      round(100.0 * count(*) filter (where p.is_correct) / nullif(count(*), 0), 1) as difficulty_index,
      round(
        100.0 * count(*) filter (where p.is_correct and p.score_quartile = 4)
          / nullif(count(*) filter (where p.score_quartile = 4), 0)
        - 100.0 * count(*) filter (where p.is_correct and p.score_quartile = 1)
          / nullif(count(*) filter (where p.score_quartile = 1), 0)
      , 1) as discrimination_index,
      round(avg(p.display_order), 1) as average_position
    from presented p
    group by p.question_id, p.external_code, p.question_text
  ),
  top_distractor as (
    select distinct on (p.question_id)
      p.question_id,
      qo.option_text as option_text,
      count(*) as picks
    from presented p
    join public.question_options qo on qo.id = p.selected_option_id
    where p.selected_option_id is not null and not p.is_correct
    group by p.question_id, qo.option_text
    order by p.question_id, count(*) desc, qo.option_text
  )
  select jsonb_build_object(
    'generatedAt', v_now,
    'passingPercentage', coalesce(v_passing, 0),
    'summary', (
      select jsonb_build_object(
        'submitted', (select count(*) from submitted),
        'started', (select count(*) from public.attempts where status in ('in_progress','submitted','expired','abandoned')),
        'created', (select count(*) from public.attempts),
        'inProgress', (select count(*) from public.attempts where status = 'in_progress'),
        'qualified', (select count(*) filter (where qualified) from submitted),
        'passRate', (select round(100.0 * count(*) filter (where qualified) / nullif(count(*), 0), 1) from submitted),
        'averageScore', (select round(avg(score_percentage), 1) from submitted),
        'medianScore', (select round(percentile_cont(0.5) within group (order by score_percentage)::numeric, 1) from submitted),
        'p25Score', (select round(percentile_cont(0.25) within group (order by score_percentage)::numeric, 1) from submitted),
        'p75Score', (select round(percentile_cont(0.75) within group (order by score_percentage)::numeric, 1) from submitted),
        'medianDurationSeconds', (select round(percentile_cont(0.5) within group (order by duration_seconds)::numeric) from submitted),
        'averageUnanswered', (select round(avg(unanswered_count), 1) from submitted),
        'attemptsWithWarnings', (select count(*) filter (where tab_warning_count > 0) from submitted),
        'questionsAnalysed', (select count(*) from item_stats)
      )
    ),
    'scoreDistribution', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'rangeStart', (b.bucket - 1) * 10,
        'rangeEnd', b.bucket * 10,
        'count', coalesce(s.total, 0)
      ) order by b.bucket), '[]'::jsonb)
      from generate_series(1, 10) as b(bucket)
      left join (
        select least(width_bucket(score_percentage, 0, 100, 10), 10) as bucket, count(*) as total
        from submitted group by 1
      ) s on s.bucket = b.bucket
    ),
    'trend', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'date', d.day,
        'submitted', coalesce(t.submitted, 0),
        'qualified', coalesce(t.qualified, 0)
      ) order by d.day), '[]'::jsonb)
      from generate_series(
        (v_now at time zone 'utc')::date - (greatest(p_trend_days, 1) - 1),
        (v_now at time zone 'utc')::date,
        interval '1 day'
      ) as d(day)
      left join (
        select (submitted_at at time zone 'utc')::date as day,
               count(*) as submitted,
               count(*) filter (where qualified) as qualified
        from submitted group by 1
      ) t on t.day = d.day::date
    ),
    'itemAnalysis', (
      select coalesce(jsonb_agg(x order by difficulty_index nulls last, code), '[]'::jsonb)
      from (
        select
          i.difficulty_index,
          i.external_code as code,
          jsonb_build_object(
            'code', i.external_code,
            'prompt', i.question_text,
            'presented', i.presented_count,
            'difficultyIndex', i.difficulty_index,
            'discriminationIndex', i.discrimination_index,
            'unansweredRate', round(100.0 * i.unanswered_count / nullif(i.presented_count, 0), 1),
            'averagePosition', i.average_position,
            'topDistractor', td.option_text,
            'topDistractorPicks', td.picks
          ) as x
        from item_stats i
        left join top_distractor td on td.question_id = i.question_id
        order by i.difficulty_index nulls last, i.external_code
        limit 12
      ) ranked
    ),
    'timeScore', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'minutes', round(s.duration_seconds / 60.0, 2),
        'score', s.score_percentage,
        'qualified', s.qualified
      )), '[]'::jsonb)
      from (select * from submitted order by submitted_at desc limit 300) s
    ),
    'integrity', (
      select jsonb_build_object(
        'clean', jsonb_build_object(
          'attempts', count(*) filter (where tab_warning_count = 0),
          'averageScore', round(avg(score_percentage) filter (where tab_warning_count = 0), 1),
          'passRate', round(100.0 * count(*) filter (where tab_warning_count = 0 and qualified)
            / nullif(count(*) filter (where tab_warning_count = 0), 0), 1)
        ),
        'flagged', jsonb_build_object(
          'attempts', count(*) filter (where tab_warning_count > 0),
          'averageScore', round(avg(score_percentage) filter (where tab_warning_count > 0), 1),
          'passRate', round(100.0 * count(*) filter (where tab_warning_count > 0 and qualified)
            / nullif(count(*) filter (where tab_warning_count > 0), 0), 1)
        ),
        'totalWarnings', coalesce(sum(tab_warning_count), 0)
      )
      from submitted
    ),
    'hubs', (
      select coalesce(jsonb_agg(x order by (x->>'averageScore')::numeric desc nulls last), '[]'::jsonb)
      from (
        select jsonb_build_object(
          'hub', h.name,
          'region', reg.name,
          'attempts', count(sub.id),
          'averageScore', round(avg(sub.score_percentage), 1),
          'passRate', round(100.0 * count(*) filter (where sub.qualified) / nullif(count(sub.id), 0), 1)
        ) as x
        from public.attempts a
        join submitted sub on sub.id = a.id
        join public.hubs h on h.id = a.hub_id_snapshot
        join public.regions reg on reg.id = a.region_id_snapshot
        group by h.id, h.name, reg.name
      ) hub_rows
    )
  )
  into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_admin_analytics(text, integer) from public, anon, authenticated;
grant execute on function public.get_admin_analytics(text, integer) to service_role;

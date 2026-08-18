-- Expanded assessment analytics.
--
-- The first cut answered "how did the cohort do". This one also answers "why":
-- per-option pick counts behind every question, duration and timing effects,
-- centre and state rollups, and the tab-warning ladder. It is a single round
-- trip because every panel on the analytics page reads from the same
-- submitted-attempt population, and splitting it would let the panels
-- disagree with each other mid-refresh.
--
-- Item analysis keeps the classic psychometrics pair: difficulty index (share
-- answering correctly, unanswered counted as wrong) and discrimination index
-- (top score quartile correct rate minus bottom). A low discrimination on a
-- hard question means the question is faulty rather than demanding, so both
-- numbers are always reported together.
--
-- Day, hour and weekday buckets are cut in Asia/Kolkata: the reader is in
-- India and "submissions at 3pm" has to mean their 3pm.

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
  v_tz constant text := 'Asia/Kolkata';
  v_today date := (v_now at time zone v_tz)::date;
  v_days integer := greatest(coalesce(p_trend_days, 30), 1);
  v_passing numeric(5, 2);
  v_version_id uuid;
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

  select av.id, av.passing_percentage
  into v_version_id, v_passing
  from public.assessment_versions av
  where av.status = 'published'
  order by av.version_number desc
  limit 1;

  with submitted as (
    select
      a.id,
      a.candidate_name_snapshot,
      a.candidate_email_snapshot,
      a.hub_id_snapshot,
      a.region_id_snapshot,
      a.score_percentage,
      a.score_obtained,
      a.maximum_score,
      a.correct_count,
      a.incorrect_count,
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
      aq.is_flagged,
      aq.is_visited,
      q.question_text,
      q.external_code,
      q.category,
      q.difficulty,
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
      p.category,
      p.difficulty,
      count(*) as presented_count,
      count(*) filter (where p.is_correct) as correct_count,
      count(*) filter (where p.is_unanswered) as unanswered_count,
      count(*) filter (where p.is_flagged) as flagged_count,
      round(100.0 * count(*) filter (where p.is_correct) / nullif(count(*), 0), 1) as difficulty_index,
      round(
        100.0 * count(*) filter (where p.is_correct and p.score_quartile = 4)
          / nullif(count(*) filter (where p.score_quartile = 4), 0)
        - 100.0 * count(*) filter (where p.is_correct and p.score_quartile = 1)
          / nullif(count(*) filter (where p.score_quartile = 1), 0)
      , 1) as discrimination_index,
      round(
        100.0 * count(*) filter (where p.is_correct and p.score_quartile = 4)
          / nullif(count(*) filter (where p.score_quartile = 4), 0)
      , 1) as top_quartile_correct,
      round(
        100.0 * count(*) filter (where p.is_correct and p.score_quartile = 1)
          / nullif(count(*) filter (where p.score_quartile = 1), 0)
      , 1) as bottom_quartile_correct,
      round(avg(p.display_order), 1) as average_position
    from presented p
    group by p.question_id, p.external_code, p.question_text, p.category, p.difficulty
  ),
  option_stats as (
    -- Every option of every question, including the ones nobody picked, so the
    -- expanded question view can show a full answer spread rather than a gap.
    select
      qo.question_id,
      qo.id as option_id,
      qo.option_code,
      qo.option_text,
      qo.display_order,
      (qo.id = k.correct_option_id) as is_correct,
      count(p.attempt_question_id) filter (where p.selected_option_id = qo.id) as picks
    from public.question_options qo
    join private.question_answer_keys k on k.question_id = qo.question_id
    left join presented p on p.question_id = qo.question_id
    where qo.is_active
    group by qo.question_id, qo.id, qo.option_code, qo.option_text, qo.display_order, k.correct_option_id
  ),
  top_distractor as (
    select distinct on (o.question_id)
      o.question_id,
      o.option_text,
      o.picks
    from option_stats o
    where not o.is_correct and o.picks > 0
    order by o.question_id, o.picks desc, o.option_text
  )
  select jsonb_build_object(
    'generatedAt', v_now,
    'passingPercentage', coalesce(v_passing, 0),
    'trendDays', v_days,

    'summary', (
      select jsonb_build_object(
        'submitted', (select count(*) from submitted),
        'started', (select count(*) from public.attempts where status in ('in_progress','submitted','expired','abandoned')),
        'created', (select count(*) from public.attempts),
        'inProgress', (select count(*) from public.attempts where status = 'in_progress'),
        'notStarted', (select count(*) from public.attempts where status = 'ready'),
        'expired', (select count(*) from public.attempts where status = 'expired'),
        'abandoned', (select count(*) from public.attempts where status = 'abandoned'),
        'candidates', (select count(*) from public.candidates),
        'qualified', (select count(*) filter (where qualified) from submitted),
        'notQualified', (select count(*) filter (where not qualified) from submitted),
        'passRate', (select round(100.0 * count(*) filter (where qualified) / nullif(count(*), 0), 1) from submitted),
        'averageScore', (select round(avg(score_percentage), 1) from submitted),
        'medianScore', (select round(percentile_cont(0.5) within group (order by score_percentage)::numeric, 1) from submitted),
        'p10Score', (select round(percentile_cont(0.10) within group (order by score_percentage)::numeric, 1) from submitted),
        'p25Score', (select round(percentile_cont(0.25) within group (order by score_percentage)::numeric, 1) from submitted),
        'p75Score', (select round(percentile_cont(0.75) within group (order by score_percentage)::numeric, 1) from submitted),
        'p90Score', (select round(percentile_cont(0.90) within group (order by score_percentage)::numeric, 1) from submitted),
        'minScore', (select round(min(score_percentage), 1) from submitted),
        'maxScore', (select round(max(score_percentage), 1) from submitted),
        'scoreStdDev', (select round(stddev_samp(score_percentage), 1) from submitted),
        'perfectScores', (select count(*) filter (where score_percentage >= 100) from submitted),
        'medianDurationSeconds', (select round(percentile_cont(0.5) within group (order by duration_seconds)::numeric) from submitted),
        'averageDurationSeconds', (select round(avg(duration_seconds)) from submitted),
        'fastestDurationSeconds', (select min(duration_seconds) from submitted),
        'slowestDurationSeconds', (select max(duration_seconds) from submitted),
        'averageCorrect', (select round(avg(correct_count), 1) from submitted),
        'averageIncorrect', (select round(avg(incorrect_count), 1) from submitted),
        'averageUnanswered', (select round(avg(unanswered_count), 1) from submitted),
        'attemptsWithWarnings', (select count(*) filter (where tab_warning_count > 0) from submitted),
        'totalWarnings', (select coalesce(sum(tab_warning_count), 0) from submitted),
        'averageWarnings', (select round(avg(tab_warning_count), 2) from submitted),
        'submittedToday', (select count(*) from submitted where (submitted_at at time zone v_tz)::date = v_today),
        'submittedLast7Days', (select count(*) from submitted where (submitted_at at time zone v_tz)::date > v_today - 7),
        'hubsCovered', (select count(distinct hub_id_snapshot) from submitted),
        'regionsCovered', (select count(distinct region_id_snapshot) from submitted),
        'hubsTotal', (select count(*) from public.hubs),
        'regionsTotal', (select count(*) from public.regions),
        'questionsAnalysed', (select count(*) from item_stats),
        'questionsTotal', (
          select count(*) from public.questions
          where is_active and (v_version_id is null or assessment_version_id = v_version_id)
        ),
        'flagRate', (select round(100.0 * count(*) filter (where is_flagged) / nullif(count(*), 0), 1) from presented)
      )
    ),

    'scoreDistribution', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'rangeStart', (b.bucket - 1) * 10,
        'rangeEnd', b.bucket * 10,
        'count', coalesce(s.total, 0),
        'qualified', coalesce(s.qualified, 0),
        'notQualified', coalesce(s.total, 0) - coalesce(s.qualified, 0)
      ) order by b.bucket), '[]'::jsonb)
      from generate_series(1, 10) as b(bucket)
      left join (
        select least(width_bucket(score_percentage, 0, 100, 10), 10) as bucket,
               count(*) as total,
               count(*) filter (where qualified) as qualified
        from submitted group by 1
      ) s on s.bucket = b.bucket
    ),

    'trend', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'date', d.day,
        'submitted', coalesce(t.submitted, 0),
        'qualified', coalesce(t.qualified, 0),
        'averageScore', t.average_score
      ) order by d.day), '[]'::jsonb)
      from generate_series(v_today - (v_days - 1), v_today, interval '1 day') as d(day)
      left join (
        select (submitted_at at time zone v_tz)::date as day,
               count(*) as submitted,
               count(*) filter (where qualified) as qualified,
               round(avg(score_percentage), 1) as average_score
        from submitted group by 1
      ) t on t.day = d.day::date
    ),

    'hourly', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'hour', h.hour,
        'submitted', coalesce(x.total, 0)
      ) order by h.hour), '[]'::jsonb)
      from generate_series(0, 23) as h(hour)
      left join (
        select extract(hour from (submitted_at at time zone v_tz))::integer as hour, count(*) as total
        from submitted group by 1
      ) x on x.hour = h.hour
    ),

    'weekday', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'weekday', w.weekday,
        'submitted', coalesce(x.total, 0),
        'averageScore', x.average_score
      ) order by w.weekday), '[]'::jsonb)
      from generate_series(1, 7) as w(weekday)
      left join (
        select extract(isodow from (submitted_at at time zone v_tz))::integer as weekday,
               count(*) as total,
               round(avg(score_percentage), 1) as average_score
        from submitted group by 1
      ) x on x.weekday = w.weekday
    ),

    'durationDistribution', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'rangeStart', (b.bucket - 1) * 5,
        'rangeEnd', case when b.bucket = 7 then null else b.bucket * 5 end,
        'count', coalesce(x.total, 0),
        'averageScore', x.average_score,
        'passRate', x.pass_rate
      ) order by b.bucket), '[]'::jsonb)
      from generate_series(1, 7) as b(bucket)
      left join (
        select least(width_bucket(duration_seconds / 60.0, 0, 30, 6), 7) as bucket,
               count(*) as total,
               round(avg(score_percentage), 1) as average_score,
               round(100.0 * count(*) filter (where qualified) / nullif(count(*), 0), 1) as pass_rate
        from submitted group by 1
      ) x on x.bucket = b.bucket
    ),

    'itemAnalysis', (
      select coalesce(jsonb_agg(x order by sort_difficulty nulls last, sort_code), '[]'::jsonb)
      from (
        select
          i.difficulty_index as sort_difficulty,
          i.external_code as sort_code,
          jsonb_build_object(
            'code', i.external_code,
            'prompt', i.question_text,
            'category', i.category,
            'difficultyLabel', i.difficulty,
            'presented', i.presented_count,
            'correct', i.correct_count,
            'unanswered', i.unanswered_count,
            'flagged', i.flagged_count,
            'difficultyIndex', i.difficulty_index,
            'discriminationIndex', i.discrimination_index,
            'topQuartileCorrect', i.top_quartile_correct,
            'bottomQuartileCorrect', i.bottom_quartile_correct,
            'unansweredRate', round(100.0 * i.unanswered_count / nullif(i.presented_count, 0), 1),
            'flagRate', round(100.0 * i.flagged_count / nullif(i.presented_count, 0), 1),
            'averagePosition', i.average_position,
            'topDistractor', td.option_text,
            'topDistractorPicks', td.picks,
            'options', (
              select coalesce(jsonb_agg(jsonb_build_object(
                'code', o.option_code,
                'text', o.option_text,
                'isCorrect', o.is_correct,
                'picks', o.picks,
                'share', round(100.0 * o.picks / nullif(i.presented_count, 0), 1)
              ) order by o.display_order), '[]'::jsonb)
              from option_stats o
              where o.question_id = i.question_id
            )
          ) as x
        from item_stats i
        left join top_distractor td on td.question_id = i.question_id
        order by i.difficulty_index nulls last, i.external_code
        limit 60
      ) ranked
    ),

    'timeScore', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'minutes', round(s.duration_seconds / 60.0, 2),
        'score', s.score_percentage,
        'qualified', s.qualified,
        'warnings', s.tab_warning_count
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
        'totalWarnings', coalesce(sum(tab_warning_count), 0),
        'maxWarnings', coalesce(max(tab_warning_count), 0)
      )
      from submitted
    ),

    'warningLadder', (
      -- Outcomes at 0, 1, 2 and 3+ warnings, so a reader can see whether the
      -- score gap widens with each switch or is flat noise.
      select coalesce(jsonb_agg(jsonb_build_object(
        'bucket', b.bucket,
        'label', case b.bucket when 0 then 'None' when 3 then '3 or more' else b.bucket::text end,
        'attempts', coalesce(x.attempts, 0),
        'averageScore', x.average_score,
        'passRate', x.pass_rate
      ) order by b.bucket), '[]'::jsonb)
      from generate_series(0, 3) as b(bucket)
      left join (
        select least(tab_warning_count, 3) as bucket,
               count(*) as attempts,
               round(avg(score_percentage), 1) as average_score,
               round(100.0 * count(*) filter (where qualified) / nullif(count(*), 0), 1) as pass_rate
        from submitted group by 1
      ) x on x.bucket = b.bucket
    ),

    'hubs', (
      select coalesce(jsonb_agg(x order by (x->>'averageScore')::numeric desc nulls last), '[]'::jsonb)
      from (
        select jsonb_build_object(
          'hub', h.name,
          'region', reg.name,
          'attempts', count(sub.id),
          'qualified', count(*) filter (where sub.qualified),
          'averageScore', round(avg(sub.score_percentage), 1),
          'medianScore', round(percentile_cont(0.5) within group (order by sub.score_percentage)::numeric, 1),
          'bestScore', round(max(sub.score_percentage), 1),
          'passRate', round(100.0 * count(*) filter (where sub.qualified) / nullif(count(sub.id), 0), 1),
          'warnings', coalesce(sum(sub.tab_warning_count), 0),
          'medianDurationSeconds', round(percentile_cont(0.5) within group (order by sub.duration_seconds)::numeric)
        ) as x
        from submitted sub
        join public.hubs h on h.id = sub.hub_id_snapshot
        join public.regions reg on reg.id = sub.region_id_snapshot
        group by h.id, h.name, reg.name
      ) hub_rows
    ),

    'regions', (
      select coalesce(jsonb_agg(x order by (x->>'averageScore')::numeric desc nulls last), '[]'::jsonb)
      from (
        select jsonb_build_object(
          'region', reg.name,
          'hubs', count(distinct sub.hub_id_snapshot),
          'attempts', count(sub.id),
          'qualified', count(*) filter (where sub.qualified),
          'averageScore', round(avg(sub.score_percentage), 1),
          'passRate', round(100.0 * count(*) filter (where sub.qualified) / nullif(count(sub.id), 0), 1),
          'warnings', coalesce(sum(sub.tab_warning_count), 0)
        ) as x
        from submitted sub
        join public.regions reg on reg.id = sub.region_id_snapshot
        group by reg.id, reg.name
      ) region_rows
    ),

    'topPerformers', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'name', s.candidate_name_snapshot,
        'hub', h.name,
        'region', reg.name,
        'score', s.score_percentage,
        'durationSeconds', s.duration_seconds,
        'warnings', s.tab_warning_count
      ) order by s.score_percentage desc, s.duration_seconds), '[]'::jsonb)
      from (
        select * from submitted order by score_percentage desc, duration_seconds limit 5
      ) s
      join public.hubs h on h.id = s.hub_id_snapshot
      join public.regions reg on reg.id = s.region_id_snapshot
    )
  )
  into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_admin_analytics(text, integer) from public, anon, authenticated;
grant execute on function public.get_admin_analytics(text, integer) to service_role;

-- Trainer rows now carry the tab-switch count, so the evaluations table can
-- flag a candidate without the reader opening every report to find out.
create or replace function public.get_admin_trainers(
  p_session_token_hash text,
  p_search text default null,
  p_region_id uuid default null,
  p_hub_id uuid default null,
  p_limit integer default 100
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid;
  v_now timestamptz := clock_timestamp();
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
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

  select coalesce(jsonb_agg(row_json order by sort_at desc nulls last), '[]'::jsonb)
  into v_result
  from (
    select
      coalesce(a.submitted_at, a.started_at, a.created_at) as sort_at,
      jsonb_build_object(
        'attemptId', a.id,
        'name', a.candidate_name_snapshot,
        'email', a.candidate_email_snapshot,
        'region', reg.name,
        'hub', h.name,
        'status', a.status,
        'scoreObtained', a.score_obtained,
        'maximumScore', a.maximum_score,
        'scorePercentage', a.score_percentage,
        'correctCount', a.correct_count,
        'incorrectCount', a.incorrect_count,
        'unansweredCount', a.unanswered_count,
        'tabWarningCount', a.tab_warning_count,
        'durationSeconds', case
          when a.submitted_at is null or a.started_at is null then null
          else greatest(0, extract(epoch from (a.submitted_at - a.started_at))::integer)
        end,
        'qualified', a.qualified,
        'submittedAt', a.submitted_at,
        'startedAt', a.started_at
      ) as row_json
    from public.attempts a
    join public.regions reg on reg.id = a.region_id_snapshot
    join public.hubs h on h.id = a.hub_id_snapshot
    where (p_region_id is null or a.region_id_snapshot = p_region_id)
      and (p_hub_id is null or a.hub_id_snapshot = p_hub_id)
      and (
        v_search is null
        or a.candidate_name_snapshot ilike '%' || v_search || '%'
        or a.candidate_email_snapshot ilike '%' || v_search || '%'
      )
    order by coalesce(a.submitted_at, a.started_at, a.created_at) desc
    limit greatest(coalesce(p_limit, 100), 1)
  ) rows;

  return v_result;
end;
$$;

revoke all on function public.get_admin_trainers(text, text, uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.get_admin_trainers(text, text, uuid, uuid, integer) to service_role;

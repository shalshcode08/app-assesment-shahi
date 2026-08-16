-- Adds coverage counts (states, skill centres, assessed trainers) and the
-- top-performing hub block to the admin dashboard payload.

create or replace function public.get_admin_dashboard(
  p_session_token_hash text,
  p_trend_days integer default 14
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
  v_top_hub_id uuid;
  v_top_hub jsonb;
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

  -- Best hub by average submitted score; ties break toward more attempts.
  select a.hub_id_snapshot
  into v_top_hub_id
  from public.attempts a
  where a.status = 'submitted' and a.score_percentage is not null
  group by a.hub_id_snapshot
  order by avg(a.score_percentage) desc, count(*) desc
  limit 1;

  if v_top_hub_id is not null then
    select jsonb_build_object(
      'hub', h.name,
      'region', reg.name,
      'trainersEvaluated', stats.evaluated,
      'averageScorePercentage', stats.avg_score,
      'topTrainer', (
        select jsonb_build_object(
          'name', t.candidate_name_snapshot,
          'region', reg.name,
          'hub', h.name,
          'scoreObtained', t.score_obtained,
          'maximumScore', t.maximum_score,
          'scorePercentage', t.score_percentage
        )
        from public.attempts t
        where t.hub_id_snapshot = v_top_hub_id
          and t.status = 'submitted'
          and t.score_percentage is not null
        order by t.score_percentage desc, t.submitted_at asc
        limit 1
      )
    )
    into v_top_hub
    from public.hubs h
    join public.regions reg on reg.id = h.region_id
    cross join lateral (
      select
        count(*) as evaluated,
        round(avg(a.score_percentage), 1) as avg_score
      from public.attempts a
      where a.hub_id_snapshot = v_top_hub_id
        and a.status = 'submitted'
        and a.score_percentage is not null
    ) stats
    where h.id = v_top_hub_id;
  end if;

  select jsonb_build_object(
    'generatedAt', v_now,
    'passingPercentage', coalesce(v_passing, 0),
    'topHub', v_top_hub,
    'coverage', jsonb_build_object(
      'activeStates', (select count(*) from public.regions r where r.is_active),
      'skillCentres', (select count(*) from public.hubs h where h.is_active)
    ),
    'summary', (
      select jsonb_build_object(
        'totalAttempts', count(*),
        'submittedCount', count(*) filter (where a.status = 'submitted'),
        'inProgressCount', count(*) filter (where a.status = 'in_progress'),
        'candidateCount', count(distinct a.candidate_id),
        'assessedTrainers', count(distinct a.candidate_id) filter (where a.status = 'submitted'),
        'qualifiedCount', count(*) filter (where a.qualified),
        'passRate', case
          when count(*) filter (where a.status = 'submitted') = 0 then null
          else round(
            100.0 * count(*) filter (where a.qualified)
            / count(*) filter (where a.status = 'submitted'), 1)
        end,
        'averageScorePercentage', round(avg(a.score_percentage) filter (where a.status = 'submitted'), 1),
        'averageDurationSeconds', round(avg(
          extract(epoch from (a.submitted_at - a.started_at))
        ) filter (where a.status = 'submitted')),
        'tabWarningTotal', coalesce(sum(a.tab_warning_count), 0)
      )
      from public.attempts a
    ),
    'trend', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'date', d.day,
        'started', coalesce(t.started, 0),
        'submitted', coalesce(t.submitted, 0)
      ) order by d.day), '[]'::jsonb)
      from generate_series(
        (v_now at time zone 'utc')::date - (greatest(p_trend_days, 1) - 1),
        (v_now at time zone 'utc')::date,
        interval '1 day'
      ) as d(day)
      left join (
        select
          (coalesce(a.started_at, a.created_at) at time zone 'utc')::date as day,
          count(*) as started,
          count(*) filter (where a.status = 'submitted') as submitted
        from public.attempts a
        group by 1
      ) t on t.day = d.day::date
    ),
    'scoreDistribution', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'bucket', b.bucket,
        'rangeStart', (b.bucket - 1) * 10,
        'rangeEnd', b.bucket * 10,
        'count', coalesce(s.total, 0)
      ) order by b.bucket), '[]'::jsonb)
      from generate_series(1, 10) as b(bucket)
      left join (
        select
          least(width_bucket(a.score_percentage, 0, 100, 10), 10) as bucket,
          count(*) as total
        from public.attempts a
        where a.status = 'submitted' and a.score_percentage is not null
        group by 1
      ) s on s.bucket = b.bucket
    ),
    'regions', (
      select coalesce(jsonb_agg(r), '[]'::jsonb)
      from (
        select jsonb_build_object(
          'region', reg.name,
          'attempts', count(a.id),
          'submitted', count(a.id) filter (where a.status = 'submitted'),
          'qualified', count(a.id) filter (where a.qualified),
          'averageScorePercentage', round(avg(a.score_percentage) filter (where a.status = 'submitted'), 1)
        ) as r
        from public.regions reg
        left join public.attempts a on a.region_id_snapshot = reg.id
        group by reg.id, reg.name, reg.display_order
        having count(a.id) > 0
        order by count(a.id) desc, reg.display_order
      ) ranked
    ),
    'hardestQuestions', (
      select coalesce(jsonb_agg(q), '[]'::jsonb)
      from (
        select jsonb_build_object(
          'code', que.external_code,
          'prompt', que.question_text,
          'answered', count(*),
          'correctRate', round(
            100.0 * count(*) filter (where aa.selected_option_id = k.correct_option_id)
            / nullif(count(*), 0), 1)
        ) as q
        from public.attempt_answers aa
        join public.attempt_questions aq on aq.id = aa.attempt_question_id
        join public.questions que on que.id = aq.question_id
        join private.question_answer_keys k on k.question_id = que.id
        where aa.selected_option_id is not null
        group by que.id, que.external_code, que.question_text
        having count(*) >= 1
        order by
          (count(*) filter (where aa.selected_option_id = k.correct_option_id))::numeric
            / nullif(count(*), 0) asc,
          count(*) desc
        limit 6
      ) ranked
    ),
    'recentAttempts', (
      select coalesce(jsonb_agg(x), '[]'::jsonb)
      from (
        select jsonb_build_object(
          'attemptId', a.id,
          'name', a.candidate_name_snapshot,
          'email', a.candidate_email_snapshot,
          'region', reg.name,
          'hub', h.name,
          'status', a.status,
          'scorePercentage', a.score_percentage,
          'correctCount', a.correct_count,
          'qualified', a.qualified,
          'tabWarningCount', a.tab_warning_count,
          'submittedAt', a.submitted_at,
          'startedAt', a.started_at
        ) as x
        from public.attempts a
        join public.regions reg on reg.id = a.region_id_snapshot
        join public.hubs h on h.id = a.hub_id_snapshot
        order by coalesce(a.submitted_at, a.started_at, a.created_at) desc
        limit 12
      ) recent
    )
  )
  into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_admin_dashboard(text, integer) from public, anon, authenticated;
grant execute on function public.get_admin_dashboard(text, integer) to service_role;

-- Assessment leaderboard: ranked submitted attempts plus headline totals.
-- Ties on score are broken by the faster completion, then by earlier submission.

create or replace function public.get_admin_leaderboard(
  p_session_token_hash text,
  p_search text default null,
  p_status text default null,
  p_sort text default 'score_desc'
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
  v_status text := lower(coalesce(nullif(btrim(coalesce(p_status, '')), ''), 'all'));
  v_sort text := lower(coalesce(nullif(btrim(coalesce(p_sort, '')), ''), 'score_desc'));
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

  select av.id
  into v_version_id
  from public.assessment_versions av
  where av.status = 'published'
  order by av.version_number desc
  limit 1;

  with ranked as (
    select
      a.id,
      a.candidate_name_snapshot as name,
      a.candidate_email_snapshot as email,
      reg.name as region,
      h.name as hub,
      a.score_obtained,
      a.maximum_score,
      a.score_percentage,
      a.correct_count,
      a.qualified,
      a.tab_warning_count,
      a.submitted_at,
      greatest(0, extract(epoch from (a.submitted_at - a.started_at))::integer) as duration_seconds,
      row_number() over (
        order by a.score_percentage desc,
                 (a.submitted_at - a.started_at) asc,
                 a.submitted_at asc
      ) as rank
    from public.attempts a
    join public.regions reg on reg.id = a.region_id_snapshot
    join public.hubs h on h.id = a.hub_id_snapshot
    where a.status = 'submitted' and a.score_percentage is not null
  ),
  filtered as (
    select *
    from ranked r
    where (
        v_status = 'all'
        or (v_status = 'passed' and r.qualified)
        or (v_status = 'failed' and not r.qualified)
      )
      and (
        v_search is null
        or r.name ilike '%' || v_search || '%'
        or r.email ilike '%' || v_search || '%'
        or r.region ilike '%' || v_search || '%'
        or r.hub ilike '%' || v_search || '%'
      )
  )
  select jsonb_build_object(
    'summary', jsonb_build_object(
      'totalAssessments', (select count(*) from ranked),
      'averageScorePercentage', (select round(avg(score_percentage), 1) from ranked),
      'passRate', (
        select case when count(*) = 0 then null
               else round(100.0 * count(*) filter (where qualified) / count(*), 1) end
        from ranked
      ),
      'qualifiedCount', (select count(*) filter (where qualified) from ranked),
      'questionBankCount', (
        select count(*)
        from public.questions q
        where q.assessment_version_id = v_version_id and q.is_active
      )
    ),
    'podium', (
      select coalesce(jsonb_agg(p order by (p->>'rank')::integer), '[]'::jsonb)
      from (
        select jsonb_build_object(
          'attemptId', r.id, 'rank', r.rank, 'name', r.name, 'region', r.region,
          'hub', r.hub, 'scoreObtained', r.score_obtained,
          'maximumScore', r.maximum_score, 'scorePercentage', r.score_percentage,
          'durationSeconds', r.duration_seconds
        ) as p
        from ranked r
        where r.rank <= 3
      ) top3
    ),
    'rows', (
      select coalesce(jsonb_agg(x order by sort_key_num, sort_key_time), '[]'::jsonb)
      from (
        select
          case v_sort
            when 'score_asc' then f.score_percentage
            when 'time_asc' then f.duration_seconds::numeric
            when 'recent' then 0
            else -f.score_percentage
          end as sort_key_num,
          case v_sort
            when 'recent' then extract(epoch from f.submitted_at) * -1
            else f.duration_seconds
          end as sort_key_time,
          jsonb_build_object(
            'attemptId', f.id, 'rank', f.rank, 'name', f.name, 'email', f.email,
            'region', f.region, 'hub', f.hub, 'scoreObtained', f.score_obtained,
            'maximumScore', f.maximum_score, 'scorePercentage', f.score_percentage,
            'correctCount', f.correct_count, 'qualified', f.qualified,
            'tabWarningCount', f.tab_warning_count,
            'durationSeconds', f.duration_seconds, 'submittedAt', f.submitted_at
          ) as x
        from filtered f
      ) sorted
    )
  )
  into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_admin_leaderboard(text, text, text, text) from public, anon, authenticated;
grant execute on function public.get_admin_leaderboard(text, text, text, text) to service_role;

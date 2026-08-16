-- Trainer evaluations list for the admin portal, with optional search and
-- state/centre filters. Search matches name or email, case-insensitively.

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

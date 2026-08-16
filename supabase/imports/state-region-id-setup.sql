-- Adds regionId to the state rollup so the States & centres table can deep
-- link into the trainers list filtered to that state.

create or replace function public.get_admin_state_metrics(
  p_session_token_hash text
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

  select coalesce(jsonb_agg(row_json order by sort_submitted desc, sort_name), '[]'::jsonb)
  into v_result
  from (
    select
      reg.name as sort_name,
      count(a.id) filter (where a.status = 'submitted') as sort_submitted,
      jsonb_build_object(
        'regionId', reg.id,
        'region', reg.name,
        'centres', coalesce(centres.names, '[]'::jsonb),
        'centreCount', coalesce(centres.total, 0),
        'trainers', count(distinct a.candidate_id),
        'submitted', count(a.id) filter (where a.status = 'submitted'),
        'passed', count(a.id) filter (where a.qualified),
        'failed', count(a.id) filter (where a.status = 'submitted' and not a.qualified),
        'inProgress', count(a.id) filter (where a.status = 'in_progress'),
        'averageScorePercentage', round(avg(a.score_percentage) filter (where a.status = 'submitted'), 1),
        'passRate', case
          when count(a.id) filter (where a.status = 'submitted') = 0 then null
          else round(
            100.0 * count(a.id) filter (where a.qualified)
            / count(a.id) filter (where a.status = 'submitted'), 1)
        end
      ) as row_json
    from public.regions reg
    left join public.attempts a on a.region_id_snapshot = reg.id
    left join lateral (
      select
        jsonb_agg(h.name order by h.display_order, h.name) as names,
        count(*) as total
      from public.hubs h
      where h.region_id = reg.id and h.is_active
    ) centres on true
    where reg.is_active
    group by reg.id, reg.name, reg.display_order, centres.names, centres.total
  ) rows;

  return v_result;
end;
$$;

revoke all on function public.get_admin_state_metrics(text) from public, anon, authenticated;
grant execute on function public.get_admin_state_metrics(text) to service_role;

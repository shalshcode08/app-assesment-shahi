-- Counting a switch away from the assessment, not just a tab change.
--
-- Browsers disagree about what leaving means. Changing tab fires
-- visibilitychange; switching application (Cmd-Tab on macOS, Alt-Tab elsewhere)
-- often fires only a window blur while the page stays "visible". Counting just
-- page_hidden therefore missed the most common way to leave on a Mac.
--
-- Both events now count, and a short quiet window collapses the pair a single
-- switch can produce, so one departure is charged once.
create or replace function public.record_guest_attempt_event(
  p_attempt_token_hash text,
  p_event_type text,
  p_client_occurred_at timestamptz,
  p_dedupe_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt_id uuid;
  v_max_tab_switches integer;
  v_warning_count integer;
  v_inserted_event_id uuid;
  v_last_counted_at timestamptz;
  v_auto_submitted boolean := false;
  v_now timestamptz := clock_timestamp();
begin
  if p_event_type not in (
    'page_hidden',
    'window_blurred',
    'fullscreen_exited',
    'connection_lost',
    'connection_restored',
    'attempt_resumed'
  ) then
    raise exception using errcode = '22023', message = 'INVALID_ATTEMPT_EVENT';
  end if;

  select a.id, av.max_tab_switches
  into v_attempt_id, v_max_tab_switches
  from public.attempts a
  join public.assessment_versions av on av.id = a.assessment_version_id
  where a.attempt_token_hash = p_attempt_token_hash
    and a.status = 'in_progress'
    and a.expires_at > now();

  if v_attempt_id is null then
    raise exception using errcode = 'P0001', message = 'ATTEMPT_NOT_ACTIVE';
  end if;

  -- Read the previous departure before inserting this one, so the new row does
  -- not answer the question about itself.
  select max(e.received_at)
  into v_last_counted_at
  from public.attempt_events e
  where e.attempt_id = v_attempt_id
    and e.event_type in ('page_hidden', 'window_blurred');

  insert into public.attempt_events (
    attempt_id,
    event_type,
    client_occurred_at,
    dedupe_key
  )
  values (
    v_attempt_id,
    p_event_type,
    p_client_occurred_at,
    p_dedupe_key
  )
  on conflict (attempt_id, dedupe_key) do nothing
  returning id into v_inserted_event_id;

  if v_inserted_event_id is not null
    and p_event_type in ('page_hidden', 'window_blurred')
    and (
      v_last_counted_at is null
      or v_now - v_last_counted_at > interval '3 seconds'
    )
  then
    update public.attempts a
    set tab_warning_count = a.tab_warning_count + 1,
        last_activity_at = now()
    where a.id = v_attempt_id;
  end if;

  select a.tab_warning_count
  into v_warning_count
  from public.attempts a
  where a.id = v_attempt_id;

  if v_max_tab_switches is not null and v_warning_count > v_max_tab_switches then
    perform public.submit_guest_attempt(p_attempt_token_hash);
    v_auto_submitted := true;
  end if;

  return jsonb_build_object(
    'autoSubmitted', v_auto_submitted,
    'maxTabSwitches', v_max_tab_switches,
    'tabWarningCount', v_warning_count
  );
end;
$$;

revoke all on function public.record_guest_attempt_event(text, text, timestamptz, text)
  from public, anon, authenticated;
grant execute on function public.record_guest_attempt_event(text, text, timestamptz, text)
  to service_role;

-- Exactly one live test.
--
-- `set_admin_test_status` already archives whatever was published before, but
-- that is a rule the application follows rather than one the database keeps: a
-- direct update, a restored dump, or two admins publishing at the same moment
-- could still leave two live tests, and `create_guest_attempt` would then pick
-- between them by timestamp. The index below makes a second live test
-- impossible, so the sign-in flow can never be ambiguous.

-- Anything already published beyond the newest one is archived first, otherwise
-- the index cannot be built.
with ranked as (
  select
    av.id,
    row_number() over (
      order by av.published_at desc nulls last, av.version_number desc
    ) as position
  from public.assessment_versions av
  where av.status = 'published'
)
update public.assessment_versions av
set status = 'archived'
from ranked
where ranked.id = av.id
  and ranked.position > 1;

drop index if exists public.assessment_versions_single_published;

-- Uniqueness on a column whose value is fixed by the predicate: at most one row
-- may satisfy `status = 'published'`.
create unique index assessment_versions_single_published
  on public.assessment_versions (status)
  where status = 'published';

-- Publishing now reports the collision instead of failing with a constraint
-- error, which can only happen if another admin published in the same moment.
create or replace function public.set_admin_test_status(
  p_session_token_hash text,
  p_assessment_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version public.assessment_versions%rowtype;
  v_ready integer;
begin
  perform private.require_admin(p_session_token_hash);

  if p_status not in ('draft', 'published', 'archived') then
    return jsonb_build_object('status', 'invalid', 'message', 'Unsupported test status.');
  end if;

  select av.*
  into v_version
  from public.assessment_versions av
  where av.assessment_id = p_assessment_id
  order by av.version_number desc
  limit 1;

  if v_version.id is null then
    return jsonb_build_object('status', 'not_found', 'message', 'That test no longer exists.');
  end if;

  if p_status = 'published' then
    select count(*)::integer
    into v_ready
    from public.questions q
    where q.assessment_version_id = v_version.id
      and q.is_active
      and exists (
        select 1 from private.question_answer_keys k where k.question_id = q.id
      )
      and (
        select count(*) from public.question_options o
        where o.question_id = q.id and o.is_active
      ) >= 2;

    if v_ready < v_version.questions_per_attempt then
      return jsonb_build_object(
        'status', 'not_enough_questions',
        'message', format(
          'This test serves %s questions but the bank only has %s ready. Upload more questions or lower the count.',
          v_version.questions_per_attempt, v_ready
        )
      );
    end if;

    -- Taking the live row out of the way first keeps this inside one
    -- transaction: either the swap happens completely or not at all.
    update public.assessment_versions av
    set status = 'archived'
    where av.status = 'published'
      and av.id <> v_version.id;

    update public.assessment_versions av
    set status = 'published',
        published_at = coalesce(av.published_at, now())
    where av.id = v_version.id;

    update public.assessments a
    set is_active = true
    where a.id = p_assessment_id;
  else
    update public.assessment_versions av
    set status = p_status
    where av.id = v_version.id;
  end if;

  return jsonb_build_object('status', 'ok');
exception
  when unique_violation then
    return jsonb_build_object(
      'status', 'conflict',
      'message', 'Another test was published a moment ago. Refresh and try again.'
    );
end;
$$;

revoke all on function public.set_admin_test_status(text, uuid, text)
  from public, anon, authenticated;
grant execute on function public.set_admin_test_status(text, uuid, text) to service_role;

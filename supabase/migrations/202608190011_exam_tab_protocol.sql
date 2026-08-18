-- Tab-switch protocol. The count already on record travels with the attempt so
-- a reload does not show the candidate a clean slate they do not have.

create or replace function public.get_guest_attempt(
  p_attempt_token_hash text
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'attemptId', a.id,
    'status', a.status,
    'title', av.title,
    'durationSeconds', av.duration_seconds,
    'instructions', av.instructions,
    'maxTabSwitches', av.max_tab_switches,
    'tabWarningCount', a.tab_warning_count,
    'startedAt', a.started_at,
    'expiresAt', a.expires_at,
    'serverNow', now(),
    'candidate', jsonb_build_object(
      'name', a.candidate_name_snapshot,
      'email', a.candidate_email_snapshot,
      'region', r.name,
      'hub', h.name
    ),
    'questions', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', aq.id,
          'position', aq.display_order,
          'section', coalesce(q.category, 'General'),
          'prompt', q.question_text,
          'isVisited', aq.is_visited,
          'isFlagged', aq.is_flagged,
          'selectedOptionId', aa.selected_option_id,
          'answerRevision', coalesce(aa.revision, 0),
          'options', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', qo.id,
                'label', qo.option_text
              )
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
      left join public.attempt_answers aa on aa.attempt_question_id = aq.id
      where aq.attempt_id = a.id
    ), '[]'::jsonb)
  )
  from public.attempts a
  join public.assessment_versions av on av.id = a.assessment_version_id
  join public.regions r on r.id = a.region_id_snapshot
  join public.hubs h on h.id = a.hub_id_snapshot
  where a.attempt_token_hash = p_attempt_token_hash;
$$;

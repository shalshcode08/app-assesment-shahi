-- Operational queries: the things the admin interface does not cover.
--
-- Nothing here runs as a unit. Copy the block you need into the SQL Editor and
-- run it as the `postgres` role. Blocks marked CHANGES DATA are wrapped in a
-- transaction so you can inspect the result before committing; the `rollback`
-- at the end is deliberate, so a copied block can never write by accident.
-- Change it to `commit` once the numbers look right.


-- ===========================================================================
-- 1. Is the system in a state where a trainer can sit the test?
-- ===========================================================================

-- The one answer that matters before a sitting. Every column must read true or
-- the trainer sees an error at sign-in rather than a question.
select
  (select count(*) from public.regions where is_active) > 0 as has_active_state,
  (select count(*) from public.hubs where is_active) > 0 as has_active_centre,
  exists (
    select 1
    from public.assessment_versions av
    join public.assessments a on a.id = av.assessment_id
    where av.status = 'published'
      and a.is_active
      and (av.available_from is null or av.available_from <= now())
      and (av.available_until is null or av.available_until > now())
  ) as test_is_live_now,
  (
    select count(*)
    from public.questions q
    join public.assessment_versions av on av.id = q.assessment_version_id
    where av.status = 'published'
      and q.is_active
      and exists (select 1 from private.question_answer_keys k where k.question_id = q.id)
      and (select count(*) from public.question_options o
           where o.question_id = q.id and o.is_active) >= 2
  ) as questions_ready,
  (
    select av.questions_per_attempt
    from public.assessment_versions av
    where av.status = 'published'
  ) as questions_needed;


-- Which test is live, and when it opens and closes.
select
  a.title,
  av.status,
  av.questions_per_attempt,
  av.passing_percentage,
  av.duration_seconds / 60 as minutes,
  av.max_tab_switches,
  av.available_from,
  av.available_until,
  av.published_at
from public.assessment_versions av
join public.assessments a on a.id = av.assessment_id
order by (av.status = 'published') desc, av.published_at desc nulls last;


-- ===========================================================================
-- 2. Attempts that need attention
-- ===========================================================================

-- Stale attempts: started, past their deadline, never submitted. A candidate
-- who closed the laptop leaves one of these, and it counts as neither a pass
-- nor a fail until it is closed.
select
  a.id,
  a.candidate_name_snapshot as trainer,
  a.candidate_email_snapshot as email,
  r.name as state,
  a.started_at,
  a.expires_at,
  now() - a.expires_at as overdue_by
from public.attempts a
join public.regions r on r.id = a.region_id_snapshot
where a.status = 'in_progress'
  and a.expires_at < now()
order by a.expires_at;


-- CHANGES DATA. Submit and score every stale attempt, which is what the
-- candidate's answers already earned. Run the query above first.
begin;
  with stale as (
    select a.attempt_token_hash
    from public.attempts a
    where a.status = 'in_progress'
      and a.expires_at < now()
  )
  select count(public.submit_guest_attempt(stale.attempt_token_hash)) as submitted
  from stale;
rollback;


-- Signed in but never started: the instruction dialog was never accepted.
-- Usually a trainer who changed their mind, occasionally one who could not
-- proceed. Worth a look if the count is large.
select
  a.candidate_email_snapshot as email,
  r.name as state,
  h.name as centre,
  a.created_at
from public.attempts a
join public.regions r on r.id = a.region_id_snapshot
join public.hubs h on h.id = a.hub_id_snapshot
where a.status = 'ready'
order by a.created_at desc;


-- Attempts worth reviewing for integrity: heavy tab switching, or finished
-- implausibly fast for the number of questions served.
select
  a.candidate_name_snapshot as trainer,
  a.candidate_email_snapshot as email,
  a.score_percentage,
  a.tab_warning_count as tab_switches,
  round(extract(epoch from (a.submitted_at - a.started_at)) / 60.0, 1) as minutes,
  (select count(*) from public.attempt_questions aq where aq.attempt_id = a.id) as questions,
  a.submitted_at
from public.attempts a
where a.status = 'submitted'
  and (
    a.tab_warning_count >= 3
    or extract(epoch from (a.submitted_at - a.started_at)) <
       30 * (select count(*) from public.attempt_questions aq where aq.attempt_id = a.id)
  )
order by a.tab_warning_count desc, a.submitted_at desc;


-- The full timeline of one attempt: every event, in order. Use it when a
-- trainer disputes an auto-submission.
select
  e.event_type,
  e.client_occurred_at,
  e.received_at
from public.attempt_events e
join public.attempts a on a.id = e.attempt_id
where a.candidate_email_snapshot = 'trainer@example.com'
order by e.received_at;


-- ===========================================================================
-- 3. One trainer, everything on record
-- ===========================================================================

select
  c.full_name,
  c.email,
  r.name as state,
  h.name as centre,
  c.created_at as registered,
  a.status,
  a.score_percentage,
  a.qualified,
  a.correct_count,
  a.incorrect_count,
  a.unanswered_count,
  a.tab_warning_count,
  a.started_at,
  a.submitted_at
from public.candidates c
join public.regions r on r.id = c.region_id
join public.hubs h on h.id = c.hub_id
left join public.attempts a on a.candidate_id = c.id
where c.normalized_email = lower(btrim('trainer@example.com'))
order by a.created_at desc;


-- CHANGES DATA. Let one trainer sit the test again. Their previous attempt is
-- marked invalidated rather than deleted, so the history stays intact and the
-- attempt-per-email limit no longer counts it.
begin;
  update public.attempts a
  set status = 'invalidated'
  where a.candidate_id = (
      select id from public.candidates
      where normalized_email = lower(btrim('trainer@example.com'))
    )
    and a.status in ('ready', 'in_progress', 'submitted', 'expired', 'abandoned')
  returning a.id, a.status;
rollback;


-- CHANGES DATA. Erase one trainer entirely, for a deletion request. Attempt
-- children cascade; the audit log keeps only the identifier.
begin;
  delete from public.attempts a
  where a.candidate_id = (
    select id from public.candidates
    where normalized_email = lower(btrim('trainer@example.com'))
  );

  delete from public.candidates
  where normalized_email = lower(btrim('trainer@example.com'));
rollback;


-- ===========================================================================
-- 4. Question bank health
-- ===========================================================================

-- Questions that can never be served: no answer key, or fewer than two active
-- options. They count towards the bank but not towards the sampling minimum.
select
  a.title as test,
  q.external_code,
  left(q.question_text, 60) as question,
  (select count(*) from public.question_options o
   where o.question_id = q.id and o.is_active) as active_options,
  exists (select 1 from private.question_answer_keys k where k.question_id = q.id) as has_answer_key,
  q.is_active
from public.questions q
join public.assessment_versions av on av.id = q.assessment_version_id
join public.assessments a on a.id = av.assessment_id
where not exists (select 1 from private.question_answer_keys k where k.question_id = q.id)
   or (select count(*) from public.question_options o
       where o.question_id = q.id and o.is_active) < 2
order by a.title, q.external_code;


-- Translation coverage: which questions a language is still missing.
select
  l.name as language,
  count(*) filter (where tr.question_id is null) as missing,
  count(*) as questions
from public.assessment_languages l
join public.questions q on q.assessment_version_id = l.assessment_version_id
left join public.question_translations tr
  on tr.question_id = q.id and tr.language_id = l.id
group by l.name
order by missing desc;


-- The exact questions a language has not been given yet.
select q.external_code, left(q.question_text, 70) as question
from public.assessment_languages l
join public.questions q on q.assessment_version_id = l.assessment_version_id
left join public.question_translations tr
  on tr.question_id = q.id and tr.language_id = l.id
where l.name = 'Hindi'
  and tr.question_id is null
order by q.external_code;


-- Questions nobody gets right, and questions everybody does. The first group is
-- usually wrong or badly worded; the second carries no information.
select
  q.external_code,
  left(q.question_text, 60) as question,
  count(*) as served,
  count(*) filter (where ans.selected_option_id = k.correct_option_id) as correct,
  round(100.0 * count(*) filter (where ans.selected_option_id = k.correct_option_id)
        / nullif(count(*), 0), 1) as correct_rate
from public.attempt_questions aq
join public.questions q on q.id = aq.question_id
join public.attempts a on a.id = aq.attempt_id
left join private.question_answer_keys k on k.question_id = q.id
left join public.attempt_answers ans on ans.attempt_question_id = aq.id
where a.status = 'submitted'
group by q.external_code, q.question_text
having count(*) >= 5
order by correct_rate;


-- ===========================================================================
-- 5. Coverage and results by location
-- ===========================================================================

select
  r.name as state,
  h.name as centre,
  h.is_active as centre_visible,
  count(distinct c.id) as trainers,
  count(a.id) filter (where a.status = 'submitted') as submitted,
  count(a.id) filter (where a.qualified) as qualified,
  round(avg(a.score_percentage) filter (where a.status = 'submitted'), 1) as avg_score
from public.regions r
join public.hubs h on h.region_id = r.id
left join public.candidates c on c.hub_id = h.id
left join public.attempts a on a.hub_id_snapshot = h.id
group by r.name, h.name, h.is_active
order by r.name, h.name;


-- Centres that exist but have never been used. Either the trainers there have
-- not been invited yet, or the centre was entered twice under different names.
select r.name as state, h.name as centre, h.created_at
from public.hubs h
join public.regions r on r.id = h.region_id
where not exists (select 1 from public.candidates c where c.hub_id = h.id)
order by r.name, h.name;


-- ===========================================================================
-- 6. Administrators
-- ===========================================================================

select
  a.email,
  a.full_name,
  a.is_active,
  a.failed_attempt_count,
  a.locked_until,
  a.last_login_at,
  (select count(*) from private.admin_sessions s
   where s.admin_id = a.id and s.expires_at > now()) as live_sessions
from private.admins a
order by a.email;


-- CHANGES DATA. Unlock an administrator locked out by failed sign-ins.
begin;
  update private.admins
  set failed_attempt_count = 0,
      locked_until = null
  where email = 'admin@example.com';
rollback;


-- CHANGES DATA. Set a new password.
begin;
  update private.admins
  set password_hash = private.hash_password('a-long-new-password'),
      failed_attempt_count = 0,
      locked_until = null
  where email = 'admin@example.com';
rollback;


-- CHANGES DATA. Revoke every session, forcing all administrators to sign in
-- again. Use it after removing someone's access.
begin;
  delete from private.admin_sessions;
rollback;


-- ===========================================================================
-- 7. Size and growth
-- ===========================================================================

select
  relname as table_name,
  to_char(n_live_tup, '999,999,999') as rows,
  pg_size_pretty(pg_total_relation_size(relid)) as total_size
from pg_stat_user_tables
where schemaname in ('public', 'private')
order by pg_total_relation_size(relid) desc;


-- Attempts per day, to see when sittings actually happen.
select
  date_trunc('day', coalesce(a.submitted_at, a.created_at))::date as day,
  count(*) as attempts,
  count(*) filter (where a.status = 'submitted') as submitted,
  count(*) filter (where a.qualified) as qualified
from public.attempts a
group by day
order by day desc
limit 30;

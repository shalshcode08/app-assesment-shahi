-- Removes the probe candidates/attempts created while verifying the backend.
-- Run in the SQL Editor; service_role has no delete grant on these tables.
-- Children of public.attempts (attempt_questions, attempt_answers,
-- attempt_question_options, attempt_events) cascade automatically.

delete from public.attempts
where candidate_id in (
  select id from public.candidates
  where normalized_email like 'probe-%@example.invalid'
     or normalized_email like 'e2e-%@example.invalid'
);

delete from public.candidates
where normalized_email like 'probe-%@example.invalid'
   or normalized_email like 'e2e-%@example.invalid';

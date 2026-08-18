-- Empties the database of everything that is data, leaving the schema and the
-- administrator accounts in place. Use it to hand over a clean deployment after
-- testing, or to start a new assessment cycle.
--
-- Destructive and not reversible. Run as the `postgres` role in the SQL Editor;
-- `service_role` holds no delete grant on these tables.
--
-- What goes: attempts and everything recorded against them, candidates, the
-- audit log, questions with their options, answer keys and translations, tests
-- and their languages, and the states and centres.
--
-- What stays: the schema, the functions, and `private.admins`. Admin sessions
-- are cleared, so everyone signs in again.
--
-- Run the counts below first if you want to see what you are about to remove.

select
  (select count(*) from public.attempts) as attempts,
  (select count(*) from public.candidates) as candidates,
  (select count(*) from public.questions) as questions,
  (select count(*) from public.assessments) as tests,
  (select count(*) from public.regions) as states,
  (select count(*) from public.hubs) as centres,
  (select count(*) from private.admins) as admins_kept;

begin;

-- Attempt records. The children of public.attempts cascade, but they are named
-- here so a schema change that drops a cascade cannot leave orphans behind.
delete from public.attempt_events;
delete from public.attempt_answers;
delete from public.attempt_question_options;
delete from public.attempt_questions;
delete from public.attempts;

delete from public.audit_logs;
delete from public.candidates;

-- Question bank, translations first: they point at questions and options.
delete from public.question_option_translations;
delete from public.question_translations;
delete from private.question_answer_keys;
delete from public.question_options;
delete from public.questions;

delete from public.assessment_languages;
delete from public.assessment_versions;
delete from public.assessments;

-- Locations last: candidates and attempts referenced them.
delete from public.hubs;
delete from public.regions;

-- Everyone signs in again, so no session outlives the reset.
delete from private.admin_sessions;

commit;

select
  (select count(*) from public.attempts) as attempts,
  (select count(*) from public.candidates) as candidates,
  (select count(*) from public.questions) as questions,
  (select count(*) from public.assessments) as tests,
  (select count(*) from public.regions) as states,
  (select count(*) from public.hubs) as centres,
  (select count(*) from private.admins) as admins_kept;

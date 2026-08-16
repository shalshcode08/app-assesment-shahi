insert into public.regions (id, code, name, display_order)
values
  ('10000000-0000-4000-8000-000000000001', 'haryana', 'Haryana', 10),
  ('10000000-0000-4000-8000-000000000002', 'karnataka', 'Karnataka', 20),
  ('10000000-0000-4000-8000-000000000003', 'maharashtra', 'Maharashtra', 30),
  ('10000000-0000-4000-8000-000000000004', 'tamil-nadu', 'Tamil Nadu', 40)
on conflict (code) do update
set name = excluded.name,
    display_order = excluded.display_order,
    is_active = true;

insert into public.hubs (id, region_id, code, name, display_order)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'north-hub', 'North Hub', 10),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'south-hub', 'South Hub', 10),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', 'west-hub', 'West Hub', 10),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004', 'chennai-hub', 'Chennai Hub', 10)
on conflict (region_id, code) do update
set name = excluded.name,
    display_order = excluded.display_order,
    is_active = true;

insert into public.assessments (id, code, title)
values (
  '30000000-0000-4000-8000-000000000001',
  'trainer-competency',
  'Trainer Competency Assessment'
)
on conflict (code) do update
set title = excluded.title,
    is_active = true;

insert into public.assessment_versions (
  id,
  assessment_id,
  version_number,
  title,
  status,
  duration_seconds,
  questions_per_attempt,
  passing_percentage,
  maximum_attempts_per_email,
  published_at
)
values (
  '40000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  1,
  'Trainer Competency Assessment',
  'published',
  1800,
  50,
  70,
  1,
  now()
)
on conflict (assessment_id, version_number) do update
set title = excluded.title,
    duration_seconds = excluded.duration_seconds,
    questions_per_attempt = excluded.questions_per_attempt,
    passing_percentage = excluded.passing_percentage,
    maximum_attempts_per_email = excluded.maximum_attempts_per_email;

-- Questions are intentionally not seeded here. Import the approved question
-- workbook before testing login; the database refuses to create an attempt
-- until at least 50 valid questions and answer keys are available.

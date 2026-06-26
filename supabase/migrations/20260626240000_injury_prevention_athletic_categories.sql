-- Injury prevention & athletic exercise categories + seed exercises

-- 1. New categories (used in exercise picker filter)
insert into muscle_groups (slug, label, sort_order) values
  ('injury_prevention', 'Injury Prevention', 16),
  ('athletic',          'Athletic',          17)
on conflict (slug) do nothing;

-- 2. New exercises
insert into exercises (name, alt_name, is_custom) values
  ('Single-Leg Glute Bridge',  'Glute Bridge',              false),
  ('Clamshells',               'Banded Clamshell',          false),
  ('Monster Walks',            'Banded Lateral Walk',       false),
  ('Copenhagen Plank',         'Copenhagen Side Plank',     false),
  ('Box Jumps',                'Step-Up Jump',              false),
  ('Broad Jump',               'Standing Long Jump',        false),
  ('Jump Squats',              'Bodyweight Jump Squat',     false),
  ('Med Ball Slam',            'Battle Rope Slam',          false)
on conflict (name) do nothing;

-- 3. Tag exercises (anatomical + category — exercises can have multiple tags)
insert into exercise_muscle_groups (exercise_id, muscle_group_id)
select e.id, mg.id
from exercises e
join muscle_groups mg on (
  -- New: injury prevention
  (e.name = 'Single-Leg Glute Bridge' and mg.slug in ('glutes', 'injury_prevention')) or
  (e.name = 'Clamshells'               and mg.slug in ('glutes', 'injury_prevention')) or
  (e.name = 'Monster Walks'            and mg.slug in ('glutes', 'injury_prevention')) or
  (e.name = 'Copenhagen Plank'         and mg.slug in ('core', 'injury_prevention')) or
  -- New: athletic
  (e.name = 'Box Jumps'                and mg.slug in ('quads', 'athletic')) or
  (e.name = 'Broad Jump'               and mg.slug in ('quads', 'athletic')) or
  (e.name = 'Jump Squats'              and mg.slug in ('quads', 'athletic')) or
  (e.name = 'Med Ball Slam'            and mg.slug in ('core', 'athletic')) or
  -- Existing exercises: add category tags
  (e.name = 'Tibialis Raises'           and mg.slug = 'injury_prevention') or
  (e.name = 'Cable External Rotations' and mg.slug = 'injury_prevention') or
  (e.name = 'Pallof Press'             and mg.slug = 'injury_prevention') or
  (e.name = 'Dead Bug'                 and mg.slug = 'injury_prevention') or
  (e.name = 'Farmer''s Carry'          and mg.slug in ('core', 'athletic')) or
  (e.name = 'Cable Woodchop'           and mg.slug in ('core', 'athletic'))
)
on conflict do nothing;

-- 4. Add to default workout days
insert into workout_day_exercises (workout_day_id, exercise_id, sort_order, target_sets, target_reps)
select wd.id, e.id, v.sort_order, v.target_sets, v.target_reps
from workout_days wd
join (values
  -- Glutes day: injury prevention finishers
  ('glutes', 'Single-Leg Glute Bridge', 7, 2, '12 ea'),
  ('glutes', 'Clamshells',              8, 2, '15 ea'),
  -- Legs day: athletic + injury prevention
  ('legs', 'Monster Walks',             10, 2, '10 ea'),
  ('legs', 'Box Jumps',                 11, 3, '5'),
  ('legs', 'Broad Jump',                12, 3, '5'),
  -- Pull day: prehab
  ('pull', 'Copenhagen Plank',          10, 2, '20–30s ea')
) as v(day_slug, exercise_name, sort_order, target_sets, target_reps)
  on wd.slug = v.day_slug
join exercises e on e.name = v.exercise_name
on conflict (workout_day_id, exercise_id) do nothing;

-- Five-day program (push/pull/glutes/upper/legs) + workout skip tracking

-- ============================================================
-- GLUTES & UPPER WORKOUT DAYS
-- ============================================================

insert into workout_days (name, slug, color, subtitle, sort_order, is_custom) values
  ('Glutes', 'glutes', '#059669', 'Glutes · Calves · Core', 3, false),
  ('Upper',  'upper',  '#D97706', 'Shoulders · Arms · Core', 4, false)
on conflict (slug) do nothing;

update workout_days
set sort_order = 5,
    subtitle = 'Quads · Hamstrings · Athletic · Core'
where slug = 'legs';

delete from workout_day_exercises wde
using workout_days wd, exercises e
where wde.workout_day_id = wd.id
  and wde.exercise_id = e.id
  and wd.slug = 'legs'
  and e.name in ('Hip Thrust', 'Standing Calf Raises');

insert into workout_day_exercises (workout_day_id, exercise_id, sort_order, target_sets, target_reps)
select wd.id, e.id, v.sort_order, v.target_sets, v.target_reps
from workout_days wd
join (values
  ('glutes', 'Hip Thrust',               1, 4, '8–12'),
  ('glutes', 'Bulgarian Split Squat',    2, 3, '8–12 ea'),
  ('glutes', 'Hip Abduction Machine',    3, 3, '12–15'),
  ('glutes', 'Standing Calf Raises',     4, 4, '12–20'),
  ('glutes', 'Russian Twist',            5, 3, '15 ea'),
  ('glutes', 'Plank',                    6, 1, '30–45s')
) as v(day_slug, exercise_name, sort_order, target_sets, target_reps)
  on wd.slug = v.day_slug
join exercises e on e.name = v.exercise_name
on conflict (workout_day_id, exercise_id) do nothing;

insert into workout_day_exercises (workout_day_id, exercise_id, sort_order, target_sets, target_reps)
select wd.id, e.id, v.sort_order, v.target_sets, v.target_reps
from workout_days wd
join (values
  ('upper', 'Single-Arm DB Row',           1, 3, '8–12'),
  ('upper', 'Incline Dumbbell Press',      2, 3, '8–12'),
  ('upper', 'Arnold Press',                3, 3, '10–12'),
  ('upper', 'Lateral Raises',              4, 4, '12–15'),
  ('upper', 'Overhead Tricep Extension',   5, 3, '10–15'),
  ('upper', 'Hammer Curls',                6, 2, '10–15'),
  ('upper', 'Weighted Crunches',           7, 3, '12–15'),
  ('upper', 'Pallof Press',                8, 3, '10 ea'),
  ('upper', 'Dead Bug',                    9, 3, '10 ea'),
  ('upper', 'Plank',                      10, 1, '30–45s')
) as v(day_slug, exercise_name, sort_order, target_sets, target_reps)
  on wd.slug = v.day_slug
join exercises e on e.name = v.exercise_name
on conflict (workout_day_id, exercise_id) do nothing;

delete from workout_day_exercises wde
using workout_days wd
where wde.workout_day_id = wd.id
  and wd.slug = 'legs';

insert into workout_day_exercises (workout_day_id, exercise_id, sort_order, target_sets, target_reps)
select wd.id, e.id, v.sort_order, v.target_sets, v.target_reps
from workout_days wd
join (values
  ('legs', 'Squat or Leg Press',        1, 4, '8–12'),
  ('legs', 'Bulgarian Split Squat',     2, 3, '8–12 ea'),
  ('legs', 'Leg Curl',                  3, 3, '10–15'),
  ('legs', 'Leg Extension',             4, 3, '10–15'),
  ('legs', 'Single-Leg RDL',            5, 2, '8 ea'),
  ('legs', 'Tibialis Raises',           6, 2, '15'),
  ('legs', 'Farmer''s Carry',           7, 3, '30s'),
  ('legs', 'Hanging Knee Raise',        8, 3, '12'),
  ('legs', 'Plank',                     9, 1, '30–45s')
) as v(day_slug, exercise_name, sort_order, target_sets, target_reps)
  on wd.slug = v.day_slug
join exercises e on e.name = v.exercise_name
on conflict (workout_day_id, exercise_id) do nothing;

-- ============================================================
-- WORKOUT SKIPS
-- ============================================================

create table if not exists workout_skips (
  id              uuid primary key default gen_random_uuid(),
  workout_day_id  uuid not null references workout_days(id) on delete cascade,
  week_start      date not null,
  note            text,
  created_at      timestamptz not null default now(),
  constraint workout_skips_unique unique (workout_day_id, week_start)
);

create index if not exists idx_workout_skips_week on workout_skips(week_start desc);

alter table workout_skips enable row level security;

create policy "public read skips"  on workout_skips for select using (true);
create policy "public write skips" on workout_skips for all using (true) with check (true);

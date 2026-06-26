-- ============================================================
-- SWEATLOG — SUPABASE SCHEMA
-- Run this in Supabase → SQL Editor → New Query
-- ============================================================

-- 1. MUSCLE GROUPS (anatomical categories for exercises)
create table if not exists muscle_groups (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  label       text not null,
  sort_order  int not null default 0
);

-- 2. EXERCISES (deduplicated global pool)
create table if not exists exercises (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  alt_name    text,
  is_custom   boolean not null default false,
  created_at  timestamptz not null default now(),
  constraint exercises_name_unique unique (name)
);

-- 3. EXERCISE ↔ MUSCLE GROUP (many-to-many)
create table if not exists exercise_muscle_groups (
  exercise_id     uuid not null references exercises(id) on delete cascade,
  muscle_group_id uuid not null references muscle_groups(id) on delete cascade,
  primary key (exercise_id, muscle_group_id)
);

-- 4. WORKOUT DAYS (user-defined templates: Push, Pull, Legs, etc.)
create table if not exists workout_days (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  color       text not null default '#2563EB',
  subtitle    text,
  sort_order  int not null default 0,
  is_custom   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- 5. EXERCISES ASSIGNED TO A WORKOUT DAY
create table if not exists workout_day_exercises (
  id              uuid primary key default gen_random_uuid(),
  workout_day_id  uuid not null references workout_days(id) on delete cascade,
  exercise_id     uuid not null references exercises(id) on delete cascade,
  sort_order      int not null default 0,
  target_sets     int not null default 3,
  target_reps     text not null default '8–12',
  constraint workout_day_exercises_unique unique (workout_day_id, exercise_id)
);

-- 6. SESSIONS
create table if not exists sessions (
  id              uuid primary key default gen_random_uuid(),
  workout_day_id  uuid not null references workout_days(id),
  status          text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned')),
  started_at      timestamptz not null default now(),
  finished_at     timestamptz,
  duration_mins   int,
  note            text,
  created_at      timestamptz not null default now()
);

-- 7. SESSION SETS
create table if not exists session_sets (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references sessions(id) on delete cascade,
  exercise_id   uuid not null references exercises(id),
  exercise_name text not null,
  alt_used      boolean not null default false,
  set_number    int not null check (set_number > 0),
  weight_kg     numeric(5,2),
  reps          int,
  duration_secs int,
  rpe           int check (rpe between 1 and 10),
  done          boolean not null default false,
  created_at    timestamptz not null default now(),
  constraint session_sets_unique_set unique (session_id, exercise_id, set_number)
);

-- 8. BODY CHECK-INS
create table if not exists body_checkins (
  id          uuid primary key default gen_random_uuid(),
  date        date not null default current_date,
  weight_kg   numeric(4,1),
  waist_cm    numeric(4,1),
  energy      int check (energy between 1 and 5),
  note        text,
  created_at  timestamptz not null default now(),
  constraint body_checkins_date_unique unique (date)
);

-- 9. PERSONAL RECORDS
create table if not exists personal_records (
  id            uuid primary key default gen_random_uuid(),
  exercise_id   uuid not null references exercises(id) on delete cascade,
  exercise_name text not null,
  weight_kg     numeric(5,2),
  reps          int,
  duration_secs int,
  session_id    uuid references sessions(id) on delete set null,
  achieved_at   timestamptz not null default now(),
  constraint personal_records_exercise_unique unique (exercise_id)
);

-- ============================================================
-- SEED MUSCLE GROUPS
-- ============================================================
insert into muscle_groups (slug, label, sort_order) values
  ('chest',       'Chest',        1),
  ('shoulders',   'Shoulders',    2),
  ('triceps',     'Triceps',      3),
  ('biceps',      'Biceps',       4),
  ('upper_back',  'Upper Back',   5),
  ('lower_back',  'Lower Back',   6),
  ('quads',       'Quads',        7),
  ('hamstrings',  'Hamstrings',   8),
  ('glutes',      'Glutes',       9),
  ('calves',      'Calves',       10),
  ('knees',       'Knees',        11),
  ('ankles',      'Ankles',       12),
  ('core',        'Core',         13),
  ('forearms',    'Forearms',     14),
  ('traps',       'Traps',        15)
on conflict (slug) do nothing;

-- ============================================================
-- SEED EXERCISES (deduplicated — one row per movement)
-- ============================================================
insert into exercises (name, alt_name, is_custom) values
  ('Incline Dumbbell Press',         'Incline Machine Press',     false),
  ('Seated DB Shoulder Press',       'Barbell Overhead Press',    false),
  ('Chest Press Machine',            'Flat DB Press',             false),
  ('Lateral Raises',                 'Cable Lateral Raise',       false),
  ('Tricep Pushdowns',               'Tricep Dips',               false),
  ('Cable External Rotations',       'Band External Rotations',   false),
  ('Lat Pulldown',                   'Wide Grip Pull-Up',         false),
  ('Seated Cable Row',               'DB Bent-Over Row',          false),
  ('Face Pulls',                     'Band Pull-Apart',           false),
  ('Dumbbell Curls',                 'EZ Bar Curl',               false),
  ('Hammer Curls',                   'Cable Hammer Curl',         false),
  ('Dead Hang',                      'Scapular Pull-Up',          false),
  ('Hip Thrust',                     'Glute Bridge',              false),
  ('Bulgarian Split Squat',          'Reverse Lunge',             false),
  ('Hip Abduction Machine',          'Banded Clamshell',          false),
  ('Standing Calf Raises',           'Leg Press Calf Raise',      false),
  ('Single-Arm DB Row',              'Cable Row',                 false),
  ('Arnold Press',                   'Machine Shoulder Press',    false),
  ('Overhead Tricep Extension',      'Skull Crushers',            false),
  ('Weighted Crunches',              'Cable Crunch',              false),
  ('Pallof Press',                   'Cable Rotation',            false),
  ('Squat or Leg Press',             'Goblet Squat',              false),
  ('Leg Curl',                       'Nordic Curl',               false),
  ('Leg Extension',                  'Wall Sit',                  false),
  ('Single-Leg RDL',                 'Single-Leg Cable Pull',     false),
  ('Tibialis Raises',                'Band Dorsiflexion',         false),
  ('Farmer''s Carry',                 'Suitcase Carry',            false),
  ('Plank',                          'Dead Bug Hold',             false),
  ('Dead Bug',                       'Bird Dog',                  false),
  ('Hanging Knee Raise',             'Lying Leg Raise',           false),
  ('Russian Twist',                  'Bicycle Crunch',            false),
  ('Side Plank',                     'Copenhagen Plank',          false),
  ('Cable Woodchop',                 'Med Ball Rotational Slam',  false)
on conflict (name) do nothing;

-- ============================================================
-- SEED EXERCISE MUSCLE GROUPS
-- ============================================================
insert into exercise_muscle_groups (exercise_id, muscle_group_id)
select e.id, mg.id
from exercises e
join muscle_groups mg on (
  (e.name = 'Incline Dumbbell Press'    and mg.slug = 'chest') or
  (e.name = 'Seated DB Shoulder Press'  and mg.slug = 'shoulders') or
  (e.name = 'Chest Press Machine'       and mg.slug = 'chest') or
  (e.name = 'Lateral Raises'            and mg.slug = 'shoulders') or
  (e.name = 'Tricep Pushdowns'          and mg.slug = 'triceps') or
  (e.name = 'Cable External Rotations'  and mg.slug = 'shoulders') or
  (e.name = 'Lat Pulldown'              and mg.slug = 'upper_back') or
  (e.name = 'Seated Cable Row'          and mg.slug = 'upper_back') or
  (e.name = 'Face Pulls'                and mg.slug = 'shoulders') or
  (e.name = 'Dumbbell Curls'            and mg.slug = 'biceps') or
  (e.name = 'Hammer Curls'              and mg.slug = 'biceps') or
  (e.name = 'Dead Hang'                 and mg.slug = 'upper_back') or
  (e.name = 'Hip Thrust'                and mg.slug = 'glutes') or
  (e.name = 'Bulgarian Split Squat'     and mg.slug = 'quads') or
  (e.name = 'Hip Abduction Machine'     and mg.slug = 'glutes') or
  (e.name = 'Standing Calf Raises'     and mg.slug = 'calves') or
  (e.name = 'Single-Arm DB Row'         and mg.slug = 'upper_back') or
  (e.name = 'Arnold Press'              and mg.slug = 'shoulders') or
  (e.name = 'Overhead Tricep Extension' and mg.slug = 'triceps') or
  (e.name = 'Weighted Crunches'        and mg.slug = 'core') or
  (e.name = 'Pallof Press'              and mg.slug = 'core') or
  (e.name = 'Squat or Leg Press'       and mg.slug = 'quads') or
  (e.name = 'Leg Curl'                  and mg.slug = 'hamstrings') or
  (e.name = 'Leg Extension'            and mg.slug = 'quads') or
  (e.name = 'Single-Leg RDL'           and mg.slug = 'hamstrings') or
  (e.name = 'Tibialis Raises'          and mg.slug = 'ankles') or
  (e.name = 'Farmer''s Carry'          and mg.slug = 'core') or
  (e.name = 'Plank'                     and mg.slug = 'core') or
  (e.name = 'Dead Bug'                 and mg.slug = 'core') or
  (e.name = 'Hanging Knee Raise'       and mg.slug = 'core') or
  (e.name = 'Russian Twist'            and mg.slug = 'core') or
  (e.name = 'Side Plank'               and mg.slug = 'core') or
  (e.name = 'Cable Woodchop'           and mg.slug = 'core')
)
on conflict do nothing;

-- ============================================================
-- SEED DEFAULT WORKOUT DAYS (Push / Pull / Legs)
-- ============================================================
insert into workout_days (name, slug, color, subtitle, sort_order, is_custom) values
  ('Push', 'push', '#2563EB', 'Chest · Shoulders · Triceps', 1, false),
  ('Pull', 'pull', '#7C3AED', 'Back · Biceps · Rear Delts',  2, false),
  ('Legs', 'legs', '#DC2626', 'Quads · Glutes · Hamstrings', 3, false)
on conflict (slug) do nothing;

-- Helper: seed exercises onto a workout day
insert into workout_day_exercises (workout_day_id, exercise_id, sort_order, target_sets, target_reps)
select wd.id, e.id, v.sort_order, v.target_sets, v.target_reps
from workout_days wd
join (values
  -- PUSH
  ('push', 'Incline Dumbbell Press',    1, 3, '8–12'),
  ('push', 'Seated DB Shoulder Press',  2, 3, '8–12'),
  ('push', 'Chest Press Machine',       3, 3, '10–12'),
  ('push', 'Lateral Raises',            4, 4, '12–15'),
  ('push', 'Tricep Pushdowns',          5, 3, '10–15'),
  ('push', 'Cable External Rotations',  6, 2, '15'),
  ('push', 'Plank',                     7, 1, '30–45s'),
  -- PULL
  ('pull', 'Lat Pulldown',              1, 3, '8–12'),
  ('pull', 'Seated Cable Row',          2, 3, '8–12'),
  ('pull', 'Face Pulls',                3, 3, '12–15'),
  ('pull', 'Dumbbell Curls',            4, 3, '10–15'),
  ('pull', 'Hammer Curls',              5, 2, '10–15'),
  ('pull', 'Dead Hang',                 6, 2, '30s'),
  ('pull', 'Cable Woodchop',            7, 3, '10 ea'),
  ('pull', 'Side Plank',                8, 2, '20–30s ea'),
  ('pull', 'Plank',                     9, 1, '30–45s'),
  -- LEGS
  ('legs', 'Hip Thrust',                1, 4, '8–12'),
  ('legs', 'Bulgarian Split Squat',     2, 3, '8–12 ea'),
  ('legs', 'Squat or Leg Press',        3, 4, '8–12'),
  ('legs', 'Leg Curl',                  4, 3, '10–15'),
  ('legs', 'Leg Extension',             5, 3, '10–15'),
  ('legs', 'Standing Calf Raises',      6, 4, '12–20'),
  ('legs', 'Single-Leg RDL',            7, 2, '8 ea'),
  ('legs', 'Tibialis Raises',           8, 2, '15'),
  ('legs', 'Farmer''s Carry',           9, 3, '30s'),
  ('legs', 'Hanging Knee Raise',       10, 3, '12'),
  ('legs', 'Plank',                    11, 1, '30–45s')
) as v(day_slug, exercise_name, sort_order, target_sets, target_reps)
  on wd.slug = v.day_slug
join exercises e on e.name = v.exercise_name
on conflict (workout_day_id, exercise_id) do nothing;

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_sessions_day          on sessions(workout_day_id);
create index if not exists idx_sessions_started      on sessions(started_at desc);
create index if not exists idx_sessions_status       on sessions(status);
create index if not exists idx_session_sets_sess     on session_sets(session_id);
create index if not exists idx_session_sets_ex       on session_sets(exercise_id);
create index if not exists idx_body_checkins_date    on body_checkins(date desc);
create index if not exists idx_exercises_custom      on exercises(is_custom);
create index if not exists idx_workout_days_order    on workout_days(sort_order);
create index if not exists idx_wde_day               on workout_day_exercises(workout_day_id, sort_order);
create index if not exists idx_personal_records_ex   on personal_records(exercise_id);

-- ============================================================
-- VIEWS
-- ============================================================
create or replace view latest_body_log
with (security_invoker = true) as
  select distinct on (date)
    id, date, weight_kg, waist_cm, energy, note, created_at
  from body_checkins
  order by date asc, created_at desc;

create or replace view exercise_prs
with (security_invoker = true) as
  select distinct on (exercise_id)
    exercise_id,
    exercise_name,
    weight_kg as max_weight_kg,
    reps      as max_reps,
    duration_secs,
    created_at
  from session_sets
  where done = true
    and (weight_kg is not null or duration_secs is not null)
  order by exercise_id, weight_kg desc nulls last, reps desc nulls last, duration_secs desc nulls last;

-- ============================================================
-- ROW LEVEL SECURITY (Phase 1: single user, no auth)
-- ============================================================
alter table muscle_groups          enable row level security;
alter table exercises              enable row level security;
alter table exercise_muscle_groups enable row level security;
alter table workout_days           enable row level security;
alter table workout_day_exercises  enable row level security;
alter table sessions               enable row level security;
alter table session_sets           enable row level security;
alter table body_checkins          enable row level security;
alter table personal_records       enable row level security;

create policy "public read muscle_groups"   on muscle_groups          for select using (true);
create policy "public read exercises"       on exercises              for select using (true);
create policy "public write exercises"      on exercises              for all using (true) with check (true);
create policy "public read emg"             on exercise_muscle_groups for select using (true);
create policy "public write emg"            on exercise_muscle_groups for all using (true) with check (true);
create policy "public read workout_days"    on workout_days           for select using (true);
create policy "public write workout_days"  on workout_days           for all using (true) with check (true);
create policy "public read wde"               on workout_day_exercises  for select using (true);
create policy "public write wde"              on workout_day_exercises  for all using (true) with check (true);
create policy "public read sessions"        on sessions               for select using (true);
create policy "public write sessions"       on sessions               for all using (true) with check (true);
create policy "public read sets"            on session_sets           for select using (true);
create policy "public write sets"           on session_sets           for all using (true) with check (true);
create policy "public read checkins"        on body_checkins          for select using (true);
create policy "public write checkins"       on body_checkins          for all using (true) with check (true);
create policy "public read prs"             on personal_records       for select using (true);
create policy "public write prs"            on personal_records       for all using (true) with check (true);

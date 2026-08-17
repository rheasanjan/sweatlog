-- Phase 1: Activity model on sessions
alter table sessions
  add column if not exists category text not null default 'strength',
  add column if not exists name text,
  add column if not exists color text;

alter table sessions
  drop constraint if exists sessions_category_check;

alter table sessions
  add constraint sessions_category_check
  check (category in ('strength', 'cardio', 'sport', 'mobility'));

-- Backfill display snapshots from templates
update sessions s
set
  name = coalesce(s.name, wd.name),
  color = coalesce(s.color, wd.color)
from workout_days wd
where s.workout_day_id = wd.id
  and (s.name is null or s.color is null);

-- Allow activities without a template (Phase 2+); Phase 1 strength still sets it
alter table sessions
  alter column workout_day_id drop not null;

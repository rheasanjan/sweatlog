-- Phase 2: optional type-specific fields for lightweight activities
alter table sessions
  add column if not exists details jsonb not null default '{}';

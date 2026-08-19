# Sweatlog Phase 2 — Generalized Activities

**Date:** 2026-08-19  
**Status:** Approved for implementation planning  
**Depends on:** Phase 1 Activity model (`docs/superpowers/specs/2026-08-17-activity-model-phase1-design.md`)

## Problem

Phase 1 made Home/History activity-centric, but logging is still strength-only via **Log a Workout**. Cardio, sport, and mobility cannot be recorded, so a real training week is only partially visible.

## Goal

Ship full Phase 2: users can log Strength, Cardio, Sport, and Mobility through one **Log Activity** entry point, see them in Recent Activity and History, and get a weekly summary with count, total time, and category breakdown — without building Strava.

## Product principles (carry forward)

1. Log first, plan second  
2. Templates are tools, not goals  
3. Actual sessions are the source of truth  
4. Keep non-strength logging lightweight  
5. Don’t build Strava  

## Decisions (locked)

| Topic | Decision |
|-------|----------|
| Scope | Full Phase 2 — all four categories + lightweight forms + feed/history |
| Home | Keep current layout; CTA → **Log Activity** → category picker |
| Strength path | Category → existing template Picker → ActiveSession (unchanged) |
| Optional fields storage | JSON `details` on `sessions` |
| Weekly summary | Count + total time + category breakdown |
| Approach | Category hub + lightweight forms per non-strength category |

## Non-goals (Phase 2)

- Cardio progress graphs / cardio PRs  
- Training plans / streak  
- Custom user-defined activity types UI  
- Empty strength workout without a template  
- Renaming DB tables (`sessions` → `activities`)  
- Visual redesign beyond hierarchy/terminology needed for activities  

---

## 1. Data model

### Storage

Continue using `sessions` as the Activity store.

Add:

```sql
alter table sessions
  add column if not exists details jsonb not null default '{}';
```

Existing columns used:

| Column | Role |
|--------|------|
| `category` | `'strength' \| 'cardio' \| 'sport' \| 'mobility'` |
| `name` | Display name snapshot (e.g. `"Run"`, `"Push"`) |
| `color` | Card accent snapshot |
| `duration_mins` | Required for all logged activities |
| `note` | Optional notes |
| `workout_day_id` | Set for template-based strength; null for non-strength |
| `details` | Optional type-specific fields (JSON) |
| `session_sets` | Strength only; unused for non-strength |

Non-strength activities are saved as `status = 'completed'` on create (no in-progress set logger).

### `details` shapes

| Type | Fields |
|------|--------|
| Run | `distance_km?`, `pace_sec_per_km?`, `indoor?: boolean` |
| Walk / Incline Walk | `distance_km?`, `speed_kmh?`, `incline_pct?` |
| Cycling | `distance_km?`, `avg_speed_kmh?` |
| Rowing / Zumba / Dance / Cardio Other | usually empty or notes-only |
| Pickleball | `format?: 'singles' \| 'doubles'` |
| Other Sport | empty / notes |
| Mobility / Stretching / Yoga / Recovery / Other | `subtype?: string` optional |

Omit unset optional fields rather than storing nulls when practical.

### Activity catalog (app constants, V1)

**Cardio:** Run, Walk, Incline Walk, Cycling, Rowing, Zumba / Dance, Other  

**Sport:** Pickleball, Other Sport  

**Mobility:** Mobility, Stretching, Yoga, Recovery, Other  

**Strength:** existing workout templates only.

Assign a stable color per category (or per type) for feed cards.

---

## 2. Log Activity flow

### Home

- Keep stats + Log CTA + Recent Activity  
- Button label: **Log Activity**  
- Tap opens category screen (not template picker)

### Category screen — “What did you do?”

Four options:

1. Strength  
2. Cardio  
3. Sport  
4. Mobility  

Back → Home.

### Strength

→ Existing template Picker → ActiveSession / finish / summary.  

Picker back → category screen.

### Cardio / Sport / Mobility

1. Show type list for that category  
2. Open lightweight form:
   - Date (default today)  
   - Duration (required)  
   - Type-specific optional fields  
   - Notes (optional)  
3. Save creates a completed activity  
4. Navigate to Home; item appears in Recent Activity  

### Edit

| Category | Editor |
|----------|--------|
| Strength | Existing `SessionEdit` |
| Cardio / Sport / Mobility | Same lightweight form in edit mode |

Edit from Recent Activity or History.

---

## 3. Home, History & weekly summary

### Recent Activity

All categories, newest first. Subtitles:

- Strength: `{relative date} · {sets} sets · {duration}`  
- Run: `{relative date} · {duration} · {distance}` (omit missing pieces)  
- Incline Walk: include speed / incline when present  
- Pickleball / Mobility: `{relative date} · {duration}`  

Use `activity.name` and `activity.color`.

### History

- Keep week navigation and finished-activity list  
- Same subtitle helper as Recent Activity  
- No template “Not logged” rows  

### Weekly summary (current week)

- Headline: `N activities · {total duration}` (e.g. `6 activities · 3h 18m`)  
- Secondary: category breakdown — `3 strength · 2 cardio · 1 sport` (omit zeros)  
- Preserve strength PR wins when present  
- Empty: `0 activities · 0m` + short nudge  

### Home header

- This week count uses **activities** wording (e.g. `4 activities`)

### Progress

Unchanged in Phase 2 (strength only).

---

## 4. App structure

### Suggested components / modules

| Piece | Responsibility |
|-------|----------------|
| `ActivityCategoryPicker` | Strength / Cardio / Sport / Mobility |
| Category type lists | Fixed catalog per category |
| `LightweightActivityForm` | Create + edit non-strength |
| `formatActivitySubtitle` | Shared Home/History card copy |
| `activityCatalog` (lib) | Types, colors, default names |
| `buildWeeklySummary` | Extend with category counts + activities copy |
| Supabase helpers | `createLightweightActivity`, `updateLightweightActivity` |

### Screens

Extend `Screen` as needed, e.g.:

- `activityCategory`  
- `activityType` (optional if combined with form)  
- `activityForm`  

Strength continues to use `picker` / `session` / `summary` / `sessionEdit`.

### Migration & docs

- Ship SQL under `supabase/migrations/`  
- Note in README for existing projects  

### Testing

- Unit: subtitle formatter; weekly summary breakdown; details helpers  
- Component: category routing; duration required; mixed-type Recent Activity  
- Regression: strength create/finish/PR/remove-exercise-during-session  

### Error handling

- Same alert / connection patterns as today  
- Clear hint if `details` column missing (run Phase 2 migration)  

---

## 5. Success criteria

- Log Run, Pickleball, and Mobility each in under a minute  
- They appear in Recent Activity and History with sensible subtitles  
- Strength logging (template → sets → finish → PR) still works  
- Weekly summary shows activity count, total time, and category breakdown  
- Editing a non-strength activity updates fields without affecting strength sessions  
- No cardio progress UI ships in this phase  

## 6. Follow-on (not this spec)

- Phase 3: richer templates (e.g. Main Gym vs Apartment Gym)  
- Phase 4: Progress exercise selector UX + cardio progress later  
- Phase 5: optional training plans  

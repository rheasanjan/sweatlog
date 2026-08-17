# Sweatlog Phase 1 — Activity Model & Home/History Mental Model

**Date:** 2026-08-17  
**Status:** Approved for implementation planning  
**Scope:** Phase 1 only (strength logging preserved; no cardio/sport/mobility UI yet)

## Problem

Sweatlog treats `workout_days` (templates such as Push, Pull, Glutes) as a weekly program. Home and History derive goals from template count (`3/7`, “Not logged”, skips, streak-from-complete-program). That implies the user must complete every template each week.

Product principle for this phase:

> Sweatlog should record what the user actually did. Templates are tools, not goals. Planning is optional and out of scope.

## Goals

1. Introduce **Activity** as the universal logged entity in the data model and app types (even though Phase 1 only logs strength).
2. Stop deriving weekly goals from the number of templates.
3. Make Home and History show **actual finished activities**.
4. Allow multiple activities from the same template in one week.
5. Preserve existing strength logging, session edit, Progress graphs, and PR tracking.
6. Leave a clean seam for Phase 2 (Log Activity categories + lightweight non-strength forms).

## Non-goals (Phase 1)

- Cardio / sport / mobility logging UI
- “Log Activity” category picker (CTA stays “Log a Workout”)
- Training plans
- Streak on Home or History
- Cardio progress metrics
- Renaming DB tables (`sessions` → `activities`, `workout_days` → `templates`)
- Deleting the `workout_skips` table

## Decisions (locked)

| Topic | Decision |
|-------|----------|
| Approach | Early Activity model (evolve `sessions`; app speaks Activity) |
| Home templates | Keep template grid as **start shortcuts** — never ✓/○ completion goals |
| Streak | Remove from Home (and weekly summary) for Phase 1 |
| History unfinished templates | Show finished activities only — no “Not logged”, no skips in UI |
| Weekly summary | Session count + total duration (e.g. `4 sessions · 2h 45m`) |
| Same template twice in a week | Allowed — each is a separate activity |
| Skips | Unused in app; leave DB table in place |

---

## 1. Data model

### Concepts

| Concept | Meaning | Storage |
|---------|---------|---------|
| **Activity** | Something the user actually did (a logged occurrence) | `sessions` table, extended |
| **Workout template** | Reusable starting point for a strength workout | `workout_days` (structure unchanged) |
| **Strength detail** | Exercises and sets for a strength activity | `session_sets` (unchanged) |

Templates must never be treated as incomplete workouts or weekly obligations.

### Schema changes

Alter `sessions`:

1. `category text not null default 'strength'`  
   Check constraint: `'strength' | 'cardio' | 'sport' | 'mobility'`
2. `name text` — display name snapshot at log time (e.g. `"Push"`)
3. `color text` — color snapshot for feed/cards
4. Make `workout_day_id` **nullable** (template link optional; Phase 1 strength-from-template still sets it)

### Backfill

For existing rows:

- `category = 'strength'`
- `name` / `color` copied from joined `workout_days`

### Explicitly deferred columns

No distance, pace, incline, sport subtype, or plan FKs in Phase 1.

### App types

- `Activity` — what Home, History, and lists consume (maps to `sessions` row + joined sets / template metadata as needed)
- `WorkoutTemplate` — TypeScript rename of today’s `WorkoutDay`; DB table remains `workout_days`
- Strength create path: Template → Activity(`category: 'strength'`, snapshot `name`/`color`, `workout_day_id` set) → copy template exercises into `session_sets`

`workout_skips` remains in the database but is not fetched or shown in the main UI path.

---

## 2. Home

### Header stats

| Stat | Behavior |
|------|----------|
| Weight | Unchanged (latest body log) |
| This week | Count of **finished** activities this week (e.g. `4 sessions`) |
| Streak | **Removed** |

Do not show `accountedFor.size / workoutDays.length`.

### Templates section

- Keep the template grid.
- Each tile is a shortcut to start that template (same start flow as opening the picker and selecting it).
- No checkmark, empty circle, or skip styling.
- Section label should read as templates/shortcuts (e.g. “Templates”), not “This Week” as a completion checklist.

### Primary CTA

Keep **Log a Workout** → opens template picker. Phase 2 renames to Log Activity.

### Recent Activity

- Rename conceptually from “Recent Sessions” to recent activity feed (copy can say “Recent Activity”).
- List finished activities newest-first (not one row per template).
- Multiple entries for the same template are allowed.
- Strength row format unchanged: name, relative date, sets + duration.
- Tap → edit that activity.

### Data wiring

Home receives activities + templates. It does not receive or use week skips.

---

## 3. History & weekly summary

### Keep

- Week selector and prev/next navigation
- PR section inside the weekly summary card (strength PR wins + week-over-week beats)
- Edit on activity cards

### Weekly summary (current week)

Replace template-based copy (`3 of 7 sessions in`, week complete, streak badge) with:

- Headline based on **finished activity count + total `duration_mins`**  
  Example: `4 sessions · 2h 45m`
- Empty week: `0 sessions · 0m` plus a short nudge to log
- Preserve PR wins and “also up on last week” when applicable
- Remove streak badge from the card

Duration total: sum of `duration_mins` on finished activities in the week (treat null as 0). Format hours/minutes compactly (e.g. `45m`, `2h 5m`).

### Week list

- Remove the per-template overview (`Push · Not logged`, Log/Skip buttons).
- Show a single chronological list of finished activities for the selected week.
- Multiple activities from the same template all appear.
- Tap → edit.
- Empty state: no activities this week; logging happens via Home / Picker (including Picker date backfill), not History template rows.

### Title

Use **History** (drop “Workout History” emphasis on workouts-only).

---

## 4. Picker & strength logging

### Picker role

“Start from template,” not a weekly checklist.

- Remove skip / unskip from the UI entirely.
- Tapping a template **always starts a new activity**, even if that template was already logged this week.
- **Resume only** an existing `in_progress` activity for that template if one exists; do **not** open a finished same-week activity for edit when the user taps the template (that was the old `getSessionForWeek` short-circuit).
- Keep: date picker for backfill, create/edit templates, informational “Last done: …” hint (not a completion state).

### Strength session flow

Unchanged end-to-end: ActiveSession → sets → finish → Summary → PRs.

On create, persist:

- `category: 'strength'`
- `name` / `color` snapshots from the template
- `workout_day_id` = template id

### Progress

No redesign in Phase 1. Continue reading strength sets / history. Rename types only where required to compile against `Activity`.

### PRs

Keep current all-time PR logic. Weekly summary continues to surface PR wins for the current week using strength set comparison (existing `buildWeeklySummary` PR logic, decoupled from template day counts).

---

## 5. Migration & implementation notes

### Supabase

1. Ship a SQL migration in-repo (and document running it in README).
2. Add columns + backfill + nullable `workout_day_id`.
3. Do not delete `workout_skips`.

### Application

1. Introduce `Activity` / `WorkoutTemplate` types and adapters.
2. Rewrite `buildWeeklySummary` around activity count + total duration (+ PRs); remove template-count / skip / streak-from-program behavior.
3. Update Home, History, Picker; stop passing `weekSkips` through the main UI.
4. Update or replace tests that assert `N of M`, week-complete via skips, or template-based streak.
5. Prefer finishing multiple same-template activities in one week as a manual/QA check.

### Error handling

Keep existing patterns (alerts, connection error screen). If new columns are missing, surface a clear “run the Phase 1 migration” hint where practical.

---

## 6. Success criteria

- Home never shows `x/y` derived from template count.
- Home template tiles never show completion or skip state.
- History never shows “Not logged” or skip rows for templates.
- Logging Push twice in one week yields two separate editable activities in Home and History.
- Weekly summary shows session count + total duration; PRs still appear when earned.
- Strength Progress graphs and PR tracking still work.
- No cardio/sport/mobility logging UI ships in this phase.

## 7. Follow-on (not this spec)

- **Phase 2:** Log Activity flow; cardio/sport/mobility lightweight forms; feed supports all categories.
- **Phase 3:** Richer templates (e.g. Main Gym vs Apartment Gym) with copy-on-start guarantees.
- **Phase 4:** Progress exercise selector UX.
- **Phase 5:** Optional explicit training plans (plan completion separate from activity history).

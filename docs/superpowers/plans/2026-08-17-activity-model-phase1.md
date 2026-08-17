# Phase 1 Activity Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate templates from logged activities so Home/History reflect what the user actually did, while preserving strength logging and PRs and introducing an Activity-shaped data model for Phase 2.

**Architecture:** Evolve the existing `sessions` table into the Activity store (add `category`, `name`, `color`; nullable `workout_day_id`). App types expose `Activity` / `WorkoutTemplate`. Home, History, Picker, and weekly summary stop treating template count as a weekly goal. Strength create path snapshots template name/color onto each activity.

**Tech Stack:** React 18 + Vite + TypeScript, Supabase (Postgres), Vitest

**Spec:** `docs/superpowers/specs/2026-08-17-activity-model-phase1-design.md`

## Global Constraints

- Phase 1 only: no cardio/sport/mobility logging UI; CTA stays **Log a Workout**
- Do not derive weekly goals from template count; no ✓/○/skip UI for templates
- Multiple finished activities from the same template in one week are allowed
- Remove streak from Home and weekly summary
- Do not delete `workout_skips` table; stop using it in the UI
- Do not rename DB tables (`sessions`, `workout_days`)
- Preserve strength Progress graphs and PR tracking
- Prefer TDD for pure logic (`weeklySummary`, duration helpers); UI verified manually
- Keep commits small and focused after each task

## File map

| File | Responsibility |
|------|----------------|
| `supabase/migrations/20260817120000_activity_model_phase1.sql` | Schema migration |
| `schema.sql` | Keep canonical schema in sync for fresh installs |
| `README.md` | Note to run the Phase 1 migration |
| `src/types/index.ts` | `Activity`, `ActivityCategory`, `WorkoutTemplate` |
| `src/lib/program.ts` | Duration formatting; in-progress helper; deprecate template-streak usage |
| `src/lib/weeklySummary.ts` | Activity-count + total-duration summary + PRs |
| `src/lib/weeklySummary.test.ts` | Updated tests for new summary contract |
| `src/lib/supabase.ts` | Snapshot fields on create; optional in-progress fetch; stop requiring skips in app load |
| `src/components/Home.tsx` | Stats, template shortcuts, recent activity |
| `src/components/History.tsx` | Activity list only; new summary wiring |
| `src/components/WeeklySummaryCard.tsx` | Drop streak badge |
| `src/components/Picker.tsx` | No skips; always new unless resume in-progress |
| `src/components/ActiveSession.tsx` | Pass template into `createSession`; optional resume |
| `src/App.tsx` | Drop `weekSkips`; wire template start / resume |

---

### Task 1: SQL migration + schema sync

**Files:**
- Create: `supabase/migrations/20260817120000_activity_model_phase1.sql`
- Modify: `schema.sql` (sessions table definition + any comments)
- Modify: `README.md` (short migration note under Setup)

**Interfaces:**
- Consumes: existing `sessions`, `workout_days`
- Produces: `sessions.category`, `sessions.name`, `sessions.color`; nullable `sessions.workout_day_id`

- [ ] **Step 1: Write the migration file**

```sql
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
```

- [ ] **Step 2: Mirror the same columns/constraints in `schema.sql` for the `sessions` create table** so fresh installs match. Update the comment above sessions to say activities are stored in `sessions`.

- [ ] **Step 3: Add a README note** after the “Run the schema” step:

```markdown
### Existing projects — Phase 1 activity migration

If the database was created before the Activity model change, run
`supabase/migrations/20260817120000_activity_model_phase1.sql` in the
Supabase SQL Editor (in addition to any earlier migrations you already applied).
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260817120000_activity_model_phase1.sql schema.sql README.md
git commit -m "$(cat <<'EOF'
Add Phase 1 activity columns migration for sessions.

EOF
)"
```

---

### Task 2: Types — Activity & WorkoutTemplate

**Files:**
- Modify: `src/types/index.ts`

**Interfaces:**
- Produces:
  - `export type ActivityCategory = 'strength' | 'cardio' | 'sport' | 'mobility'`
  - `export interface Activity { ... }`
  - `export type WorkoutTemplate = { id: string; name: string; slug: string; color: string; subtitle: string | null; sort_order: number; is_custom: boolean }`
  - Keep `WorkoutDay` as `export type WorkoutDay = WorkoutTemplate` for gradual rename
  - `Session` becomes `export type Session = Activity` (compat alias)
  - `FinishedSession` based on `Activity`

- [ ] **Step 1: Replace `WorkoutDay` / `Session` definitions with the following**

```ts
export type ActivityCategory = 'strength' | 'cardio' | 'sport' | 'mobility'

export interface WorkoutTemplate {
  id: string
  name: string
  slug: string
  color: string
  subtitle: string | null
  sort_order: number
  is_custom: boolean
}

/** @deprecated Prefer WorkoutTemplate — alias during Phase 1 migration */
export type WorkoutDay = WorkoutTemplate

export interface Activity {
  id: string
  category: ActivityCategory
  name: string
  color: string
  workout_day_id: string | null
  status: string
  started_at: string
  finished_at: string | null
  duration_mins: number | null
  note: string | null
  workout_days?: Pick<WorkoutTemplate, 'id' | 'name' | 'slug' | 'color' | 'subtitle'> | null
  session_sets?: SessionSet[]
}

/** Compat alias — prefer Activity */
export type Session = Activity

export interface FinishedSession extends Omit<Activity, 'session_sets'> {
  prs?: PersonalRecord[]
  session_sets?: SessionSet[] | SetRow[]
}
```

Keep `WorkoutDayExercise`, `WorkoutSkip`, and other types unchanged. Update `WorkoutDayExercise` / skip types only if they reference `WorkoutDay` (they can keep using `WorkoutDay`).

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`  
Expected: may show errors where `workout_day_id: string` was required or `name`/`color`/`category` missing on inserts — fix those in later tasks. If only those expected errors appear, proceed. If unrelated breakages, fix minimally.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "$(cat <<'EOF'
Add Activity and WorkoutTemplate types for Phase 1.

EOF
)"
```

---

### Task 3: Duration helpers + in-progress lookup (TDD)

**Files:**
- Create: `src/lib/activityHelpers.ts`
- Create: `src/lib/activityHelpers.test.ts`
- Modify: `src/lib/program.ts` (optional re-export; leave `computeStreak` unused by UI)

**Interfaces:**
- Produces:
  - `formatTotalDuration(totalMins: number): string` — `0m`, `45m`, `2h`, `2h 5m`
  - `sumDurationMins(activities: Array<{ duration_mins: number | null | undefined }>): number`
  - `finishedActivitiesInWeek(activities, weekMonday): Activity[]` can stay as `sessionsInWeek` from program if filtered to finished elsewhere
  - `getInProgressForTemplate(activities: Activity[], templateId: string): Activity | null`

- [ ] **Step 1: Write failing tests** in `src/lib/activityHelpers.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { formatTotalDuration, sumDurationMins, getInProgressForTemplate } from './activityHelpers'
import type { Activity } from '../types'

describe('formatTotalDuration', () => {
  it('formats zero, minutes, hours, and mixed', () => {
    expect(formatTotalDuration(0)).toBe('0m')
    expect(formatTotalDuration(45)).toBe('45m')
    expect(formatTotalDuration(120)).toBe('2h')
    expect(formatTotalDuration(125)).toBe('2h 5m')
  })
})

describe('sumDurationMins', () => {
  it('sums durations treating null as 0', () => {
    expect(sumDurationMins([
      { duration_mins: 40 },
      { duration_mins: null },
      { duration_mins: 25 },
    ])).toBe(65)
  })
})

describe('getInProgressForTemplate', () => {
  it('returns newest in_progress for template', () => {
    const activities: Activity[] = [
      {
        id: 'a1', category: 'strength', name: 'Push', color: '#2563EB',
        workout_day_id: 'd1', status: 'in_progress',
        started_at: '2026-07-07T10:00:00.000Z', finished_at: null,
        duration_mins: null, note: null,
      },
      {
        id: 'a2', category: 'strength', name: 'Push', color: '#2563EB',
        workout_day_id: 'd1', status: 'completed',
        started_at: '2026-07-07T12:00:00.000Z', finished_at: '2026-07-07T13:00:00.000Z',
        duration_mins: 60, note: null,
      },
    ]
    expect(getInProgressForTemplate(activities, 'd1')?.id).toBe('a1')
    expect(getInProgressForTemplate(activities, 'd2')).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests — expect fail**

Run: `npm test -- src/lib/activityHelpers.test.ts`  
Expected: FAIL (module/functions missing)

- [ ] **Step 3: Implement `src/lib/activityHelpers.ts`**

```ts
import type { Activity } from '../types'

export function formatTotalDuration(totalMins: number): string {
  const mins = Math.max(0, Math.round(totalMins) || 0)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function sumDurationMins(
  activities: Array<{ duration_mins: number | null | undefined }>,
): number {
  return activities.reduce((sum, a) => sum + (Number(a.duration_mins) || 0), 0)
}

export function getInProgressForTemplate(
  activities: Activity[] | null | undefined,
  templateId: string,
): Activity | null {
  const matches = (activities || [])
    .filter(a => a.workout_day_id === templateId && a.status === 'in_progress')
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
  return matches[0] || null
}
```

- [ ] **Step 4: Run tests — expect pass**

Run: `npm test -- src/lib/activityHelpers.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/activityHelpers.ts src/lib/activityHelpers.test.ts
git commit -m "$(cat <<'EOF'
Add activity duration and in-progress helpers.

EOF
)"
```

---

### Task 4: Rewrite weekly summary (TDD)

**Files:**
- Modify: `src/lib/weeklySummary.ts`
- Modify: `src/lib/weeklySummary.test.ts`
- Modify: `src/components/WeeklySummaryCard.tsx` (drop streak badge)

**Interfaces:**
- Consumes: `sessionsInWeek`, `isBetterSet`, `formatImprovementDelta`, `formatTotalDuration`, `sumDurationMins`
- Produces:
  - `weeklySummaryCopy({ sessionCount, totalMins, prCount })`
  - `buildWeeklySummary({ sessions: Activity[], weekMonday: Date }): WeeklySummary`
  - `WeeklySummary`: `{ sessionCount, totalMins, prs, weekOverWeekBeats, headline, subline, rich }` — **remove** `doneCount`, `dayCount`, `weekComplete`, `streak`

- [ ] **Step 1: Rewrite failing/desired tests** in `weeklySummary.test.ts`

Replace `weeklySummaryCopy` and `buildWeeklySummary` describes with:

```ts
describe('weeklySummaryCopy', () => {
  it('handles empty, sparse, and rich states', () => {
    expect(weeklySummaryCopy({ sessionCount: 0, totalMins: 0, prCount: 0 })).toEqual({
      headline: '0 sessions · 0m',
      subline: 'Log a session to start the week.',
      rich: false,
    })
    expect(weeklySummaryCopy({ sessionCount: 2, totalMins: 85, prCount: 0 })).toEqual({
      headline: '2 sessions · 1h 25m',
      subline: 'Keep logging what you actually did.',
      rich: false,
    })
    expect(weeklySummaryCopy({ sessionCount: 4, totalMins: 165, prCount: 2 })).toEqual({
      headline: 'Strong week — 4 sessions · 2h 45m',
      subline: 'All-time bests set this week.',
      rich: true,
    })
  })
})

describe('buildWeeklySummary', () => {
  it('returns empty state with no sessions', () => {
    const summary = buildWeeklySummary({ sessions: [], weekMonday })
    expect(summary.sessionCount).toBe(0)
    expect(summary.totalMins).toBe(0)
    expect(summary.prs).toEqual([])
    expect(summary.headline).toBe('0 sessions · 0m')
  })

  // Keep the existing PR and week-over-week tests, but call:
  // buildWeeklySummary({ sessions: [...], weekMonday })
  // Remove workoutDays / weekSkips args.
  // Delete tests: 'marks week complete when done + skipped...' and 'computes streak...'
})
```

Update session fixtures to include `category: 'strength'`, `name: 'Push'`, `color: '#2563EB'`. Status in fixtures should be `'completed'` (fix existing `'finished'` if present — production uses `'completed'`).

- [ ] **Step 2: Run tests — expect fail**

Run: `npm test -- src/lib/weeklySummary.test.ts`  
Expected: FAIL on new copy/API

- [ ] **Step 3: Implement new `weeklySummary.ts`**

```ts
import { addWeeks, sessionsInWeek, weekStartKey } from './program'
import { formatTotalDuration, sumDurationMins } from './activityHelpers'
import type { Activity, SessionSet } from '../types'

export interface WeeklyPrWin {
  exerciseId: string
  exerciseName: string
  deltaLabel: string
}

export interface WeeklySummary {
  sessionCount: number
  totalMins: number
  prs: WeeklyPrWin[]
  weekOverWeekBeats: string[]
  headline: string
  subline: string
  rich: boolean
}

// keep isBetterSet + formatImprovementDelta + bestsByExercise helpers as today

export function weeklySummaryCopy(input: {
  sessionCount: number
  totalMins: number
  prCount: number
}): { headline: string; subline: string; rich: boolean } {
  const { sessionCount, totalMins, prCount } = input
  const durationLabel = formatTotalDuration(totalMins)
  const rich = prCount > 0

  if (sessionCount === 0) {
    return {
      headline: `0 sessions · ${durationLabel}`,
      subline: 'Log a session to start the week.',
      rich: false,
    }
  }

  if (rich) {
    return {
      headline: `Strong week — ${sessionCount} sessions · ${durationLabel}`,
      subline: 'All-time bests set this week.',
      rich: true,
    }
  }

  return {
    headline: `${sessionCount} sessions · ${durationLabel}`,
    subline: 'Keep logging what you actually did.',
    rich: false,
  }
}

export function buildWeeklySummary(input: {
  sessions: Activity[]
  weekMonday: Date
}): WeeklySummary {
  const { sessions, weekMonday } = input
  const thisWeekSessions = sessionsInWeek(sessions, weekMonday)
  const lastWeekSessions = sessionsInWeek(sessions, addWeeks(weekMonday, -1))
  const priorSessions = sessions.filter(
    s => weekStartKey(new Date(s.started_at)) < weekStartKey(weekMonday),
  )

  const sessionCount = thisWeekSessions.length
  const totalMins = sumDurationMins(thisWeekSessions)

  // PR / wow logic unchanged from current file (bestsByExercise comparisons)
  // ...

  const copy = weeklySummaryCopy({ sessionCount, totalMins, prCount: prs.length })
  return {
    sessionCount,
    totalMins,
    prs,
    weekOverWeekBeats,
    headline: copy.headline,
    subline: copy.subline,
    rich: copy.rich,
  }
}
```

Port the existing PR loops verbatim; only remove `workoutDays`, skips, `weekComplete`, and `computeStreak`.

- [ ] **Step 4: Update `WeeklySummaryCard`** — remove streak badge (`streak >= 1` block). Props stay `{ summary }`.

- [ ] **Step 5: Run tests — expect pass**

Run: `npm test -- src/lib/weeklySummary.test.ts`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/weeklySummary.ts src/lib/weeklySummary.test.ts src/components/WeeklySummaryCard.tsx
git commit -m "$(cat <<'EOF'
Rewrite weekly summary around session count and duration.

EOF
)"
```

---

### Task 5: Supabase create/fetch for Activity snapshots

**Files:**
- Modify: `src/lib/supabase.ts`
- Modify: `src/components/ActiveSession.tsx` (createSession call site)

**Interfaces:**
- Consumes: `WorkoutTemplate` pick of `id | name | color`
- Produces:
  - `createSession(template: Pick<WorkoutTemplate, 'id' | 'name' | 'color'>, opts?): Promise<Activity>`
  - `fetchInProgressSession(templateId: string): Promise<Activity | null>`
  - `fetchRecentSessions` return type remains activity rows (columns include category/name/color after migration)

- [ ] **Step 1: Update `createSession`**

```ts
export async function createSession(
  template: Pick<WorkoutTemplate, 'id' | 'name' | 'color'>,
  { startedAt }: { startedAt?: string } = {},
): Promise<Activity> {
  const started = startedAt || new Date().toISOString()
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      workout_day_id: template.id,
      category: 'strength',
      name: template.name,
      color: template.color,
      status: 'in_progress',
      started_at: started,
    })
    .select()
    .single()
  if (error) throw error
  return data
}
```

Update imports/types in `supabase.ts` to use `Activity` / `WorkoutTemplate` where appropriate.

- [ ] **Step 2: Add in-progress fetch**

```ts
export async function fetchInProgressSession(templateId: string): Promise<Activity | null> {
  const { data, error } = await supabase
    .from('sessions')
    .select(`
      *,
      workout_days ( id, name, slug, color, subtitle ),
      session_sets (
        id, exercise_id, exercise_name, alt_used,
        set_number, weight_kg, reps, duration_secs, done
      )
    `)
    .eq('workout_day_id', templateId)
    .eq('status', 'in_progress')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}
```

- [ ] **Step 3: Fix ActiveSession create call**

Change:

```ts
createSession(workoutDay.id, { startedAt })
```

to:

```ts
createSession(
  { id: workoutDay.id, name: workoutDay.name, color: workoutDay.color },
  { startedAt },
)
```

- [ ] **Step 4: Improve connection error hint in `App.tsx`** (optional one-liner): if error message mentions `category` / column, append “Run the Phase 1 activity migration SQL.”

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase.ts src/components/ActiveSession.tsx src/App.tsx
git commit -m "$(cat <<'EOF'
Snapshot activity name and color when creating sessions.

EOF
)"
```

---

### Task 6: Home — activity stats + template shortcuts

**Files:**
- Modify: `src/components/Home.tsx`
- Modify: `src/App.tsx` (props)

**Interfaces:**
- Consumes: `activities: Activity[]`, `templates: WorkoutTemplate[]`, `bodyLog`, `onStart`, `onStartTemplate(template)`, `onEditSession`
- Produces: UI only

- [ ] **Step 1: Rewrite Home props and header**

```ts
export interface HomeProps {
  templates: WorkoutTemplate[]
  activities: Activity[]
  bodyLog: BodyLogEntry[]
  onStart: () => void
  onStartTemplate: (template: WorkoutTemplate) => void
  onEditSession: (session: Activity) => void
}
```

Header stats:

- Weight — unchanged
- This week — `${thisWeekFinished.length} sessions` where `thisWeekFinished = activities.filter(a => a.status === 'completed' && new Date(a.started_at) >= weekStart)`  
  (If status filter already applied by `fetchRecentSessions`, counting week slice is enough.)
- Remove streak `Stat`

- [ ] **Step 2: Templates grid as shortcuts**

- Section label: `Templates` (not “This Week”)
- Each tile is a `<button type="button">` calling `onStartTemplate(day)`
- No Check / Minus / done / skipped styling — neutral card using `lightColor` / border with template color lightly, or plain white + color accent
- Do not compute `doneThisWeek` / skips

- [ ] **Step 3: Recent Activity**

- Label: `Recent Activity`
- Prefer `activity.name` (fallback `activity.workout_days?.name || 'Workout'`)
- Prefer `activity.color` (fallback template join color)
- Keep sets + duration row; tap edits

- [ ] **Step 4: Wire App**

```tsx
<Home
  templates={workoutDays}
  activities={sessions}
  bodyLog={bodyLog}
  onStart={() => setScreen('picker')}
  onStartTemplate={(day) => startSession(day, new Date(), 'home')}
  onEditSession={s => openSessionEdit(s, 'home')}
/>
```

Remove `weekSkips` prop.

- [ ] **Step 5: Manual check** — `npm run dev`, confirm header is not `x/y`, templates have no checkmarks, recent list can show duplicate names.

- [ ] **Step 6: Commit**

```bash
git add src/components/Home.tsx src/App.tsx
git commit -m "$(cat <<'EOF'
Rework Home around activities and template shortcuts.

EOF
)"
```

---

### Task 7: History — finished activities only

**Files:**
- Modify: `src/components/History.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `activities`, `onBack`, `onEditSession` — **remove** `workoutDays`, `weekSkips`, `onLogSession` from History (backfill only via Picker)
- Produces: week nav + summary + activity cards

- [ ] **Step 1: Simplify props**

```ts
export interface HistoryProps {
  activities: Activity[]
  onBack: () => void
  onEditSession: (session: Activity) => void
}
```

- [ ] **Step 2: Replace template overview + dual lists with one list**

- Title: `History`
- Keep week navigator
- `weeklySummary = buildWeeklySummary({ sessions: activities, weekMonday })` for current week only (same as today)
- Remove `workoutDays.map` overview entirely
- Remove log modal
- Single section: chronological finished activities in week (`sessionsInWeek` + sort by `started_at` desc)
- Card uses `activity.name` / `activity.color`
- Empty: “No sessions this week. Log a workout from Home.”

- [ ] **Step 3: Wire App** — drop `weekSkips` / `onLogSession` / `workoutDays` from History.

- [ ] **Step 4: Manual check** — History never shows “Not logged”; two Push activities in one week both appear.

- [ ] **Step 5: Commit**

```bash
git add src/components/History.tsx src/App.tsx
git commit -m "$(cat <<'EOF'
Show only finished activities on History.

EOF
)"
```

---

### Task 8: Picker — no skips; always new unless in-progress

**Files:**
- Modify: `src/components/Picker.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/ActiveSession.tsx` (resume support)

**Interfaces:**
- Consumes: templates, activities (completed list), `onSelect(template, date)`, `onResume?(activity)`, `onEditSession` only from explicit recent/edit affordances if any
- Produces: start new or resume in-progress

- [ ] **Step 1: Remove skip UI and props**

- Delete `weekSkips`, `handleSkip`, `handleUnskip`, skip buttons, skipped styling
- Remove imports of `skipWorkoutForWeek`, `unskipWorkoutForWeek`, `getSessionForWeek`

- [ ] **Step 2: Change click behavior**

```ts
const handleDayClick = async (day: WorkoutTemplate) => {
  try {
    const inProgress = await fetchInProgressSession(day.id)
    if (inProgress) {
      onResume(inProgress)
      return
    }
    onSelect(day, logDateObj)
  } catch (err) {
    alert('Could not start: ' + (err instanceof Error ? err.message : String(err)))
  }
}
```

Never route finished same-week activities to edit on template tap.

- [ ] **Step 3: ActiveSession resume (minimal)**

Add optional prop `resumeActivity?: Activity | null`.

- If `resumeActivity` is set: set `sessionIdRef` from it; do **not** call `createSession`; load exercises from `resumeActivity.session_sets` into UI state (or refetch sets)
- If not set: keep current `createSession` path

App:

```ts
const [resumeActivity, setResumeActivity] = useState<Activity | null>(null)

// picker
onResume={(activity) => {
  setActiveWorkoutDay(/* template from workoutDays by activity.workout_day_id */)
  setResumeActivity(activity)
  setScreen('session')
}}

// when starting fresh via startSession, clear resumeActivity
```

Pass `resumeActivity` into `ActiveSession` and clear it on finish/back.

- [ ] **Step 4: Visual** — template rows should not show “Done this week” completion chrome that blocks starting again. Informational “Last done: …” stays.

- [ ] **Step 5: Manual check** — log Push, return to Picker, tap Push again → new session (not edit). If an in-progress exists, resumes.

- [ ] **Step 6: Commit**

```bash
git add src/components/Picker.tsx src/components/ActiveSession.tsx src/App.tsx
git commit -m "$(cat <<'EOF'
Allow multiple weekly activities from the same template.

EOF
)"
```

---

### Task 9: App cleanup — drop weekSkips from load path

**Files:**
- Modify: `src/App.tsx`
- Optionally leave skip functions in `supabase.ts` unused (do not delete unless trivial)

**Interfaces:**
- Produces: `loadAll` without `fetchAllWeekSkips`

- [ ] **Step 1: Remove** `weekSkips` state, `fetchAllWeekSkips` from `loadAll` / `refreshData`, and all prop drilling.

- [ ] **Step 2: Run full test suite**

Run: `npm test`  
Expected: PASS

- [ ] **Step 3: Run build**

Run: `npm run build`  
Expected: success

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/lib/supabase.ts src/components/*.tsx src/types/index.ts
git commit -m "$(cat <<'EOF'
Stop loading workout skips in the main app path.

EOF
)"
```

---

### Task 10: Verification checklist

**Files:** none (manual + tests)

- [ ] **Step 1: Ensure migration applied** on the Supabase project used for local `.env`

- [ ] **Step 2: Run automated checks**

```bash
npm test
npm run build
```

Expected: all pass / build OK

- [ ] **Step 3: Manual QA**

1. Home header shows session count this week, not `x/y`; no streak
2. Template tiles have no checkmarks; tapping one starts logging
3. Log Push, finish; log Push again same week → two Recent Activity rows; both on History
4. History has no “Not logged” / Skip; weekly summary like `2 sessions · 1h 20m`
5. PRs still appear on summary when you beat an all-time best
6. Progress strength graph still loads
7. Edit from Recent Activity / History still works

- [ ] **Step 4: Final commit only if verification fixed stray files**; otherwise done.

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| Activity columns + nullable template FK | 1 |
| Activity / WorkoutTemplate types | 2 |
| Duration helpers | 3 |
| Weekly summary count + duration; drop streak/N-of-M | 4 |
| Snapshot name/color on create | 5 |
| Home stats + template shortcuts + recent activity | 6 |
| History finished-only list | 7 |
| Multiple sessions / no skip / resume in-progress | 8 |
| Stop using skips in app | 9 |
| Success criteria QA | 10 |

No cardio UI, plans, streak, or table renames included.

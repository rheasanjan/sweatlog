# Phase 2 Generalized Activities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users log Strength, Cardio, Sport, and Mobility through **Log Activity**, show them in Home/History, and summarize the week with count + time + category breakdown.

**Architecture:** Keep `sessions` as the Activity store. Add `details jsonb` for optional non-strength fields. Home CTA opens a category hub; Strength reuses the existing template picker + set logger; Cardio/Sport/Mobility use a lightweight form that creates a completed activity with a manually entered duration (no live timer). Shared subtitle + weekly-summary helpers power the feed.

**Tech Stack:** React 18 + Vite + TypeScript, Supabase (Postgres), Vitest

**Spec:** `docs/superpowers/specs/2026-08-19-generalized-activities-phase2-design.md`

## Global Constraints

- Non-strength duration is a **manual entered field** logged after the fact — never a live timer
- Strength path stays: category → template Picker → ActiveSession
- Optional fields live in `sessions.details` JSON (`{}` default)
- Don’t build Strava — keep cardio/sport/mobility forms minimal
- Preserve strength PRs / Progress / remove-during-session behavior
- No cardio progress UI, plans, streak, or custom activity-type UI in this phase
- Prefer TDD for pure helpers; frequent small commits

## File map

| File | Responsibility |
|------|----------------|
| `supabase/migrations/20260819120000_activity_details_phase2.sql` | Add `details` jsonb |
| `schema.sql` / `README.md` | Sync + migration note |
| `src/types/index.ts` | `details` on Activity; new screens |
| `src/lib/activityCatalog.ts` | Categories, types, colors |
| `src/lib/activitySubtitle.ts` | Feed/History subtitle formatter |
| `src/lib/weeklySummary.ts` | Activities copy + category breakdown |
| `src/lib/supabase.ts` | create/update lightweight activities |
| `src/components/ActivityCategoryPicker.tsx` | Strength/Cardio/Sport/Mobility |
| `src/components/ActivityTypePicker.tsx` | Type list per category |
| `src/components/LightweightActivityForm.tsx` | Create/edit non-strength (manual duration) |
| `src/components/Home.tsx` | Log Activity CTA; mixed subtitles; “activities” count |
| `src/components/History.tsx` | Mixed subtitles |
| `src/components/WeeklySummaryCard.tsx` | Show breakdown if provided |
| `src/App.tsx` | Wire new screens + edit routing |

---

### Task 1: Migration — `details` jsonb

**Files:**
- Create: `supabase/migrations/20260819120000_activity_details_phase2.sql`
- Modify: `schema.sql`, `README.md`

**Interfaces:**
- Produces: `sessions.details jsonb not null default '{}'`

- [ ] **Step 1: Write migration**

```sql
alter table sessions
  add column if not exists details jsonb not null default '{}';
```

- [ ] **Step 2: Mirror in `schema.sql` sessions table** and add README note under Phase 1 migration section for Phase 2.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260819120000_activity_details_phase2.sql schema.sql README.md
git commit -m "$(cat <<'EOF'
Add sessions.details jsonb for lightweight activity fields.

EOF
)"
```

---

### Task 2: Types — `details` + screens

**Files:**
- Modify: `src/types/index.ts`

**Interfaces:**
- Produces:
  - `export type ActivityDetails = Record<string, string | number | boolean>`
  - `Activity.details: ActivityDetails`
  - Extend `Screen` with `'activityCategory' | 'activityType' | 'activityForm'`

- [ ] **Step 1: Update types**

```ts
export type Screen =
  | 'home' | 'picker' | 'session' | 'summary' | 'progress' | 'history' | 'sessionEdit'
  | 'activityCategory' | 'activityType' | 'activityForm'

export type ActivityDetails = Record<string, string | number | boolean>

export interface Activity {
  // ...existing fields...
  details?: ActivityDetails | null
}
```

- [ ] **Step 2: `npx tsc --noEmit`** — fix only type-file issues; fixtures can be updated in later tasks when they fail.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "$(cat <<'EOF'
Add activity details type and Phase 2 screens.

EOF
)"
```

---

### Task 3: Activity catalog (TDD)

**Files:**
- Create: `src/lib/activityCatalog.ts`
- Create: `src/lib/activityCatalog.test.ts`

**Interfaces:**
- Produces:
  - `ACTIVITY_CATEGORIES: { id: ActivityCategory; label: string; color: string }[]` (exclude strength from type lists; strength has no subtypes here)
  - `typesForCategory(category): { id: string; label: string; color: string }[]`
  - `getActivityType(category, typeId)`

Catalog (exact labels):

- Cardio: Run, Walk, Incline Walk, Cycling, Rowing, Zumba / Dance, Other  
- Sport: Pickleball, Other Sport  
- Mobility: Mobility, Stretching, Yoga, Recovery, Other  

Category colors (suggested): cardio `#0891B2`, sport `#D97706`, mobility `#059669`, strength `#2563EB`.

- [ ] **Step 1: Write failing tests** for `typesForCategory('cardio')` including Run / Incline Walk; sport includes Pickleball; mobility includes Yoga.

- [ ] **Step 2: Run** `npm test -- src/lib/activityCatalog.test.ts` — expect FAIL

- [ ] **Step 3: Implement catalog**

- [ ] **Step 4: Run tests — PASS; commit**

```bash
git add src/lib/activityCatalog.ts src/lib/activityCatalog.test.ts
git commit -m "$(cat <<'EOF'
Add fixed activity type catalog for non-strength logging.

EOF
)"
```

---

### Task 4: Subtitle formatter (TDD)

**Files:**
- Create: `src/lib/activitySubtitle.ts`
- Create: `src/lib/activitySubtitle.test.ts`

**Interfaces:**
- Consumes: `Activity`, `formatTotalDuration` (optional)
- Produces: `formatActivitySubtitle(activity, { relativeDate: string }): string`

Rules:
- Always include relative date fragment caller provides (or build inside with a `daysAgo`-style helper)
- Append ` · {N} min` when `duration_mins` set
- Strength: also ` · {sets} sets` when sets present
- Run: append ` · {distance} km` when `details.distance_km` present
- Incline Walk: append speed / incline when present
- Omit missing optionals; no trailing separators

- [ ] **Step 1: Failing tests** for strength, run with distance, pickleball duration-only, incline walk with incline

- [ ] **Step 2–4: Implement, pass, commit**

```bash
git commit -m "$(cat <<'EOF'
Format activity feed subtitles for mixed categories.

EOF
)"
```

---

### Task 5: Weekly summary — activities + breakdown (TDD)

**Files:**
- Modify: `src/lib/weeklySummary.ts`, `src/lib/weeklySummary.test.ts`
- Modify: `src/components/WeeklySummaryCard.tsx` if needed to show breakdown

**Interfaces:**
- Extend `WeeklySummary` with `categoryCounts: Partial<Record<ActivityCategory, number>>`
- Copy:
  - Empty: `0 activities · 0m` / `Log an activity to start the week.`
  - Sparse: `2 activities · 1h 25m` / breakdown string e.g. `1 strength · 1 cardio`
  - Rich (PRs): `Strong week — 4 activities · 2h 45m` / breakdown or PR subline
- Helper: `formatCategoryBreakdown(counts): string` — omit zeros; order strength, cardio, sport, mobility

- [ ] **Step 1: Rewrite/extend tests** for activities wording + breakdown with mixed categories

- [ ] **Step 2–4: Implement, pass, update card to render breakdown under subline if useful**

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
Extend weekly summary with activity counts and category breakdown.

EOF
)"
```

---

### Task 6: Supabase create/update lightweight activities

**Files:**
- Modify: `src/lib/supabase.ts`
- Modify: `src/lib/supabase.test.ts`

**Interfaces:**
- Produces:

```ts
export async function createLightweightActivity(input: {
  category: Exclude<ActivityCategory, 'strength'>
  name: string
  color: string
  durationMins: number
  startedAt: string // date-at-noon ISO
  note?: string | null
  details?: ActivityDetails
}): Promise<Activity>

export async function updateLightweightActivity(
  id: string,
  input: {
    durationMins: number
    startedAt: string
    note?: string | null
    details?: ActivityDetails
    name?: string
    color?: string
  },
): Promise<Activity>
```

Insert must set `status: 'completed'`, `finished_at` (~ startedAt + duration), `workout_day_id: null`, `details: details ?? {}`.

**No timer fields.** Duration comes only from `durationMins` argument.

- [ ] **Step 1: Failing persistence tests** for insert payload (category, duration, details, completed)

- [ ] **Step 2–4: Implement, pass, commit**

```bash
git commit -m "$(cat <<'EOF'
Persist lightweight non-strength activities with details JSON.

EOF
)"
```

---

### Task 7: Category + type picker UI

**Files:**
- Create: `src/components/ActivityCategoryPicker.tsx`
- Create: `src/components/ActivityTypePicker.tsx`
- Create: tests for labels/routing callbacks (static markup ok)

**Interfaces:**
- Category picker props: `onBack`, `onSelectCategory(category)`
- Type picker props: `category`, `onBack`, `onSelectType(type)`

- [ ] **Step 1: Implement category screen** — four buttons, title “What did you do?”

- [ ] **Step 2: Implement type picker** using `typesForCategory`

- [ ] **Step 3: Tests** assert Strength/Cardio/Sport/Mobility labels; cardio list includes Run

- [ ] **Step 4: Commit**

```bash
git commit -m "$(cat <<'EOF'
Add activity category and type picker screens.

EOF
)"
```

---

### Task 8: LightweightActivityForm (manual duration)

**Files:**
- Create: `src/components/LightweightActivityForm.tsx`
- Create: `src/components/LightweightActivityForm.test.tsx`

**Interfaces:**
- Props: `category`, `activityType: { id, label, color }`, `initial?: Activity | null`, `onBack`, `onSaved(activity)`

**Form fields:**
- Date input (required)
- Duration minutes input (required, number > 0) — **plain number field, label “Duration (min)”** — never a stopwatch/timer UI
- Optional fields by type (Run: distance, pace optional, indoor checkbox; Incline Walk: distance/speed/incline; Cycling: distance/avg speed; Pickleball: singles/doubles select; Mobility: optional subtype text)
- Notes textarea

Save calls `createLightweightActivity` or `updateLightweightActivity`.

- [ ] **Step 1: Test** that rendered form contains “Duration (min)” and does **not** contain timer/stopwatch copy; save disabled or errors when duration empty

- [ ] **Step 2: Implement form**

- [ ] **Step 3: Pass tests; commit**

```bash
git commit -m "$(cat <<'EOF'
Add lightweight activity form with manual duration entry.

EOF
)"
```

---

### Task 9: Wire App navigation

**Files:**
- Modify: `src/App.tsx`
- Modify: Picker `onBack` return target when entered from category flow

**Flow:**
1. Home `onStart` → `activityCategory`
2. Strength → `picker` (set `sessionReturnScreen` / back stack so Picker back → category)
3. Cardio/Sport/Mobility → `activityType` → `activityForm`
4. Form save → `refreshData` → `home`
5. Edit from Home/History: if `category === 'strength'` → SessionEdit; else → `activityForm` with `initial`

- [ ] **Step 1: Wire screens and state** (`selectedCategory`, `selectedType`, `editingLightweight`)

- [ ] **Step 2: Manual smoke via `npm run build`**

- [ ] **Step 3: Commit**

```bash
git commit -m "$(cat <<'EOF'
Wire Log Activity navigation for all categories.

EOF
)"
```

---

### Task 10: Home + History use mixed subtitles & “activities”

**Files:**
- Modify: `src/components/Home.tsx`, `Home.test.tsx`
- Modify: `src/components/History.tsx`, `History.test.tsx`

- [ ] **Step 1: Home CTA** → `Log Activity`; week stat → `N activities`; recent rows use `formatActivitySubtitle`

- [ ] **Step 2: History cards** use same formatter; keep edit wiring

- [ ] **Step 3: Update tests**; commit

```bash
git commit -m "$(cat <<'EOF'
Show mixed activity types on Home and History.

EOF
)"
```

---

### Task 11: Apply migration + verification

**Files:** none (ops + QA)

- [ ] **Step 1:** `supabase db push --linked` (or SQL Editor) for `details` column

- [ ] **Step 2:** `npm test` && `npm run build` && `npx tsc --noEmit`

- [ ] **Step 3: Manual QA**
  1. Log Activity → Cardio → Run → enter duration 18, distance 2.1 → appears on Home  
  2. Log Pickleball 75 min → History shows it  
  3. Log Mobility 20 min → weekly summary breakdown includes mobility  
  4. Strength Push still works  
  5. Edit a Run’s duration  
  6. Confirm no live timer UI on non-strength forms  

- [ ] **Step 4: Commit only if fixes needed**

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| `details` jsonb | 1 |
| Types / screens | 2 |
| Activity catalog | 3 |
| Subtitles | 4 |
| Weekly summary breakdown | 5 |
| Persist lightweight activities | 6 |
| Category + type pickers | 7 |
| Manual duration form | 8 |
| App wiring | 9 |
| Home/History mixed feed | 10 |
| Migration + QA | 11 |

No placeholders; duration explicitly manual for non-strength.

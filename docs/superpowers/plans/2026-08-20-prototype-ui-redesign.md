# Prototype UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Match the supplied Sweatlog prototype across Home, shared chrome, and a unified Log Activity picker without changing existing persistence or strength-session behavior.

**Architecture:** Add shared design tokens and activity presentation metadata, then replace the category/type screens with a single catalog-driven picker. Existing lightweight forms and the strength template picker remain the destinations, with App navigation adjusted to return to the unified picker.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, Lucide React

**Spec:** `docs/superpowers/specs/2026-08-20-prototype-ui-redesign.md`

## Global Constraints

- Preserve the existing Phase 2 activity catalog and Supabase schema.
- Strength continues through the existing template picker and ActiveSession.
- Non-strength activities continue through LightweightActivityForm.
- Do not add prototype-only sports or live timers.
- Use tests before behavior changes.

---

### Task 1: Shared visual tokens and activity presentation

**Files:**
- Create: `src/styles/theme.ts`
- Modify: `src/lib/activityCatalog.ts`
- Test: `src/lib/activityCatalog.test.ts`
- Modify: `index.html`

**Interfaces:**
- Produces `theme` tokens for app surfaces, typography, brand, and category colors.
- Extends activity category/type options with icon names or supplies exported presentation helpers used by Home and LogActivityPicker.

- [ ] Add failing catalog tests for prototype category colors and icon metadata.
- [ ] Run `npm test -- src/lib/activityCatalog.test.ts` and confirm the assertions fail.
- [ ] Add shared tokens and presentation metadata.
- [ ] Load Manrope and Inter from Google Fonts in `index.html` and establish global body/background/button styles.
- [ ] Re-run the catalog tests.

### Task 2: Unified Log Activity picker

**Files:**
- Create: `src/components/LogActivityPicker.tsx`
- Create: `src/components/LogActivityPicker.test.tsx`

**Interfaces:**
- Props:
  - `activities: Activity[]`
  - `onBack(): void`
  - `onSelectStrength(): void`
  - `onSelectType(category: Exclude<ActivityCategory, 'strength'>, type: ActivityTypeOption): void`
- Renders quick-log chips, search, and grouped catalog tiles.

- [ ] Write static-render tests for header copy, quick log, all existing category groups, and catalog types.
- [ ] Run the focused test and confirm it fails because the component does not exist.
- [ ] Implement category icons, quick-log derivation, search filtering, and tile callbacks.
- [ ] Run the focused test and confirm it passes.

### Task 3: Prototype Home and shared chrome

**Files:**
- Modify: `src/components/Home.tsx`
- Modify: `src/components/Home.test.tsx`
- Modify: `src/components/BottomNav.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Home continues consuming existing props.
- Recent activity rows use category presentation metadata and preserve edit callbacks.

- [ ] Update Home tests to require category badges and removal of left-border cards.
- [ ] Run the focused Home test and confirm it fails.
- [ ] Implement the radial header, stat chips, overlapping gradient CTA, badge activity cards, and icon edit control.
- [ ] Restyle BottomNav and the App shell with shared tokens.
- [ ] Re-run focused tests.

### Task 4: Navigation integration

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/types/index.ts`
- Delete: `src/components/ActivityCategoryPicker.tsx`
- Delete: `src/components/ActivityTypePicker.tsx`
- Delete or rewrite: `src/components/ActivityCategoryPicker.test.tsx`

**Interfaces:**
- Home opens `logActivity`.
- Strength selection opens `picker`.
- Non-strength selection sets category/type and opens `activityForm`.
- New-form and template-picker back navigation returns to `logActivity`.

- [ ] Add or update render tests covering unified picker destinations where practical.
- [ ] Replace obsolete category/type screen states and rendering.
- [ ] Remove unused components and screen types.
- [ ] Run TypeScript and all tests.

### Task 5: Verification

**Files:** none unless fixes are required.

- [ ] Run `npm test`.
- [ ] Run `npx tsc --noEmit`.
- [ ] Run `npm run build`.
- [ ] Start the local app and visually verify Home, unified Log Activity, Strength routing, and a non-strength form.
- [ ] Check edited files for lint diagnostics.

### Task 6: Shared screen primitives

**Files:**
- Create: `src/components/ui/ScreenHeader.tsx`
- Create: `src/components/ui/ScreenHeader.test.tsx`
- Create: `src/styles/ui.ts`

**Interfaces:**
- `ScreenHeader({ title, subtitle?, onBack?, action? })`
- Export shared `cardStyle`, `inputStyle`, `labelStyle`, `primaryButtonStyle`, and `sectionTitleStyle`.

- [ ] Write a failing render test for title, subtitle, and accessible back action.
- [ ] Implement shared header and styles using `theme`.
- [ ] Run focused tests.

### Task 7: History and Progress

**Files:**
- Modify: `src/components/History.tsx`
- Modify: `src/components/History.test.tsx`
- Modify: `src/components/WeeklySummaryCard.tsx`
- Modify: `src/components/Progress.tsx`

- [ ] Update History tests for category badges and shared prototype card surfaces.
- [ ] Restyle History and WeeklySummaryCard.
- [ ] Restyle Progress cards, charts, fields, and check-in sheet without changing data behavior.
- [ ] Run History and full tests.

### Task 8: Forms, summary, and strength workflows

**Files:**
- Modify: `src/components/LightweightActivityForm.tsx`
- Modify: `src/components/Summary.tsx`
- Modify: `src/components/Picker.tsx`
- Modify: `src/components/ActiveSession.tsx`
- Modify: `src/components/SessionEdit.tsx`
- Modify: `src/components/WorkoutDayEditor.tsx`
- Modify: `src/components/ExercisePickerModal.tsx`

- [ ] Migrate headers, fields, cards, buttons, and modal surfaces to shared tokens.
- [ ] Preserve all callbacks, validation, set logging, exercise editing, and persistence behavior.
- [ ] Run component regressions, TypeScript, and the production build.

## Self-review

- The plan covers every approved visual and navigation requirement.
- Existing data and session paths are reused rather than replaced.
- Prototype-only activity types and set-logger behavior changes remain out of scope.

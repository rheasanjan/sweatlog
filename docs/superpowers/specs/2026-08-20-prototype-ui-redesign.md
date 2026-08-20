# Sweatlog Prototype UI Redesign

**Date:** 2026-08-20
**Status:** Approved
**Reference:** `/Users/rheasanjan/Downloads/sweatlog-prototype.html`

## Goal

Bring the shipped Sweatlog UI closer to the supplied prototype while preserving the Phase 2 activity catalog, persistence, editing, and strength-session behavior.

## Approved scope

- Restyle the entire app with the prototype visual language.
- Replace the two-step Category → Type flow with one unified **Log Activity** picker.
- Let Strength continue into the existing workout-template picker.
- Let non-strength tiles continue into the existing lightweight activity form.
- Give History, Progress, forms, Summary, strength templates, ActiveSession, session editing, workout editing, and exercise selection consistent prototype headers, cards, fields, buttons, and modal treatments.

## Visual system

- Page background: `#F2F4F8`
- Navy: `#0B1120`; navy soft: `#16203A`
- Brand: `#3D5CFF`; brand dark: `#2A44E0`
- Strength: `#6C4FFF`; soft: `#F1EEFF`
- Cardio: `#00A9A0`; soft: `#E4F7F5`
- Sport: `#FF8A3D`; soft: `#FFF1E5`
- Mobility: `#22B573`; soft: `#E7F8EF`
- Manrope for display headings and Inter for body text.
- Cards use white surfaces, `#E7EAF0` borders, and 16px corner radii.

## Home

- Use the prototype radial navy header, larger Sweatlog title, and translucent stat cards.
- Pull the gradient Log Activity CTA upward so it overlaps the header/body boundary.
- Render recent activities as badge cards with a category icon and soft category background.
- Use an icon edit affordance instead of a text-only “Edit” label.

## Remaining screens

- **History:** shared navy header, bordered week selector, badge activity cards, and a branded weekly summary.
- **Progress:** shared header, bordered metric/chart cards, branded chart colors, and a prototype-style check-in sheet.
- **Forms and editors:** shared header, grouped white field cards, consistent labels/inputs, and gradient primary actions.
- **Summary:** navy/strength completion hero, trophy-styled PR card, bordered exercise rows, and gradient home action.
- **Strength templates:** shared header treatment, soft strength accents, and prototype card surfaces while retaining template editing.
- **ActiveSession:** retain the dense set-logging layout while applying the visual tokens to header, exercise cards, fields, and actions.
- **Modals:** dark scrim, constrained centered/mobile sheet width, white bordered surface, and consistent close/primary controls.

## Unified Log Activity picker

- Header title: **Log Activity**, current date, back button, and search input.
- Quick-log row: Strength plus recently used non-strength activity types, deduplicated and capped.
- Category grids use the existing app catalog only:
  - Cardio: Run, Walk, Incline Walk, Cycling, Rowing, Zumba / Dance, Other
  - Strength: one Strength tile that opens the current template picker
  - Sport: Pickleball, Other Sport
  - Mobility: Mobility, Stretching, Yoga, Recovery, Other
- Search filters tile labels and hides empty category groups.
- Selecting Strength opens the current template picker.
- Selecting another tile opens the current lightweight activity form.
- Back from the template picker or a new lightweight form returns to unified Log Activity.

## Non-goals

- No new prototype-only activity types.
- No changes to Supabase storage.
- No behavioral redesign of the ActiveSession set logger.
- No new live timers or automatic tracking.

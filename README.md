# Sweatlog

A personal gym progress tracker built with React + Supabase. Pairs nicely with [sweetspot](https://github.com/) for glucose — sweatlog is the lifting side.

---

## Tech Stack

- **Frontend**: React + Vite
- **Database**: Supabase (Postgres)
- **Hosting**: Vercel (static)
- **Auth**: None for Phase 1 (multi-user ready for Phase 2)

---

## Setup (~10 minutes)

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Name it `sweatlog` and set a database password
3. Wait ~2 minutes for it to spin up

### 2. Run the schema

1. Supabase Dashboard → **SQL Editor** → **New Query**
2. Paste the full contents of `schema.sql`
3. Click **Run** — creates tables, indexes, views, seeds exercises, and enables RLS

### 3. Get your API keys

1. Supabase Dashboard → **Project Settings** → **API**
2. Copy **Project URL** and **anon / public key**

### 4. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 5. Install and run locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Deploy to Vercel

### Option A: GitHub (recommended)

1. Push this repo to GitHub as `sweatlog`
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import the repo
3. Vercel auto-detects Vite — no build config changes needed
4. Add environment variables in **Project Settings → Environment Variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy

### Option B: Vercel CLI

```bash
npm install -g vercel
vercel
```

Add the two env vars when prompted, or in the Vercel dashboard after the first deploy.

### Build settings (usually auto-detected)

| Setting | Value |
|---------|-------|
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

---

## Add to your phone (PWA)

Once deployed on Vercel:

- **iPhone**: Open in Safari → Share → Add to Home Screen
- **Android**: Open in Chrome → Menu → Add to Home Screen

---

## Phase 2: Multi-User

The schema is prepared for multi-user. When ready:

1. Enable Supabase Auth in the dashboard
2. Run the migration notes at the bottom of `schema.sql`
3. Add a login screen to the React app

---

## Project Structure

```
sweatlog/
├── schema.sql              ← Run this in Supabase first
├── .env.example
└── src/
    ├── lib/
    │   ├── supabase.js     ← Database calls
    │   └── program.js      ← Defaults (sets/reps) + helpers
    └── components/
        ├── Home.jsx
        ├── Picker.jsx          ← Pick or create workout days
        ├── WorkoutDayEditor.jsx ← Add/remove exercises on a day
        ├── ActiveSession.jsx
        ├── Summary.jsx
        └── Progress.jsx
```

### Data model

- **Muscle groups** — anatomical tags on exercises (shoulders, quads, glutes, calves, etc.)
- **Exercises** — deduplicated global pool, each tagged with muscle group(s)
- **Workout days** — your templates (Push, Pull, Legs by default; add Glutes, Upper, etc. yourself)
- **Sessions** — a logged workout for a specific day

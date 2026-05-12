# Gym Tracker

A mobile-first workout tracking app for PPL (Push / Pull / Legs) routines, built with Next.js and Supabase.

## Features

- **PPL Templates** — pre-built Push, Pull, and Legs day routines with 7-8 exercises each
- **Workout Logger** — log sets with weight & reps during your session; swipe to check off each set
- **Previous Session Reference** — see last session’s numbers inline while you train
- **Auto PR Tracking** — personal bests are detected and saved automatically when you beat your record
- **Workout History** — browse past sessions with duration, total sets, and volume stats
- **Exercise Library** — filter by muscle group, search by name, view all PRs at a glance
- **Clean dark UI** — mobile-first, large tap targets, no clutter

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Deployment | Vercel |
| Icons | Lucide React |

---

## Setup

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Open **SQL Editor** and run `supabase/schema.sql` to create all tables.
3. Then run `supabase/seed.sql` to populate the PPL templates and exercises.
4. Copy your **Project URL** and **anon public key** from **Project Settings → API**.

### 2. Configure environment variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deploy to Vercel

1. Push this repo to GitHub (already done).
2. Go to [vercel.com](https://vercel.com) → **New Project** → import `gym-tracker`.
3. Add your environment variables in the Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Click **Deploy**. Vercel auto-detects Next.js — no extra config needed.

---

## Database Schema

```
workout_templates   — Push Day / Pull Day / Legs Day
exercises           — exercise library (24 PPL exercises seeded)
template_exercises  — join table: which exercises belong to which template
workout_sessions    — each time you start a workout
workout_sets        — individual sets (weight, reps, completed flag)
personal_bests      — one row per exercise, upserted on new PR
```

## App Pages

| Route | Description |
|---|---|
| `/` | Dashboard: quick-start PPL, recent sessions, top PRs |
| `/workout/new` | Pick a template and start a session |
| `/workout/[id]` | Active workout logger with live timer and progress bar |
| `/history` | All past sessions with stats |
| `/history/[id]` | Detailed breakdown of a single session |
| `/exercises` | Full exercise list with muscle-group filter and PRs |

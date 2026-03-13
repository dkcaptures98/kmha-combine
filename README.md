# KMHA Combine Performance Tracker

A full-stack sports analytics dashboard for Kitchener Minor Hockey Association to track combine testing data across all teams, seasons, and years.

**Free to deploy** — runs entirely on Supabase (free tier) + Vercel (free tier). No credit card required.

---

## Features

- **Multi-team dashboard** with leaderboards, charts, and most-improved stats
- **Season-aware change tracking** (In-season: Sep–Mar · Off-season: May–Aug)
- **Coach data entry** — roster auto-loads, enter scores per athlete
- **CSV import** — upload your Base44 exports directly
- **Authentication** — Supabase Auth, coach login required
- **All 20 KMHA teams** pre-loaded with 356 athletes and existing combine data

---

## Tech Stack

| Layer | Service | Cost |
|---|---|---|
| Frontend | Next.js 14 (App Router) | Free |
| Database | Supabase PostgreSQL | Free (500MB) |
| Auth | Supabase Auth | Free |
| Hosting | Vercel | Free |
| Repo | GitHub | Free |

---

## Setup Instructions

### Step 1 — Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **Start your project**
2. Sign in with GitHub
3. Click **New project**
   - Name: `kmha-combine`
   - Database password: save this somewhere safe
   - Region: pick closest (e.g. US East)
4. Wait ~2 minutes for the project to spin up

### Step 2 — Run the database schema

1. In your Supabase dashboard, click **SQL Editor** in the left sidebar
2. Click **New query**
3. Copy the contents of `supabase/migrations/001_schema.sql` and paste it in
4. Click **Run** — you should see "Success"

### Step 3 — Import your athlete and combine data

1. In SQL Editor, click **New query** again
2. Copy the contents of `supabase/migrations/002_seed.sql` and paste it in
3. Click **Run** — this imports all 356 athletes and 4,277 combine entries

> **Note:** The seed file is large (~550KB). If the SQL Editor times out, use the Supabase CLI or split the inserts. Alternatively, use the **Import CSV** page in the app after deploying.

### Step 4 — Get your Supabase API keys

1. In Supabase dashboard, go to **Settings → API**
2. Copy:
   - **Project URL** (looks like `https://xxxxxxxxxxxx.supabase.co`)
   - **anon / public key** (long JWT string)

### Step 5 — Create a coach login

1. In Supabase dashboard, go to **Authentication → Users**
2. Click **Add user → Create new user**
3. Enter email and password for your coaches
4. Repeat for each coach who needs access

### Step 6 — Deploy to Vercel

1. Push this repo to GitHub (see below)
2. Go to [vercel.com](https://vercel.com) → **Add New Project**
3. Import your GitHub repo
4. Under **Environment Variables**, add:
   ```
   NEXT_PUBLIC_SUPABASE_URL = your_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY = your_anon_key
   ```
5. Click **Deploy** — done in ~60 seconds

---

## Push to GitHub

```bash
# In the kmha-combine folder:
git init
git add .
git commit -m "Initial commit — KMHA Combine Tracker"

# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/kmha-combine.git
git branch -M main
git push -u origin main
```

---

## Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Create your env file
cp .env.local.example .env.local
# Edit .env.local and add your Supabase URL and anon key

# 3. Start dev server
npm run dev

# Open http://localhost:3000
```

---

## Project Structure

```
src/
├── app/
│   ├── auth/login/       # Login page
│   ├── dashboard/        # Main analytics dashboard
│   ├── entry/            # Coach data entry
│   ├── athletes/         # Athlete roster management
│   ├── import/           # CSV import tool
│   └── api/              # API routes (athletes, entries, import)
├── components/
│   ├── Navbar.tsx
│   ├── dashboard/        # Leaderboard, ChangeStats, Filters
│   ├── charts/           # Recharts bar charts
│   └── ui/               # StatCard and shared components
├── lib/
│   ├── supabase/         # Client + server Supabase helpers
│   ├── analytics.ts      # Leaderboard + change calculation logic
│   ├── uuid.ts           # ID generation
│   └── seed-data.json    # Parsed athlete + entry data
├── types/
│   └── index.ts          # All TypeScript types + season constants
└── middleware.ts          # Auth protection for all routes
supabase/
├── migrations/
│   ├── 001_schema.sql    # Full DB schema + RLS policies
│   └── 002_seed.sql      # All 356 athletes + 4,277 entries
```

---

## Test Types

| Test | Unit | Higher is better? |
|---|---|---|
| Sprint (10m) | seconds | No (lower = faster) |
| Vertical Jump | cm | Yes |
| Chin-ups | reps | Yes |
| Chin Hold | seconds | Yes |
| Broad Jump | ft.in (e.g. 5.11) | Yes |

---

## Season Logic

| Season | Months | Change Calculation |
|---|---|---|
| In-Season | September → March | Compare September score vs latest |
| Off-Season | May → August | Compare May score vs latest |

The 2025–2026 in-season runs September 2025 through March 2026.

---

## Adding New Teams or Tests

**New team:** Add to `TEAMS` array in `src/types/index.ts`, and run:
```sql
INSERT INTO teams (name) VALUES ('U19AAA');
```

**New test type:** Add to `TEST_TYPES`, `TEST_LABELS`, `TEST_UNITS`, and `TEST_LOWER_IS_BETTER` in `src/types/index.ts`, then update the `check` constraint in `001_schema.sql`.

---

## Support

Built for KMHA. Questions? Open a GitHub issue.

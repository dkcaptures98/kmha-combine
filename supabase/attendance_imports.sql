-- Run once in Supabase SQL Editor before using TeamBuildr Attendance Import.
create table if not exists public.attendance_imports (
  id uuid primary key default gen_random_uuid(),
  athlete_id text not null,
  team text not null,
  season text not null,
  first_session date,
  last_session date,
  raw_attended integer not null default 0,
  total_sessions integer not null default 0,
  bonus_sessions integer not null default 0,
  adjusted_attended integer not null default 0,
  adjusted_percentage numeric(5,2) not null default 0,
  session_data jsonb not null default '{}'::jsonb,
  source_filename text,
  updated_at timestamptz not null default now(),
  unique (athlete_id, season)
);

create index if not exists attendance_imports_team_season_idx
  on public.attendance_imports(team, season);

alter table public.attendance_imports enable row level security;

-- Match the app's existing authenticated-user access model.
drop policy if exists "authenticated attendance imports" on public.attendance_imports;
create policy "authenticated attendance imports"
  on public.attendance_imports
  for all
  to authenticated
  using (true)
  with check (true);

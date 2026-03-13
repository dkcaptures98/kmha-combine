-- KMHA Combine Tracking System
-- Run this in Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Teams table
create table if not exists teams (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  created_at timestamptz default now()
);

-- Insert all KMHA teams
insert into teams (name) values
  ('U10AA'), ('U10AAA'),
  ('U11AA'), ('U11AAA'),
  ('U12AA'), ('U12AAA'),
  ('U13AA'), ('U13AAA'), ('U13AALR'),
  ('U14AA'), ('U14AAA'),
  ('U15AA'), ('U15AAA'), ('U15AALR'), ('U15ALR'),
  ('U16AA'), ('U16AAA'),
  ('U18AA'), ('U18AAA'), ('U18ALR')
on conflict (name) do nothing;

-- Athletes table
create table if not exists athletes (
  id text primary key,
  first_name text not null,
  last_name text not null,
  team text not null references teams(name),
  active boolean default true,
  created_at timestamptz default now()
);

-- Combine test entries
create table if not exists combine_entries (
  id text primary key,
  athlete_id text not null references athletes(id),
  athlete_name text not null,
  team text not null,
  score numeric not null,
  month text not null,
  year integer not null,
  test_type text not null check (test_type in ('Sprint', 'Vertical', 'Chinups', 'ChinHold', 'BroadJump')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes for performance
create index if not exists idx_entries_team on combine_entries(team);
create index if not exists idx_entries_athlete on combine_entries(athlete_id);
create index if not exists idx_entries_year_month on combine_entries(year, month);
create index if not exists idx_entries_test_type on combine_entries(test_type);

-- Row Level Security
alter table athletes enable row level security;
alter table combine_entries enable row level security;
alter table teams enable row level security;

-- Allow all authenticated users to read everything
create policy "Authenticated users can read athletes" on athletes
  for select using (auth.role() = 'authenticated');

create policy "Authenticated users can read entries" on combine_entries
  for select using (auth.role() = 'authenticated');

create policy "Authenticated users can read teams" on teams
  for select using (auth.role() = 'authenticated');

-- Allow authenticated users to insert/update entries
create policy "Authenticated users can insert entries" on combine_entries
  for insert with check (auth.role() = 'authenticated');

create policy "Authenticated users can update entries" on combine_entries
  for update using (auth.role() = 'authenticated');

create policy "Authenticated users can delete entries" on combine_entries
  for delete using (auth.role() = 'authenticated');

-- Allow authenticated users to manage athletes
create policy "Authenticated users can insert athletes" on athletes
  for insert with check (auth.role() = 'authenticated');

create policy "Authenticated users can update athletes" on athletes
  for update using (auth.role() = 'authenticated');

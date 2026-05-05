-- FORGE Supabase starter schema
-- Run this in Supabase SQL Editor after the project is ready.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Champion',
  weight_kg numeric,
  step_goal integer not null default 10000,
  kcal_goal integer not null default 2500,
  water_goal integer not null default 3000,
  protein_min numeric not null default 1.8,
  protein_max numeric not null default 2.0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workout_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_date date not null,
  plan_type text,
  plan_label text,
  readiness numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, workout_date)
);

create table if not exists public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_day_id uuid not null references public.workout_days(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id text not null,
  exercise_name text not null,
  set_index integer not null,
  weight numeric,
  reps integer,
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workout_day_id, exercise_id, set_index)
);

alter table public.profiles enable row level security;
alter table public.workout_days enable row level security;
alter table public.workout_sets enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can read own workout days"
  on public.workout_days for select
  using (auth.uid() = user_id);

create policy "Users can insert own workout days"
  on public.workout_days for insert
  with check (auth.uid() = user_id);

create policy "Users can update own workout days"
  on public.workout_days for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own workout days"
  on public.workout_days for delete
  using (auth.uid() = user_id);

create policy "Users can read own workout sets"
  on public.workout_sets for select
  using (auth.uid() = user_id);

create policy "Users can insert own workout sets"
  on public.workout_sets for insert
  with check (auth.uid() = user_id);

create policy "Users can update own workout sets"
  on public.workout_sets for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own workout sets"
  on public.workout_sets for delete
  using (auth.uid() = user_id);

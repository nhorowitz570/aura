-- Aura V2 — single source of truth schema.
-- RLS on every user-owned table. Idempotent enough to re-run on fresh dbs.

create extension if not exists "pgcrypto";

-- ============================================================
-- Enums
-- ============================================================
do $$ begin
  create type units_kind as enum ('imperial','metric');
exception when duplicate_object then null; end $$;
do $$ begin
  create type accent_kind as enum ('neutral','blue','violet','emerald','rose');
exception when duplicate_object then null; end $$;
do $$ begin
  create type theme_kind as enum ('light','dark','system');
exception when duplicate_object then null; end $$;
do $$ begin
  create type sex_kind as enum ('male','female','other','prefer_not_to_say');
exception when duplicate_object then null; end $$;
do $$ begin
  create type meal_source_kind as enum ('manual','scan');
exception when duplicate_object then null; end $$;
do $$ begin
  create type log_source_kind as enum ('manual','apple_health','google_fit','fitbit','whoop','garmin','oura');
exception when duplicate_object then null; end $$;
do $$ begin
  create type exercise_kind as enum ('strength','cardio');
exception when duplicate_object then null; end $$;
do $$ begin
  create type program_schedule_kind as enum ('weekly','rotating');
exception when duplicate_object then null; end $$;
do $$ begin
  create type ai_role_kind as enum ('user','assistant','tool');
exception when duplicate_object then null; end $$;
do $$ begin
  create type streak_kind as enum ('log','workout','water');
exception when duplicate_object then null; end $$;

-- ============================================================
-- profiles
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  dob date,
  sex sex_kind,
  height_cm numeric(6,2),
  weight_kg numeric(6,2),
  units units_kind not null default 'imperial',
  accent accent_kind not null default 'neutral',
  theme theme_kind not null default 'system',
  manual_mode_sleep boolean not null default false,
  manual_mode_vitals boolean not null default false,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create a profile row when an auth user appears.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- goals
-- ============================================================
create table if not exists public.goals (
  user_id uuid primary key references auth.users(id) on delete cascade,
  calories integer not null default 2200,
  protein_g integer not null default 150,
  water_ml integer not null default 2500,
  sleep_min integer not null default 480,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- daily_logs (flags only)
-- ============================================================
create table if not exists public.daily_logs (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  has_workout boolean not null default false,
  has_meal_log boolean not null default false,
  has_water_log boolean not null default false,
  has_sleep_log boolean not null default false,
  primary key (user_id, date)
);

-- ============================================================
-- meals
-- ============================================================
create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  at timestamptz not null default now(),
  name text not null,
  calories integer not null default 0,
  protein_g numeric(6,2) not null default 0,
  carbs_g   numeric(6,2) not null default 0,
  fat_g     numeric(6,2) not null default 0,
  source meal_source_kind not null default 'manual',
  image_path text,
  created_at timestamptz not null default now()
);
create index if not exists meals_user_at_idx on public.meals (user_id, at desc);

-- ============================================================
-- water_logs (each + or - tap)
-- ============================================================
create table if not exists public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  at timestamptz not null default now(),
  delta_ml integer not null
);
create index if not exists water_user_at_idx on public.water_logs (user_id, at desc);

-- ============================================================
-- sleep_logs
-- ============================================================
create table if not exists public.sleep_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  start_at timestamptz not null,
  end_at   timestamptz not null,
  quality smallint check (quality is null or (quality between 1 and 5)),
  source log_source_kind not null default 'manual',
  created_at timestamptz not null default now()
);
create index if not exists sleep_user_start_idx on public.sleep_logs (user_id, start_at desc);

-- ============================================================
-- vitals_logs
-- ============================================================
create table if not exists public.vitals_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  at timestamptz not null default now(),
  resting_hr integer,
  hrv_ms integer,
  bp_sys integer,
  bp_dia integer,
  source log_source_kind not null default 'manual',
  created_at timestamptz not null default now()
);
create index if not exists vitals_user_at_idx on public.vitals_logs (user_id, at desc);

-- ============================================================
-- body_metrics (daily)
-- ============================================================
create table if not exists public.body_metrics (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  weight_kg numeric(6,2),
  body_fat_pct numeric(5,2),
  created_at timestamptz not null default now(),
  primary key (user_id, date)
);

-- ============================================================
-- exercises (catalog + user-added)
-- ============================================================
create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  name text not null,
  type exercise_kind not null default 'strength',
  muscle_group text,
  equipment text,
  created_at timestamptz not null default now()
);
create index if not exists exercises_owner_idx on public.exercises (owner_id);
create unique index if not exists exercises_seed_name_idx on public.exercises (name) where owner_id is null;

-- ============================================================
-- workout_programs / days / day_exercises
-- ============================================================
create table if not exists public.workout_programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  schedule_kind program_schedule_kind not null default 'weekly',
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.workout_days (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.workout_programs(id) on delete cascade,
  position integer not null,
  label text not null,
  weekday smallint check (weekday is null or (weekday between 0 and 6))
);
create index if not exists workout_days_program_idx on public.workout_days (program_id, position);

create table if not exists public.workout_day_exercises (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.workout_days(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  position integer not null,
  target_sets integer,
  target_reps integer,
  target_weight_kg numeric(6,2),
  target_duration_s integer
);
create index if not exists wde_day_idx on public.workout_day_exercises (day_id, position);

-- ============================================================
-- workout_sessions / sets
-- ============================================================
create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  program_id uuid references public.workout_programs(id) on delete set null,
  day_id uuid references public.workout_days(id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists sessions_user_started_idx on public.workout_sessions (user_id, started_at desc);

create table if not exists public.workout_session_sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  set_index integer not null,
  reps integer,
  weight_kg numeric(6,2),
  duration_s integer,
  created_at timestamptz not null default now()
);
create index if not exists wss_session_idx on public.workout_session_sets (session_id, set_index);

-- ============================================================
-- AI: threads, messages, memories
-- ============================================================
create table if not exists public.ai_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);
create index if not exists ai_threads_user_recent_idx on public.ai_threads (user_id, last_message_at desc);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.ai_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role ai_role_kind not null,
  content text not null default '',
  tool_calls jsonb,
  created_at timestamptz not null default now()
);
create index if not exists ai_messages_thread_idx on public.ai_messages (thread_id, created_at);

create table if not exists public.ai_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists ai_memories_user_recent_idx on public.ai_memories (user_id, created_at desc);

-- ============================================================
-- food_scans
-- ============================================================
create table if not exists public.food_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  image_path text not null,
  parsed jsonb,
  meal_id uuid references public.meals(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists food_scans_user_recent_idx on public.food_scans (user_id, created_at desc);

-- ============================================================
-- streaks (cached)
-- ============================================================
create table if not exists public.streaks (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind streak_kind not null,
  current integer not null default 0,
  best integer not null default 0,
  last_day date,
  primary key (user_id, kind)
);

-- ============================================================
-- Storage bucket for food scans
-- ============================================================
insert into storage.buckets (id, name, public)
values ('food-scans','food-scans', false)
on conflict (id) do nothing;

-- ============================================================
-- RLS
-- ============================================================
alter table public.profiles            enable row level security;
alter table public.goals               enable row level security;
alter table public.daily_logs          enable row level security;
alter table public.meals               enable row level security;
alter table public.water_logs          enable row level security;
alter table public.sleep_logs          enable row level security;
alter table public.vitals_logs         enable row level security;
alter table public.body_metrics        enable row level security;
alter table public.exercises           enable row level security;
alter table public.workout_programs    enable row level security;
alter table public.workout_days        enable row level security;
alter table public.workout_day_exercises enable row level security;
alter table public.workout_sessions    enable row level security;
alter table public.workout_session_sets enable row level security;
alter table public.ai_threads          enable row level security;
alter table public.ai_messages         enable row level security;
alter table public.ai_memories         enable row level security;
alter table public.food_scans          enable row level security;
alter table public.streaks             enable row level security;

-- Helper policies: a user only ever sees / writes their own rows.
do $$
declare
  t text;
  tables text[] := array[
    'profiles','goals','daily_logs','meals','water_logs','sleep_logs',
    'vitals_logs','body_metrics','workout_programs',
    'workout_sessions','ai_threads','ai_messages','ai_memories',
    'food_scans','streaks'
  ];
  col text;
begin
  foreach t in array tables loop
    col := case when t = 'profiles' then 'id' else 'user_id' end;
    execute format('drop policy if exists %I_select on public.%I', t, t);
    execute format('drop policy if exists %I_modify on public.%I', t, t);
    execute format(
      'create policy %I_select on public.%I for select using (auth.uid() = %I)',
      t, t, col
    );
    execute format(
      'create policy %I_modify on public.%I for all using (auth.uid() = %I) with check (auth.uid() = %I)',
      t, t, col, col
    );
  end loop;
end $$;

-- exercises: seed rows (owner_id is null) are world-readable; user-owned rows scoped to the user.
drop policy if exists exercises_select on public.exercises;
drop policy if exists exercises_modify on public.exercises;
create policy exercises_select on public.exercises
  for select using (owner_id is null or auth.uid() = owner_id);
create policy exercises_modify on public.exercises
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- workout_days inherit access from program ownership.
drop policy if exists workout_days_select on public.workout_days;
drop policy if exists workout_days_modify on public.workout_days;
create policy workout_days_select on public.workout_days
  for select using (
    exists (select 1 from public.workout_programs p where p.id = program_id and p.user_id = auth.uid())
  );
create policy workout_days_modify on public.workout_days
  for all using (
    exists (select 1 from public.workout_programs p where p.id = program_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.workout_programs p where p.id = program_id and p.user_id = auth.uid())
  );

drop policy if exists wde_select on public.workout_day_exercises;
drop policy if exists wde_modify on public.workout_day_exercises;
create policy wde_select on public.workout_day_exercises
  for select using (
    exists (
      select 1 from public.workout_days d
      join public.workout_programs p on p.id = d.program_id
      where d.id = day_id and p.user_id = auth.uid()
    )
  );
create policy wde_modify on public.workout_day_exercises
  for all using (
    exists (
      select 1 from public.workout_days d
      join public.workout_programs p on p.id = d.program_id
      where d.id = day_id and p.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.workout_days d
      join public.workout_programs p on p.id = d.program_id
      where d.id = day_id and p.user_id = auth.uid()
    )
  );

drop policy if exists wss_select on public.workout_session_sets;
drop policy if exists wss_modify on public.workout_session_sets;
create policy wss_select on public.workout_session_sets
  for select using (
    exists (select 1 from public.workout_sessions s where s.id = session_id and s.user_id = auth.uid())
  );
create policy wss_modify on public.workout_session_sets
  for all using (
    exists (select 1 from public.workout_sessions s where s.id = session_id and s.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.workout_sessions s where s.id = session_id and s.user_id = auth.uid())
  );

-- Storage RLS: only the owner can read/write their own folder in food-scans.
-- Path convention: <user_id>/<random>.jpg
drop policy if exists "food_scans_read_own" on storage.objects;
drop policy if exists "food_scans_write_own" on storage.objects;
create policy "food_scans_read_own" on storage.objects
  for select using (
    bucket_id = 'food-scans' and auth.uid()::text = (storage.foldername(name))[1]
  );
create policy "food_scans_write_own" on storage.objects
  for all using (
    bucket_id = 'food-scans' and auth.uid()::text = (storage.foldername(name))[1]
  ) with check (
    bucket_id = 'food-scans' and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- Touch helpers
-- ============================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists goals_touch on public.goals;
create trigger goals_touch before update on public.goals
  for each row execute function public.touch_updated_at();

-- Aura v3 schema additions.
-- Run this once against your Supabase project (SQL Editor) before deploying v3.

-- ----- AI preferences + onboarding additions on profiles -----
alter table public.profiles
  add column if not exists ai_personality      text not null default 'default',
  add column if not exists ai_response_length  text not null default 'auto',
  add column if not exists ai_proactive        boolean not null default true,
  add column if not exists ai_show_sources     boolean not null default false,
  add column if not exists activity_level      text,
  add column if not exists experience_level    text,
  add column if not exists dietary             text[] not null default '{}',
  add column if not exists primary_goal        text,
  add column if not exists target_date         date,
  add column if not exists enabled_features    text[] not null default '{workouts,nutrition,hydration,sleep,vitals}';

-- Sanity check value sets (kept loose to avoid future migrations).
alter table public.profiles drop constraint if exists profiles_ai_personality_chk;
alter table public.profiles add constraint profiles_ai_personality_chk
  check (ai_personality in ('default','coach','friendly','clinical'));

alter table public.profiles drop constraint if exists profiles_ai_response_length_chk;
alter table public.profiles add constraint profiles_ai_response_length_chk
  check (ai_response_length in ('auto','concise','standard','detailed'));

-- ----- Conversation branching support -----
alter table public.ai_messages
  add column if not exists parent_id  uuid references public.ai_messages(id) on delete set null,
  add column if not exists edited_at  timestamptz,
  add column if not exists branch_of  uuid references public.ai_messages(id) on delete set null;

create index if not exists ai_messages_thread_parent_idx
  on public.ai_messages(thread_id, parent_id);

-- ----- AI memory updated_at (allow client-side edits) -----
alter table public.ai_memories
  add column if not exists updated_at timestamptz not null default now();

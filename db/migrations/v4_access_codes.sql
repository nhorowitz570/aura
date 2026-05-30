-- Aura v4: access-code gated signups.
-- Run this once against your Supabase project (SQL Editor) before deploying v4.
-- Idempotent — safe to re-run.

-- ----- Access codes -----
create table if not exists public.access_codes (
  code        text primary key,              -- stored uppercase, ≥128-bit random → base32
  max_uses    int not null default 1,
  use_count   int not null default 0,
  expires_at  timestamptz,
  created_at  timestamptz not null default now()
);

-- Per-use log. Separate from access_codes so multi-use codes can track each consumer.
create table if not exists public.access_code_uses (
  id          uuid primary key default gen_random_uuid(),
  code        text not null references public.access_codes(code) on delete cascade,
  user_id     uuid references auth.users(id) on delete set null,
  used_at     timestamptz not null default now()
);

create index if not exists access_code_uses_code_idx
  on public.access_code_uses(code);

-- RLS: admin-only (service role). Anon/auth clients never read or write these.
alter table public.access_codes enable row level security;
alter table public.access_code_uses enable row level security;
-- No policies — only service-role (bypasses RLS) touches these.

-- ----- Atomic RPCs (SECURITY DEFINER, run as table owner) -----

-- Reserve one use of a code. Returns the number of rows updated (0 or 1).
-- Single conditional UPDATE — concurrent callers race safely.
create or replace function public.reserve_access_code(p_code text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated int;
begin
  update public.access_codes
     set use_count = use_count + 1
   where code = p_code
     and use_count < max_uses
     and (expires_at is null or expires_at > now());

  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;

-- Release a previously reserved use (call on signUp failure).
create or replace function public.release_access_code(p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.access_codes
     set use_count = greatest(use_count - 1, 0)
   where code = p_code;
end;
$$;

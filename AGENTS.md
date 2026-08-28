<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

Please leave notes for other agents about the codebase if needed.

## Agent Notes

- **UI system: Shadcn (new-york style) on Tailwind v4.** Stock neutral palette, soft rounded corners, light + dark mode via `next-themes`. Primitives live in `components/ui/`; feature widgets in `components/features/`; navigation in `components/nav/`. Do not reintroduce neo-brutalism, glassmorphism, particle backgrounds, GSAP/framer animations, or heavy charts — the previous direction was scrapped in favor of sparse, calm, Shadcn-defaults UX.
- **Density**: mobile-first and sparse. One hero metric per page, supporting cards in a 2-column grid on `sm+`. Avoid more than ~5 elements above the fold.
- **Navigation**: desktop = left `Sidebar` (`components/nav/sidebar.tsx`); mobile = `BottomTabs` (`components/nav/bottom-tabs.tsx`) with 4 primary tabs + a "More" sheet. Nav config is centralized in `lib/nav.ts` — edit there, not in the components.
- **Auth & layout**: route groups `(auth)` and `(dashboard)` each enforce auth in their `layout.tsx`. Dashboard pages can assume `user` exists.
- **Forms**: Sheets from `components/ui/sheet.tsx` (side="bottom") for create flows; call server actions inside `useTransition` and `router.refresh()` on success. Toasts via `sonner`. **v3 note:** `side="bottom"` now renders as a centered modal at all breakpoints (height capped at 85vh, no focus-trap on open). True slide-out drawers still work via `side="left"` / `side="right"`. For brand-new code prefer `components/ui/modal.tsx`.
- **Server Actions are reachable directly.** Keep auth checks inside each action; do not rely only on the UI path.
- **Schema gotchas**: `daily_logs` columns are `has_workout`, `has_meal_log`, `has_water_log`, `has_sleep_log` — do not invent names like `has_hydration` or `has_nutrition`.
- **Dropped features**: the `/body` route and `components/body/` (progress photos, comparison slider) were removed. `server/actions/body.ts` is gone; the underlying tables remain but are unused.
- **Data-source gating**: features that need a wearable (`/sleep`, `/vitals`) are gated behind a connected data source. Connection state is cookie-backed in `server/actions/dataSources.ts` (no DB migration). Catalog + helpers in `lib/data-sources.ts`. Use `hasSourceFor(feature, connected)` to gate; render `<ConnectSourcePrompt feature="..." />` when ungated. Connections are stubbed — connecting just flips a flag. Real OAuth/sync lands later. To gate a new page, follow the pattern in `app/(dashboard)/sleep/page.tsx`.
- **Legacy deps still in `package.json`** (`gsap`, `@gsap/react`, `framer-motion`, `motion`, `@nivo/*`) are not used anywhere — safe to remove if you touch deps. *(`motion` is now used in v3 for page transitions, nav pill, chat anims — don't remove that one.)*

## v3 additions

- **AI preferences** live on `profiles` (`ai_personality`, `ai_response_length`, `ai_proactive`, `ai_show_sources`). Edit in Settings → AI preferences. Read in `lib/ai/prompts/assistant.system.ts` and `lib/ai/preferences.ts`.
- **Feature toggles**: `profiles.enabled_features text[]`. `Home`, `Goals`, `Assistant`, `Settings` are always on (see `lib/features.ts` `CORE_HREFS`). Sidebar + BottomTabs filter via `isHrefEnabled`.
- **Onboarding fields**: `activity_level`, `experience_level`, `dietary`, `primary_goal`, `target_date` — all on `profiles`. The wizard has 9 steps (Welcome → Review).
- **Assistant rebuild** (`app/(dashboard)/assistant/assistant-client.tsx`): always starts with a fresh new chat. Threads created on first message via `POST /api/ai/chat`. Mobile uses a left `Sheet` drawer; long-press a thread opens a centered actions modal (Rename / Delete). User messages have inline edit → creates a client-side branch with `< n/m >` switcher (no DB schema for branches yet; held in component state).
- **AI memory modal**: `components/ai/memory-modal.tsx` is the single source of truth for view/add/edit/delete. The settings card just opens it.
- **Geist font** loaded via `next/font/google` in `app/layout.tsx`; `--font-geist` → `--font-sans`.
- **Migration**: `db/migrations/v3_ai_prefs_features.sql` adds all v3 columns; idempotent.

## v4 additions

- **Access codes**: signup is gated by an access code. Tables: `access_codes` (code PK, max_uses, use_count, expires_at) and `access_code_uses` (per-use log with user_id). All code operations go through `createAdminClient()` (service role) — the anon client cannot read these tables (RLS enabled, no policies). Atomic reservation uses `reserve_access_code` / `release_access_code` SECURITY DEFINER RPCs defined in the migration. Code generation utility in `lib/access-codes.ts` (128-bit random, base32, XXXX-XXXX-XXXX-XXXX format). The `signUp` action in `server/actions/auth.ts` reserves the code before creating the auth user and releases it on failure. Codes are consumed on submit (reserve-on-submit model), not on email confirmation.
- **Migration**: `db/migrations/v4_access_codes.sql` adds tables + RPCs; idempotent.

## Local / Cloud Agent dev environment

- **Config**: `.cursor/environment.json` wires `scripts/cloud-agent-install.sh` (npm deps + Docker/fuse-overlayfs/Supabase CLI) and `scripts/cloud-agent-start.sh` (brings up the local Supabase stack, applies `db/migrations/v3` + `v4`, seeds exercises, writes `.env.local`), then runs `npm run dev` in a terminal. Both scripts are idempotent.
- **Local Supabase** runs via `supabase start` (config in `supabase/config.toml`). Docker must use the `fuse-overlayfs` storage driver (overlay2 chokes on whiteout files in the nested VM; vfs is too slow for Postgres), and `bridge-nf-call-iptables` must be `0` so containers can reach Postgres — the start script handles both.
- **Migrations order**: `supabase/migrations/0001_initial.sql` runs automatically on `supabase start`; the `db/migrations/v3_*.sql` and `v4_*.sql` files are applied separately by the start script (they are not in the supabase migrations dir).
- **Exercise seed**: `npm run seed:exercises` currently fails because `exercises` only has a *partial* unique index on `name` (`where owner_id is null`), which PostgREST can't use as an `on_conflict` target. The start script seeds via generated SQL with `on conflict do nothing` instead.
- **Env keys**: local Supabase keys are deterministic defaults; `.env.local` is generated from `supabase status -o env`. Set `OPENROUTER_API_KEY` (Cloud Agent secret) to enable the AI assistant — the rest of the app works without it.
- **Access code for local signup**: insert one, e.g. `insert into access_codes (code, max_uses) values ('TEST-TEST-TEST-TEST', 100);`.

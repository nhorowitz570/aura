# Aura — quiet, focused health tracker

A Next.js 16 / React 19 / Tailwind v4 health-tracking app with a built-in AI assistant.

## Stack

- **Next.js 16** (App Router, Server Actions)
- **React 19**
- **Tailwind v4 + shadcn/ui (new-york)**
- **Supabase** (auth + postgres + storage)
- **OpenRouter** (LLM access — defaults to a Gemini-class model)
- **motion** for animations

## Local development

```bash
npm install
cp .env.example .env.local      # fill in real values
npm run dev
```

Open http://localhost:3000.

### Required env vars

| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable anon key |
| `NEXT_PUBLIC_SITE_URL` | Your deployed origin (used by OAuth callbacks) |
| `OPENROUTER_API_KEY` | OpenRouter key for the assistant |

## Database migrations

Run these in order against your Supabase project (SQL Editor):

1. Whatever you already had wired up for the V2 schema (`profiles`, `goals`, `ai_threads`, `ai_messages`, `ai_memories`, etc).
2. `db/migrations/v3_ai_prefs_features.sql` — adds AI preferences, feature toggles, branching support, and onboarding fields. Idempotent.

After running step 2 every profile gets sensible defaults; no per-user backfill is required.

## Deploying to Vercel

1. Push to GitHub.
2. Import the repo into Vercel — Next.js auto-detect handles the build (`next build`).
3. Add the env vars from the table above in Project Settings → Environment Variables.
4. Set `NEXT_PUBLIC_SITE_URL` to your Vercel URL.
5. In Supabase → Authentication → URL Configuration, add the Vercel URL to **Site URL** and **Redirect URLs**.
6. Run `db/migrations/v3_ai_prefs_features.sql` in the Supabase SQL editor before the first deploy.

No `vercel.json` is required — Next.js defaults work.

## Project conventions

See `AGENTS.md` for the architecture rules (UI density, navigation, modal vs sheet, route-group auth, feature gating).

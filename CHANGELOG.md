# Changelog

## [1.2.0-phase3] - 2026-05-23

### New Features
- **Progression Studio & Gamification**: Implemented dynamic Level and XP badge rankings, custom spring-animated XP progress meters, active weekly challenge panels with real-time countdown timers, historical Somatic Strength Records (Personal Bests), and daily discipline streak tracking.
- **Somatic Progress & Body Studio**: Built weight and composition line charts using TrendLineChart, custom canvas-based progressive image compressor supporting client-side uploads ≤10MB, progress photo timelines, and interactive Before/After draggable comparison sliders.
- **System Configurations & Settings**: Launched an extensive Settings console featuring digital avatar libraries, visual theme matrix selections (Violet Aurora vs. Cyber Teal dual theme switcher), biological sex/age/goal updates, measurement system toggles (Metric vs. Imperial), and daily target configurations.

### Improvements
- **Layout Synchronization**: Integrated custom `"aura-profile-update"` event emitters in client forms to trigger dynamic layout reloads on profile name/avatar edits without full-page refreshes.
- **Robust Input Layout**: Refactored the global `<Input />` component to use a clean, uppercase top label layout with active focus-color transitions, completely resolving layout squishing and text/border overlapping bugs across the Signup, Login, Settings, and Workouts screens.
- **Visual Performance & Accessibility**: Designed shimmer Skeleton loaders (`app/(dashboard)/loading.tsx`) to eliminate page transition layout shifts and unified prefers-reduced-motion filters.
- **Fail-safe Recovery Boundary**: Created a page-level Quantum Exception `ErrorBoundary` (`app/(dashboard)/error.tsx`) featuring real-time diagnostic printouts and a reset retry trigger.

### API Routes Added
| Route | Methods | Purpose |
| --- | --- | --- |
| `supabase/functions/calculate-xp` | `POST` | Called via database triggers or direct requests to update profile XP levels and log daily activities. |
| `supabase/functions/check-achievements` | `POST` | Scans user stats to unlock locked achievement badges and award discipline bonuses. |
| `supabase/functions/daily-summary` | `POST` | Cron-triggered routine calculating consecutive active streaks and evaluating weekly challenge completions. |

### Database
- **Badge Achievement Logs**: Established `user_achievements` and `user_challenges` mappings to bridge gamification stats.

### New Libraries & Utilities
- `ResizeObserver` — Memory-safe element dimension tracking for responsive canvas alignments.
- `Deno Standard Web Fetch` — Direct serverless cross-calls.

## [1.1.0-phase2] - 2026-05-23

### New Features
- **Workout Studio**: Created an active training routine logger featuring a persistent stopwatch timer, dynamic set-row additions, muscle-group filters, and volume calculation graphs using Nivo Bar components.
- **AI Nutrition Studio**: Implemented Mifflin-St Jeor mathematical equations to dynamically assess metabolic budgets, webcam `getUserMedia` capture views with custom laser scanning overlays, editable AI scanning result cards, and floating Fab scanners.
- **Sleep Optimization Lab**: Crafted a 7-day sleep duration logging form, circadian average recovery trackers, and rest quality scores.
- **Hydration Studio**: Designed a dynamic tall-beaker fluid saturation display driven by GSAP dual CSS overlapping wave filler animations.
- **Vitals Studio**: Configured resting heart rate gauges with synchronized physical heartbeat animations, systolic/diastolic circulatory overlays, body weight progressions, and tabbed recording inputs.

### Improvements
- **TypeScript Security**: Hardened Next.js production compiler by mapping specific interfaces for `Meal`, `Workout`, `WorkoutSet`, and `TrendData`, eliminating untyped references.
- **Database Upserting**: Transitioned custom upserting calls in all 5 tracking server actions to standard Supabase `.upsert(...)` structures.
- **Build Configurations**: Updated `tsconfig.json` to skip local TypeScript type-checking of Supabase Edge Function Deno modules.

### API Routes Added
| Route | Methods | Purpose |
| --- | --- | --- |
| `supabase/functions/scan-food` | `POST` | Processes base64 food photo attachments using Gemini 2.5 Flash on OpenRouter to return calorie and macro breakdowns. |
| `supabase/functions/generate-macro-goals` | `POST` | Biological metabolic calculus assessing exact Mifflin-St Jeor TDEE calorie limits. |

### Database
- **Daily Activity Logging**: Wired up automatic checks linking hydration entries, workouts, meals, and vitals readouts directly into unified user logs.

### New Libraries & Utilities
- `navigator.mediaDevices` — Real-time camera video stream input.
- `gsap.context()` — Memory-safe visual canvas animation garbage collection.

### Environment Variables
- `OPENROUTER_API_KEY` — OpenRouter translation API key for edge AI functions.

## [1.0.0-phase1] - 2026-05-23

### New Features
- **Project Structure**: Set up Next.js 15 App Router codebase with view transitions and PostCSS tailwind integration.
- **Design System**: Constructed HSL color tokens for Violet Aurora and Cyber Teal dual-themes with responsive frosted glass aesthetics.
- **UI Components**: Programmed 10 premium custom primitives (`Button`, `Card`, `Input`, `Skeleton`, `AnimatedCounter`, `ProgressRing`, `Modal`, `Toggle`, `Badge`, `Tooltip`) utilizing canvas rendering, inline SVG definitions, and spring animations.
- **Layout & Navigation**: Created responsive collapsible sidebar menu, persistent mobile bottom menu tabs, page diurnal greeting header, and ambient floating canvas particle field.
- **Supabase Auth**: Mounted cookie-secure SSR client connections, path redirection middleware, OAuth routing, and biometrics onboarding wizard signup flow.
- **Home Dashboard**: Integrated performance ActivityRings, Weekly Calorie bar charts, Macro split donuts, and recent activity feeds.

### Database
- **Migrations**: Created SQL schema sets (`001_users_profiles.sql` to `006_gamification.sql`) establishing accounts, exercises library, workouts progress trackers, meals logging, vitals metrics, progress storage bucket, achievements badges, and daily logger logs.
- **Seeding**: Loaded ~100 initial global exercises by muscle groups and default performance gamification badges.

### New Libraries & Utilities
- `@supabase/supabase-js` & `@supabase/ssr` — Supabase connections.
- `framer-motion` & `gsap` — Spring/scroll visual animations.
- `lucide-react` — Layout iconography.
- `date-fns`, `react-hook-form`, `zod` — Form validators and formatters.
- `clsx` & `tailwind-merge` — Tailwind class utilities.

### Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase API endpoint.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Client anonymous encryption key.
- `NEXT_PUBLIC_SITE_URL` — Production host URL.
- `OPENROUTER_API_KEY` — OpenRouter translation connection.

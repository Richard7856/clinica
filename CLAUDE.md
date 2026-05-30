# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

> **Read the rule above first.** This repo runs **Next.js 16** (App Router +
> Turbopack) with React 19. APIs and conventions differ from older Next.js;
> consult `node_modules/next/dist/docs/` before writing framework code instead
> of assuming behavior from memory.

## What this is

**Clínica** — internal control app for an aesthetic clinic: patients,
sessions, cabins, payments, and scheduling. MVP scoped to a single clinic.
UI strings and domain language are in **Spanish**. See `README.md` for the
product spec and `DECISIONS.md` for the rationale behind the major technical
choices (read it before changing the data layer, auth, or state model).

## Commands

Package manager is **pnpm** (`pnpm-lock.yaml`).

```bash
pnpm dev          # dev server (Turbopack) on http://localhost:3000
pnpm build        # production build
pnpm start        # serve the production build
pnpm lint         # ESLint (flat config, eslint-config-next)
pnpm exec tsc --noEmit   # typecheck (no dedicated script)
```

There is **no test framework** configured — no jest/vitest/playwright, no
`test` script. Don't invent test commands; verify changes via `pnpm build`,
`pnpm lint`, and the dev server.

### Firebase (local)

```bash
firebase emulators:start                     # Auth/Firestore/Storage emulators + UI on :4000
NEXT_PUBLIC_USE_EMULATORS=1 pnpm dev         # point the app at the emulators
firebase deploy --only firestore:rules       # deploy security rules / indexes
```

Env vars (`NEXT_PUBLIC_FIREBASE_*` for the client, `FIREBASE_ADMIN_*` for the
Admin SDK) live in `.env.local`; the Admin private key is stored with literal
`\n` and unescaped at runtime in `lib/firebase/admin.ts`. README "Setup
manual" has the one-time Firebase console steps — those are done by the human,
not Claude.

## Architecture

Layering is deliberate: **UI components never touch Firebase directly.** Data
flows through schemas → repositories → React Query → components.

- `lib/schemas/` — **Zod schema per entity** (patient, session, appointment,
  payment, staff, etc.); `common.ts` holds shared validators. Schemas are the
  source of truth for shapes and types.
- `lib/repositories/` — **Repository adapter pattern.** A generic
  `Repository<TInput, T>` interface (`types.ts`) plus one Firestore-backed
  implementation per entity, sharing `firestore-helpers.ts`. This is the only
  layer allowed to import the Firestore SDK, so the backend can later be
  swapped (the original plan mentioned Supabase/FastAPI). Firestore
  `Timestamp`s are converted to **ISO 8601 strings at the repository
  boundary** — SDK types must not leak upward.
- `lib/firebase/` — `client.ts` (browser SDK singleton, emulator-aware) and
  `admin.ts` (server/Admin SDK).
- `app/` — App Router. `(auth)/login` is the public route group; `(app)/` is
  the authenticated shell (`(app)/layout.tsx` is the auth guard) containing
  `dashboard`, `patients`, `checkin`, `agenda`, `payments`, `reports`,
  `settings`.
- `components/` — `ui/` are shadcn primitives; `providers.tsx` wires
  QueryClient + AuthProvider + Toaster; `auth-context.tsx` holds global auth
  state; `app-nav.tsx` / `mobile-nav.tsx` render role-gated navigation.

### Auth & roles

Three roles: **admin / reception / therapist**. Role is stored in *two*
places — an Auth **custom claim** (consumed by `firestore.rules` for
server-side enforcement) and the `/staff/{uid}` Firestore doc (for UI). The
`useAuth` hook reads the claim with a doc fallback. When adding a feature,
enforce access in `firestore.rules`, not just in the UI.

### State conventions

`@tanstack/react-query` for server state (staleTime ~30s, not real-time;
clinic-scale), `react-hook-form` + `@hookform/resolvers` + Zod for forms,
`sonner` for toasts.

### Firestore

Schemaless (no migrations folder). Schema evolution = update the Zod schema +
update `firestore.rules` + add any needed composite index to
`firestore.indexes.json` (then deploy). Security/access lives in
`firestore.rules` and `storage.rules`.

## Notable config

- `next.config.ts` pins the Turbopack root to this directory (prevents Next
  from inferring a monorepo root from the home directory).
- `tsconfig.json` — strict mode, path alias `@/*` → repo root.
- `components.json` — shadcn config (used by `pnpm dlx shadcn add ...`).
- `.mcp.json` — wires a Firestore MCP server (GenAI Toolbox); requires Google
  Application Default Credentials to use.

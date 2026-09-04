# MAUDIO Restructure — Two Clients, One Backend

Based on inspecting the current repository (single Vite app in `src/`, Capacitor + native Media3 code in `android/`, and an orphaned Expo app in `maudio-native/`).

## Target structure

```text
MAUDIO
├── src/
│   ├── web/        React web client (pages, components, web hooks, routing)
│   ├── mobile/     Mobile client bridge (Capacitor plugins, native player bridge,
│   │               offline downloads/cache, notifications, network)
│   └── shared/     Backend contracts + business logic used by both clients
│                   (Supabase client, MusicRepository, StorageManager,
│                    PlayerEngine, types, config, utils)
├── android/        Native Android (Media3/ExoPlayer service, Android Auto, manifest)
└── supabase/       Auth, DB, RLS, Edge Functions
```

The mobile client stays inside this repo and reuses the same web bundle through
Capacitor — no second application, ever. `maudio-native/` (the isolated Expo app,
not wired to Vite or Capacitor) is deleted.

## What moves where

| Now | After |
| --- | --- |
| `src/pages`, `src/components`, `src/hooks`, `src/contexts`, `src/App.tsx`, `src/index.css` | `src/web/...` |
| `src/lib/native.ts`, `src/lib/native/`, `src/lib/offline/`, `src/hooks/use-capacitor.tsx`, `src/components/NativeBootstrap.tsx` | `src/mobile/...` |
| `src/core/`, `src/integrations/supabase`, `src/types`, `src/config`, `src/services`, `src/utils`, `src/lib/utils.ts`, `src/lib/share.ts` | `src/shared/...` |
| `maudio-native/` | deleted |

`src/main.tsx` stays at the root as the single Vite entry.

## Import aliases

Add to `vite.config.ts` and `tsconfig`:
`@web/*`, `@mobile/*`, `@shared/*`, with the existing `@/*` kept pointing at `src/`
so nothing breaks during the move. All imports are rewritten mechanically to the
new aliases; no logic changes.

## Boundary rules (enforced by lint + docs)

- `src/shared` may not import from `src/web` or `src/mobile`.
- `src/web` may not import from `src/mobile` directly — native features are reached
  through a small capability layer in `src/mobile/index.ts` that no-ops on the web.
- `src/mobile` may not import web pages/components.
- Rules added as ESLint `no-restricted-imports` and written into `docs/ARCHITECTURE.md`
  plus a `CONTRIBUTING.md` "two clients" rule.

## Verification

- Build passes, dev preview loads, routes render.
- `npx cap sync android` still resolves `dist/` and the native player bridge.
- Spot-check playback, offline downloads, and admin pages after the move.

## Not included

No monorepo tooling (`/apps`, `/packages`, workspaces) — Lovable's build expects a
single root Vite app, so the same boundary is achieved with folders and aliases.
No feature, UI, or backend behaviour changes in this pass.

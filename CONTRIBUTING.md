# Contributing to MAUDIO

## The two-client rule (non-negotiable)

MAUDIO has **two clients**: a Web Client (`src/web`) and a Mobile Client
(`src/mobile` + `android/`). Never create a second independent MAUDIO
application, duplicate the project, or create another mobile project/folder
unless explicitly instructed. Web functionality must remain inside the Web
Client. Native mobile functionality must remain inside the Mobile Client. Both
clients may consume the same Supabase backend and shared contracts
(`src/shared`).

Before changing architecture, inspect the existing repository. Do not invent a
new structure.

## Boundaries

| Layer | May import | Must not import |
| --- | --- | --- |
| `src/shared` | other shared modules, Supabase | anything in `src/web` or `src/mobile` |
| `src/web` | `@shared/*`, `@web/*`, `@mobile` (barrel only) | deep `@mobile/...` paths |
| `src/mobile` | `@shared/*`, Capacitor plugins | web pages/components |
| `android/` | native only | — |

These are enforced by `no-restricted-imports` rules in `eslint.config.js`.

### Why the `@mobile` barrel

`src/mobile/index.ts` is the capability layer. Every export there is safe to
call in a browser — it degrades to a no-op or a web fallback when Capacitor is
absent. That is what keeps a single build working for both clients.

### Device storage

Shared code never imports Capacitor. `src/shared/core/storage/StorageManager.ts`
declares a `DeviceStorage` contract with a no-op web default; the Mobile Client
provides `capacitorDeviceStorage` and `src/main.tsx` registers it at boot via
`registerDeviceStorage()`.

## Adding a feature

1. Data access → `src/shared/core/data/MusicRepository.ts`.
2. Media URLs / offline files → `src/shared/core/storage/StorageManager.ts`.
3. Playback state → `src/shared/core/player/PlayerEngine.ts`.
4. Screens and UI → `src/web`.
5. Anything requiring a native API → `src/mobile` (+ `android/` if it needs
   Java/Kotlin), exported through `src/mobile/index.ts`.

## Checks before shipping

```bash
npm run build
npx cap sync android   # when the mobile client is affected
```

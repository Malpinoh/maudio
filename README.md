# MAUDIO

Music streaming platform with **two clients and one shared backend**.

```text
MAUDIO
├── 🌐 WEB CLIENT        src/web        React + TypeScript + Vite
│                        Home · Search · Artists · Albums · Playlists ·
│                        Library · Player · Login/Signup · Admin
│
├── 📱 MOBILE CLIENT     src/mobile + android/ (+ ios/)
│                        Capacitor shell around the same web bundle, with a
│                        native Media3/ExoPlayer engine:
│                        native player · background playback · downloads ·
│                        notifications · Bluetooth · Android Auto
│
├── 🤝 SHARED            src/shared
│                        Supabase client · MusicRepository · StorageManager ·
│                        PlayerEngine · types · config · utils
│
└── ☁️ BACKEND           supabase/
                         Auth · Database · Storage · RLS · Edge Functions · APIs
```

## The one architecture rule

> MAUDIO has two clients: a **Web Client** and a **Mobile Client**. Never create a
> second independent MAUDIO application, duplicate the project, or add another
> mobile project/folder unless explicitly instructed. Web functionality stays in
> the Web Client. Native mobile functionality stays in the Mobile Client. Both
> clients consume the same Supabase backend and the same shared contracts.

See `CONTRIBUTING.md` for how the boundary is enforced.

## Folder map

| Path | Owner | Contents |
| --- | --- | --- |
| `src/main.tsx` | root | single Vite entry; registers mobile capabilities |
| `src/web/` | Web Client | `pages/`, `components/`, `hooks/`, `contexts/`, `App.tsx`, `index.css`, `assets/` |
| `src/mobile/` | Mobile Client | `index.ts` (capability layer), `native.ts`, `nativePlayer.ts`, `offline/`, `deviceStorage.ts`, `use-capacitor.tsx`, `NativeBootstrap.tsx` |
| `src/shared/` | both | `core/` (repository, storage, player engine, DI), `integrations/supabase/`, `types/`, `config/`, `services/`, `utils/`, `lib/` |
| `android/` | Mobile Client | Media3/ExoPlayer service, Android Auto, manifest, Gradle |
| `supabase/` | backend | migrations, edge functions, config |

## Import aliases

| Alias | Points to | May be imported by |
| --- | --- | --- |
| `@shared/*` | `src/shared` | web, mobile |
| `@web/*` | `src/web` | web only |
| `@mobile` | `src/mobile/index.ts` | web (capability layer only), root entry |

`@/*` still resolves to `src/` for legacy imports, but new code should use the
three aliases above.

## Running

```bash
npm install
npm run dev            # web client at http://localhost:8080
npm run build          # produces dist/ (also the mobile web bundle)
npx cap sync android   # push dist/ + plugins into the Android project
```

Then open `android/` in Android Studio to run or build the mobile app. Mobile
specifics (permissions, notification, Android Auto, QA checklist) live in
`MOBILE_APP_GUIDE.md`; the shared core layer is documented in
`docs/ARCHITECTURE.md`.

## Backend

Supabase project `qkpjlfcpncvvjyzfolag` — auth, Postgres with RLS on every
table, `audio` / `cover_art` storage buckets, and edge functions under
`supabase/functions/`.

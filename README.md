# MAUDIO

MAUDIO is a Spotify-like music streaming platform. Purple-centric brand
(`#7c3aed`), unauthenticated browsing allowed, HLS adaptive streaming,
per-stream royalty system, regional and global charts.

This repo hosts three things that share one Supabase backend:

```
maudio/
├── src/              # React + Vite web app (and PWA)
├── maudio-native/    # React Native (Expo) mobile app — Android + iOS
├── android/          # Legacy Capacitor Android shell (kept until RN reaches parity)
├── supabase/         # Shared backend: SQL migrations + edge functions
└── public/           # Static web assets
```

- Web app:    `src/` (Vite, React 18, Tailwind, shadcn/ui)
- Native app: `maudio-native/` (Expo SDK 51, React Native 0.74, React Navigation, react-native-track-player)
- Backend:    Supabase project `qkpjlfcpncvvjyzfolag` (Postgres + RLS + Storage + Edge Functions)

## Web app (development)

```sh
npm install
npm run dev          # http://localhost:8080
```

Environment variables in `.env` are auto-populated:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

## Native app (Android + iOS)

The native app is a fresh React Native build that uses the **same Supabase
backend** as the web app. It owns the playback notification, lock-screen
controls, and background audio via `react-native-track-player` — these are
true native features that the previous Capacitor build could not deliver
reliably on Android 13+.

### Prerequisites

- Node 18+
- Android Studio (for Android) and/or Xcode 15+ on macOS (for iOS)
- A connected device or running emulator

### First run

```sh
cd maudio-native
npm install
npx expo prebuild --platform android   # generates the native android/ project
npx expo run:android                   # build & launch on device/emulator
# For iOS (Mac only):
# npx expo prebuild --platform ios
# npx expo run:ios
```

### Subsequent runs after pulling changes

```sh
cd maudio-native
npm install
npx expo run:android      # or run:ios
```

### Where things live

| Concern | Path |
|---|---|
| App entry | `maudio-native/App.tsx` |
| Supabase client | `maudio-native/src/lib/supabase.ts` |
| Auth | `maudio-native/src/contexts/AuthContext.tsx` |
| Native player | `maudio-native/src/player/` |
| Tabs / screens | `maudio-native/src/navigation/`, `src/screens/` |
| Online/offline pill | `maudio-native/src/components/NetworkPill.tsx` |

### Feature matrix (Phase 1)

| Feature | Web | Native |
|---|:---:|:---:|
| Browse / Home / Search | ✅ | ✅ |
| Charts (Global / Regional) | ✅ | ✅ |
| HLS playback | ✅ | ✅ |
| Lock-screen + notification controls | partial | ✅ native |
| Background audio + foreground service | flaky on Android | ✅ native |
| Offline downloads (200 MB LRU) | ✅ | 🔜 next round |
| Upload / Artist Dashboard / Admin | ✅ | ❌ (web only) |
| Payouts / Royalties | ✅ | ❌ (web only) |

The legacy `android/` Capacitor project remains for backwards compatibility
until the React Native app reaches full parity. After that, it (and the
`@capacitor/*` dependencies in `package.json`) will be removed.

## Backend

Schema lives in `supabase/migrations/`. Edge functions in `supabase/functions/`.
All changes are applied through Lovable migrations — do not edit the database
directly.

## Editing in Lovable

Open the [Lovable Project](https://lovable.dev/projects/37c241b2-011b-4b28-9680-e9eaec2c83e7)
to make changes. Commits sync to this repo automatically.

## License

Proprietary © MAUDIO.
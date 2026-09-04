# MAUDIO Architecture

MAUDIO ships **two clients over one backend**:

- **Web Client** — `src/web` (React + Vite): pages, components, hooks, contexts.
- **Mobile Client** — `src/mobile` + `android/`: Capacitor bridge, native
  Media3/ExoPlayer player, downloads/cache, notifications, Android Auto.
  The Web Client reaches native capabilities only through the `@mobile` barrel
  (`src/mobile/index.ts`), which no-ops in a browser.
- **Shared** — `src/shared`: Supabase client, MusicRepository, StorageManager,
  PlayerEngine, DI, types, config, utils. Shared code never imports a client.

Never create a second MAUDIO application or another mobile folder — see
`CONTRIBUTING.md`.

Three injected services form the foundation of the app. UI never talks to
Supabase, S3 or the device filesystem directly.

```
   Pages / Components / Hooks
              |
      ServicesProvider (DI)
        /            \
MusicRepository   StorageManager        PlayerEngine
        \            /                       |
   Supabase (metadata)  S3 / Supabase media  music-player state
                        Capacitor Filesystem  -> <audio> (web/iOS)
                        + SQLite (offline)    -> Media3 service (Android)
```

## MusicRepository — `src/shared/core/data/MusicRepository.ts`

Single source of all music data: tracks, charts, trending, artists, albums,
playlists, search, recommendations, similar tracks, user library (liked/saved)
and recently played. It owns query shape, ordering and fallbacks, and decorates
every row with media URLs resolved through StorageManager (`cover`, `audioUrl`).

Use it via `const repo = useMusicRepository()`. Do not import `supabase` in a
page or component for music data.

## StorageManager — `src/shared/core/storage/StorageManager.ts`

Unified interface over storage providers:

- Remote media (audio, album art, artist images) through a `RemoteMediaProvider`.
  `supabaseMediaProvider` is the current default; `createS3MediaProvider(baseUrl)`
  swaps the whole app to S3 without touching callers. Media is addressed by
  **key** (`audio/{artistId}/{albumId}/{trackId}.mp3`), never a hardcoded URL.
- Device storage: downloads, the 200 MB LRU audio cache, cache usage and the
  Offline Mix (backed by Capacitor Filesystem + SQLite).
- `resolvePlaybackUrl(trackId, key)` picks downloaded → cached → remote.

Use it via `const storage = useStorageManager()`.

## PlayerEngine — `src/shared/core/player/PlayerEngine.ts`

Stable facade over the music-player state machine. Exposes current track,
queue, playback state, progress/position, volume, mute, repeat, shuffle,
playback speed and crossfade, plus every transport and queue action. On Android
the same calls are routed to the native Media3 foreground service (notification,
lock screen, Bluetooth, Android Auto); on web/iOS to the `<audio>` element.

Use it via `const player = usePlayerEngine()`. `player.raw` remains available
for advanced surfaces (EQ, diagnostics).

## Dependency Injection — `src/shared/core/di/ServicesProvider.tsx`

`<ServicesProvider>` wraps the app in `App.tsx` and builds the container once.
`useServices()`, `useMusicRepository()` and `useStorageManager()` read from it.
Tests or provider swaps inject their own container:

```tsx
<ServicesProvider services={{ storage: fakeStorage, music: fakeRepo }} />
<ServicesProvider mediaProvider={createS3MediaProvider("https://cdn.maudio.app")} />
```

Non-React code can call `getServices()`.

## Extension points (future sprints)

DownloadManager, CacheManager, OfflineManager and SyncManager plug into the same
container and build on StorageManager + MusicRepository — no component changes
required.


# Bulletproof Android Media3 Playback for MAUDIO

Move audio playback out of the WebView into a native **Media3 (ExoPlayer) + MediaLibraryService** foreground service. This is the only architecture Android 13/14/15 reliably keeps alive with lock-screen controls, Bluetooth headset buttons, and Android Auto — and it fixes the real root cause: OEM battery-killers suspending the WebView audio element.

---

## Why the current setup breaks on Android 13+

- Audio lives in the WebView `<audio>` tag. Android 14/15 aggressively suspends WebView media when the app is backgrounded; OEMs (Xiaomi/Samsung/Oppo) are worse.
- `capacitor-music-controls-plugin` targets pre-Android-13, missing runtime `POST_NOTIFICATIONS` and proper FGS type declarations.
- Current custom plugin has two `MediaSession` instances (one in `Plugin`, one in `Service`) fighting for the token, and control PendingIntents route to two different places (`getBroadcast` in plugin, `getService` in service) — buttons don't consistently reach the JS layer.
- No Media3 = no Android Auto, no MediaBrowser tree, no proper Bluetooth AVRCP metadata.

---

## Architecture

```text
JS (React)  ── Capacitor bridge ──►  MaudioPlayerPlugin (Kotlin)
                                       │
                                       ▼
                              MaudioMediaLibraryService  (androidx.media3.session)
                                       │
                                 ┌─────┼──────┐
                                 ▼     ▼      ▼
                              ExoPlayer  MediaSession  NotificationManager
                                 │           │              │
                          HLS/Progressive   Lock-screen +   Rich notif +
                          streaming +       Bluetooth +     album art
                          gapless           Android Auto
```

The WebView keeps rendering UI. All actual audio bytes flow through native ExoPlayer. JS just tells the service what to play and reads state back.

---

## Native module (Kotlin, in `android/app/src/main/java/com/maudio/online/player/`)

New files:
- `MaudioPlayerService.kt` — extends `MediaLibraryService`, owns single `ExoPlayer` + `MediaLibrarySession`. Declares `foregroundServiceType="mediaPlayback"` and posts the Media3-generated notification (auto-styled MediaStyle, cover art from `MediaMetadata.artworkUri`, correct compact-view buttons).
- `MaudioLibrarySessionCallback.kt` — implements `MediaLibrarySession.Callback` for MediaBrowser tree so Android Auto and BT head units can browse: Home → Recently Played, Downloads, Offline Mix, Top Charts, Your Playlists. Nodes hydrated from Supabase via a light `LibraryRepository.kt`.
- `MaudioPlayerPlugin.kt` — Capacitor plugin exposing:
  - `load({ tracks, startIndex, autoplay })` → builds `MediaItem` list with `MediaMetadata` (title, artist, album, artworkUri, durationMs), binds to service via `MediaController`.
  - `play() / pause() / next() / previous() / seekTo({ positionMs }) / setRepeat / setShuffle / setSpeed / clear()`.
  - `updateQueue({ tracks, currentIndex })`, `setVolume`, `getState()`.
  - Emits events to JS: `state`, `positionChanged` (throttled 500ms), `trackChanged`, `queueEnded`, `error`, `controlTap`.
- `MaudioMediaButtonReceiver.kt` — thin wrapper over Media3's `MediaButtonReceiver` so BT headset play/pause hits the session even when the app process is dead.
- `AutoConnectionReceiver.kt` — listens for `com.google.android.gms.car.media.STATUS` to warm up when Android Auto connects.

Uses:
```gradle
implementation "androidx.media3:media3-exoplayer:1.4.1"
implementation "androidx.media3:media3-exoplayer-hls:1.4.1"
implementation "androidx.media3:media3-session:1.4.1"
implementation "androidx.media3:media3-datasource-okhttp:1.4.1"
implementation "androidx.media3:media3-ui:1.4.1"
```

Custom `OkHttpDataSource.Factory` with 30 s read timeout, 20 s connect, User-Agent `MAUDIO/<version> (Android)`, and cookie forwarding for signed Supabase URLs.

---

## AndroidManifest additions

```xml
<service
  android:name=".player.MaudioPlayerService"
  android:exported="true"
  android:foregroundServiceType="mediaPlayback">
  <intent-filter>
    <action android:name="androidx.media3.session.MediaLibraryService"/>
    <action android:name="android.media.browse.MediaBrowserService"/>
  </intent-filter>
</service>

<receiver
  android:name="androidx.media3.session.MediaButtonReceiver"
  android:exported="true">
  <intent-filter>
    <action android:name="android.intent.action.MEDIA_BUTTON"/>
  </intent-filter>
</receiver>

<meta-data
  android:name="com.google.android.gms.car.application"
  android:resource="@xml/automotive_app_desc"/>
```

`res/xml/automotive_app_desc.xml` declares `<uses name="media"/>` so Android Auto shows MAUDIO in its media picker.

Remove: old `capacitor-music-controls-plugin` receiver/service entries and the community plugin dependency (dead weight once native player owns playback).

Permissions already present are correct: `INTERNET`, `POST_NOTIFICATIONS`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK`, `WAKE_LOCK`. Add `BLUETOOTH_CONNECT` for Android 12+ BT device metadata.

---

## JS integration

New: `src/lib/native/nativePlayer.ts`
```ts
export interface NativeTrack {
  id: string; url: string; title: string; artist: string;
  album?: string; artworkUrl?: string; durationMs?: number;
}
export const nativePlayer = {
  isAvailable(): boolean,           // true only on Android native
  load(tracks, startIndex, autoplay),
  play(), pause(), toggle(),
  next(), previous(), seekTo(ms),
  setRepeat(mode), setShuffle(bool), setSpeed(rate),
  updateQueue(tracks, currentIndex),
  clear(),
  on(event, cb): () => void,        // state / positionChanged / trackChanged / queueEnded / error
};
```

Refactor `src/contexts/music-player/useMusicPlayerState.ts`:
- If `nativePlayer.isAvailable()`, route all playback commands through it and **do not** create the HTML `<audio>` element.
- Progress bar, mini-player, fullscreen player read state from `nativePlayer.on('positionChanged')` and `on('state')`.
- Downloads (`src/lib/offline/storage.ts`): pass local `file://` URIs to `nativePlayer.load()` — ExoPlayer plays them the same as HTTPS.
- Cached URLs work identically.
- Web / iOS keep the current WebView audio path unchanged.

Delete: `src/lib/native/musicControls.ts` and its call sites (superseded).
Delete: `MaudioPlaybackNotificationPlugin.java`, `MaudioPlaybackNotificationReceiver.java`, `MaudioPlaybackNotificationService.java`.

---

## Android Auto / MediaBrowser tree

`MaudioLibrarySessionCallback` returns a browsable root with these children, populated from Supabase (cached 5 min):

```text
Root
├── Recently Played           (from user_listening_history)
├── Downloads                 (from local SQLite)
├── Offline Mix               (from local SQLite)
├── Top Charts                (get_charts_by_period, weekly, global)
├── Your Playlists            (playlists where created_by = user)
└── Made For You              (get_personalized_recommendations)
```

Guest users get the Charts + Made For You branches only. Auth token is read from the same AsyncStorage bridge the WebView uses (`sb-<ref>-auth-token`) via a native `SharedPreferences` reader — no re-login needed.

---

## Reliability details

- **Runtime notification permission**: `MaudioPlayerPlugin.checkPermissions()` requests `POST_NOTIFICATIONS` on Android 13+ on first `load()`. If denied, playback still works, just no notification — surface a Sonner toast prompting Settings.
- **Foreground-service-start-not-allowed**: service only started from an allowed context (user tap → JS `load()` while activity foregrounded). If backgrounded when `play()` is called, we use `MediaController.sendCustomCommand` to wake the session via existing media button pathway instead of `startForegroundService`.
- **OEM battery whitelisting**: onboarding hint on first Android launch pointing to Battery → Unrestricted for MAUDIO. Non-blocking.
- **Audio focus**: Media3 handles it (`AudioFocusRequest` built in). Ducks on call/notification, pauses on transient loss, resumes on gain.
- **Bluetooth AVRCP**: MediaMetadata with title/artist/album/artwork automatically surfaced to headsets. Album art fetched via ExoPlayer's `ImageDecoder` from `artworkUri` (Supabase/S3 URL).
- **Gapless & seek**: enabled via `ExoPlayer.Builder().setSeekBackIncrementMs(10_000).setSeekForwardIncrementMs(30_000)`.

---

## Rollout

1. Add Media3 gradle deps + AndroidManifest edits.
2. Ship `MaudioPlayerService`, `MaudioPlayerPlugin`, `LibraryRepository`, register plugin in `MainActivity.java`.
3. Add `nativePlayer.ts` bridge, gate it behind `Capacitor.getPlatform() === 'android'`.
4. Refactor `useMusicPlayerState` to route through `nativePlayer` on Android; keep WebView audio for web/iOS.
5. Remove old music-controls plugin + custom notification service files + manifest entries.
6. Add MediaBrowser tree + Android Auto manifest + automotive_app_desc.xml.
7. Update `MOBILE_APP_GUIDE.md`: build steps, POST_NOTIFICATIONS prompt, Android Auto testing via Desktop Head Unit.

Each step compiles independently; JS side keeps working through step 3 (opt-in path).

---

## Out of scope this pass

- iOS lock-screen (already handled by web `navigator.mediaSession` inside WKWebView — separate work if you want a native iOS AVAudioSession + MPNowPlayingInfoCenter path).
- Cast / AirPlay routing.
- Chromecast Audio.

Ready to build. Approve to proceed.

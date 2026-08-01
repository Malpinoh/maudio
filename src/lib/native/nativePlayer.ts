/**
 * Bridge to the native Media3 (ExoPlayer) player on Android.
 *
 * On Android the WebView no longer decodes audio at all. The native
 * `MaudioPlayerService` (a foreground `MediaLibraryService`) owns playback, the
 * MediaSession, the notification, Bluetooth transport buttons and the Android
 * Auto browse tree. That is the only architecture Android 13/14/15 reliably
 * keeps alive with the screen locked.
 *
 * On web and iOS every method is a no-op and `isAvailable()` returns false, so
 * the existing HTMLAudioElement path keeps running unchanged.
 */
import { Capacitor, registerPlugin } from "@capacitor/core";

export interface NativeTrack {
  id: string;
  url: string;
  title: string;
  artist: string;
  album?: string;
  artworkUrl?: string;
  durationMs?: number;
}

export interface NativePlayerState {
  connected: boolean;
  isPlaying?: boolean;
  playWhenReady?: boolean;
  playbackState?: number;
  isBuffering?: boolean;
  positionMs?: number;
  durationMs?: number;
  index?: number;
  queueLength?: number;
  trackId?: string | null;
  shuffle?: boolean;
  repeatMode?: number;
}

export interface NativePositionEvent {
  positionMs: number;
  durationMs: number;
  bufferedMs: number;
}

export interface NativeTrackChangedEvent {
  trackId: string | null;
  index: number;
  reason: number;
}

export interface NativeErrorEvent {
  code: number;
  name: string;
  message: string;
  trackId: string | null;
}

export interface NativeLibrarySection {
  id: string;
  title: string;
  artworkUrl?: string;
  tracks: NativeTrack[];
}

interface MaudioPlayerPlugin {
  isAvailable(): Promise<{ available: boolean; connected: boolean }>;
  requestNotificationPermission(): Promise<{ granted: boolean }>;
  load(options: {
    tracks: NativeTrack[];
    startIndex?: number;
    autoplay?: boolean;
    startPositionMs?: number;
  }): Promise<NativePlayerState>;
  updateQueue(options: { tracks: NativeTrack[] }): Promise<NativePlayerState>;
  play(): Promise<NativePlayerState>;
  pause(): Promise<NativePlayerState>;
  next(): Promise<NativePlayerState>;
  previous(): Promise<NativePlayerState>;
  seekTo(options: { positionMs: number }): Promise<NativePlayerState>;
  skipToIndex(options: { index: number }): Promise<NativePlayerState>;
  setRepeat(options: { mode: "off" | "all" | "one" }): Promise<NativePlayerState>;
  setShuffle(options: { enabled: boolean }): Promise<NativePlayerState>;
  setSpeed(options: { rate: number }): Promise<NativePlayerState>;
  setVolume(options: { volume: number }): Promise<NativePlayerState>;
  getState(): Promise<NativePlayerState>;
  clear(): Promise<NativePlayerState>;
  syncLibrary(options: { tree: { sections: NativeLibrarySection[] } }): Promise<void>;
  addListener(event: string, cb: (data: any) => void): Promise<{ remove: () => void }>;
}

const plugin = registerPlugin<MaudioPlayerPlugin>("MaudioPlayer");

let available: boolean | null = null;

/** True only inside the Android native shell, where Media3 exists. */
export function isNativePlayerAvailable(): boolean {
  if (available !== null) return available;
  try {
    available = Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
  } catch {
    available = false;
  }
  return available;
}

const guard = async <T,>(fn: () => Promise<T>): Promise<T | null> => {
  if (!isNativePlayerAvailable()) return null;
  try {
    return await fn();
  } catch (e) {
    console.warn("[nativePlayer] command failed", e);
    return null;
  }
};

export type NativePlayerEvent =
  | "state"
  | "positionChanged"
  | "trackChanged"
  | "queueEnded"
  | "error";

export const nativePlayer = {
  isAvailable: isNativePlayerAvailable,

  requestNotificationPermission: () =>
    guard(() => plugin.requestNotificationPermission()),

  load: (tracks: NativeTrack[], startIndex = 0, autoplay = true, startPositionMs = 0) =>
    guard(() => plugin.load({ tracks, startIndex, autoplay, startPositionMs })),

  updateQueue: (tracks: NativeTrack[]) => guard(() => plugin.updateQueue({ tracks })),

  play: () => guard(() => plugin.play()),
  pause: () => guard(() => plugin.pause()),
  next: () => guard(() => plugin.next()),
  previous: () => guard(() => plugin.previous()),

  seekTo: (positionMs: number) => guard(() => plugin.seekTo({ positionMs })),
  skipToIndex: (index: number) => guard(() => plugin.skipToIndex({ index })),

  setRepeat: (mode: "off" | "all" | "one") => guard(() => plugin.setRepeat({ mode })),
  setShuffle: (enabled: boolean) => guard(() => plugin.setShuffle({ enabled })),
  setSpeed: (rate: number) => guard(() => plugin.setSpeed({ rate })),
  setVolume: (volume: number) => guard(() => plugin.setVolume({ volume })),

  getState: () => guard(() => plugin.getState()),
  clear: () => guard(() => plugin.clear()),

  /** Push the browse tree consumed by Android Auto and Bluetooth head units. */
  syncLibrary: (sections: NativeLibrarySection[]) =>
    guard(() => plugin.syncLibrary({ tree: { sections } })),

  /** Subscribe to a native player event. Returns an unsubscribe function. */
  on(event: NativePlayerEvent, cb: (data: any) => void): () => void {
    if (!isNativePlayerAvailable()) return () => {};
    let handle: { remove: () => void } | null = null;
    let cancelled = false;
    plugin
      .addListener(event, cb)
      .then((h) => {
        if (cancelled) h.remove();
        else handle = h;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      try {
        handle?.remove();
      } catch {}
    };
  },
};

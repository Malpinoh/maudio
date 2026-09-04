/**
 * PlayerEngine — the single playback API for the app.
 *
 * It owns nothing new: it is the stable facade over the existing music-player
 * state machine (`src/contexts/music-player`), which in turn routes audio to
 * the HTML <audio> element on web/iOS and to the native Media3 service on
 * Android. UI code should depend on this interface, never on the audio element
 * or the native bridge.
 */
import type { Track } from "@shared/types/track-types";
import type {
  MusicPlayerContextType,
  PlaybackError,
  PlaybackSource,
  RepeatMode,
} from "@web/contexts/music-player/types";

export interface PlayerSnapshot {
  currentTrack: Track | null;
  queue: Track[];
  isPlaying: boolean;
  isLoading: boolean;
  position: number;
  duration: number;
  progress: number; // 0..1
  volume: number;
  isMuted: boolean;
  repeatMode: RepeatMode;
  isShuffle: boolean;
  playbackRate: number;
  crossfadeEnabled: boolean;
  crossfadeDuration: number;
  source: PlaybackSource | null;
  error: PlaybackError | null;
}

export interface PlayerEngine extends PlayerSnapshot {
  // Transport
  play(track: Track): void;
  toggle(): void;
  next(): void;
  previous(): void;
  seek(seconds: number): void;
  retry(): void;

  // Queue
  setQueue(tracks: Track[], source?: PlaybackSource | null): void;
  addToQueue(track: Track): void;
  removeFromQueue(trackId: string): void;
  reorderQueue(from: number, to: number): void;
  clearQueue(): void;
  setSource(source: PlaybackSource | null): void;

  // Modes & output
  setVolume(volume: number): void;
  toggleMute(): void;
  toggleRepeat(): void;
  toggleShuffle(): void;
  setPlaybackRate(rate: number): void;
  setCrossfadeEnabled(enabled: boolean): void;
  setCrossfadeDuration(seconds: number): void;

  /** Escape hatch for advanced surfaces (EQ panel, diagnostics). */
  readonly raw: MusicPlayerContextType;
}

export function createPlayerEngine(ctx: MusicPlayerContextType): PlayerEngine {
  return {
    currentTrack: ctx.currentTrack,
    queue: ctx.queue,
    isPlaying: ctx.isPlaying,
    isLoading: ctx.isLoading,
    position: ctx.currentTime,
    duration: ctx.duration,
    progress: ctx.duration > 0 ? ctx.currentTime / ctx.duration : 0,
    volume: ctx.volume,
    isMuted: ctx.isMuted,
    repeatMode: ctx.repeatMode,
    isShuffle: ctx.isShuffle,
    playbackRate: ctx.playbackRate,
    crossfadeEnabled: ctx.crossfadeEnabled,
    crossfadeDuration: ctx.crossfadeDuration,
    source: ctx.playbackSource,
    error: ctx.playbackError,

    play: ctx.playTrack,
    toggle: ctx.togglePlay,
    next: ctx.playNext,
    previous: ctx.playPrevious,
    seek: ctx.seekTo,
    retry: ctx.retryPlayback,

    setQueue: ctx.setQueue,
    addToQueue: ctx.addToQueue,
    removeFromQueue: ctx.removeFromQueue,
    reorderQueue: ctx.reorderQueue,
    clearQueue: ctx.clearQueue,
    setSource: ctx.setPlaybackSource,

    setVolume: ctx.setVolume,
    toggleMute: ctx.toggleMute,
    toggleRepeat: ctx.toggleRepeat,
    toggleShuffle: ctx.toggleShuffle,
    setPlaybackRate: ctx.setPlaybackRate,
    setCrossfadeEnabled: ctx.setCrossfadeEnabled,
    setCrossfadeDuration: ctx.setCrossfadeDuration,

    raw: ctx,
  };
}

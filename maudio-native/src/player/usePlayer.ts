import { useEffect, useState, useCallback } from "react";
import TrackPlayer, {
  Event,
  State,
  useActiveTrack,
  usePlaybackState,
  useProgress,
} from "react-native-track-player";
import { setupPlayer } from "./setup";
import { audioUrl, coverUrl } from "@/lib/supabase";

export type AppTrack = {
  id: string;
  title: string;
  artist: string;
  audio_file_path: string;
  cover_art_path?: string | null;
  duration?: number | null;
  album_name?: string | null;
};

function toRNTPTrack(t: AppTrack) {
  return {
    id: t.id,
    url: audioUrl(t.audio_file_path) || "",
    title: t.title,
    artist: t.artist,
    album: t.album_name || undefined,
    artwork: coverUrl(t.cover_art_path) || undefined,
    duration: t.duration || undefined,
  };
}

export function usePlayerSetup() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setupPlayer().then(() => setReady(true)).catch((e) => console.warn("[player] setup", e));
  }, []);
  return ready;
}

export function usePlayer() {
  const active = useActiveTrack();
  const state = usePlaybackState();
  const progress = useProgress(500);

  const isPlaying = state.state === State.Playing;

  const playTrack = useCallback(async (t: AppTrack, queue?: AppTrack[]) => {
    await setupPlayer();
    await TrackPlayer.reset();
    const items = (queue && queue.length ? queue : [t]).map(toRNTPTrack);
    await TrackPlayer.add(items);
    const idx = items.findIndex((i) => i.id === t.id);
    if (idx > 0) await TrackPlayer.skip(idx);
    await TrackPlayer.play();
  }, []);

  const togglePlay = useCallback(async () => {
    isPlaying ? await TrackPlayer.pause() : await TrackPlayer.play();
  }, [isPlaying]);

  return {
    current: active as any,
    isPlaying,
    position: progress.position,
    duration: progress.duration,
    playTrack,
    togglePlay,
    next: () => TrackPlayer.skipToNext().catch(() => {}),
    previous: () => TrackPlayer.skipToPrevious().catch(() => {}),
    seekTo: (s: number) => TrackPlayer.seekTo(s),
  };
}
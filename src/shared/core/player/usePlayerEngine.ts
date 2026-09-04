import { useMemo } from "react";
import { useMusicPlayer } from "@web/contexts/music-player";
import { createPlayerEngine, type PlayerEngine } from "./PlayerEngine";

/** Consume playback state/actions through the centralized PlayerEngine. */
export function usePlayerEngine(): PlayerEngine {
  const ctx = useMusicPlayer();
  return useMemo(() => createPlayerEngine(ctx), [ctx]);
}

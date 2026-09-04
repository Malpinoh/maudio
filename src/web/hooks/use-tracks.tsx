import { useState, useEffect } from 'react';
import { toast } from "sonner";
import type { Track, TracksFilter } from '@/types/track-types';
import { useMusicRepository } from '@/core';

// Fix: Use 'export type' for re-exporting types with isolatedModules enabled
export type { Track, TracksFilter } from '@/types/track-types';
export { logStreamPlay } from '@/services/track-service';

/** Reads music data exclusively through MusicRepository. */
export function useTracks(filter: TracksFilter = { published: true, limit: 10 }) {
  const repository = useMusicRepository();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadTracks() {
      try {
        setLoading(true);
        const data = await repository.getTracks(filter);
        if (!cancelled) setTracks(data);
      } catch (err) {
        console.error('Error fetching tracks:', err);
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Unknown error fetching tracks'));
          toast.error('Failed to load tracks');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadTracks();
    return () => { cancelled = true; };
  }, [
    repository,
    filter.published, 
    filter.genre, 
    filter.mood, 
    filter.artist, 
    filter.searchTerm, 
    filter.limit,
    filter.orderBy?.column,
    filter.orderBy?.ascending,
    filter.tags,
    filter.chartType,
    filter.region,
    filter.chartPeriod
  ]);

  return { tracks, loading, error };
}


import { useState, useEffect } from 'react';
import { toast } from "sonner";
import type { Track } from '@/types/track-types';
import { useMusicRepository } from '@/core';

export function useTrack(id: string | undefined) {
  const repository = useMusicRepository();
  const [track, setTrack] = useState<Track | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    async function loadTrack() {
      try {
        setLoading(true);
        const data = await repository.getTrack(id!);
        if (!cancelled) setTrack(data);
      } catch (err) {
        console.error('Error fetching track:', err);
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Unknown error fetching track'));
          toast.error('Failed to load track');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadTrack();
    return () => { cancelled = true; };
  }, [id, repository]);

  return { track, loading, error };
}

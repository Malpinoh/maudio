import { useState, useEffect } from 'react';
import { supabase } from "@shared/integrations/supabase/client";
import { toast } from "sonner";
import type { Track } from '@shared/types/track-types';
import { useMusicRepository } from '@shared/core';

export function useTrending(limit = 50) {
  const repository = useMusicRepository();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadTrendingTracks() {
      try {
        setLoading(true);
        setError(null);
        const data = await repository.getTrending(limit);
        if (!cancelled) setTracks(data);
      } catch (err) {
        console.error('Error loading trending tracks:', err);
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Unknown error loading trending tracks'));
          toast.error('Failed to load trending tracks');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadTrendingTracks();
    return () => { cancelled = true; };
  }, [limit, repository]);

  return { tracks, loading, error };
}

// Hook to manually trigger trending score calculation (for admin use)
export function useCalculateTrending() {
  const [calculating, setCalculating] = useState(false);
  
  const calculateTrending = async () => {
    try {
      setCalculating(true);
      
      const { error } = await supabase.rpc('calculate_trending_scores');
      
      if (error) {
        throw error;
      }
      
      toast.success('Trending scores calculated successfully');
      return true;
    } catch (err) {
      console.error('Error calculating trending scores:', err);
      toast.error('Failed to calculate trending scores');
      return false;
    } finally {
      setCalculating(false);
    }
  };
  
  return { calculateTrending, calculating };
}
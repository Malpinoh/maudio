import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export function useTopPicks(limit = 10) {
  const { user } = useAuth();
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let data: any[] | null = null;
      if (user) {
        const res = await supabase.rpc("recommend_tracks_for_user", {
          p_user_id: user.id,
          p_limit: limit,
        });
        if (!res.error) data = res.data as any[];
      }
      if (!data || data.length === 0) {
        // Trending fallback
        const res = await supabase
          .from("tracks")
          .select("*")
          .eq("published", true)
          .order("play_count", { ascending: false })
          .limit(limit);
        data = res.data as any[];
      }
      if (!cancelled) {
        setTracks(data || []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, limit]);

  return { tracks, loading };
}
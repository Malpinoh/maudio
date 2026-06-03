import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type Filter = {
  limit?: number;
  genre?: string;
  chartType?: "global" | "regional" | "trending";
  region?: string;
  orderBy?: { column: string; ascending: boolean };
};

export function useTracks(filter: Filter = {}) {
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let q = supabase.from("tracks").select("*").eq("published", true);
      if (filter.genre) q = q.eq("genre", filter.genre);
      const order = filter.orderBy || { column: "uploaded_at", ascending: false };
      q = q.order(order.column, { ascending: order.ascending });
      if (filter.limit) q = q.limit(filter.limit);
      const { data, error } = await q;
      if (!cancelled) {
        if (error) console.warn("useTracks", error);
        setTracks(data || []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [JSON.stringify(filter)]);

  return { tracks, loading };
}

export function useChartTracks(scope: "global" | "regional", region?: string, limit = 50) {
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      // Fallback to tracks ordered by play_count when chart views are not yet
      // available. Track B will introduce daily/weekly views.
      let q = supabase
        .from("tracks")
        .select("*")
        .eq("published", true)
        .order("play_count", { ascending: false })
        .limit(limit);
      const { data } = await q;
      if (!cancelled) {
        setTracks(data || []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scope, region, limit]);

  return { tracks, loading };
}
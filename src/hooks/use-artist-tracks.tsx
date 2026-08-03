import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Track } from "@/types/track-types";
import { useMusicRepository, useStorageManager } from "@/core";

/**
 * Artist tracks are fetched via MusicRepository; the realtime subscription only
 * keeps the already-loaded list in sync.
 */
export function useArtistTracks(artistId: string) {
  const repository = useMusicRepository();
  const storage = useStorageManager();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!artistId) return;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const data = await repository.getArtistTracks(artistId);
        if (!cancelled) setTracks(data);
      } catch (error) {
        console.error("Error fetching artist tracks:", error);
        if (!cancelled) toast.error("Failed to load artist tracks");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const withUrls = (row: any): Track => ({
      ...(row as Track),
      cover: storage.coverUrl(row.cover_art_path),
      audioUrl: storage.audioUrl(row.audio_file_path),
    });

    const channel = supabase
      .channel("artist-tracks-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tracks",
          filter: `or(user_id.eq.${artistId},artist_profile_id.eq.${artistId})`,
        },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            setTracks((prev) =>
              prev.map((t) => (t.id === (payload.new as any).id ? withUrls(payload.new) : t)),
            );
          } else if (payload.eventType === "INSERT") {
            setTracks((prev) => [withUrls(payload.new), ...prev]);
          } else if (payload.eventType === "DELETE") {
            setTracks((prev) => prev.filter((t) => t.id !== (payload.old as any).id));
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [artistId, repository, storage]);

  return { tracks, loading };
}

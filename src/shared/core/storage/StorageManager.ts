/**
 * StorageManager — the single abstraction over every storage provider MAUDIO
 * uses. Components and pages must never talk to S3, Capacitor Filesystem or
 * Supabase Storage directly; they go through this interface.
 *
 * Providers:
 *  - remote media  : AWS S3 (future) / Supabase Storage (current) for audio,
 *                    album artwork and artist images.
 *  - device storage: Capacitor Filesystem + SQLite for downloads and the
 *                    200 MB LRU audio cache (see src/lib/offline/storage.ts).
 *  - metadata      : Supabase (rows, not files) — exposed via MusicRepository.
 *
 * Media is addressed by *key* (e.g. `audio/{artistId}/{albumId}/{trackId}.mp3`)
 * so the remote provider can be swapped without touching callers.
 */
import {
  cacheTrackInBackground,
  deleteDownload,
  downloadTrack,
  getCacheUsage,
  getOfflineFileUri,
  getOfflineUri,
  isCached,
  isDownloaded,
  listCached,
  listDownloads,
  listOfflineMix,
  clearCache,
  offlineToTrack,
  type OfflineTrack,
  type TrackForOffline,
} from "@/lib/offline/storage";

export type MediaKind = "audio" | "cover" | "artist";

export interface RemoteMediaProvider {
  readonly id: string;
  /** Resolve a storage key (or already-absolute URL) into a playable/render URL. */
  urlFor(kind: MediaKind, key: string | null | undefined): string;
}

const SUPABASE_PUBLIC_BASE =
  "https://qkpjlfcpncvvjyzfolag.supabase.co/storage/v1/object/public";

const BUCKETS: Record<MediaKind, string> = {
  audio: "audio_files",
  cover: "cover_art",
  artist: "cover_art",
};

/** Current remote provider: Supabase Storage public buckets. */
export const supabaseMediaProvider: RemoteMediaProvider = {
  id: "supabase",
  urlFor(kind, key) {
    if (!key) return "";
    if (key.startsWith("http://") || key.startsWith("https://")) return key;
    if (key.startsWith("blob:") || key.startsWith("file:")) return key;
    return `${SUPABASE_PUBLIC_BASE}/${BUCKETS[kind]}/${key.replace(/^\/+/, "")}`;
  },
};

/**
 * S3 provider stub. Once the bucket/CDN host is configured this becomes the
 * default provider and nothing else in the app has to change.
 */
export function createS3MediaProvider(publicBaseUrl: string): RemoteMediaProvider {
  return {
    id: "s3",
    urlFor(kind, key) {
      if (!key) return "";
      if (key.startsWith("http")) return key;
      return `${publicBaseUrl.replace(/\/+$/, "")}/${key.replace(/^\/+/, "")}`;
    },
  };
}

export interface StorageManager {
  /** Remote media URLs. */
  audioUrl(key: string | null | undefined): string;
  coverUrl(key: string | null | undefined): string;
  artistImageUrl(key: string | null | undefined): string;
  /**
   * Best available source for a track: downloaded file → cached file → remote.
   */
  resolvePlaybackUrl(trackId: string, remoteKey: string): Promise<string>;

  /** Device storage (offline). */
  isDownloaded(trackId: string): Promise<boolean>;
  isCached(trackId: string): Promise<boolean>;
  download(track: TrackForOffline, onProgress?: (p: number) => void): Promise<void>;
  removeDownload(trackId: string): Promise<void>;
  listDownloads(): Promise<OfflineTrack[]>;
  listCached(): Promise<OfflineTrack[]>;
  listOfflineMix(): Promise<OfflineTrack[]>;
  cacheInBackground(track: TrackForOffline): Promise<void>;
  cacheUsage(): Promise<{ used: number; limit: number }>;
  clearCache(): Promise<void>;
  toTrack(entry: OfflineTrack): any;
}

export function createStorageManager(
  provider: RemoteMediaProvider = supabaseMediaProvider,
): StorageManager {
  return {
    audioUrl: (key) => provider.urlFor("audio", key),
    coverUrl: (key) => provider.urlFor("cover", key),
    artistImageUrl: (key) => provider.urlFor("artist", key),

    async resolvePlaybackUrl(trackId, remoteKey) {
      const local = await getOfflineUri(trackId).catch(() => null);
      if (local) return local;
      return provider.urlFor("audio", remoteKey);
    },

    isDownloaded,
    isCached,
    download: downloadTrack,
    removeDownload: deleteDownload,
    listDownloads,
    listCached,
    listOfflineMix,
    cacheInBackground: cacheTrackInBackground,
    cacheUsage: getCacheUsage,
    clearCache,
    toTrack: offlineToTrack,
  };
}

export { getOfflineFileUri };
export type { OfflineTrack, TrackForOffline };

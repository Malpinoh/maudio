/**
 * StorageManager — the single abstraction over every storage provider MAUDIO
 * uses. Components and pages must never talk to S3, Capacitor Filesystem or
 * Supabase Storage directly; they go through this interface.
 *
 * Providers:
 *  - remote media  : AWS S3 (future) / Supabase Storage (current) for audio,
 *                    album artwork and artist images.
 *  - device storage: Capacitor Filesystem + SQLite for downloads and the
 *                    200 MB LRU audio cache (provided by the Mobile Client).
 *  - metadata      : Supabase (rows, not files) — exposed via MusicRepository.
 *
 * Media is addressed by *key* (e.g. `audio/{artistId}/{albumId}/{trackId}.mp3`)
 * so the remote provider can be swapped without touching callers.
 */
/**
 * Device storage (downloads + LRU cache) is a *client capability*, not shared
 * code: the Mobile Client provides the Capacitor/SQLite implementation and
 * registers it at boot. On the Web Client the no-op implementation below is
 * used, so shared code never imports client-specific modules.
 */
export type OfflineTrack = Record<string, any>;

export type TrackForOffline = Record<string, any> & { id: string };

export interface DeviceStorage {
  isDownloaded(trackId: string): Promise<boolean>;
  isCached(trackId: string): Promise<boolean>;
  getOfflineUri(trackId: string): Promise<string | null>;
  getOfflineFileUri(trackId: string): Promise<string | null>;
  downloadTrack(track: TrackForOffline, onProgress?: (p: number) => void): Promise<void>;
  deleteDownload(trackId: string): Promise<void>;
  listDownloads(): Promise<OfflineTrack[]>;
  listCached(): Promise<OfflineTrack[]>;
  listOfflineMix(): Promise<OfflineTrack[]>;
  cacheTrackInBackground(track: TrackForOffline): Promise<void>;
  getCacheUsage(): Promise<{ used: number; limit: number }>;
  clearCache(): Promise<void>;
  offlineToTrack(entry: OfflineTrack): any;
}

/** Browser fallback: nothing is stored on the device. */
export const noopDeviceStorage: DeviceStorage = {
  isDownloaded: async () => false,
  isCached: async () => false,
  getOfflineUri: async () => null,
  getOfflineFileUri: async () => null,
  downloadTrack: async () => {},
  deleteDownload: async () => {},
  listDownloads: async () => [],
  listCached: async () => [],
  listOfflineMix: async () => [],
  cacheTrackInBackground: async () => {},
  getCacheUsage: async () => ({ used: 0, limit: 0 }),
  clearCache: async () => {},
  offlineToTrack: (entry) => entry,
};

let activeDeviceStorage: DeviceStorage = noopDeviceStorage;

/** Called once at boot by the client that owns device storage. */
export function registerDeviceStorage(impl: DeviceStorage): void {
  activeDeviceStorage = impl;
}

export function getDeviceStorage(): DeviceStorage {
  return activeDeviceStorage;
}

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
  device: () => DeviceStorage = getDeviceStorage,
): StorageManager {
  return {
    audioUrl: (key) => provider.urlFor("audio", key),
    coverUrl: (key) => provider.urlFor("cover", key),
    artistImageUrl: (key) => provider.urlFor("artist", key),

    async resolvePlaybackUrl(trackId, remoteKey) {
      const local = await device().getOfflineUri(trackId).catch(() => null);
      if (local) return local;
      return provider.urlFor("audio", remoteKey);
    },

    isDownloaded: (id) => device().isDownloaded(id),
    isCached: (id) => device().isCached(id),
    download: (track, onProgress) => device().downloadTrack(track, onProgress),
    removeDownload: (id) => device().deleteDownload(id),
    listDownloads: () => device().listDownloads(),
    listCached: () => device().listCached(),
    listOfflineMix: () => device().listOfflineMix(),
    cacheInBackground: (track) => device().cacheTrackInBackground(track),
    cacheUsage: () => device().getCacheUsage(),
    clearCache: () => device().clearCache(),
    toTrack: (entry) => device().offlineToTrack(entry),
  };
}

/** Best local file:// URI for a track (used by the native player bridge). */
export const getOfflineFileUri = (trackId: string) =>
  getDeviceStorage().getOfflineFileUri(trackId);

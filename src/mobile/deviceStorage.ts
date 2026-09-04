/**
 * Mobile Client → shared contract adapter.
 *
 * Implements the `DeviceStorage` capability declared in the shared layer using
 * Capacitor Filesystem + SQLite. Registered once at boot from `src/main.tsx`.
 * On the web every call safely degrades (the underlying module already guards
 * on `Capacitor.isNativePlatform()`).
 */
import type { DeviceStorage } from "@shared/core/storage/StorageManager";
import {
  cacheTrackInBackground,
  clearCache,
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
  offlineToTrack,
} from "./offline/storage";

export const capacitorDeviceStorage: DeviceStorage = {
  isDownloaded,
  isCached,
  getOfflineUri,
  getOfflineFileUri,
  downloadTrack,
  deleteDownload,
  listDownloads,
  listCached,
  listOfflineMix,
  cacheTrackInBackground,
  getCacheUsage,
  clearCache,
  offlineToTrack,
};

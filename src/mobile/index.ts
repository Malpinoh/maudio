/**
 * MAUDIO Mobile Client — capability layer.
 *
 * The Web Client imports native capabilities from this single entry point only
 * (`@mobile`). Everything here is safe to call in a browser: each function
 * degrades to a no-op or a web fallback when Capacitor is not present.
 *
 * Rule: MAUDIO has exactly two clients — Web (`src/web`) and Mobile
 * (`src/mobile` + `android/`). Never create a second MAUDIO application.
 */
export * from "./native";
export * from "./nativePlayer";
export * from "./offline/network";
export { capacitorDeviceStorage } from "./deviceStorage";

export {
  CACHE_LIMIT_BYTES,
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
  type OfflineTrack,
  type TrackForOffline,
} from "./offline/storage";

export { useCapacitor } from "./use-capacitor";
export { NativeBootstrap } from "./NativeBootstrap";

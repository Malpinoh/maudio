import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  RatingType,
} from "react-native-track-player";

let isReady = false;

export async function setupPlayer(): Promise<void> {
  if (isReady) return;
  try {
    await TrackPlayer.setupPlayer({
      autoHandleInterruptions: true,
    });
  } catch (e: any) {
    if (!String(e?.message || "").includes("already been initialized")) throw e;
  }
  await TrackPlayer.updateOptions({
    ratingType: RatingType.Heart,
    android: {
      appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
    },
    capabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.SkipToNext,
      Capability.SkipToPrevious,
      Capability.SeekTo,
      Capability.Stop,
    ],
    compactCapabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext],
    notificationCapabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.SkipToNext,
      Capability.SkipToPrevious,
      Capability.SeekTo,
    ],
    progressUpdateEventInterval: 2,
  });
  isReady = true;
}
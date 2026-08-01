package com.maudio.online.player;

import android.Manifest;
import android.content.ComponentName;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import androidx.annotation.OptIn;
import androidx.core.content.ContextCompat;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.session.MediaController;
import androidx.media3.session.SessionToken;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.google.common.util.concurrent.ListenableFuture;
import com.google.common.util.concurrent.MoreExecutors;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Capacitor bridge to the native Media3 player.
 *
 * The WebView no longer decodes audio. It only sends commands here and renders
 * state coming back, which is what makes lock-screen playback survive Android
 * 13/14/15 background restrictions and aggressive OEM battery managers.
 */
@OptIn(markerClass = UnstableApi.class)
@CapacitorPlugin(
        name = "MaudioPlayer",
        permissions = {
                @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS })
        }
)
public class MaudioPlayerPlugin extends Plugin {

    private static final String TAG = "MaudioPlayer";
    private static final long POSITION_INTERVAL_MS = 500L;

    private MediaController controller;
    private ListenableFuture<MediaController> controllerFuture;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private boolean progressRunning = false;

    private final Runnable progressTicker = new Runnable() {
        @Override
        public void run() {
            if (controller != null && controller.isPlaying()) {
                JSObject data = new JSObject();
                data.put("positionMs", controller.getCurrentPosition());
                data.put("durationMs", safeDuration());
                data.put("bufferedMs", controller.getBufferedPosition());
                notifyListeners("positionChanged", data);
            }
            if (progressRunning) handler.postDelayed(this, POSITION_INTERVAL_MS);
        }
    };

    // ---------------------------------------------------------------- lifecycle

    @Override
    public void load() {
        connectController();
    }

    private void connectController() {
        if (controller != null || controllerFuture != null) return;
        try {
            SessionToken token = new SessionToken(
                    getContext(),
                    new ComponentName(getContext(), MaudioPlayerService.class));
            controllerFuture = new MediaController.Builder(getContext(), token).buildAsync();
            controllerFuture.addListener(() -> {
                try {
                    controller = controllerFuture.get();
                    controller.addListener(playerListener);
                    startProgress();
                    emitState();
                } catch (Exception e) {
                    Log.w(TAG, "Unable to connect MediaController", e);
                    controllerFuture = null;
                }
            }, MoreExecutors.directExecutor());
        } catch (Exception e) {
            Log.w(TAG, "Unable to build MediaController", e);
        }
    }

    @Override
    protected void handleOnDestroy() {
        stopProgress();
        if (controller != null) {
            controller.removeListener(playerListener);
            controller.release();
            controller = null;
        }
        controllerFuture = null;
        super.handleOnDestroy();
    }

    // ---------------------------------------------------------------- listener

    private final Player.Listener playerListener = new Player.Listener() {
        @Override
        public void onIsPlayingChanged(boolean isPlaying) {
            emitState();
            if (isPlaying) startProgress();
        }

        @Override
        public void onPlaybackStateChanged(int state) {
            emitState();
            if (state == Player.STATE_ENDED) {
                notifyListeners("queueEnded", new JSObject());
            }
        }

        @Override
        public void onMediaItemTransition(MediaItem mediaItem, int reason) {
            JSObject data = new JSObject();
            data.put("trackId", mediaItem != null ? mediaItem.mediaId : null);
            data.put("index", controller != null ? controller.getCurrentMediaItemIndex() : 0);
            data.put("reason", reason);
            notifyListeners("trackChanged", data);
            emitState();
        }

        @Override
        public void onPlayerError(PlaybackException error) {
            JSObject data = new JSObject();
            data.put("code", error.errorCode);
            data.put("name", error.getErrorCodeName());
            data.put("message", error.getMessage());
            data.put("trackId", currentTrackId());
            notifyListeners("error", data);
        }
    };

    private void startProgress() {
        if (progressRunning) return;
        progressRunning = true;
        handler.postDelayed(progressTicker, POSITION_INTERVAL_MS);
    }

    private void stopProgress() {
        progressRunning = false;
        handler.removeCallbacks(progressTicker);
    }

    private long safeDuration() {
        if (controller == null) return 0L;
        long d = controller.getDuration();
        return d == androidx.media3.common.C.TIME_UNSET || d < 0 ? 0L : d;
    }

    private String currentTrackId() {
        if (controller == null) return null;
        MediaItem item = controller.getCurrentMediaItem();
        return item != null ? item.mediaId : null;
    }

    private JSObject stateObject() {
        JSObject data = new JSObject();
        if (controller == null) {
            data.put("connected", false);
            return data;
        }
        data.put("connected", true);
        data.put("isPlaying", controller.isPlaying());
        data.put("playWhenReady", controller.getPlayWhenReady());
        data.put("playbackState", controller.getPlaybackState());
        data.put("isBuffering", controller.getPlaybackState() == Player.STATE_BUFFERING);
        data.put("positionMs", controller.getCurrentPosition());
        data.put("durationMs", safeDuration());
        data.put("index", controller.getCurrentMediaItemIndex());
        data.put("queueLength", controller.getMediaItemCount());
        data.put("trackId", currentTrackId());
        data.put("shuffle", controller.getShuffleModeEnabled());
        data.put("repeatMode", controller.getRepeatMode());
        return data;
    }

    private void emitState() {
        notifyListeners("state", stateObject());
    }

    // ---------------------------------------------------------------- commands

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("available", true);
        ret.put("connected", controller != null);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestNotificationPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }
        boolean granted = ContextCompat.checkSelfPermission(
                getContext(), Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
        if (granted) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }
        requestPermissionForAlias("notifications", call, "notificationPermissionResult");
    }

    @PermissionCallback
    private void notificationPermissionResult(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", getPermissionState("notifications") == PermissionState.GRANTED);
        call.resolve(ret);
    }

    @PluginMethod
    public void load(PluginCall call) {
        JSArray tracks = call.getArray("tracks");
        int startIndex = call.getInt("startIndex", 0);
        boolean autoplay = Boolean.TRUE.equals(call.getBoolean("autoplay", true));
        long startPositionMs = call.getLong("startPositionMs", 0L);

        if (tracks == null) {
            call.reject("tracks is required");
            return;
        }

        List<MediaItem> items = toMediaItems(tracks);
        if (items.isEmpty()) {
            call.reject("no playable tracks supplied");
            return;
        }
        final int safeIndex = Math.max(0, Math.min(startIndex, items.size() - 1));

        runOnController(call, () -> {
            controller.setMediaItems(items, safeIndex, startPositionMs);
            controller.prepare();
            controller.setPlayWhenReady(autoplay);
            startProgress();
            call.resolve(stateObject());
        });
    }

    @PluginMethod
    public void updateQueue(PluginCall call) {
        JSArray tracks = call.getArray("tracks");
        if (tracks == null) { call.reject("tracks is required"); return; }
        List<MediaItem> items = toMediaItems(tracks);
        runOnController(call, () -> {
            String keepId = currentTrackId();
            long position = controller.getCurrentPosition();
            int index = 0;
            for (int i = 0; i < items.size(); i++) {
                if (items.get(i).mediaId.equals(keepId)) { index = i; break; }
            }
            controller.setMediaItems(items, index, keepId == null ? 0 : position);
            controller.prepare();
            call.resolve(stateObject());
        });
    }

    @PluginMethod
    public void play(PluginCall call) {
        runOnController(call, () -> {
            controller.play();
            startProgress();
            call.resolve(stateObject());
        });
    }

    @PluginMethod
    public void pause(PluginCall call) {
        runOnController(call, () -> { controller.pause(); call.resolve(stateObject()); });
    }

    @PluginMethod
    public void next(PluginCall call) {
        runOnController(call, () -> {
            if (controller.hasNextMediaItem()) controller.seekToNextMediaItem();
            call.resolve(stateObject());
        });
    }

    @PluginMethod
    public void previous(PluginCall call) {
        runOnController(call, () -> {
            if (controller.hasPreviousMediaItem()) controller.seekToPreviousMediaItem();
            else controller.seekTo(0);
            call.resolve(stateObject());
        });
    }

    @PluginMethod
    public void seekTo(PluginCall call) {
        long positionMs = call.getLong("positionMs", 0L);
        runOnController(call, () -> { controller.seekTo(positionMs); call.resolve(stateObject()); });
    }

    @PluginMethod
    public void skipToIndex(PluginCall call) {
        int index = call.getInt("index", 0);
        runOnController(call, () -> {
            if (index >= 0 && index < controller.getMediaItemCount()) {
                controller.seekTo(index, 0L);
            }
            call.resolve(stateObject());
        });
    }

    @PluginMethod
    public void setRepeat(PluginCall call) {
        String mode = call.getString("mode", "off");
        final int repeat = "one".equals(mode) ? Player.REPEAT_MODE_ONE
                : "all".equals(mode) ? Player.REPEAT_MODE_ALL
                : Player.REPEAT_MODE_OFF;
        runOnController(call, () -> { controller.setRepeatMode(repeat); call.resolve(stateObject()); });
    }

    @PluginMethod
    public void setShuffle(PluginCall call) {
        boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled", false));
        runOnController(call, () -> { controller.setShuffleModeEnabled(enabled); call.resolve(stateObject()); });
    }

    @PluginMethod
    public void setSpeed(PluginCall call) {
        Double rate = call.getDouble("rate", 1.0);
        final float speed = rate == null ? 1f : rate.floatValue();
        runOnController(call, () -> { controller.setPlaybackSpeed(speed); call.resolve(stateObject()); });
    }

    @PluginMethod
    public void setVolume(PluginCall call) {
        Double volume = call.getDouble("volume", 1.0);
        final float v = volume == null ? 1f : Math.max(0f, Math.min(1f, volume.floatValue()));
        runOnController(call, () -> { controller.setVolume(v); call.resolve(stateObject()); });
    }

    @PluginMethod
    public void getState(PluginCall call) {
        runOnController(call, () -> call.resolve(stateObject()));
    }

    @PluginMethod
    public void clear(PluginCall call) {
        runOnController(call, () -> {
            controller.stop();
            controller.clearMediaItems();
            stopProgress();
            call.resolve(stateObject());
        });
    }

    /** Push the browse tree used by Android Auto / Bluetooth head units. */
    @PluginMethod
    public void syncLibrary(PluginCall call) {
        JSObject tree = call.getObject("tree");
        LibraryCache.write(getContext(), tree == null ? "" : tree.toString());
        call.resolve();
    }

    // ---------------------------------------------------------------- helpers

    private void runOnController(PluginCall call, Runnable action) {
        connectController();
        getActivity().runOnUiThread(() -> {
            if (controller == null) {
                call.reject("player not connected");
                return;
            }
            try {
                action.run();
            } catch (Exception e) {
                Log.w(TAG, "player command failed", e);
                call.reject(e.getMessage() == null ? "player command failed" : e.getMessage());
            }
        });
    }

    private List<MediaItem> toMediaItems(JSArray tracks) {
        List<MediaItem> items = new ArrayList<>();
        try {
            JSONArray raw = new JSONArray(tracks.toString());
            for (int i = 0; i < raw.length(); i++) {
                JSONObject track = raw.optJSONObject(i);
                if (track == null) continue;
                MediaItem item = LibraryCache.playableItem(track);
                if (item != null) items.add(item);
            }
        } catch (Exception e) {
            Log.w(TAG, "Unable to parse tracks", e);
        }
        return items;
    }
}

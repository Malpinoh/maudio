package com.maudio.online.player;

import android.content.Context;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;

import androidx.annotation.Nullable;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Browse tree + track resolution cache for Android Auto / Bluetooth head units.
 *
 * The React layer pushes a snapshot of the user's library into SharedPreferences
 * via MaudioPlayerPlugin.syncLibrary(). Native code reads it here so the browse
 * tree keeps working even when the WebView is not running (car connected with the
 * app cold, headset button pressed after process death, etc).
 */
public final class LibraryCache {

    public static final String PREFS = "maudio_library_cache";
    public static final String KEY_TREE = "tree_json";

    public static final String ROOT_ID = "[root]";

    private final Context context;

    public LibraryCache(Context context) {
        this.context = context.getApplicationContext();
    }

    public static void write(Context context, String json) {
        SharedPreferences prefs = context.getApplicationContext()
                .getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        prefs.edit().putString(KEY_TREE, json == null ? "" : json).apply();
    }

    private JSONObject readTree() {
        try {
            String raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                    .getString(KEY_TREE, "");
            if (raw == null || raw.isEmpty()) return null;
            return new JSONObject(raw);
        } catch (Exception e) {
            return null;
        }
    }

    /** Top-level browsable sections (Recently Played, Downloads, Charts, ...). */
    public List<MediaItem> getRootChildren() {
        List<MediaItem> out = new ArrayList<>();
        JSONObject tree = readTree();
        if (tree == null) return out;
        JSONArray sections = tree.optJSONArray("sections");
        if (sections == null) return out;
        for (int i = 0; i < sections.length(); i++) {
            JSONObject section = sections.optJSONObject(i);
            if (section == null) continue;
            String id = section.optString("id", "");
            if (id.isEmpty()) continue;
            JSONArray tracks = section.optJSONArray("tracks");
            if (tracks == null || tracks.length() == 0) continue;
            out.add(browsableItem(id, section.optString("title", id), section.optString("artworkUrl", "")));
        }
        return out;
    }

    /** Playable tracks inside a section. */
    public List<MediaItem> getSectionChildren(String sectionId) {
        List<MediaItem> out = new ArrayList<>();
        JSONObject section = findSection(sectionId);
        if (section == null) return out;
        JSONArray tracks = section.optJSONArray("tracks");
        if (tracks == null) return out;
        for (int i = 0; i < tracks.length(); i++) {
            JSONObject track = tracks.optJSONObject(i);
            if (track == null) continue;
            MediaItem item = playableItem(track);
            if (item != null) out.add(item);
        }
        return out;
    }

    /** Resolve a bare mediaId (from Auto / a restored session) into a playable item. */
    @Nullable
    public MediaItem resolve(String mediaId) {
        if (mediaId == null || mediaId.isEmpty()) return null;
        JSONObject tree = readTree();
        if (tree == null) return null;
        JSONArray sections = tree.optJSONArray("sections");
        if (sections == null) return null;
        for (int i = 0; i < sections.length(); i++) {
            JSONObject section = sections.optJSONObject(i);
            if (section == null) continue;
            JSONArray tracks = section.optJSONArray("tracks");
            if (tracks == null) continue;
            for (int j = 0; j < tracks.length(); j++) {
                JSONObject track = tracks.optJSONObject(j);
                if (track != null && mediaId.equals(track.optString("id", ""))) {
                    return playableItem(track);
                }
            }
        }
        return null;
    }

    /** All tracks of the section containing this id, so Auto taps queue the whole list. */
    public List<MediaItem> siblingsOf(String mediaId) {
        JSONObject tree = readTree();
        if (tree == null) return new ArrayList<>();
        JSONArray sections = tree.optJSONArray("sections");
        if (sections == null) return new ArrayList<>();
        for (int i = 0; i < sections.length(); i++) {
            JSONObject section = sections.optJSONObject(i);
            if (section == null) continue;
            JSONArray tracks = section.optJSONArray("tracks");
            if (tracks == null) continue;
            for (int j = 0; j < tracks.length(); j++) {
                JSONObject track = tracks.optJSONObject(j);
                if (track != null && mediaId.equals(track.optString("id", ""))) {
                    return getSectionChildren(section.optString("id", ""));
                }
            }
        }
        return new ArrayList<>();
    }

    @Nullable
    private JSONObject findSection(String sectionId) {
        JSONObject tree = readTree();
        if (tree == null) return null;
        JSONArray sections = tree.optJSONArray("sections");
        if (sections == null) return null;
        for (int i = 0; i < sections.length(); i++) {
            JSONObject section = sections.optJSONObject(i);
            if (section != null && sectionId.equals(section.optString("id", ""))) return section;
        }
        return null;
    }

    private static MediaItem browsableItem(String id, String title, String artworkUrl) {
        MediaMetadata.Builder md = new MediaMetadata.Builder()
                .setTitle(title)
                .setIsBrowsable(true)
                .setIsPlayable(false)
                .setMediaType(MediaMetadata.MEDIA_TYPE_FOLDER_MIXED);
        if (artworkUrl != null && artworkUrl.startsWith("http")) {
            md.setArtworkUri(Uri.parse(artworkUrl));
        }
        return new MediaItem.Builder().setMediaId(id).setMediaMetadata(md.build()).build();
    }

    @Nullable
    public static MediaItem playableItem(JSONObject track) {
        String id = track.optString("id", "");
        String url = track.optString("url", "");
        if (id.isEmpty() || url.isEmpty()) return null;

        MediaMetadata.Builder md = new MediaMetadata.Builder()
                .setTitle(track.optString("title", "Unknown title"))
                .setArtist(track.optString("artist", "Unknown artist"))
                .setAlbumTitle(track.optString("album", ""))
                .setIsBrowsable(false)
                .setIsPlayable(true)
                .setMediaType(MediaMetadata.MEDIA_TYPE_MUSIC);

        String artwork = track.optString("artworkUrl", "");
        if (artwork.startsWith("http")) md.setArtworkUri(Uri.parse(artwork));

        long durationMs = track.optLong("durationMs", 0L);
        if (durationMs > 0) {
            Bundle extras = new Bundle();
            extras.putLong("durationMs", durationMs);
            md.setExtras(extras);
        }

        return new MediaItem.Builder()
                .setMediaId(id)
                .setUri(Uri.parse(url))
                .setMediaMetadata(md.build())
                .build();
    }

    /** Convert a plain map (from the JS bridge) into a playable MediaItem. */
    @Nullable
    public static MediaItem fromMap(Map<String, Object> map) {
        try {
            JSONObject json = new JSONObject(new LinkedHashMap<>(map));
            return playableItem(json);
        } catch (Exception e) {
            return null;
        }
    }
}

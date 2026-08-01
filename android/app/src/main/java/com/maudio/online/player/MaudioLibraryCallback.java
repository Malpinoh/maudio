package com.maudio.online.player;

import android.content.Context;
import android.os.Bundle;

import androidx.annotation.OptIn;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.session.LibraryResult;
import androidx.media3.session.MediaLibraryService.LibraryParams;
import androidx.media3.session.MediaLibraryService.MediaLibrarySession;
import androidx.media3.session.MediaSession;

import com.google.common.collect.ImmutableList;
import com.google.common.util.concurrent.Futures;
import com.google.common.util.concurrent.ListenableFuture;

import java.util.ArrayList;
import java.util.List;

/**
 * Exposes the MAUDIO library as a MediaBrowser tree so Android Auto, Wear, Assistant
 * and Bluetooth head units can browse and start playback without the WebView running.
 *
 * Also resolves bare mediaIds into playable MediaItems, which is what makes
 * "play <song> on MAUDIO" and Auto list taps work.
 */
@OptIn(markerClass = UnstableApi.class)
public class MaudioLibraryCallback implements MediaLibrarySession.Callback {

    private final LibraryCache cache;

    public MaudioLibraryCallback(Context context) {
        this.cache = new LibraryCache(context);
    }

    @Override
    public ListenableFuture<LibraryResult<MediaItem>> onGetLibraryRoot(
            MediaLibrarySession session,
            MediaSession.ControllerInfo browser,
            LibraryParams params) {

        MediaItem root = new MediaItem.Builder()
                .setMediaId(LibraryCache.ROOT_ID)
                .setMediaMetadata(new MediaMetadata.Builder()
                        .setTitle("MAUDIO")
                        .setIsBrowsable(true)
                        .setIsPlayable(false)
                        .setMediaType(MediaMetadata.MEDIA_TYPE_FOLDER_MIXED)
                        .build())
                .build();

        return Futures.immediateFuture(LibraryResult.ofItem(root, params));
    }

    @Override
    public ListenableFuture<LibraryResult<ImmutableList<MediaItem>>> onGetChildren(
            MediaLibrarySession session,
            MediaSession.ControllerInfo browser,
            String parentId,
            int page,
            int pageSize,
            LibraryParams params) {

        List<MediaItem> children = LibraryCache.ROOT_ID.equals(parentId)
                ? cache.getRootChildren()
                : cache.getSectionChildren(parentId);

        return Futures.immediateFuture(
                LibraryResult.ofItemList(ImmutableList.copyOf(children), params));
    }

    @Override
    public ListenableFuture<LibraryResult<MediaItem>> onGetItem(
            MediaLibrarySession session,
            MediaSession.ControllerInfo browser,
            String mediaId) {

        MediaItem item = cache.resolve(mediaId);
        if (item == null) {
            return Futures.immediateFuture(LibraryResult.ofError(LibraryResult.RESULT_ERROR_BAD_VALUE));
        }
        return Futures.immediateFuture(LibraryResult.ofItem(item, null));
    }

    /**
     * Controllers (Auto, Assistant, a restored session) hand us MediaItems that carry
     * only a mediaId. Fill in the playback URI + metadata from the cache, otherwise
     * ExoPlayer would reject them.
     */
    @Override
    public ListenableFuture<List<MediaItem>> onAddMediaItems(
            MediaSession session,
            MediaSession.ControllerInfo controller,
            List<MediaItem> mediaItems) {

        List<MediaItem> resolved = new ArrayList<>();
        for (MediaItem item : mediaItems) {
            if (item.localConfiguration != null) {
                resolved.add(item);
                continue;
            }
            MediaItem hydrated = cache.resolve(item.mediaId);
            if (hydrated != null) resolved.add(hydrated);
        }
        return Futures.immediateFuture(resolved);
    }

    /**
     * When Auto taps a single track we queue its whole section so next/previous work
     * on the head unit instead of dead-ending after one song.
     */
    @Override
    public ListenableFuture<MediaSession.MediaItemsWithStartPosition> onSetMediaItems(
            MediaSession session,
            MediaSession.ControllerInfo controller,
            List<MediaItem> mediaItems,
            int startIndex,
            long startPositionMs) {

        if (mediaItems.size() == 1 && mediaItems.get(0).localConfiguration == null) {
            String mediaId = mediaItems.get(0).mediaId;
            List<MediaItem> siblings = cache.siblingsOf(mediaId);
            if (!siblings.isEmpty()) {
                int index = 0;
                for (int i = 0; i < siblings.size(); i++) {
                    if (siblings.get(i).mediaId.equals(mediaId)) { index = i; break; }
                }
                return Futures.immediateFuture(
                        new MediaSession.MediaItemsWithStartPosition(siblings, index, startPositionMs));
            }
        }

        return Futures.transform(
                onAddMediaItems(session, controller, mediaItems),
                items -> new MediaSession.MediaItemsWithStartPosition(items, startIndex, startPositionMs),
                Runnable::run);
    }

    @Override
    public ListenableFuture<LibraryResult<Void>> onSubscribe(
            MediaLibrarySession session,
            MediaSession.ControllerInfo browser,
            String parentId,
            LibraryParams params) {
        session.notifyChildrenChanged(browser, parentId, Integer.MAX_VALUE, params);
        return Futures.immediateFuture(LibraryResult.ofVoid());
    }
}


# MAUDIO Storage Migration → AWS S3

Goal: AWS S3 becomes the sole media store for audio + images. Supabase keeps auth, database, realtime, edge functions. App code talks only to a `MediaStorage` service abstraction that stores **media keys** (never raw URLs) so we can swap providers later.

---

## 1. Prerequisites (need from you)

Before I build anything:

1. **Connect AWS S3** — I'll link Lovable's AWS S3 connector to this project. You'll paste an Access Key ID + Secret Key from an IAM user with permissions on your bucket (`s3:PutObject`, `GetObject`, `DeleteObject`, `ListBucket`, `AbortMultipartUpload`, `CreateMultipartUpload`, `UploadPart`, `CompleteMultipartUpload`). Enable `write` scope.
2. **Bucket name + region** (e.g. `maudio-media`, `us-east-1`).
3. **CORS on the S3 bucket** — I'll give you the JSON to paste in AWS Console → Permissions → CORS (needed for browser signed-URL uploads/downloads).
4. **Decide**: Should the bucket be **fully private** (signed URLs for playback, ~15 min expiry, auto-refresh) or **public-read** (permanent HTTPS URLs, simpler, less secure)? Recommendation: **private + signed URLs** for audio, **public-read** for artwork.

---

## 2. Storage Service Abstraction

New module: `src/lib/media-storage/` and mirrored `supabase/functions/_shared/media-storage/`.

```text
media-storage/
  types.ts          ← MediaKey, UploadResult, SizeVariant
  provider.ts       ← MediaStorageProvider interface
  s3-provider.ts    ← AWS S3 implementation (via edge fn)
  index.ts          ← singleton, currently returns S3 provider
  keys.ts           ← buildAudioKey(), buildCoverKey(), buildArtistKey()
  url.ts            ← resolveMediaUrl(key) — signed or public
```

Interface (all methods async):
- `getUploadUrl(key, contentType)` → `{ uploadUrl, method, headers }`
- `getMultipartUpload(key, contentType, partCount)` → per-part signed URLs + completion token
- `getReadUrl(key, opts?)` → signed HTTPS URL (or public URL for images)
- `delete(key)`
- `head(key)` → size, contentType, exists

App code **only** imports from `media-storage/` — never calls AWS or Supabase Storage directly. All DB columns store `*_key` (e.g. `audio_key`, `cover_key`, `avatar_key`), never full URLs.

---

## 3. Edge Functions (S3 signing lives server-side)

New: `supabase/functions/media-sign/index.ts`
- POST `{ action: 'upload'|'read'|'multipart-init'|'multipart-sign'|'multipart-complete'|'delete', key, contentType?, partCount?, uploadId?, parts? }`
- Auth: requires valid Supabase JWT. For `upload`/`delete`, checks that the key's `artist-id` belongs to the caller (or caller is admin).
- Calls AWS via Lovable's AWS S3 connector gateway (`connector-gateway.lovable.dev/aws_s3`) using `sign_storage_url` for single PUT/GET, and direct SigV4 for multipart. Bucket + region from connector config; region from a new `AWS_S3_REGION` secret if not in the connector.
- File-type allowlist enforced server-side: `audio/mpeg, audio/wav, audio/flac, audio/mp4, audio/aac, image/jpeg, image/png, image/webp`.

Updated: existing `music-upload` and `audio-converter` functions rewritten to accept an already-uploaded S3 key + return processed keys back.

New: `supabase/functions/image-optimize/index.ts` — invoked after cover/artist image upload, generates `thumb` (200), `medium` (600), `large` (1400) WebP variants, stores under sibling keys (`.../cover.jpg` → `.../cover_thumb.webp` etc.), writes size map to DB.

---

## 4. Key Structure

```text
artists/{artist_id}/profile_{uuid}.{ext}
covers/{artist_id}/{album_id}/cover_{uuid}.{ext}
covers/{artist_id}/{album_id}/cover_thumb.webp
covers/{artist_id}/{album_id}/cover_medium.webp
covers/{artist_id}/{album_id}/cover_large.webp
audio/{artist_id}/{album_id}/{track_id}_{uuid}.{ext}
previews/{artist_id}/{album_id}/{track_id}_preview.mp3
```

`{uuid}` on the leaf prevents collisions and lets us replace files without cache issues.

---

## 5. Database Migration

New nullable columns (kept alongside existing paths during transition):
- `tracks`: `audio_key`, `preview_key`, `cover_key`, `cover_sizes jsonb`
- `profiles`: `avatar_key`, `avatar_sizes jsonb`
- `playlists`: `cover_key`, `cover_sizes jsonb`
- `featured_banners`: `image_key`

DB function `public.get_media_key(...)` returns the key with sensible fallback (new key → legacy path). No RLS changes needed; keys are opaque.

Legacy columns (`audio_file_path`, `cover_art_path`, `avatar_url`) stay in schema until migration completes, then dropped in a follow-up.

---

## 6. Upload Flow (Client)

1. Client requests key from `keys.ts` (deterministic given artist/album/track ids).
2. Client calls `media-sign` for a signed upload URL (or multipart plan if file > 20 MB).
3. Client PUTs directly to S3 with progress. For multipart, uploads parts in parallel (concurrency 4), retries per part, resumes from local IndexedDB state on interrupt.
4. On success, client calls the existing `music-upload` fn with `{ audio_key, cover_key, ...metadata }` — server validates the objects exist via `head`, then inserts the DB row.
5. Server enqueues `image-optimize` for cover/artist images.

Client-side image compression before upload: canvas resize to max 1600px + JPEG q0.85 (skipped for audio).

---

## 7. Playback / Read Flow

- `resolveMediaUrl(key, { kind: 'audio' })` → calls a lightweight cached edge fn `media-sign` (`action: 'read'`) that returns a 15-min signed URL. Client caches URL in memory keyed by media key + expiry-1min; auto-refreshes before expiry.
- Images: bucket policy allows public-read on `covers/**` and `artists/**` prefixes only → return `https://{bucket}.s3.{region}.amazonaws.com/{key}` directly, no signing round-trip.
- `useMusicPlayerState` playback priority stays the same: Downloaded → Cached → `resolveMediaUrl(track.audio_key)`. HLS variants (`track_quality_variants`) get the same key-based treatment.

---

## 8. Existing Data Migration

New edge fn `supabase/functions/media-migrate/index.ts` (admin-only, invocable from a new **Admin → Storage Migration** panel):

- Paginates `tracks`, `profiles`, `playlists`, `featured_banners` with legacy paths and null new keys.
- For each row: downloads from Supabase Storage → uploads to S3 under the new key structure → verifies via `head` (size match) → writes `*_key` column → logs to a new `media_migration_log` table (row id, from_path, to_key, status, error).
- Dry-run mode + resumable (skips rows already migrated). Rate-limited to avoid egress spikes.
- **Nothing is deleted from Supabase Storage automatically**. After you confirm 100% success, a separate "cleanup" action removes source objects. Legacy columns dropped in a follow-up migration once you're confident.

Admin UI (`src/components/admin/StorageMigration.tsx`): Start/Pause/Resume, per-table progress bars, error list, dry-run toggle, final cleanup button.

---

## 9. Offline / Capacitor

No changes to `src/lib/offline/storage.ts` API. Under the hood, download simply fetches from the resolved S3 URL instead of Supabase — behavior is identical to user. 200 MB LRU cache and Downloads tab unchanged. Native lock-screen controls unaffected.

---

## 10. Security

- Bucket private by default. Public-read policy scoped to `covers/*` and `artists/*` prefixes only.
- All uploads go through `media-sign` — enforces auth, ownership (`artist_id` in key must match `user_id` in profile, or admin), MIME allowlist, and max size (audio 200 MB, image 15 MB).
- Signed read URLs for audio: 15 min TTL.
- No S3 credentials ever reach the browser — only signed URLs.
- CORS locked to your app origins (I'll provide JSON).

---

## 11. Rollout Order

1. AWS connector + secrets + bucket CORS (you).
2. DB migration adding `*_key` columns.
3. `media-storage` service + `media-sign` edge fn.
4. Rewire upload UI + `useTrackUpload` to new flow.
5. Rewire playback + image rendering to `resolveMediaUrl`.
6. `image-optimize` fn + size variants.
7. Admin migration panel + `media-migrate` fn — dry run on staging data.
8. Full data migration.
9. Cleanup migration: drop legacy columns, empty Supabase Storage buckets.

Each step is independently deployable; app keeps working with legacy paths until step 5 flips reads.

---

## Confirmations needed before I start

1. Confirm AWS S3 as provider (vs. also wanting R2/B2 support wired now).
2. **Private bucket + signed URLs everywhere**, or **public-read for images, signed for audio** (my recommendation)?
3. Bucket name + AWS region.
4. OK to keep legacy Supabase Storage columns for one full release cycle after migration completes before dropping them?

Once you confirm, I'll start with Step 1 (AWS connector) and Step 2 (DB migration).

# File upload visibility trace & root-cause analysis

## Symptom recap

On affected machines, newly uploaded files are physically present but do **not** show up in the UI file/design library after upload and even after a browser reload. They only appear after restarting OctoPrint.

## End-to-end upload flow (local uploads)

1. The browser uploads via `POST /api/files/<target>` from the Files view model (`jquery.fileupload`).
   - Frontend wiring: `FilesViewModel._setDropzone` and upload callbacks in `files.js`.
2. API endpoint `uploadGcodeFile(target)` receives the uploaded temp file and wraps it as `DiskFileWrapper`.
3. The endpoint sanitizes path/name and calls `fileManager.add_file(...)`.
4. `FileManager.add_file(...)` delegates to storage (`LocalFileStorage.add_file(...)`), then fires:
   - `Events.FILE_ADDED`
   - `Events.UPDATED_FILES` (`{"type": "printables"}`)
5. In the browser, `onEventUpdatedFiles` calls `requestData()` to reload list data.
6. `requestData()` calls `OctoPrint.files.list(true, force)` → `GET /api/files?recursive=true`.

## Where stale results can be returned

There are **two independent caches** in this flow that both rely on filesystem last-modified timestamps:

1. API layer cache in `server/api/files.py` (`_file_cache`)
   - `_getFileList(... allow_from_cache=True)` caches based on
     `fileManager.last_modified(origin, recursive=True)`.
2. Storage layer cache in `filemanager/storage.py` (`self._filelist_cache`)
   - `_list_folder(... force_refresh=False)` reuses cached tree when
     `cache[0] >= lm` where `lm = self.last_modified(path, recursive=True)`.

### Important detail: `last_modified()` does **not** look at every file's mtime

`LocalFileStorage.last_modified()` computes folder-level recency from:
- folder mtime (`os.stat(folder).st_mtime`)
- optional `.metadata.json` mtime

When recursive, it takes max over folders.

So if a filesystem/mount does not reliably advance directory or metadata mtimes for the observed operation pattern (or only does so with coarse timestamp resolution), both caches may believe "nothing changed" and continue serving stale trees until process restart clears in-memory caches.

## Why this can happen on only some machines

This is consistent with per-machine filesystem differences:

- Different upload folder backing store (e.g. ext4 vs CIFS/NFS/FUSE/overlay).
- Different mount options and metadata caching behavior.
- Coarser mtime resolution on some filesystems (changes in same timestamp quantum can compare equal).

Because cache reuse checks use mtime-based comparisons, behavior can diverge even with identical OctoPrint code.

## Additional observations from code behavior

- Browser reload alone does not guarantee fresh data: `/api/files` is wrapped in ETag/Last-Modified revalidation. If server-side last-modified is unchanged, browser may receive 304 and keep old list.
- Manual refresh button in file sidebar (`requestData({force: true})`) bypasses server revalidation path and sets `force=true` query parameter. If this works while normal reload does not, that strongly implicates cache invalidation/mtime detection.

## Practical diagnostics to confirm on affected machines

1. Compare upload folder filesystem types and mount options across affected vs unaffected machines.
2. Immediately after upload, inspect timestamps:
   - uploaded file mtime
   - parent folder mtime
   - `.metadata.json` mtime
3. Hit API both ways and compare:
   - normal: `GET /api/files?recursive=true`
   - forced: `GET /api/files?recursive=true&force=true`
4. From UI, use refresh button (force path). If file appears only with force or restart, stale cache path is confirmed.

## Most likely root cause

The most likely cause is timestamp-based cache invalidation missing file additions on some filesystem setups, causing stale in-memory file list caches (`_file_cache` and/or `_filelist_cache`) to persist until OctoPrint restart.

## Potential hardening ideas

- Invalidate caches on `Events.UPDATED_FILES` directly (event-driven invalidation instead of timestamp-only invalidation).
- Include per-file checks or directory content hash in invalidation criteria (more expensive, but robust).
- Avoid `>=` cache reuse on low-resolution timestamps, or add monotonic change tokens on mutating operations.


## Additional plausible trigger: system clock skew / time going backwards

Yes — this is possible and fits the current cache logic.

Why:

- Both cache layers compare "cached lastmodified" against current filesystem-derived `last_modified` values.
- If the system clock was previously ahead (or files/folders carry future mtimes) and later moves back, a cached timestamp can remain **greater** than newly computed timestamps.
- In that state, cache checks can keep treating stale data as fresh:
  - API cache refresh condition uses `cached_lm < current_lm`.
  - Storage cache reuse condition uses `cache[0] >= lm`.

So after a backward time jump, new uploads may fail to invalidate caches until restart (which clears in-memory caches) or until filesystem mtimes eventually exceed the previously cached future value.

Notes:

- The UI sort field (`date`) comes from file `st_mtime`, so skew can also distort ordering.
- The main visibility issue, however, is primarily from mtime-based cache invalidation decisions.

Quick checks for this scenario:

1. Compare `date -u` and NTP sync status on affected hosts.
2. Inspect suspiciously future mtimes under uploads (folders and `.metadata.json`).
3. After reproducing, compare `/api/files?recursive=true` vs `/api/files?recursive=true&force=true`.


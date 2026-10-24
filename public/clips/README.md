# Card trailer media

Every timeline card (all 112 titles) plays a self-hosted, muted, looping copy of the official trailer.
The fallbacks are noted per title in `scripts/media/manifest.json` (`$note`):

- an official clip for a title that never had an online trailer (Luke Cage S2);
- a commentary featurette for A Funny Thing Happened on the Way to Thor's Hammer, not offered in the drawer;
- a licensed Movieclips / Rotten Tomatoes Classic Trailers upload when the studio never posted the trailer.

One pair of files per title, named by the entry's `clip`:

- `<clip>.webm`: AV1 (SVT-AV1 CRF 42), 768x320, no audio, keyframe every 2 s, cues at the front
- `<clip>.mp4`: H.264 Main 3.1 (CRF 27, max 450 kbps), 768x320, no audio, keyframe every 2 s, `+faststart`

The video files are not committed (see `.gitignore`) and are not deployed to Cloudflare Pages. They live
in the R2 bucket `verseorder-media` under `clips/`, served at `https://media.verseorder.watch/clips/`
(an R2 custom domain on the verseorder.watch zone). R2 answers byte ranges itself (206, `Accept-Ranges`,
`Content-Range`) and the Cloudflare edge caches the objects, so playing a clip runs no Worker or Pages
Function. The bucket's CORS policy allows GET/HEAD with `Range` from verseorder.watch (a plain `<video>`
doesn't need it). Upload new or changed files with:

    set -a; . /path/to/cloudflare.env; set +a   # CLOUDFLARE_API_TOKEN (R2 edit), CLOUDFLARE_ACCOUNT_ID
    node scripts/media/upload_clips.mjs --dry-run   # list what would be sent
    node scripts/media/upload_clips.mjs             # upload (compares MD5s, sends only new files)

Objects carry `Cache-Control: public, max-age=31536000, immutable`, so a re-encoded clip needs a new file
name, not an overwrite: name it e.g. `<clip>-v2`, set that `clip` in `scripts/media/manifest.json` and
`src/data/watch-order.json`, upload, then deploy the site. If a local file differs (MD5 vs. R2 ETag) from
the object under the same key, the script uploads nothing and exits 1, with or without `--dry-run`.
`--overwrite` replaces those objects anyway and purges their URLs from the Cloudflare cache (the token
needs Zone > Cache Purge, otherwise it prints the URLs to purge by hand); browsers that already cached
the old file keep it. Same-bytes objects with a wrong `Cache-Control` are re-put. The decision logic is
in `scripts/media/upload_plan.mjs`, tested with `npm run test:scripts`. The site reads the base URL from `mediaBase` in
`site.config.json`; build with `NEXT_PUBLIC_MEDIA_BASE=/clips` to play the local files here instead. The
CSP `media-src` in `public/_headers` must allow the media host. If a file is missing, the card falls back
to the static banner.

They are produced by `scripts/media/build_media.py` from `scripts/media/manifest.json`. Per title it
records the source upload, the rating-card / black trim (`trim.start`, plus `trim.end` to cut a
re-uploader's end card), the letterbox crop (or a fixed crop that cuts a burned-in streaming
watermark), and the TMDB backdrop and focus point. Check each encode's contact sheet and corners for
burned-in subtitles and logos.

    python3 scripts/media/build_media.py resolve backdrops   # TMDB candidates + contact sheets
    python3 scripts/media/build_media.py fetch analyze       # download, detect trim/crop, sheets
    python3 scripts/media/build_media.py encode apply        # write clips + watch-order.json

The TMDB token is read at runtime from `~/.secrets/tmdb_verseorder.env` (or `TMDB_ENV`) and is
never written to the repo. Work files go to `.media-work/` (ignored).

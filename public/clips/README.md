# Card trailer media

Every timeline card (all 112 titles) plays a self-hosted, muted, looping copy of the official trailer.
The fallbacks are noted per title in `scripts/media/manifest.json` (`$note`):

- an official clip for a title that never had an online trailer (Luke Cage S2);
- a commentary featurette for A Funny Thing Happened on the Way to Thor's Hammer, not offered in the drawer;
- a licensed Movieclips / Rotten Tomatoes Classic Trailers upload when the studio never posted the trailer.

One pair of files per title, named by the entry's `clip`:

- `<clip>.webm`: AV1 (SVT-AV1 CRF 42), 768x320, no audio, keyframe every 2 s, cues at the front
- `<clip>.mp4`: H.264 Main 3.1 (CRF 27, max 450 kbps), 768x320, no audio, keyframe every 2 s, `+faststart`

The video files are not committed (see `.gitignore`). They are served same-origin from `/clips/` by the
Cloudflare Pages project. A Pages Function (`functions/clips/[[path]].js`) answers byte-range requests
from the Cache API. Put the files here before `npm run build`, and `npm run deploy:cloudflare` uploads
them with the rest of `out/` (each file must stay under 25 MiB). `NEXT_PUBLIC_MEDIA_BASE` can point at a
different media host instead (CSP `media-src` in `public/_headers` must then allow it). If a file is
missing, the card falls back to the static banner.

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

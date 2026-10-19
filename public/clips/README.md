# Card trailer media

The banner card plays a self-hosted, muted, looping copy of the official trailer (or, for titles
that never had one, an official clip). One pair of files per title, named by the entry's `clip`:

- `<clip>.webm`: AV1 (SVT-AV1 CRF 42), 768x320, no audio, keyframe every 2 s
- `<clip>.mp4`: H.264 Main 3.1 (CRF 27, max 450 kbps), 768x320, no audio, keyframe every 2 s, `+faststart`

The video files are not committed (see `.gitignore`). They are served same-origin from `/clips/` by the
Cloudflare Pages project: put them here before `npm run build`, and `npm run deploy:cloudflare` uploads
them with the rest of `out/` (each file must stay under 25 MiB). `NEXT_PUBLIC_MEDIA_BASE` can point at a
different media host instead (CSP `media-src` in `public/_headers` must then allow it). If a file is
missing, the card falls back to the static banner.

They are produced by `scripts/media/build_media.py` from `scripts/media/manifest.json` (source
upload, rating-card / black trim, letterbox crop, TMDB backdrop and focus point per title):

    python3 scripts/media/build_media.py resolve backdrops   # TMDB candidates + contact sheets
    python3 scripts/media/build_media.py fetch analyze       # download, detect trim/crop, sheets
    python3 scripts/media/build_media.py encode apply        # write clips + watch-order.json

The TMDB token is read at runtime from `~/.secrets/tmdb_verseorder.env` (or `TMDB_ENV`) and is
never written to the repo. Work files go to `.media-work/` (ignored).

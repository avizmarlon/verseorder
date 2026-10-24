# Changelog

## Unreleased

- Give every one of the 112 timeline cards a TMDB backdrop banner (per-title focus point) and a self-hosted, muted, looping trailer preview (AV1 WebM + H.264 MP4, 768x320, no audio) served from `https://media.verseorder.watch/clips/`. The detail drawer keeps the click-to-load YouTube embed.
- Preload card media ahead of the viewport. The scroller is the IntersectionObserver root, so the margin applies. Only the start of the next few cards is fetched, nothing loads before the page settles, far cards release their sources, Save-Data is respected, and only one video decodes at a time. On touch, the timeline dot drives playback, held back during flings.
- Serve the clips from the R2 bucket `verseorder-media` through the custom domain `media.verseorder.watch` instead of a Pages Function. R2 answers byte ranges natively (206, `Accept-Ranges`, `Content-Range`), the Cloudflare edge caches the objects (one-year immutable `Cache-Control`), and the bucket CORS policy allows GET/HEAD with `Range` from verseorder.watch. The site is now fully static: `functions/clips` (which used Worker CPU per range request and went over the free-plan CPU limit) is removed, the clips are left out of the Pages deploy, and CSP `media-src` allows the media host. Add `scripts/media/upload_clips.mjs` (MD5-diffed uploads) and the `mediaBase` setting in `site.config.json` (`NEXT_PUBLIC_MEDIA_BASE` overrides it).
- `scripts/media/upload_clips.mjs` no longer overwrites an R2 object whose ETag differs from the local MD5 (the one-year immutable cache would keep serving the old clip). It uploads nothing and exits 1, also with `--dry-run`, and asks for a new versioned file name. `--overwrite` forces it and purges those URLs from the Cloudflare cache. The decision logic is in `scripts/media/upload_plan.mjs`, covered by `npm run test:scripts` (`node --test`, run in CI).
- WebM clips are muxed with cues at the front so the first range request is enough to start playback.
- Add `scripts/media/build_media.py` + `scripts/media/manifest.json`: a TMDB lookup (official videos, textless backdrops, posters), fetch, rating-card/black trim, letterbox detection, encode and data apply. Per-title overrides cover the end-card trim (licensed re-uploads) and crops that cut burned-in streaming watermarks (Netflix, Disney+).
- Fallbacks: titles with no studio trailer upload use an official clip (Luke Cage S2) or a licensed Movieclips / Rotten Tomatoes Classic Trailers upload (pre-2010 Fox/New Line titles), trimmed before the end card. Commentary-only sources (A Funny Thing Happened on the Way to Thor's Hammer) are not offered as the drawer trailer. Iron Man and Iron Man 2 come from marvel.com (Brightcove) and have no YouTube drawer trailer.
- Remove the `/lab` prototype page, its styles and its test.
- Move the website to https://verseorder.watch on Cloudflare Pages. The old GitHub Pages address redirects there.
- Show real cover art for the titles in the timeline, title details and adjacent-title navigation, with the original medallion as a fallback when a cover is missing.
- Add `scripts/resolve-posters.mjs` to resolve cover links (Wikipedia and TVMaze) into the data file.
- Use the standard MIT license text and clarify that titles, characters and artwork belong to their respective owners.
- Add canonical, OpenGraph, robots, sitemap, JSON-LD metadata and a pull-request CI workflow.

## 0.5.0 — 2026-10-18

- Introduce the living watch-order timeline, four chapters, celestial medallions, and scroll-driven light.
- Add title search, type and continuity filters, accessible details, and locally saved viewing progress.
- Keep the complete curated 112-title sequence and English interface.
- Publish the static website on GitHub Pages and clarify MIT attribution to Marlon Aviz.

## 0.1.1 — 2026-10-17

- Use English throughout the site, editorial data, watch-order Markdown and content generators.
- Preserve saved viewing progress while retiring the language selector and legacy language preference.

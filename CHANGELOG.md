# Changelog

## Unreleased

- Move the website to https://verseorder.watch on Cloudflare Pages, with security and cache headers; the old GitHub Pages address redirects to the same page on the new domain.
- Keep the site address in a single setting (`site.config.json`, overridable with `SITE_URL`).
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

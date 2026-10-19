# Deployment

The website is a static Next.js export served by **Cloudflare Pages** at https://verseorder.watch.

## Site address

The public address lives in [`site.config.json`](site.config.json) and feeds the canonical URL,
OpenGraph and JSON-LD metadata, `robots.txt` and `sitemap.xml`. Set `SITE_URL` at build time to
override it (for example for a preview).

## Builds

| Command | Output | Used for |
| --- | --- | --- |
| `npm run build` | `out/`, served from `/` | Cloudflare Pages |
| `npm run build:github-pages` | `out/`, served from `/verseorder` | Legacy GitHub Pages copy |
| `npm run build:redirect` | `out-redirect/` | GitHub Pages redirect stubs |

`scripts/build-redirect.mjs` writes one small page for every page of the export, plus `404.html`
(which GitHub Pages serves for any other path). Each sends visitors to the same path on the new
domain, keeping the query string and `#hash`, with a canonical link and a no-JavaScript fallback.

## Cloudflare Pages

[`.github/workflows/cloudflare-pages.yml`](.github/workflows/cloudflare-pages.yml) runs on every
push to `main`: lint, build, type check, end-to-end tests, a check against the Cloudflare Pages
limits (25 MiB per file, 20,000 files), then
`wrangler pages deploy out --project-name=verseorder --branch=main`.

It needs two repository secrets:

- `CLOUDFLARE_API_TOKEN`: an API token with the **Account › Cloudflare Pages › Edit** permission.
- `CLOUDFLARE_ACCOUNT_ID`: the Cloudflare account ID.

Without them the workflow still builds and tests, then skips the deploy with a warning.

Response headers and redirects come from [`public/_headers`](public/_headers) and
[`public/_redirects`](public/_redirects). HSTS is not set yet. If the card trailers are ever moved to
another host (`NEXT_PUBLIC_MEDIA_BASE`), add that origin to `media-src` in the
Content-Security-Policy.

## Card trailer clips

Card trailers are served from `/clips/`. The video files are **not committed** (`public/clips/*.mp4`
and `*.webm` are ignored by Git). They are added to the build output only at deploy time:

- **Local deploy:** put the files in `public/clips/`, run `npm run build` (Next.js copies them to
  `out/clips/`), then `npm run deploy:cloudflare` with `CLOUDFLARE_API_TOKEN` and
  `CLOUDFLARE_ACCOUNT_ID` set.
- **GitHub Actions:** set the repository variable `CLIPS_RELEASE` to the tag of a release whose
  assets are the clip files; the workflow downloads them into `public/clips/` before building.

Every Cloudflare Pages deployment is a full snapshot, so a deploy without the clips removes them
from the live site and the cards fall back to their static banners. `/clips/*` is cached for a
year: give a re-encoded clip a new file name.

## GitHub Pages

[`.github/workflows/pages.yml`](.github/workflows/pages.yml) keeps publishing
https://avizmarlon.github.io/verseorder/. Until the repository variable `GITHUB_PAGES_REDIRECT` is
set to `true`, it publishes the full site there as before. Once it is `true`, it publishes only the
redirect stubs.

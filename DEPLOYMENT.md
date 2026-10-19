# Deployment

The site is a static Next.js export hosted on Cloudflare Pages at https://verseorder.watch.

## Site address

The address is set once in [`site.config.json`](site.config.json). It's used for the canonical
link, OpenGraph and JSON-LD data, `robots.txt` and `sitemap.xml`. To build with a different
address, set `SITE_URL`.

## Builds

- `npm run build` builds the site into `out/`, served from `/`. This is what goes to Cloudflare.
- `npm run build:github-pages` builds the old GitHub Pages version, served from `/verseorder`.
- `npm run build:redirect` builds the GitHub Pages redirect pages into `out-redirect/`.

The redirect pages send visitors from the old address to the same page on the new one. The path,
query string and `#hash` are kept, and it works without JavaScript too.

## Deploying to Cloudflare Pages

Deploys run from the maintainer's machine, not from GitHub Actions:

1. Put the card trailer clips in `public/clips/` (see below).
2. Run `npm run build`.
3. Run `npm run deploy:cloudflare` with `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` set.
   The token needs the Cloudflare Pages edit permission.

The [Cloudflare Pages build](.github/workflows/cloudflare-pages.yml) workflow runs on every push to
`main`. It builds and tests the site and checks the Cloudflare Pages limits (25 MiB per file,
20,000 files), but it doesn't deploy.

The printable PDF is too big for Cloudflare Pages (over 25 MiB). `npm run deploy:cloudflare` leaves
it out, and `/verseorder-watch-order.pdf` redirects to the copy on GitHub.

Response headers and redirects are in [`public/_headers`](public/_headers) and
[`public/_redirects`](public/_redirects). HSTS isn't turned on yet. If the clips ever move to
another host (`NEXT_PUBLIC_MEDIA_BASE`), add that host to `media-src` in the
Content-Security-Policy.

## Card trailer clips

The cards play short trailer clips from `/clips/`. The video files aren't in this repository
(`public/clips/*.mp4` and `*.webm` are in `.gitignore`), so keep them on the machine you deploy
from. `npm run build` copies them into `out/clips/`.

Each Cloudflare Pages deploy replaces the whole site. If you deploy without the clips, they
disappear from the live site and the cards show their still banners instead.

`/clips/*` is cached for a year. If you re-encode a clip, give it a new file name.

## GitHub Pages

The [GitHub Pages](.github/workflows/pages.yml) workflow keeps publishing
https://avizmarlon.github.io/verseorder/. By default it publishes the full site there. When the
repository variable `GITHUB_PAGES_REDIRECT` is `true`, it publishes only the redirect pages.

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

Deploys run from the maintainer's machine, not from GitHub Actions. Check out `main`, pull, and
run `npm run deploy:cloudflare` with `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` set (the
token needs the Cloudflare Pages edit permission). [`scripts/deploy-cloudflare.mjs`](scripts/deploy-cloudflare.mjs):

1. Prints the commit being deployed and warns if the branch isn't `main` or the working tree has
   uncommitted changes. Both still deploy to production, so stop it (Ctrl+C) if that isn't intended.
2. Always runs `npm run build`, so `out/` matches the checkout. An `out/` left over from another
   branch or commit is never uploaded. It stops if `HEAD` changes during the build.
3. Runs `scripts/prepare-cloudflare.mjs` (below).
4. Runs `wrangler pages deploy out --branch=main` with the commit hash, subject and dirty flag, so
   the Cloudflare dashboard shows which commit each deployment came from.

The site is fully static: there is no `functions/` directory, so no request runs a Pages Function
or Worker (the Workers free plan caps CPU time per request). `scripts/prepare-cloudflare.mjs`
refuses to deploy if a `functions/` directory shows up.

The [Cloudflare Pages build](.github/workflows/cloudflare-pages.yml) workflow runs on every push to
`main`. It builds and tests the site and checks the Cloudflare Pages limits (25 MiB per file,
20,000 files), but it doesn't deploy.

The old printable PDF (`public/verseorder-watch-order.pdf`) is out of date and isn't published:
`npm run deploy:cloudflare` leaves it out (it's also over the 25 MiB Pages limit), and
`/verseorder-watch-order.pdf` returns a plain 404. Nothing redirects to it for now.

Response headers and redirects are in [`public/_headers`](public/_headers) and
[`public/_redirects`](public/_redirects). HSTS isn't turned on yet. The clip host
(`https://media.verseorder.watch`) is allowed in `media-src` of the Content-Security-Policy; if it
ever changes, update both `mediaBase` in `site.config.json` and the CSP.

## Card trailer clips

The cards play short trailer clips from `https://media.verseorder.watch/clips/`, an R2 bucket
(`verseorder-media`) with a custom domain on the verseorder.watch zone. R2 serves byte ranges
natively (Safari needs 206 responses) and the edge caches the files, so they cost no Worker CPU
and stay within the R2 free tier (10 GB storage, 1M Class A and 10M Class B operations per month,
free egress; the 224 files are about 0.9 GB).

The video files aren't in this repository (`public/clips/*.mp4` and `*.webm` are in `.gitignore`)
and they aren't part of the Pages deploy: `scripts/prepare-cloudflare.mjs` removes `out/clips/`.
Deploying the site without them is safe. To add or change clips, run
`node scripts/media/upload_clips.mjs` (see [public/clips/README.md](public/clips/README.md)); the
token needs R2 edit access.

Clips are cached for a year (`immutable`). If you re-encode a clip, give it a new file name and
update its `clip` in the data. The upload script refuses (exit 1) to replace an existing object
with different bytes; `--overwrite` forces it and purges the edge cache, but browsers keep the
old copy.

## GitHub Pages

The [GitHub Pages](.github/workflows/pages.yml) workflow keeps publishing
https://avizmarlon.github.io/verseorder/. By default it publishes the full site there. When the
repository variable `PAGES_REDIRECT` is `true`, it publishes only the redirect pages.

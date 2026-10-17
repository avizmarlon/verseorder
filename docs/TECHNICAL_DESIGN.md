# Technical architecture — v0.1

**State:** first runnable design prototypes; not a finalized production architecture.

## Stack and the trade-off

- Next.js 16 App Router + React + TypeScript; static export for now (`output: "export"`).
- Tailwind CSS available as a utility layer; art direction is custom CSS, not a stock UI template.
- Motion for React scene transitions/card animation and layout; GSAP installed for complex sequenced animation once art direction is selected.
- WebGL/React Three Fiber/Three.js are **deliberately deferred**; add only for proven immersive visual needs. Next.js is not inherently more animation-capable than Astro; its advantage here is the eventual rich React app platform and server feature migration.
- Self-hosted fontsource Space Grotesk / DM Sans.
- Runtime data: `src/data/watch-order.json` (typed by UI contracts). Stable IDs are never derived from current order positions.
- Viewer state: `verseorder:watched:v1` localStorage key; locale: `verseorder:locale:v1`. No backend.
- Static art and reusable licensed imagery live in `src/assets` and are bundled by Next.js for proper static-hosting paths. Motion and decorative CSS layers must have `prefers-reduced-motion` alternative.

## Static hosting

`npm run build` generates `out/`. Root hosting works without configuration. For GitHub Pages, build with `GITHUB_PAGES=true` so Next.js uses `/verseorder/` as `basePath` and `assetPrefix`. Choose and configure hosting explicitly later; repository existence does not imply a site deploy.

**Limit:** static export does not run runtime server actions, server auth/cookies, dynamic API routes, or server-generated personalized pages. When accounts/community launch, switch deployment appropriately rather than faking server functionality in the browser.

## Data and editorial strategy

Import `scripts/import_watch_order.py` documents the initial mechanical conversion of the owner's existing 110-item Markdown. The output JSON is a **baseline snapshot** with `editorialStatus = baseline-unreviewed`. The source file remains on the owner's machine; clean public MD and JSON are generated. `content/excluded.md` contains exclusions in a separate file as requested.

For long-term editorial changes, maintain stable IDs, traceable ordering decisions, localized rationale, source URLs and spoiler boundaries. Do not run the initial importer again without assessing changes to current edits.

## Video and rights strategy

Only verified official YouTube IDs get an embedded privacy-enhanced click-to-play iframe. Two verified examples are wired in the UI. Unverified entries get a YouTube search link rather than invented IDs. No continuous iframes across a scrolling catalogue, no downloading and rehosting movie trailers, and no automatic sound-on playback.

Artwork is presently original procedural CSS plus an Unsplash photograph (see `ASSET_POLICY.md`). Real movie promotional stills/posters require rights/provider terms review, attribution and source metadata. No official logos claimed.

## Performance, testing and future growth

- Lazy render sections and avoid forcing 110 animated posters to load at once; paginate display locally for the demo.
- Use performant CSS transform/opacity animations; GSAP timelines only where choreography benefits.
- Modal close on Escape; accessible controls; keyboard parity and touch alternatives to hover.
- Test production build, lint, screenshot differences, device widths and motion preferences.
- Add backend, domain services, auth, PostgreSQL and image CDN only when user/accounts/community needs are approved and priced.
- Budget and hosting unknown: no paid service dependency is added at this phase.

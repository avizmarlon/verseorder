# VerseOrder — Roadmap

This is a maintained product backlog, not a promise that all features ship at once. Keep the long-term requirements even when working on a small milestone. Update this document as decisions are accepted.

## M0 — Public foundation
- [x] Public-by-design codebase and independent VerseOrder identity.
- [x] Read July 2026 baseline and import 110 entries.
- [x] Separate exclusions from canonical journey.
- [x] EN / PT-BR UI scaffold and locally persistent progress.
- [x] Technical and product documentation; static-hostable Next.js foundation.
- [ ] Public GitHub repository and explicit ignore verification.

## M1 — Visual exploration (currently active)
- [x] Build three runnable experiences: Cinematic Archive, Sacred Timeline, Multiverse Explorer.
- [x] Interactive navigation, filters, progress, title details, limited verified trailer integration.
- [x] Browser screenshots and interactive desktop/mobile smoke tests on the production static export.
- [ ] Deeper motion, keyboard, reduced-motion and accessibility evaluation before V1.
- [ ] Owner compares with additional explorations in Claude Design or other design tools.
- [ ] Select a direction and combine the strongest ideas without a generic template look.
- [ ] Create an authored motion/lighting/interaction design system; test representative effects.

## M2 — Editorial quality
- [ ] Reconcile the July snapshot with all releases up to current review date (not just append new titles).
- [ ] Audit placement against official timeline and narrative-viewing rationale.
- [ ] Validate series seasons and any episode-level ordering recommendations.
- [ ] Write source-backed, spoiler-safe 'why here' notes for each entry.
- [ ] Localize titles/descriptions/notes to EN and PT-BR.
- [ ] Audit optional/external/excluded criteria, add editorial changelog.
- [ ] Source and validate official trailers and artwork rights, with graceful fallback.

## M3 — Public viewer V1
- [ ] Lock design system and responsive performance budgets.
- [ ] Complete canonical timeline, search, filters, optional toggles, title detail panel.
- [ ] Continue-watching and progress saved locally; export/import progress if useful.
- [ ] Mobile touch interactions and keyboard navigation equivalent to hover.
- [ ] Accessible, SEO-indexable content; semantics, reduced-motion and low-data options.
- [ ] Add smoke/e2e tests and CI.
- [ ] Select hosting (GitHub Pages, Cloudflare Pages or compatible static provider) after comparing limits and costs.
- [ ] Publish and request feedback.

## M4 — Cross-device membership (future)
- [ ] Opt-in accounts, profiles and secure session handling.
- [ ] Sync watched status/favorites/saved lists between devices.
- [ ] User preferences and private/public controls.
- [ ] GDPR/LGPD/privacy policy, delete/export account and security basics.
- [ ] Decide backend/auth/DB provider **only when actually needed**; evaluate recurring costs.

## M5 — Community and editorial participation (future)
- [ ] Evidence-backed community suggestions for additions/placement changes.
- [ ] Per-title discussions and comments with spoiler controls.
- [ ] Likes, favorites and optional social profiles.
- [ ] Reporting, moderation queue, rate limits and abuse prevention.
- [ ] Editorial proposal history and changelog; maintainers control canonical sequence.
- [ ] Optional notifications, following and reactions if usage justifies them.

## M6 — Expanding the living interface (incremental)
- [ ] Cinematic transitions between eras, semantic lighting and motion systems.
- [ ] Selective real-time WebGL/R3F environments and visualized multiverse connections.
- [ ] Verified trailer previews, hover expansion and media loading optimization.
- [ ] Deep exploration of character arcs, universes, connections and alternate viewing modes.
- [ ] Substantial art direction improvement informed by user testing and measured performance.

## Decision constraints

Keep the public repository clean of unpublished work-instruction files, secrets and local-only configuration. A future feature in this roadmap is **not** permission for infrastructure spend or premature implementation. Review scope for audience demand, visual impact, performance, maintainability and complexity before building.

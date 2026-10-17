# VerseOrder — Product Specification

**Subtitle:** The Ultimate Marvel Multiverse Watch Order  
**Status:** Draft · design exploration · 2026-10-17  
**Project visibility:** Public source and public repository, from inception.

## 1. Mission and differentiation

Give first-time viewers and returning fans one coherent, carefully explained path through Marvel movies, series, specials and selected connected universes. The order deliberately trades absolute in-universe chronology for dramatic payoff, context, character continuity and fewer avoidable spoilers.

Do **not** claim an objectively provable single “perfect” order. The headline expresses editorial ambition; factual statements and placements must be defensible and revision-friendly. Distinguish verified events from editorial preferences.

This is not a link farm, a bare spreadsheet, a release-date-only catalogue, or a generic streaming clone.

## 2. Primary audiences

1. **Newcomer** who wants to start from scratch, minimize spoilers and have clear next steps.
2. **Returning viewer** who wants a richer rewatch, optional lore detours, character connections and tracking.
3. **Contributor** who wants to propose a correction, source or alternative placement without accidentally changing the canonical order.

First-time-viewer safety and spoiler-aware explanations take precedence over showing every connection immediately.

## 3. Content and editorial data

An entry represents a **film, series season, short or special** (episode-level suggestions may be added later). Required: stable ID, order index, display title, work kind, universe, era, essential/optional role, external/alternate tag, editorial status. Optional: alternate localized titles, factual release dates, canon/source references, non-spoiler placement rationale, spoilerful rationale behind deliberate reveal, trailer provider ID, artwork and relationships.

There is one published curated order, with filters that **hide** entries without silently reordering the remaining items. An alternate first-timer path, if implemented, must be an explicitly documented editorial mode, not an accidental resort.

The July 2026 source has 110 entries. Preserve that baseline as an auditable snapshot while reconciling later releases and validating ambiguous placements. Keep exclusions in `content/excluded.md` as living editorial decisions, not as a second watch-order list.

## 4. Experience and art direction

Aspire to a **distinct, authored, state-of-the-art cinematic interface**. It should feel alive: depth, atmosphere, light, motion, scene transitions, typography, emotional pacing and art direction are part of the experience, not decoration.

Explore three independently coherent prototypes before committing to a direction:
- **Cinematic Archive:** dramatic hero, title exploration, expressive hover-expanded posters/previews.
- **Sacred Timeline:** luminous timeline, eras, transitions, checkpoints and sequential journeys.
- **Multiverse Explorer:** interactive constellation/orbit map, connected realities and narrative graph exploration.

Combine the best features **after** experiential review; do not settle for a generic dashboard or stock component kit. Favor custom compositions and interaction choreography. Advanced R3F/Three.js visuals may be introduced for cases where depth, lighting and responsive parallax really need 3D; do not impose WebGL on every page.

Motion should be delightful but safe: meaningful feedback, reasonable loading, keyboard and touch alternatives, reduced-motion respect, avoidance of seizure-inducing flashing and a gracefully performant mobile version.

## 5. MVP (after prototype selection)

- One canonical sequence and a clear current/next entry.
- Compact and expanded title representations with contextual explanations.
- EN and PT-BR interface/content scaffolding, translation completeness tracking.
- Filters: all, main continuity, external legacy, optional.
- Local progress: watched/unwatched, percent completion, resume position, persistent browser storage.
- Spoiler-safe default presentation and disclosed story explanations.
- Validated official trailers initiated by user action; hover preview *only* after explicit performance/privacy review. Lazy-load, mute and pause offscreen.
- Search, responsive mobile navigation and accessible focus states.
- Source citations for factual chronology, editorial rationale for contested order, and public correction pathway.
- Fast static publishing with no mandatory registration.

**Explicit non-goals for MVP:** user accounts, database, personalized recommendations, social feed, comment moderation backend, memberships, paid tiers, user-generated media, complex content management or always-on 3D rendering.

## 6. Post-MVP: retained product requirements

These are intentional future directions, **not** approvals to build them immediately.

**Identity and profiles**
- Sign-up/sign-in with privacy-conscious auth; optional profile; delete/export account.
- Sync watch progress across devices, preferences and watchlists.
- Favorite a title, like titles and save lists; separate private bookmarks from public signals.
- Optionally follow users or see activity, subject to consent and moderation.

**Community and participation**
- Public suggestions for titles/order changes with evidence and status/history.
- Editorial voting or feedback signals, with maintainers retaining canonical decision rights.
- Threaded comments/discussions per title and spoiler control.
- Member profiles, notifications and discussion subscriptions.
- Abuse reporting, rate limits, anti-spam, community guidelines and moderation queue.
- Versioned editorial change notes so current watchers understand order changes.

**Editorial richness**
- Character and universe connections, optional story arcs and why-this-comes-next explanations.
- Verified metadata, official sources and trailer relations with jurisdictional availability.
- Advanced visuals: atmospheric effects, meaningful choreography, lighting, responsive layered scenes and selective 3D.
- Optional accessibility settings, reduced data/animation mode and performance instrumentation.
- Multilingual editorial content with transparent translation status.

## 7. Persistence and migration path

Start with static local content plus `localStorage`. Persist keys with a version; treat stable entry IDs as the only long-lived identifiers. When shared accounts become worthwhile, introduce a backend/auth provider and PostgreSQL-compatible model behind narrow domain operations. **Do not build the backend ahead of demand.** Future migration should offer opt-in import of local progress.

A Next.js static export cannot use server actions, runtime API routes or server auth flows directly. Turning on those capabilities will require switching the deployment mode and confirming hosting costs/limits.

## 8. Editorial accuracy and trust

- Every factual claim requiring authority gets a source; official Marvel timeline and individual film release/production sources take precedence.
- Distinguish MCU main chronology from events in other universes and from recommended viewing sequence.
- Spoiler-sensitive wording by default; never expose spoilerful rationales unprompted.
- Label uncertain, not-yet-reviewed or newly released entries explicitly.
- No invented runtimes, availability, trailers, poster licenses or supposed “official” order.
- No external content copied without rights or permitted embedding.

## 9. Quality and acceptance

Success means a new viewer understands what to watch next, a returning viewer can navigate rich connections, and a contributor can inspect/contest decisions. Prototype review considers aesthetic distinctiveness, hierarchy, moment-to-moment delight, interactivity, performance, stability, accessibility, touch UX, translation completeness and maintainability.

Test static build, filtering, watch persistence, language switch, modal keyboard close, screen width and reduced motion. Test public asset/legal hygiene before each release. No user payment or external infrastructure cost without explicit approval.

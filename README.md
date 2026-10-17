# VerseOrder

**The Ultimate Marvel Multiverse Watch Order**

An independent open-source guide to watching Marvel films, shows, shorts and select connected universes in a **deliberate, story-first order** — tuned for narrative payoff and continuity, not simply in-universe dates.

The current sequence contains **112 entries**, updated on October 17, 2026. Newly added releases have sources; the original 110-entry baseline is still undergoing editorial verification. The order is independent fan curation, not Marvel's official chronology.

## Explore three interactive design concepts

These are real, navigable design prototypes. They're a starting point for an ambitious cinematic experience with motion, lighting, atmosphere, and rich interactions — not the final design.

| Cinematic Archive | Sacred Timeline | Multiverse Explorer |
| --- | --- | --- |
| ![Cinematic Archive](docs/previews/archive-desktop.png) | ![Sacred Timeline](docs/previews/timeline-desktop.png) | ![Multiverse Explorer](docs/previews/multiverse-desktop.png) |

The prototypes include EN/PT-BR interface switching, search, filters, title details, selective trailers and watched progress saved locally. The watch-order data is in `src/data/watch-order.json`; the readable list is in `content/watch-order.md`. Titles deliberately excluded from this sequence are documented separately in `content/excluded.md`.

**Editorial note:** `VisionQuest` is included while episodes are still releasing. Watching the full season must wait until the remaining episodes are available.

## Run locally

Requires Node.js and npm:

```bash
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000) to try the prototypes.

```bash
npm run lint
npm run build
npm run test:e2e
```

The site currently builds as a static Next.js export to `out/`. Public web hosting has not yet been configured. No backend or paid service is required to preview it.

## Watch-order maintenance

- Stable IDs are preserved when positions change.
- `src/data/watch-order.json` is the canonical sequence.
- `python scripts/render_watch_order_markdown.py` regenerates the readable timeline.
- `python scripts/render_watch_order_pdf.py` regenerates the printable timeline PDF (requires ReportLab).
- Dates, continuity assertions and narrative decisions should be backed by sources where possible.
- Contributions and evidence-based correction proposals are welcome; see [CONTRIBUTING.md](CONTRIBUTING.md).

## Independent fan project

VerseOrder is not affiliated with or endorsed by Marvel, Disney or Sony. Related titles, trademarks, characters and media remain the property of their respective rights holders. The app's CSS visuals are original experiments; third-party assets remain governed by their respective terms and licenses. The MIT license applies to the project code, not third-party artwork.

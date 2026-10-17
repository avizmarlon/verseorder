# Contributing to VerseOrder

Thanks for helping refine the watch order or its presentation.

**For timeline corrections:** include the affected work, proposed new placement, your rationale, whether the change is factual chronology or editorial viewing preference, and references where factual claims are made. Consider first-time viewers and spoilers. Not every connected movie belongs in the main sequence; optional suggestions are welcome.

**For website changes:** open an issue before a large redesign. Explain the experience improved, show screenshots or a reproducible interaction and test desktop/mobile plus reduced-motion. Keep English and Portuguese UI in sync where you can.

Local checks before a pull request:

```bash
npm ci
npm run build
npm run lint
```

Main content is `src/data/watch-order.json`; preserve stable IDs, keep entries unique and ordered. Do not introduce secrets, copyrighted promotional material or unverified trailer URLs. The project is an independent fan initiative without official Marvel affiliation.

Editorial decisions belong to maintainers after considering evidence and viewing experience.

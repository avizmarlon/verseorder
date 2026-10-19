# Contributing to VerseOrder

Thanks for wanting to help! You don't need to code to make the list better.

## Suggesting a change

Think a movie, show, season or special is missing? Or that something would work better in another spot? [Open an issue](https://github.com/avizmarlon/verseorder/issues/new) and tell me:

- which title you mean
- where you'd put it
- why it works better there

For release dates or continuity stuff, a link to a good source helps a lot. And please warn people before you spoil any big twists.

Bugs count too. If something's broken, confusing, hard to use with a screen reader or keyboard, or just weird on your phone, let me know.

Keep in mind this is my take on the best order, not an official chronology. Disagreeing is totally fine. That's half the fun.

## Changing the code or the list

The list lives in `src/data/watch-order.json`. That file is the source of truth, so edit it there and then regenerate the plain-text version:

```bash
python scripts/render_watch_order_markdown.py
```

To run the site locally (Node 22):

```bash
npm install
npm run dev
```

Before opening a pull request, check that these pass. CI runs the same steps:

```bash
npm run lint
GITHUB_PAGES=true npm run build
npx playwright install chromium   # first time only
GITHUB_PAGES=true npm run test:e2e
```

Keep pull requests small and focused, and say what you changed and why.

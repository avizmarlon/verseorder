# VerseOrder

A Marvel Multiverse Watch Order.

Want to watch all of Marvel but have no idea where to start? Same. VerseOrder is one list that puts the MCU, some older Marvel movies, series, specials and a few multiverse stories in an order that makes the story click. It's not strict in-universe chronology. It's the order where the callbacks, cameos and reveals hit hardest.

**[Open the watch order](https://verseorder.watch/)** or [read it as a plain list](content/watch-order.md).

Right now it has 112 entries. Some are marked optional, so you can skip them or take the detour. A few shows, like *VisionQuest*, are still airing.

## How to use it

VerseOrder doesn't stream anything. It's a guide. You watch the titles wherever you normally do and use the site to keep track.

- Go down the list in order.
- Tick off each title when you finish it. Your progress is saved in your browser, so you can come back later and pick up where you left off. No account needed.
- Use search and the MCU / Legacy / Optional filters if you're looking for something specific.

## Think something's off?

Missing a title, or think something belongs somewhere else? [Open an issue](https://github.com/avizmarlon/verseorder/issues/new) and tell me what and why. Corrections are welcome too. Please give a spoiler warning if you need to talk about big twists.

Here's [what's left out of the list for now](content/excluded.md).

## Running it locally

It's a Next.js site exported as static files. You'll need Node 22.

```bash
npm install
npm run dev        # local dev server
npm run lint
npm run build      # static export in out/
npm run test:e2e   # Playwright tests against the build
```

Cover art links live in `src/data/watch-order.json`. Run `node scripts/resolve-posters.mjs` to refresh them. Banners and card previews come from `scripts/media/` (see [public/clips/README.md](public/clips/README.md)).

## The fine print

This is a fan project. It's not affiliated with or endorsed by Marvel, Disney, Sony or any other rights holder, and it's not an official Marvel chronology. All titles, characters, posters and logos belong to their owners. Cover art and banner images are linked from [Wikipedia](https://en.wikipedia.org/), [TVMaze](https://www.tvmaze.com/) and [TMDB](https://www.themoviedb.org/), not stored here, and aren't covered by this project's license. The previews on the cards are muted copies of the official trailers (or an official clip when a title never got a trailer). They're hosted with the site, not in this repo. The site collects anonymous, cookie-free visit stats via Cloudflare Web Analytics.

This product uses the TMDB API but is not endorsed or certified by TMDB.

Made by [Marlon](https://github.com/avizmarlon). The code is [MIT licensed](LICENSE).

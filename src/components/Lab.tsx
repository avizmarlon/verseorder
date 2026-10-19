"use client";

import { entries, fxVariants } from "./timeline-data";
import TimelineCell from "./TimelineCell";

const assetBase = process.env.NEXT_PUBLIC_BASE_PATH || "";
const subject = entries.find(
  (entry) => entry.id === "captain-america-the-first-avenger",
)!;

/**
 * PROTOTYPE / dev-only. Renders the same card (Captain America: The First Avenger) once per
 * banner-transition variant so they can be compared hands-on. Not linked from the site nav.
 */
export default function Lab() {
  return (
    <div className="b-root lab-root">
      <main className="lab-main">
        <p className="lab-flag">PROTOTYPE · feature branch only · not linked from the site</p>
        <h1 className="b-serif">Card banner + trailer lab</h1>
        <p className="lab-lede">
          Hover a card (or use <b>Preview fx</b>) to play the trailer inside it. On touch
          devices a card plays when it sits in the middle of the screen. Every card below is
          the same title with a different poster-to-video transition. Only one plays at a
          time. Add <code>?fx=name</code> to the home page, or use the real timeline below.
        </p>
        <div className="lab-links">
          <a className="b-btn b-btnP" href={`${assetBase}/?lab=1&fx=crossfade`}>
            Open the real timeline with the fx selector
          </a>
        </div>
        <section className="lab-grid" aria-label="Transition variants">
          {fxVariants.map((variant, index) => (
            <article className="lab-item" key={variant.id} data-fx-id={variant.id}>
              <header>
                <span className="lab-n">{index + 1}</span>
                <h2>{variant.label}</h2>
                <code>?fx={variant.id}</code>
              </header>
              <p>{variant.blurb}</p>
              <div className="b-row seen lab-row">
                <TimelineCell
                  entry={subject}
                  fx={variant.id}
                  exposeToggle
                  onDetails={() => undefined}
                  onTrailer={() => undefined}
                />
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}

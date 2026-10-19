"use client";

import { useState } from "react";
import { defaultFx, entries, fxVariants, isFxId, type FxId } from "./timeline-data";
import TimelineCell from "./TimelineCell";

const assetBase = process.env.NEXT_PUBLIC_BASE_PATH || "";
const subject = entries.find(
  (entry) => entry.id === "captain-america-the-first-avenger",
)!;

/**
 * PROTOTYPE / dev-only. The same card (Captain America: The First Avenger) once per
 * banner-transition variant, plus a phone-sized frame of the real timeline with touch behaviour
 * forced. Not linked from the site nav.
 */
export default function Lab() {
  const [phone, setPhone] = useState(false);
  const [phoneFx, setPhoneFx] = useState<FxId>(defaultFx);
  const src = `${assetBase}/?touch=1&embed=1&fx=${phoneFx}&focus=${subject.id}`;
  return (
    <div className="b-root lab-root">
      <main className="lab-main">
        <p className="lab-flag">PROTOTYPE · feature branch only · not linked from the site</p>
        <h1 className="b-serif">Card banner + trailer lab</h1>
        <p className="lab-lede">
          Hover a card to play its trailer inside it. The poster disappears and the transition plays
          in reverse when you leave. Click a card to open its details. Only one trailer plays at a
          time. On a phone the trailer follows the glowing dot on the timeline spine: try it in the
          phone frame below, or on a real phone over your network (see the preview README).
        </p>
        <div className="lab-links">
          <a className="b-btn b-btnP" href={`${assetBase}/?lab=1&fx=${defaultFx}`}>
            Open the real timeline with the fx selector
          </a>
          <a className="b-btn" href={`${assetBase}/?lab=1&touch=1&fx=${defaultFx}`}>
            Real timeline with touch behaviour forced
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
                  inTimeline={false}
                  onDetails={() => undefined}
                  onTrailer={() => undefined}
                />
              </div>
            </article>
          ))}
        </section>
        <section className="lab-phone" aria-labelledby="lab-phone-title">
          <h2 id="lab-phone-title" className="b-serif">
            Phone preview (touch behaviour)
          </h2>
          <p className="lab-lede">
            A 390×844 frame of the real timeline with <code>?touch=1</code>: mobile layout, no
            hover, and the trailer plays when the dot on the spine reaches a title&apos;s node.
            Scroll inside the frame.
          </p>
          <div className="lab-phone-bar">
            <label>
              <span>Transition </span>
              <select
                value={phoneFx}
                onChange={(event) => {
                  if (isFxId(event.target.value)) setPhoneFx(event.target.value);
                }}
              >
                {fxVariants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.label}
                  </option>
                ))}
              </select>
            </label>
            <button className="b-btn" onClick={() => setPhone((value) => !value)}>
              {phone ? "Unload phone frame" : "Load phone frame"}
            </button>
          </div>
          {phone && (
            <div className="lab-phone-shell">
              <iframe
                key={src}
                src={src}
                title="Phone-sized preview of the timeline"
                width={390}
                height={844}
              />
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

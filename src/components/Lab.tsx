"use client";

import { useEffect, useRef, useState } from "react";
import { entries } from "./timeline-data";
import TimelineCell from "./TimelineCell";

const assetBase = process.env.NEXT_PUBLIC_BASE_PATH || "";
const subject = entries.find(
  (entry) => entry.id === "captain-america-the-first-avenger",
)!;

type Readout = {
  trailer: string;
  clip: string;
  readyState: number;
  buffered: number;
  source: string;
  lastStartMs: number | null;
};

/**
 * PROTOTYPE / dev-only. The Captain America card with a live debug readout, plus a phone-sized
 * frame of the real timeline with touch behaviour forced. Not linked from the site nav.
 */
export default function Lab() {
  const [phone, setPhone] = useState(false);
  const [readout, setReadout] = useState<Readout | null>(null);
  const holder = useRef<HTMLDivElement>(null);
  const src = `${assetBase}/?touch=1&embed=1&focus=${subject.id}`;

  useEffect(() => {
    const root = holder.current;
    if (!root) return;
    let enteredAt = 0;
    let lastStartMs: number | null = null;
    const onEnter = () => {
      enteredAt = performance.now();
    };
    const read = () => {
      const cell = root.querySelector<HTMLElement>(".b-cell");
      const video = root.querySelector("video");
      setReadout({
        trailer: cell?.dataset.trailer ?? "-",
        clip: cell?.dataset.clip ?? "-",
        readyState: video?.readyState ?? 0,
        buffered:
          video && video.buffered.length
            ? Math.round(video.buffered.end(video.buffered.length - 1) * 10) / 10
            : 0,
        source: video?.currentSrc.split("/").pop() || "-",
        lastStartMs,
      });
    };
    const observer = new MutationObserver(() => {
      const cell = root.querySelector<HTMLElement>(".b-cell");
      if (cell?.dataset.trailer === "playing" && enteredAt) {
        lastStartMs = Math.round(performance.now() - enteredAt);
        enteredAt = 0;
      }
      read();
    });
    observer.observe(root, { subtree: true, attributes: true, attributeFilter: ["data-trailer", "data-clip"] });
    root.addEventListener("pointerenter", onEnter, true);
    root.addEventListener("focusin", onEnter);
    const timer = setInterval(read, 500);
    return () => {
      observer.disconnect();
      clearInterval(timer);
      root.removeEventListener("pointerenter", onEnter, true);
      root.removeEventListener("focusin", onEnter);
    };
  }, []);

  return (
    <div className="b-root lab-root">
      <main className="lab-main">
        <p className="lab-flag">PROTOTYPE · feature branch only · not linked from the site</p>
        <h1 className="b-serif">Card banner + trailer lab</h1>
        <p className="lab-lede">
          Hover the card (or focus it with Tab) to play the muted trailer inside it: the tiles flip
          to the video and flip back when you leave. Click opens the details. On a phone the
          trailer follows the glowing dot on the timeline spine: try the phone frame below, or a
          real phone over your network (see the preview README).
        </p>
        <div className="lab-links">
          <a className="b-btn b-btnP" href={`${assetBase}/`}>
            Open the real timeline
          </a>
          <a className="b-btn" href={`${assetBase}/?touch=1`}>
            Real timeline with touch behaviour forced
          </a>
        </div>
        <section className="lab-grid lab-one" aria-label="Card preview">
          <article className="lab-item" ref={holder}>
            <div className="b-row seen lab-row">
              <TimelineCell
                entry={subject}
                inTimeline={false}
                onDetails={() => undefined}
                onTrailer={() => undefined}
              />
            </div>
          </article>
          <dl className="lab-debug" aria-label="Debug readout" aria-live="off">
            <dt>state</dt>
            <dd data-k="trailer">{readout?.trailer ?? "-"}</dd>
            <dt>clip</dt>
            <dd data-k="clip">{readout?.clip ?? "-"}</dd>
            <dt>readyState</dt>
            <dd>{readout?.readyState ?? 0}</dd>
            <dt>buffered</dt>
            <dd>{readout ? `${readout.buffered} s` : "-"}</dd>
            <dt>source</dt>
            <dd>{readout?.source ?? "-"}</dd>
            <dt>last hover → reveal</dt>
            <dd data-k="start">
              {readout?.lastStartMs != null ? `${readout.lastStartMs} ms` : "-"}
            </dd>
          </dl>
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
            <button className="b-btn" onClick={() => setPhone((value) => !value)}>
              {phone ? "Unload phone frame" : "Load phone frame"}
            </button>
          </div>
          {phone && (
            <div className="lab-phone-shell">
              <iframe
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

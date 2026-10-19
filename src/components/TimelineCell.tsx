"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Play } from "lucide-react";
import Poster from "./Poster";
import {
  art,
  colorOf,
  kindLabel,
  softOf,
  clipSources,
  type Entry,
} from "./timeline-data";

/** Load the (tiny) preview code when a banner card is within this distance of the viewport. */
const NEAR_MARGIN = "900px 0px";

/**
 * One timeline card. Cards without a banner keep the original markup and buttons. Cards with a
 * banner (prototype: Captain America: The First Avenger) are a single big button: the whole card
 * opens the details drawer, and the muted trailer preview is attached lazily (banner-clip.ts).
 */
export default function TimelineCell({
  entry,
  onDetails,
  onTrailer,
  inTimeline = true,
}: {
  entry: Entry;
  onDetails: () => void;
  onTrailer: () => void;
  /** false for lab cards: they are not on the timeline, so no dot-driven playback. */
  inTimeline?: boolean;
}) {
  const cell = useRef<HTMLDivElement>(null);
  const banner = Boolean(entry.bannerUrl && entry.clip);
  const [near, setNear] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    // Fetch the small preview code once the page is idle (no video bytes), so a card that is
    // jumped to (search, resume, fast scroll) does not wait for a chunk on its first hover.
    if (!banner) return;
    const idle = window.requestIdleCallback ?? ((fn: () => void) => setTimeout(fn, 1500));
    const handle = idle(() => void import("./banner-clip"));
    return () => (window.cancelIdleCallback ?? clearTimeout)(handle as number);
  }, [banner]);

  useEffect(() => {
    const element = cell.current;
    if (!banner || !element || near) return;
    const observer = new IntersectionObserver(
      (records) => {
        if (records.some((record) => record.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: NEAR_MARGIN },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [banner, near]);

  useEffect(() => {
    const element = cell.current;
    if (!banner || !near || !element) return;
    let cancelled = false;
    let detach: (() => void) | undefined;
    import("./banner-clip").then((module) => {
      if (cancelled) return;
      detach = module.attach({
        cell: element,
        key: `${entry.id}:${inTimeline ? "t" : "lab"}`,
        pos: inTimeline ? entry.position : null,
        sources: clipSources(entry),
      });
    });
    return () => {
      cancelled = true;
      detach?.();
    };
  }, [banner, near, entry, inTimeline]);

  if (!banner) {
    return (
      <div className="b-cell">
        <div
          className="b-glow"
          style={{
            background: `radial-gradient(90% 120% at 50% 50%,${softOf(entry)},transparent 70%)`,
          }}
        />
        <button
          className="b-hit"
          onClick={onDetails}
          aria-label={`Details: ${entry.title}`}
        />
        <Poster entry={entry} className="b-med" decorative />
        <div className="b-ct">
          <div className="b-k" style={{ color: colorOf(entry) }}>
            {kindLabel(entry)} · {entry.optional ? "Optional" : entry.universe}
          </div>
          <h3>{entry.title}</h3>
          <div className="b-more">
            <p>{entry.era}</p>
            <div className="b-acts">
              <button className="b-sm" onClick={onDetails}>
                Details
              </button>
              <button className="b-sm" onClick={onTrailer}>
                <Play size={10} />
                Trailer
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="b-cell"
      ref={cell}
      data-banner=""
      data-trailer="idle"
      data-clip="none"
    >
      <div
        className="b-banner"
        aria-hidden="true"
        style={
          {
            background: art(entry),
            "--bpos": entry.bannerFocus || "50% 50%",
          } as CSSProperties
        }
      >
        {!imageFailed && (
          // eslint-disable-next-line @next/next/no-img-element -- static export, hotlinked backdrop
          <img
            className="b-bimg"
            ref={(node) => {
              // An image that errored before hydration never fires React's onError.
              if (node && node.complete && node.naturalWidth === 0)
                setImageFailed(true);
            }}
            src={entry.bannerUrl!}
            alt=""
            width={1280}
            height={720}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            draggable={false}
            onError={() => setImageFailed(true)}
          />
        )}
        <div className="b-vid" />
        <div className="b-bscrim" />
        <div className="b-bfade" />
      </div>
      <div
        className="b-glow"
        style={{
          background: `radial-gradient(90% 120% at 50% 50%,${softOf(entry)},transparent 70%)`,
        }}
      />
      <button
        className="b-hit"
        onClick={onDetails}
        aria-label={`Details: ${entry.title}`}
      />
      <Poster entry={entry} className="b-med" decorative />
      <div className="b-ct">
        <div className="b-k" style={{ color: colorOf(entry) }}>
          {kindLabel(entry)} · {entry.optional ? "Optional" : entry.universe}
        </div>
        <h3>{entry.title}</h3>
        <p className="b-era">{entry.era}</p>
      </div>
      <div className="b-cap" aria-hidden="true">
        <b style={{ color: colorOf(entry) }}>{kindLabel(entry)}</b>
        {entry.title}
      </div>
    </div>
  );
}

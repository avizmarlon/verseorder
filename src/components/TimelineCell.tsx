"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Play } from "lucide-react";
import Poster from "./Poster";
import {
  art,
  colorOf,
  kindLabel,
  softOf,
  trailerOf,
  type Entry,
  type FxId,
} from "./timeline-data";

/** Start loading the trailer code when a banner card is within this distance of the viewport. */
const NEAR_MARGIN = "900px 0px";

/**
 * One timeline card. Cards without a banner keep the original markup and buttons. Cards with a
 * banner (prototype: Captain America: The First Avenger) are a single big button: the whole card
 * opens the details drawer, and the trailer preview is attached lazily (see banner-fx.ts).
 */
export default function TimelineCell({
  entry,
  fx,
  onDetails,
  onTrailer,
  inTimeline = true,
}: {
  entry: Entry;
  fx: FxId;
  onDetails: () => void;
  onTrailer: () => void;
  /** false for lab cards: they are not on the timeline, so no dot-driven playback. */
  inTimeline?: boolean;
}) {
  const cell = useRef<HTMLDivElement>(null);
  const trailer = trailerOf(entry);
  const banner = Boolean(entry.bannerUrl && trailer);
  const [near, setNear] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

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
    if (!banner || !near || !element || !trailer) return;
    let cancelled = false;
    let detach: (() => void) | undefined;
    import("./banner-fx").then((module) => {
      if (cancelled) return;
      detach = module.attach({
        cell: element,
        id: `${entry.id}:${fx}:${inTimeline ? "t" : "lab"}`,
        pos: inTimeline ? entry.position : null,
        videoId: trailer,
        start: entry.trailerStart ?? 0,
        fx,
      });
    });
    return () => {
      cancelled = true;
      detach?.();
    };
  }, [banner, near, trailer, fx, entry.id, entry.position, entry.trailerStart, inTimeline]);

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
      data-fx={fx}
      data-trailer="idle"
      data-warm="off"
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

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

/**
 * How far ahead of the visible area a card counts as "near": its banner and cover load (eagerly,
 * and get decoded) and its preview is attached. 150% of the scroller's height above and below, so
 * even a fast fling reaches cards that are already painted. The look-ahead starts once the page
 * has loaded (pageSettled); before that only on-screen cards load.
 */
const NEAR_MARGIN = "150% 0px";

/**
 * Resolves once the page has loaded and gone idle. Until then only cards actually on screen count
 * as near, so the look-ahead images never compete with the first paint (LCP, initial weight).
 */
let settled: Promise<void> | undefined;
const pageSettled = () =>
  (settled ??= new Promise<void>((resolve) => {
    const idle = () =>
      (window.requestIdleCallback ?? ((fn: () => void) => setTimeout(fn, 300)))(
        () => resolve(),
        { timeout: 2000 },
      );
    if (document.readyState === "complete") idle();
    else addEventListener("load", idle, { once: true });
  }));

/** The element that actually scrolls the cards (the page body does not scroll). */
const scrollerOf = (element: HTMLElement) =>
  element.closest<HTMLElement>(".b-root");

/** Decode a loaded image off the main thread so its first paint does not wait on it. */
const predecode = (image: HTMLImageElement | null) => {
  if (image?.complete && image.naturalWidth) image.decode?.().catch(() => {});
};

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
  /** false for cards rendered outside the timeline: no dot-driven playback. */
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
    const idle =
      window.requestIdleCallback ?? ((fn: () => void) => setTimeout(fn, 1500));
    const handle = idle(() => void import("./banner-clip"));
    return () => (window.cancelIdleCallback ?? clearTimeout)(handle as number);
  }, [banner]);

  useEffect(() => {
    const element = cell.current;
    if (!element || near) return;
    // root must be the scroller: with the viewport as root, the scroller's clipping cancels the
    // margin and a card only counted as near once it was already on screen.
    let observer: IntersectionObserver | undefined;
    let cancelled = false;
    const watch = (rootMargin: string) => {
      observer?.disconnect();
      observer = new IntersectionObserver(
        (records) => {
          if (records.some((record) => record.isIntersecting)) {
            setNear(true);
            observer?.disconnect();
          }
        },
        { root: scrollerOf(element), rootMargin },
      );
      observer.observe(element);
    };
    watch("0px");
    pageSettled().then(() => !cancelled && watch(NEAR_MARGIN));
    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, [near]);

  useEffect(() => {
    const element = cell.current;
    if (!banner || !near || !element) return;
    let cancelled = false;
    let detach: (() => void) | undefined;
    import("./banner-clip").then((module) => {
      if (cancelled) return;
      detach = module.attach({
        cell: element,
        key: `${entry.id}:${inTimeline ? "t" : "x"}`,
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
      <div className="b-cell" ref={cell}>
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
        <Poster entry={entry} className="b-med" decorative eager={near} />
        <div className="b-ct">
          <div className="b-k" style={{ color: colorOf(entry) }}>
            {kindLabel(entry)} · {entry.optional ? "Optional" : entry.universe}
          </div>
          <h3>{entry.title}</h3>
          <div className="b-more">
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
        {/* Rendered once the card is near (NEAR_MARGIN): loaded eagerly at low priority and
            decoded before it scrolls in. Not rendered earlier, so far cards cost nothing. */}
        {near && !imageFailed && (
          // eslint-disable-next-line @next/next/no-img-element -- static export, hotlinked backdrop
          <img
            className="b-bimg"
            ref={(node) => {
              // An image that errored before hydration never fires React's onError.
              if (node && node.complete && node.naturalWidth === 0)
                setImageFailed(true);
              else predecode(node);
            }}
            src={entry.bannerUrl!}
            alt=""
            width={1280}
            height={720}
            loading="eager"
            fetchPriority="low"
            decoding="async"
            referrerPolicy="no-referrer"
            draggable={false}
            onLoad={(event) => predecode(event.currentTarget)}
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
      <Poster entry={entry} className="b-med" decorative eager={near} />
      <div className="b-ct">
        <div className="b-k" style={{ color: colorOf(entry) }}>
          {kindLabel(entry)} · {entry.optional ? "Optional" : entry.universe}
        </div>
        <h3>{entry.title}</h3>
      </div>
      <div className="b-cap" aria-hidden="true">
        <b style={{ color: colorOf(entry) }}>{kindLabel(entry)}</b>
        {entry.title}
      </div>
    </div>
  );
}

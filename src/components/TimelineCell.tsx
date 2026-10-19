"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
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

/* ------------------------------------------------------------------ */
/* Only one decorative trailer plays at a time, across the whole page. */
/* ------------------------------------------------------------------ */
let current: string | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const trailerController = {
  request(key: string) {
    if (current === key) return;
    current = key;
    emit();
  },
  release(key: string) {
    if (current !== key) return;
    current = null;
    emit();
  },
};
/** Trailers whose embed failed (blocked, removed, offline): never retried this visit. */
const brokenTrailers = new Set<string>();

const HOVER_INTENT_MS = 260;
const CENTER_DWELL_MS = 180;
/** Keeps the iframe alive while the exit transition plays. */
const LINGER_MS = 1400;
const LOAD_TIMEOUT_MS = 14_000;
/** Seconds of playback before YouTube's auto-hiding overlay is gone and the video can be revealed. */
const CHROME_SETTLE_S = 3.4;
const PLAYER_ORIGIN = "https://www.youtube-nocookie.com";
/** Thin horizontal band around the middle of the viewport (touch devices). */
const CENTER_BAND = "-42% 0px -42% 0px";

export type TrailerState = "idle" | "loading" | "playing" | "leaving";

function useBannerTrailer(entry: Entry, fx: FxId) {
  const key = useId();
  const trailer = trailerOf(entry);
  const enabled = Boolean(entry.bannerUrl && trailer);
  const cell = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const rolling = useRef(false);
  const active = useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
  const [broken, setBroken] = useState(
    () => trailer !== null && brokenTrailers.has(trailer),
  );
  const wanted = enabled && !broken && active === key;
  const [previouslyWanted, setPreviouslyWanted] = useState(false);
  const [linger, setLinger] = useState(false);
  const [ready, setReady] = useState(false);
  if (wanted !== previouslyWanted) {
    setPreviouslyWanted(wanted);
    if (!wanted) setLinger(true);
  }
  const mounted = wanted || linger;
  if (!mounted && ready) setReady(false);

  // Tear the iframe down once the exit transition has finished.
  useEffect(() => {
    if (wanted || !linger) return;
    const timer = setTimeout(() => setLinger(false), LINGER_MS);
    return () => clearTimeout(timer);
  }, [wanted, linger]);

  // A trailer that never starts is abandoned; the static banner and poster stay.
  const fail = () => {
    if (trailer) brokenTrailers.add(trailer);
    setBroken(true);
    trailerController.release(key);
  };
  useEffect(() => {
    if (!wanted || ready) return;
    const timer = setTimeout(fail, LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanted, ready]);

  // Listen to the (cookie-less) YouTube player so the reveal only starts once frames are rolling.
  useEffect(() => {
    if (!mounted) return;
    rolling.current = false;
    const onMessage = (event: MessageEvent) => {
      const target = frame.current;
      if (!target || event.source !== target.contentWindow) return;
      if (event.origin !== PLAYER_ORIGIN) return;
      let data: { event?: string; info?: unknown } | null = null;
      try {
        data =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }
      if (!data) return;
      const info = data.info as
        | { playerState?: number; currentTime?: number }
        | number
        | null;
      // Looping restarts at 0:00; jump back past the rating card / logos instead.
      const start = entry.trailerStart;
      if (
        start &&
        typeof info === "object" &&
        typeof info?.currentTime === "number" &&
        info.currentTime < start - 0.5 &&
        info.currentTime > 0
      )
        target.contentWindow?.postMessage(
          JSON.stringify({
            event: "command",
            func: "seekTo",
            args: [start, true],
            id: 1,
            channel: "widget",
          }),
          PLAYER_ORIGIN,
        );
      if (data.event === "onError") {
        fail();
        return;
      }
      if (data.event === "onStateChange" && info === 1) rolling.current = true;
      if (typeof info !== "object" || info === null) return;
      if (info.playerState === 1) rolling.current = true;
      // YouTube keeps its own overlay (pause glyph, title, "more videos") on screen for the first
      // few seconds of playback even with controls=0, so the reveal waits until it has faded.
      if (
        rolling.current &&
        typeof info.currentTime === "number" &&
        info.currentTime >= (entry.trailerStart ?? 0) + CHROME_SETTLE_S
      )
        setReady(true);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // Triggers: hover intent on pointer devices, viewport centre band on touch devices.
  useEffect(() => {
    const element = cell.current;
    if (!element || !enabled || broken) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection?.saveData;
    if (reduced || saveData) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cleanups: Array<() => void> = [];
    const onHide = () => {
      if (document.visibilityState === "hidden") {
        clearTimeout(timer);
        trailerController.release(key);
      }
    };
    document.addEventListener("visibilitychange", onHide);
    cleanups.push(() => document.removeEventListener("visibilitychange", onHide));
    if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
      const enter = (event: PointerEvent) => {
        if (event.pointerType === "touch") return;
        clearTimeout(timer);
        timer = setTimeout(() => trailerController.request(key), HOVER_INTENT_MS);
      };
      const leave = () => {
        clearTimeout(timer);
        trailerController.release(key);
      };
      element.addEventListener("pointerenter", enter);
      element.addEventListener("pointerleave", leave);
      cleanups.push(() => {
        element.removeEventListener("pointerenter", enter);
        element.removeEventListener("pointerleave", leave);
      });
    } else {
      const observer = new IntersectionObserver(
        (records) => {
          const record = records[records.length - 1];
          clearTimeout(timer);
          if (record.isIntersecting)
            timer = setTimeout(() => trailerController.request(key), CENTER_DWELL_MS);
          else trailerController.release(key);
        },
        { rootMargin: CENTER_BAND, threshold: 0 },
      );
      observer.observe(element);
      cleanups.push(() => observer.disconnect());
    }
    return () => {
      clearTimeout(timer);
      cleanups.forEach((cleanup) => cleanup());
      trailerController.release(key);
    };
  }, [enabled, broken, key]);

  // "badge" variant: measure where the poster has to travel to reach the corner.
  useEffect(() => {
    const element = cell.current;
    if (!element || !enabled || fx !== "badge") return;
    const poster = element.querySelector<HTMLElement>(".b-med");
    if (!poster) return;
    const measure = () => {
      const scale = 0.42,
        inset = 12,
        w = poster.offsetWidth,
        h = poster.offsetHeight,
        cx = poster.offsetLeft + w / 2,
        cy = poster.offsetTop + h / 2;
      const onLeft = cx < element.clientWidth / 2;
      const tx = onLeft
        ? inset + (w * scale) / 2
        : element.clientWidth - inset - (w * scale) / 2;
      element.style.setProperty("--bx", `${tx - cx}px`);
      element.style.setProperty("--by", `${inset + (h * scale) / 2 - cy}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [enabled, fx]);

  const state: TrailerState = !mounted
    ? "idle"
    : !wanted
      ? "leaving"
      : ready
        ? "playing"
        : "loading";

  const toggle = () =>
    wanted ? trailerController.release(key) : trailerController.request(key);
  const onLoad = () => {
    const target = frame.current?.contentWindow;
    if (!target) return;
    const send = (message: object) =>
      target.postMessage(JSON.stringify(message), PLAYER_ORIGIN);
    send({ event: "listening", id: 1, channel: "widget" });
    send({
      event: "command",
      func: "unloadModule",
      args: ["captions"],
      id: 1,
      channel: "widget",
    });
  };
  return [{ enabled, mounted, state, trailer, toggle, onLoad }, cell, frame] as const;
}

const TILE_COLS = 6;
const TILE_ROWS = 3;

function CardBanner({
  entry,
  fx,
  mounted,
  trailer,
  frame,
  onLoad,
}: {
  entry: Entry;
  fx: FxId;
  mounted: boolean;
  trailer: string | null;
  frame: React.RefObject<HTMLIFrameElement | null>;
  onLoad: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const src = entry.bannerUrl!;
  const image = (className: string) =>
    !imageFailed && (
      // eslint-disable-next-line @next/next/no-img-element -- static export, hotlinked backdrop
      <img
        className={className}
        ref={(node) => {
          // An image that errored before hydration never fires React's onError.
          if (node && node.complete && node.naturalWidth === 0) setImageFailed(true);
        }}
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        draggable={false}
        onError={() => setImageFailed(true)}
      />
    );
  let embed: string | null = null;
  if (mounted && trailer) {
    const params = new URLSearchParams({
      autoplay: "1",
      mute: "1",
      controls: "0",
      loop: "1",
      playlist: trailer,
      playsinline: "1",
      modestbranding: "1",
      rel: "0",
      disablekb: "1",
      iv_load_policy: "3",
      fs: "0",
      cc_load_policy: "0",
      enablejsapi: "1",
      origin: window.location.origin,
    });
    if (entry.trailerStart) params.set("start", String(entry.trailerStart));
    embed = `${PLAYER_ORIGIN}/embed/${trailer}?${params}`;
  }
  return (
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
      {image("b-bimg")}
      <div className="b-vid">
        {embed && (
          <iframe
            ref={frame}
            src={embed}
            title={`${entry.title} trailer (decorative preview)`}
            tabIndex={-1}
            allow="autoplay; encrypted-media"
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-scripts allow-same-origin allow-presentation"
            onLoad={onLoad}
          />
        )}
      </div>
      {fx === "tiles" && (
        <div className="b-tiles">
          {Array.from({ length: TILE_COLS * TILE_ROWS }, (_, index) => (
            <i
              className="b-tile"
              key={index}
              style={
                {
                  "--c": index % TILE_COLS,
                  "--r": Math.floor(index / TILE_COLS),
                } as CSSProperties
              }
            >
              <b className="b-tface">{image("b-timg")}</b>
            </i>
          ))}
        </div>
      )}
      <div className="b-bscrim" />
      {fx === "shine" && <div className="b-shine" />}
      {fx === "letterbox" && (
        <>
          <div className="b-bar b-bar-t" />
          <div className="b-bar b-bar-b" />
        </>
      )}
      {fx === "iris" && <div className="b-irisring" />}
    </div>
  );
}

/** One timeline card (poster + text + optional banner/trailer layers). */
export default function TimelineCell({
  entry,
  fx,
  onDetails,
  onTrailer,
  exposeToggle = false,
}: {
  entry: Entry;
  fx: FxId;
  onDetails: () => void;
  onTrailer: () => void;
  /** Lab only: render a button that plays/stops the preview without hovering. */
  exposeToggle?: boolean;
}) {
  const [banner, cellRef, frameRef] = useBannerTrailer(entry, fx);
  const { enabled } = banner;
  return (
    <div
      className="b-cell"
      ref={cellRef}
      data-banner={enabled ? "" : undefined}
      data-fx={enabled ? fx : undefined}
      data-trailer={enabled ? banner.state : undefined}
    >
      {enabled && (
        <CardBanner
          entry={entry}
          fx={fx}
          mounted={banner.mounted}
          trailer={banner.trailer}
          frame={frameRef}
          onLoad={banner.onLoad}
        />
      )}
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
            {exposeToggle && enabled && (
              <button
                className="b-sm lab-toggle"
                onClick={banner.toggle}
                aria-pressed={banner.state === "playing" || banner.state === "loading"}
              >
                {banner.state === "idle" || banner.state === "leaving"
                  ? "Preview fx"
                  : "Stop fx"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

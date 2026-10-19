"use client";

import { useState, type CSSProperties } from "react";
import { art, type Entry } from "./timeline-data";

/**
 * Cover art for a title. Renders the generated gradient first (so there is never an empty box
 * and layout does not shift), then loads the real cover on top: lazily by default, eagerly (and
 * pre-decoded) once `eager` is set, which timeline cards do while they are still well off screen.
 * If the cover is missing or fails to load, the gradient stays as the graceful fallback.
 */
export default function Poster({
  entry,
  className = "",
  eager = false,
  decorative = false,
}: {
  entry: Entry;
  className?: string;
  eager?: boolean;
  decorative?: boolean;
}) {
  const src = entry.posterPath;
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = failedSrc === src;

  return (
    <span
      className={`poster ${className}`}
      style={{ background: art(entry) } as CSSProperties}
      aria-hidden={decorative ? "true" : undefined}
    >
      {src && !failed && (
        // eslint-disable-next-line @next/next/no-img-element -- static export, remote covers
        <img
          ref={(node) => {
            // An image that errored before hydration never fires React's onError; catch it here.
            if (node && node.complete && node.naturalWidth === 0)
              setFailedSrc(src);
            else if (eager && node?.complete) node.decode?.().catch(() => {});
          }}
          src={src}
          alt={decorative ? "" : `${entry.title} cover art`}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          referrerPolicy="no-referrer"
          draggable={false}
          onLoad={(event) => {
            if (eager) event.currentTarget.decode?.().catch(() => {});
          }}
          onError={() => setFailedSrc(src)}
        />
      )}
    </span>
  );
}

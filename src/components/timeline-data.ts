import collection from "@/data/watch-order.json";

/** Optional card-banner fields; only entries that opted in (prototype) carry them. */
export type Entry = (typeof collection.entries)[number] & {
  /** Horizontal (16:9-ish) backdrop used as the static card banner. Hotlinked. */
  bannerUrl?: string | null;
  /** CSS object-position for the banner crop, e.g. "50% 22%" (keeps faces in frame). */
  bannerFocus?: string | null;
  /**
   * Self-hosted muted trailer for the card (file stem under the media base): expects
   * `<clip>.webm` (AV1) and `<clip>.mp4` (H.264, faststart). Prototype: one title only.
   */
  clip?: string | null;
};
export const entries = collection.entries;
export const lastReviewedDate = collection.lastReviewedDate;
export const chapters = [
  {
    id: 1,
    name: "Genesis",
    hue: 24,
    end: 24,
    description:
      "Origins, first alliances, and a world growing larger with every story.",
  },
  {
    id: 2,
    name: "Assembly",
    hue: 214,
    end: 44,
    description:
      "Cosmic horizons and extraordinary alliances. Follow the road to Infinity.",
  },
  {
    id: 3,
    name: "Fracture",
    hue: 282,
    end: 80,
    description:
      "New perspectives, familiar faces, and stories from beyond a single reality.",
  },
  {
    id: 4,
    name: "Echoes",
    hue: 168,
    end: 112,
    description:
      "Explore the legacies, converging worlds, and next chapters of the multiverse.",
  },
] as const;
export const chapterOf = (entry: Entry) =>
  chapters.find((chapter) => entry.position <= chapter.end)!;
export const typeOf = (entry: Entry) =>
  entry.kind === "movie"
    ? "film"
    : entry.kind === "series"
      ? "series"
      : "special";
export const kindLabel = (entry: Entry) =>
  ({ movie: "Film", series: "Series", short: "Short", special: "Special" })[
    entry.kind
  ] || entry.kind;
export const hueOf = (entry: Entry) =>
  (chapterOf(entry).hue + entry.position * 37) % 360;
export const colorOf = (entry: Entry) => `hsl(${hueOf(entry)} 92% 72%)`;
export const softOf = (entry: Entry) => `hsl(${hueOf(entry)} 92% 64% / .22)`;
export function art(entry: Entry) {
  const h = hueOf(entry),
    m = entry.position % 6;
  const a = `hsl(${h} 90% 58%)`,
    b = `hsl(${(h + 48) % 360} 85% 38%)`,
    d = `hsl(${h} 60% 7%)`,
    e = `hsl(${(h + 300) % 360} 70% 15%)`,
    glow = `hsl(${h} 95% 62% / .5)`;
  switch (m) {
    case 0:
      return `radial-gradient(70% 40% at 50% 80%,${glow},transparent 70%),conic-gradient(from 180deg at 50% 80%,${d},${b} 7%,${d} 14%,${a} 24%,${d} 34%,${b} 44%,${d} 56%,${b} 68%,${d} 82%,${a} 91%,${d})`;
    case 1:
      return `radial-gradient(circle at 50% 36%,#040102 0 17%,${a} 17.6% 19%,${glow} 19.5% 34%,transparent 58%),radial-gradient(90% 60% at 50% 112%,${b},transparent 70%),linear-gradient(170deg,${e},${d})`;
    case 2:
      return `radial-gradient(circle at 50% 52%,hsl(${h} 100% 78%) 0 4%,${glow} 5% 16%,transparent 40%),linear-gradient(180deg,${e} 0 52%,${a} 52% 52.7%,${b} 52.7%,${d} 100%)`;
    case 3:
      return `repeating-linear-gradient(112deg,transparent 0 22px,${glow} 22px 24px,transparent 24px 64px),linear-gradient(200deg,${a} -25%,${d} 55%),linear-gradient(25deg,${d} 30%,${b} 130%)`;
    case 4:
      return `repeating-radial-gradient(circle at 50% 90%,transparent 0 26px,${glow} 27px 28px),radial-gradient(70% 60% at 50% 90%,${a},transparent 70%),linear-gradient(180deg,${e},${d})`;
    default:
      return `radial-gradient(60% 50% at 20% 14%,rgba(255,255,255,.28),transparent 60%),linear-gradient(128deg,${a} 0 38%,${b} 38% 39.3%,${d} 39.3%)`;
  }
}
export const storageKey = "verseorder:watched:v1";
export const trailerIds: Record<string, string> = {
  "avengers-endgame": "TcMBFSGVi1c",
  "spider-man-no-way-home": "JfVOs4VSpmA",
};

/** YouTube id of the official trailer, if one has been verified for this title. */
export const trailerOf = (entry: Entry): string | null =>
  entry.trailerYouTubeId || trailerIds[entry.id] || null;

/**
 * Where card trailer files live. Defaults to same-origin `<basePath>/clips`; set
 * NEXT_PUBLIC_MEDIA_BASE (e.g. https://media.example.pages.dev/clips) to serve them elsewhere.
 */
export const mediaBase = (
  process.env.NEXT_PUBLIC_MEDIA_BASE || `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/clips`
).replace(/\/$/, "");

/** Card trailer sources, best codec first. */
export const clipSources = (entry: Entry) =>
  entry.clip
    ? [
        { src: `${mediaBase}/${entry.clip}.webm`, type: 'video/webm; codecs="av01.0.04M.08"' },
        { src: `${mediaBase}/${entry.clip}.mp4`, type: 'video/mp4; codecs="avc1.4D401F"' },
      ]
    : [];

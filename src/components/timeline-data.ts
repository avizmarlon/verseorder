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
/**
 * Chapters group the order into blocks by `position` (inclusive `end`); the finer `era` labels
 * in the data stay as they are. `slug` is the URL hash; `legacy` lists the old #chN hashes
 * (four chapters, until 2026-10) that now land on this chapter.
 */
export const chapters = [
  {
    id: 1,
    slug: "before-the-avengers",
    legacy: ["ch1"],
    name: "Before the Avengers",
    hue: 24,
    end: 10,
    description:
      "Steve Rogers goes to war, Carol Danvers crash-lands in the '90s and Tony Stark builds his first suit. Each hero gets a solo start before Nick Fury brings them together.",
  },
  {
    id: 2,
    slug: "the-avengers-era",
    legacy: [],
    name: "The Avengers Era",
    hue: 214,
    end: 24,
    description:
      "The team assembles in New York, then goes separate ways: Cap digs into S.H.I.E.L.D., the Guardians form in space, and Daredevil and Jessica Jones work the streets. Ends with Ultron and Ant-Man.",
  },
  {
    id: 3,
    slug: "the-road-to-endgame",
    legacy: ["ch2"],
    name: "The Road to Endgame",
    hue: 262,
    end: 44,
    description:
      "The Avengers split over the Sokovia Accords while the Defenders, Black Panther, Spider-Man and Doctor Strange arrive. Then Thanos comes for the Infinity Stones.",
  },
  {
    id: 4,
    slug: "after-endgame",
    legacy: ["ch3"],
    name: "After Endgame",
    hue: 300,
    end: 52,
    description:
      "After the Blip: Wanda, Sam, Peter and a stray Loki deal with what Endgame left behind, Shang-Chi and the Eternals show up, and What If...? starts bending reality.",
  },
  {
    id: 5,
    slug: "the-spider-man-multiverse",
    legacy: [],
    name: "The Spider-Man Multiverse",
    hue: 354,
    end: 63,
    description:
      "Yes, we're going back to 2002. Tobey Maguire's and Andrew Garfield's films plus Venom come first, so No Way Home and the Spider-Verse films have their full context.",
  },
  {
    id: 6,
    slug: "beyond-the-avengers",
    legacy: [],
    name: "Beyond the Avengers",
    hue: 190,
    end: 80,
    description:
      "No team to call: Doctor Strange takes on the multiverse and new heroes step up, from Moon Knight and Ms. Marvel to She-Hulk and Ironheart. Closes with Quantumania, The Marvels and Loki S2.",
  },
  {
    id: 7,
    slug: "marvel-before-the-mcu",
    legacy: ["ch4"],
    name: "Marvel Before the MCU",
    hue: 4,
    end: 87,
    description:
      "A deliberate jump back to pre-MCU films from other studios: Wesley Snipes' Blade, Ben Affleck's Daredevil, Elektra and the 2000s Fantastic Four, so you'll know a few faces that turn up in Deadpool & Wolverine.",
  },
  {
    id: 8,
    slug: "x-men-wolverine-deadpool",
    legacy: [],
    name: "X-Men, Wolverine & Deadpool",
    hue: 46,
    end: 100,
    description:
      "The whole Fox mutant run in one block, from First Class and the original trilogy to Days of Future Past, Deadpool and Logan.",
  },
  {
    id: 9,
    slug: "back-to-the-mcu",
    legacy: [],
    name: "Back to the MCU",
    hue: 168,
    end: 112,
    description:
      "Back to the main sequence. Deadpool & Wolverine pulls the Fox era in, then the latest releases, from Agatha All Along and Thunderbolts* to Spider-Man: Brand New Day.",
  },
] as const;
export type Chapter = (typeof chapters)[number];
export const chapterOf = (entry: Entry): Chapter =>
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
 * Where card trailer files live: `mediaBase` in site.config.json (the R2 bucket behind
 * https://media.verseorder.watch), or NEXT_PUBLIC_MEDIA_BASE at build time (`/clips` serves a
 * local public/clips from the same origin).
 */
export const mediaBase = (
  process.env.NEXT_PUBLIC_MEDIA_BASE ||
  `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/clips`
).replace(/\/$/, "");

/** Card trailer sources, best codec first. */
export const clipSources = (entry: Entry) =>
  entry.clip
    ? [
        {
          src: `${mediaBase}/${entry.clip}.webm`,
          type: 'video/webm; codecs="av01.0.04M.08"',
        },
        {
          src: `${mediaBase}/${entry.clip}.mp4`,
          type: 'video/mp4; codecs="avc1.4D401F"',
        },
      ]
    : [];

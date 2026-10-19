/**
 * Card banner trailer (lazy chunk). The card plays a self-hosted, muted, looping copy
 * of the official trailer (H.264 MP4 + AV1 WebM, no audio track, faststart) instead of a YouTube
 * embed, so the first hover starts in a few tens of milliseconds.
 *
 * - Nothing is fetched on page load. After the first user interaction (scroll, wheel, touch,
 *   pointer, key), the MAX_PRELOAD cards nearest the viewport centre, favouring the direction of
 *   scroll and looking up to 2 screens ahead, get preload="metadata" (Chrome buffers the first
 *   few seconds, ~0.1-0.4 MB; preload="auto" would pull most of the file), so a card is ready
 *   before it scrolls in. It is a hard cap: a card that drops out of the nearest few gives its
 *   buffer back. Save-Data / 2g / 3g: no preload, load on hover only.
 * - Hover / keyboard focus (pointer devices) or the timeline dot on the node (touch) plays it; the
 *   flip-tiles reveal starts on the first presented frame. Leaving reverses the tiles and pauses.
 *   Touch: during a fast fling the dot does not start previews (each would download a trailer);
 *   they start as soon as the scroll slows down.
 * - One video decodes at a time: starting a card pauses any other. A card that stops previewing
 *   or leaves the approach zone drops its sources (download stopped, buffers and decoder freed)
 *   and re-arms with preload="metadata" when it is near again.
 * - prefers-reduced-motion: never attached (static banner). Hidden tab: paused.
 * Imperative on purpose: no React renders while hovering, only attribute flips.
 */

/** About one screen of cards plus the next two or three in the scroll direction. */
const MAX_PRELOAD = 6;
/** Relative to the scroller (not the viewport, whose clipping would cancel the margin). */
const APPROACH_MARGIN = "200% 0px";
/** Pause this long after leaving, so the reverse flip still shows moving video. */
const PAUSE_AFTER_MS = 1100;
const TILE_COLS = 6;
const TILE_ROWS = 3;

type Mode = "idle" | "loading" | "playing";
type Card = {
  key: string;
  cell: HTMLElement;
  video: HTMLVideoElement;
  banner: HTMLElement;
  /** built on the first preview, dropped on release: idle cards carry no extra DOM */
  tiles: HTMLElement | null;
  pos: number | null;
  sources: ClipSource[];
  /** <source> children present (network / decoder may be in use) */
  armed: boolean;
  wants: { hover: boolean; focus: boolean; dot: 0 | 1 | 2 };
  approaching: boolean;
  preloaded: boolean;
  broken: boolean;
  mode: Mode;
  pauseTimer: ReturnType<typeof setTimeout> | undefined;
  frameHandle: number;
};

const cards = new Map<string, Card>();
let ready = false;
let touchMode = false;
let dotPos: number | null = null;
/** One approach observer per scroller (the timeline). */
const approachObservers = new Map<Element | null, IntersectionObserver>();
let scheduled = false;
/** Prefetch only after the user does something: page load (and Lighthouse) stay video-free. */
let engaged = false;
/** Last scroll direction of the scroller: 1 down, -1 up. */
let direction = 1;
let lastScrollTop = 0;
let lastScrollTime = 0;
/** Touch: the timeline is being flung. The dot does not start previews until it slows down. */
let flinging = false;
let flingTimer: ReturnType<typeof setTimeout> | undefined;
/** px/ms; above this the dot crosses a card in well under a second. */
const FLING_SPEED = 1.2;
const FLING_SETTLE_MS = 140;

const reducedMotion = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches;
type NetInfo = { saveData?: boolean; effectiveType?: string };
const net = () =>
  (navigator as Navigator & { connection?: NetInfo }).connection;
/** Save-Data or a slow connection: fetch only when the user actually asks for the preview. */
const lean = () => {
  const connection = net();
  return Boolean(
    connection?.saveData ||
    /^(slow-2g|2g|3g)$/.test(connection?.effectiveType ?? ""),
  );
};

const isActive = (card: Card) =>
  !card.broken &&
  document.visibilityState === "visible" &&
  (card.wants.focus ||
    (touchMode ? card.wants.dot === 2 && !flinging : card.wants.hover));

function setMode(card: Card, mode: Mode) {
  if (card.mode === mode) return;
  card.mode = mode;
  card.cell.dataset.trailer = mode;
}

function reveal(card: Card) {
  if (!isActive(card)) return;
  setMode(card, "playing");
}

/** Put the sources in (idempotent). Kept out until needed so idle cards cost nothing. */
function arm(card: Card) {
  if (card.armed || card.broken) return;
  card.armed = true;
  for (const source of card.sources) {
    const element = document.createElement("source");
    element.src = source.src;
    element.type = source.type;
    card.video.appendChild(element);
  }
  // the last <source> failing means no playable source at all
  card.video.lastElementChild?.addEventListener("error", () =>
    markBroken(card),
  );
}

/**
 * Drop the sources: stops the download and frees the buffered data and the decoder. `keepTiles`
 * leaves the flip tiles in place (a reverse flip may still be finishing on screen).
 */
function release(card: Card, keepTiles = false) {
  if (!card.armed) return;
  card.armed = false;
  card.preloaded = false;
  card.video.cancelVideoFrameCallback?.(card.frameHandle);
  card.video.pause();
  card.video.preload = "none";
  card.video.removeAttribute("src");
  card.video.replaceChildren();
  card.video.load();
  if (!keepTiles) {
    card.tiles?.remove();
    card.tiles = null;
    delete card.cell.dataset.tiles;
  }
  if (!card.broken) card.cell.dataset.clip = "none";
}

/** Only one preview decodes at a time. */
function pauseOthers(card: Card) {
  for (const other of cards.values()) {
    if (other === card || (other.video.paused && other.mode === "idle"))
      continue;
    clearTimeout(other.pauseTimer);
    other.pauseTimer = undefined;
    other.video.cancelVideoFrameCallback?.(other.frameHandle);
    setMode(other, "idle");
    other.video.pause();
  }
}

function start(card: Card) {
  clearTimeout(card.pauseTimer);
  card.pauseTimer = undefined;
  const video = card.video;
  if (!card.armed) {
    arm(card);
    video.load();
  }
  card.tiles ??= buildTiles(card.cell, card.banner);
  pauseOthers(card);
  // Stay on preload="metadata" while playing: Chrome then buffers a short window ahead of the
  // playhead and stops fetching once paused, instead of pulling the whole trailer ("auto").
  if (video.preload === "none") video.preload = "metadata";
  const playing = !video.paused && video.readyState >= 3;
  if (playing) return reveal(card);
  setMode(card, "loading");
  // Reveal on the first frame that is actually presented (falls back to the 'playing' event).
  if (typeof video.requestVideoFrameCallback === "function") {
    video.cancelVideoFrameCallback(card.frameHandle);
    card.frameHandle = video.requestVideoFrameCallback(() => reveal(card));
  } else video.addEventListener("playing", () => reveal(card), { once: true });
  video.play().catch(() => {
    // autoplay refused (should not happen for a muted inline video) or source failed
    if (video.error) markBroken(card);
    else setMode(card, "idle");
  });
}

function stop(card: Card) {
  if (card.mode === "idle") return;
  setMode(card, "idle");
  card.video.cancelVideoFrameCallback?.(card.frameHandle);
  clearTimeout(card.pauseTimer);
  card.pauseTimer = setTimeout(() => {
    card.pauseTimer = undefined;
    if (!isActive(card)) {
      card.video.pause();
      // A paused <video> keeps buffering ahead (Chrome: several MB). Dropping the sources stops
      // that download, so it neither costs mobile data nor competes with the next card; the
      // re-armed card re-reads its start from the HTTP cache and plays from the top next time.
      release(card, true);
    }
    schedule(); // re-preloads it if it is still one of the nearest
  }, PAUSE_AFTER_MS);
}

function markBroken(card: Card) {
  card.broken = true;
  card.cell.dataset.clip = "error";
  setMode(card, "idle");
  card.armed = false;
  card.video.removeAttribute("src");
  card.video.replaceChildren();
}

/** Nearest approaching cards (and the dot's neighbours) get their first seconds buffered. */
function preloadNearest() {
  if (lean() || !engaged) return;
  const centre = innerHeight / 2;
  const ranked = [...cards.values()]
    .filter((card) => !card.broken && (card.approaching || card.wants.dot > 0))
    .map((card) => {
      const rect = card.cell.getBoundingClientRect();
      const offset = rect.top + rect.height / 2 - centre;
      // cards behind the scroll direction count triple: the next ones matter more
      const distance =
        Math.abs(offset) * (Math.sign(offset) === -direction ? 3 : 1);
      return { card, score: distance - (card.wants.dot ? 10000 : 0) };
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, MAX_PRELOAD);
  const keep = new Set(ranked.map(({ card }) => card));
  // a hard cap: a preloaded card that dropped out of the nearest few gives its buffer back
  for (const card of cards.values())
    if (
      card.armed &&
      !keep.has(card) &&
      !isActive(card) &&
      card.mode === "idle" &&
      card.pauseTimer === undefined
    )
      release(card);
  for (const { card } of ranked) {
    if (card.preloaded) continue;
    card.preloaded = true;
    card.video.preload = "metadata";
    arm(card);
    card.video.load();
    card.cell.dataset.clip = "loading";
  }
}

function evaluate() {
  scheduled = false;
  preloadNearest();
  for (const card of cards.values()) {
    if (isActive(card)) start(card);
    else {
      stop(card);
      // far away and done: give the memory back
      if (!card.approaching && !card.wants.dot && card.pauseTimer === undefined)
        release(card);
    }
  }
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(evaluate);
}

function setDot(pos: number | null) {
  if (pos === dotPos) return;
  dotPos = pos;
  for (const card of cards.values()) {
    const d = pos === null || card.pos === null ? 99 : Math.abs(card.pos - pos);
    card.wants.dot = d === 0 ? 2 : d === 1 ? 1 : 0;
  }
  schedule();
}

function ensureGlobals() {
  if (ready) return;
  ready = true;
  touchMode =
    new URLSearchParams(location.search).get("touch") === "1" ||
    matchMedia("(hover: none)").matches;
  document.addEventListener("vo:dot", (event) =>
    setDot((event as CustomEvent<number | null>).detail),
  );
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden")
      for (const card of cards.values()) {
        card.wants.hover = false;
        setMode(card, "idle");
        card.video.pause();
      }
    schedule();
  });
  // already scrolled (resume, deep link, or the chunk loaded after the user started scrolling)
  if (document.querySelector(".b-root")?.scrollTop) engaged = true;
  const engage = () => {
    if (engaged) return;
    engaged = true;
    for (const type of ENGAGE_EVENTS) removeEventListener(type, engage, true);
    schedule();
  };
  for (const type of ENGAGE_EVENTS)
    addEventListener(type, engage, { capture: true, passive: true });
  // scroll events do not bubble; capture sees the scroller's
  document.addEventListener(
    "scroll",
    (event) => {
      const target = event.target as HTMLElement;
      if (!(target instanceof HTMLElement)) return;
      const now = performance.now();
      const delta = target.scrollTop - lastScrollTop;
      if (delta) direction = delta > 0 ? 1 : -1;
      const speed = Math.abs(delta) / Math.max(now - lastScrollTime, 1);
      lastScrollTop = target.scrollTop;
      lastScrollTime = now;
      if (!touchMode) return;
      // A fling would start (and download) a trailer at every node it crosses: hold the dot's
      // previews until the scroll slows down, so the bandwidth goes to the cards ahead.
      clearTimeout(flingTimer);
      if (speed > FLING_SPEED) {
        flinging = true;
        flingTimer = setTimeout(() => {
          flinging = false;
          schedule();
        }, FLING_SETTLE_MS);
      } else if (flinging) {
        flinging = false;
        schedule();
      }
    },
    { capture: true, passive: true },
  );
  const initial = Number(document.documentElement.dataset.voDot);
  if (initial) setDot(initial);
}

const ENGAGE_EVENTS = [
  "scroll",
  "wheel",
  "touchstart",
  "pointerdown",
  "pointermove",
  "keydown",
] as const;

function observerFor(cell: HTMLElement) {
  const root = cell.closest(".b-root");
  let observer = approachObservers.get(root);
  if (!observer) {
    observer = new IntersectionObserver(
      (records) => {
        for (const record of records)
          for (const card of cards.values())
            if (card.cell === record.target)
              card.approaching = record.isIntersecting;
        schedule();
      },
      { root, rootMargin: APPROACH_MARGIN },
    );
    approachObservers.set(root, observer);
  }
  return observer;
}

function buildTiles(cell: HTMLElement, banner: HTMLElement) {
  const image = banner.querySelector<HTMLImageElement>(".b-bimg");
  const src = image?.currentSrc || image?.src;
  const wrap = document.createElement("div");
  wrap.className = "b-tiles";
  for (let i = 0; i < TILE_COLS * TILE_ROWS; i++) {
    const tile = document.createElement("i");
    tile.className = "b-tile";
    tile.style.setProperty("--c", String(i % TILE_COLS));
    tile.style.setProperty("--r", String(Math.floor(i / TILE_COLS)));
    const face = document.createElement("b");
    face.className = "b-tface";
    if (src) {
      const img = document.createElement("img");
      img.className = "b-timg";
      img.src = src;
      img.alt = "";
      img.decoding = "async";
      img.referrerPolicy = "no-referrer";
      img.draggable = false;
      face.appendChild(img);
    }
    tile.appendChild(face);
    wrap.appendChild(tile);
  }
  cell.querySelector(".b-vid")?.after(wrap);
  cell.dataset.tiles = "";
  return wrap;
}

export type ClipSource = { src: string; type: string };

export function attach(options: {
  cell: HTMLElement;
  key: string;
  pos: number | null;
  sources: ClipSource[];
}): () => void {
  const { cell } = options;
  const slot = cell.querySelector<HTMLElement>(".b-vid");
  const banner = cell.querySelector<HTMLElement>(".b-banner");
  if (!slot || !banner || reducedMotion()) {
    cell.dataset.clip = "off";
    return () => {};
  }
  ensureGlobals();
  const video = document.createElement("video");
  video.muted = true;
  video.defaultMuted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = "none";
  video.disablePictureInPicture = true;
  video.disableRemotePlayback = true;
  video.setAttribute("muted", "");
  video.setAttribute("playsinline", "");
  video.setAttribute("aria-hidden", "true");
  video.tabIndex = -1;
  slot.appendChild(video);
  const card: Card = {
    key: options.key,
    cell,
    video,
    banner,
    tiles: null,
    pos: options.pos,
    sources: options.sources,
    armed: false,
    wants: { hover: false, focus: false, dot: 0 },
    approaching: false,
    preloaded: false,
    broken: false,
    mode: "idle",
    pauseTimer: undefined,
    frameHandle: 0,
  };
  cards.set(card.key, card);
  cell.dataset.clip = "none";
  video.addEventListener("error", () => markBroken(card));
  video.addEventListener("loadeddata", () => {
    if (!card.broken) cell.dataset.clip = "ready";
  });

  const hit = cell.querySelector<HTMLElement>(".b-hit");
  const enter = (event: PointerEvent) => {
    if (touchMode || event.pointerType === "touch") return;
    card.wants.hover = true;
    // act in the same task: the hover is what the user is waiting on
    if (isActive(card)) start(card);
  };
  const leave = () => {
    card.wants.hover = false;
    schedule();
  };
  const focusIn = () => {
    card.wants.focus = true;
    start(card);
  };
  const focusOut = () => {
    card.wants.focus = false;
    schedule();
  };
  cell.addEventListener("pointerenter", enter);
  cell.addEventListener("pointerleave", leave);
  hit?.addEventListener("focus", focusIn);
  hit?.addEventListener("blur", focusOut);
  const approach = observerFor(cell);
  approach.observe(cell);
  if (card.pos !== null && dotPos !== null) {
    const d = Math.abs(card.pos - dotPos);
    card.wants.dot = d === 0 ? 2 : d === 1 ? 1 : 0;
  }
  // the chunk loads lazily: the pointer / focus may already be on the card
  if (!touchMode && cell.matches(":hover")) card.wants.hover = true;
  if (hit && document.activeElement === hit) card.wants.focus = true;
  schedule();

  return () => {
    clearTimeout(card.pauseTimer);
    cell.removeEventListener("pointerenter", enter);
    cell.removeEventListener("pointerleave", leave);
    hit?.removeEventListener("focus", focusIn);
    hit?.removeEventListener("blur", focusOut);
    approach.unobserve(cell);
    video.pause();
    video.removeAttribute("src");
    video.replaceChildren();
    video.load();
    video.remove();
    card.tiles?.remove();
    delete cell.dataset.tiles;
    cards.delete(card.key);
    cell.dataset.trailer = "idle";
  };
}

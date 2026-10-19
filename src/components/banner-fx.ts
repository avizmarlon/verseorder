/**
 * Card banner trailers (PROTOTYPE). Lazy chunk: only loaded once a card with a banner is near the
 * viewport. Imperative on purpose: no React renders while hovering, only attribute flips and
 * transform/opacity/clip-path transitions defined in globals.css.
 *
 * Model
 *  - A small pool (MAX_PLAYERS) of muted YouTube players (youtube-nocookie, postMessage API, no
 *    iframe_api script) keeps the likeliest-next trailers *playing but invisible* inside their card,
 *    so YouTube's own overlay has timed out and buffering is done before the user asks for them.
 *  - "Warm" = iframe mounted; "settled" = playing for SETTLE_S seconds of video; only then can a card
 *    be revealed (data-trailer="playing"), so reveal is gated on a real PLAYING state.
 *  - Who is warmed: the card under the timeline dot, its neighbours, the card the pointer is heading
 *    towards, the hovered / focused card. Who is revealed: hovered/focused (pointer devices) or the
 *    card the dot is on (touch).
 */
import type { FxId } from "./timeline-data";

const ORIGIN = "https://www.youtube-nocookie.com";
const MAX_PLAYERS = 2;
/** Seconds of continuous playback before YouTube's auto-hiding overlay is gone. */
const SETTLE_S = 3.4;
const GRACE_MS = 2500;
const LOAD_TIMEOUT_MS = 20_000;
const NEAR_PX = 260;
const HOVER_INTENT_WARM_MS = 40;
const HOVER_INTENT_COLD_MS = 180;

type Mode = "idle" | "loading" | "playing";
interface FxCtl {
  setPlaying(on: boolean): void;
  destroy(): void;
}
interface Card {
  key: string;
  cell: HTMLElement;
  vid: HTMLElement;
  banner: HTMLElement;
  hit: HTMLElement | null;
  pos: number | null;
  videoId: string;
  start: number;
  fx: FxId;
  wants: { dot: 0 | 1 | 2; near: boolean; hover: boolean; focus: boolean };
  dotBias: number;
  inView: boolean;
  player: Player | null;
  fxCtl: FxCtl | null;
  mode: Mode;
  destroyTimer: ReturnType<typeof setTimeout> | undefined;
  hoverTimer: ReturnType<typeof setTimeout> | undefined;
  lastWanted: number;
}

const cards = new Map<string, Card>();
const brokenVideos = new Set<string>();
const byWindow = new Map<Window, Player>();
let touchMode = false;
let dotPos: number | null = null;
let dotDir = 1;
let pointer: { x: number; y: number } | null = null;
let scheduled = false;
let globalsReady = false;
let viewObserver: IntersectionObserver | null = null;

/* ------------------------------------------------------------------ */
/* Environment                                                          */
/* ------------------------------------------------------------------ */
type Conn = { saveData?: boolean; effectiveType?: string };
const connection = () =>
  (navigator as Navigator & { connection?: Conn }).connection;
const reducedMotion = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches;
const allowed = () => !reducedMotion() && !connection()?.saveData;
const canPrewarm = () =>
  allowed() && !["slow-2g", "2g", "3g"].includes(connection()?.effectiveType || "");

/* ------------------------------------------------------------------ */
/* YouTube player (postMessage protocol)                                */
/* ------------------------------------------------------------------ */
class Player {
  frame: HTMLIFrameElement;
  settled = false;
  failed = false;
  private state = -2;
  private anchor: number | null = null;
  private time = 0;
  private timeout: ReturnType<typeof setTimeout>;
  constructor(
    host: HTMLElement,
    private videoId: string,
    private start: number,
    private notify: () => void,
  ) {
    const params = new URLSearchParams({
      autoplay: "1",
      mute: "1",
      controls: "0",
      loop: "1",
      playlist: videoId,
      playsinline: "1",
      modestbranding: "1",
      rel: "0",
      disablekb: "1",
      iv_load_policy: "3",
      fs: "0",
      cc_load_policy: "0",
      enablejsapi: "1",
      origin: location.origin,
    });
    if (start) params.set("start", String(start));
    const frame = document.createElement("iframe");
    frame.src = `${ORIGIN}/embed/${videoId}?${params}`;
    frame.title = "Trailer preview (decorative)";
    frame.tabIndex = -1;
    frame.setAttribute("aria-hidden", "true");
    frame.allow = "autoplay; encrypted-media";
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    frame.setAttribute(
      "sandbox",
      "allow-scripts allow-same-origin allow-presentation",
    );
    frame.addEventListener("load", () => {
      this.post({ event: "listening", id: 1, channel: "widget" });
      this.command("unloadModule", ["captions"]);
    });
    host.appendChild(frame);
    this.frame = frame;
    if (frame.contentWindow) byWindow.set(frame.contentWindow, this);
    this.timeout = setTimeout(() => {
      if (!this.settled) this.fail();
    }, LOAD_TIMEOUT_MS);
  }
  private post(message: object) {
    this.frame.contentWindow?.postMessage(JSON.stringify(message), ORIGIN);
  }
  command(func: string, args: unknown[] = []) {
    this.post({ event: "command", func, args, id: 1, channel: "widget" });
  }
  private fail() {
    if (this.failed) return;
    this.failed = true;
    brokenVideos.add(this.videoId);
    this.notify();
  }
  private restart() {
    this.settled = false;
    this.anchor = null;
    this.command("seekTo", [this.start, true]);
    this.notify();
  }
  handle(raw: unknown) {
    let data: { event?: string; info?: unknown } | null = null;
    try {
      data = typeof raw === "string" ? JSON.parse(raw) : (raw as typeof data);
    } catch {
      return;
    }
    if (!data) return;
    if (data.event === "onError") return this.fail();
    let playerState: number | undefined;
    let currentTime: number | undefined;
    let duration: number | undefined;
    if (data.event === "onStateChange" && typeof data.info === "number")
      playerState = data.info;
    else if (data.event === "infoDelivery" && data.info && typeof data.info === "object") {
      const info = data.info as {
        playerState?: number;
        currentTime?: number;
        duration?: number;
      };
      playerState = info.playerState;
      currentTime = info.currentTime;
      duration = info.duration;
    } else return;
    if (typeof currentTime === "number") this.time = currentTime;
    if (playerState !== undefined && playerState !== this.state) {
      this.state = playerState;
      if (playerState === 1 && this.anchor === null) this.anchor = this.time;
      else if (playerState === 2 || playerState === 0 || playerState === -1) {
        this.anchor = null;
        if (this.settled) {
          this.settled = false;
          this.notify();
        }
      }
    }
    if (typeof currentTime !== "number") return;
    // Looping restarts at 0:00 (rating card, logos) and seeking brings YouTube's overlay back for
    // a few seconds, so wrap manually and re-settle.
    const wrapped =
      (duration && currentTime >= duration - 0.7) ||
      (this.start && this.state === 1 && currentTime > 0 && currentTime < this.start - 0.6);
    if (wrapped && this.state === 1) return this.restart();
    if (
      !this.settled &&
      this.state === 1 &&
      this.anchor !== null &&
      currentTime - this.anchor >= SETTLE_S
    ) {
      this.settled = true;
      clearTimeout(this.timeout);
      this.notify();
    }
  }
  destroy() {
    clearTimeout(this.timeout);
    const win = this.frame.contentWindow;
    if (win) byWindow.delete(win);
    this.frame.remove();
  }
}

/* ------------------------------------------------------------------ */
/* Transition layers that CSS alone cannot express                      */
/* ------------------------------------------------------------------ */
const TILE_COLS = 6;
const TILE_ROWS = 3;

function buildTiles(card: Card): FxCtl {
  const src = card.banner.querySelector<HTMLImageElement>(".b-bimg")?.currentSrc;
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
  card.vid.after(wrap);
  return { setPlaying() {}, destroy: () => wrap.remove() };
}

function buildBars(card: Card): FxCtl {
  const top = document.createElement("div");
  const bottom = document.createElement("div");
  top.className = "b-bar b-bar-t";
  bottom.className = "b-bar b-bar-b";
  card.banner.append(top, bottom);
  const base = { duration: 1000, fill: "both" as const, easing: "cubic-bezier(0.55, 0.05, 0.3, 1)" };
  const bars = (el: HTMLElement) =>
    el.animate(
      [
        { transform: "scaleY(0)" },
        { transform: "scaleY(1)", offset: 0.3 },
        { transform: "scaleY(0.22)" },
      ],
      base,
    );
  const anims = [
    bars(top),
    bars(bottom),
    card.vid.animate(
      [
        { opacity: 0 },
        { opacity: 0, offset: 0.28 },
        { opacity: 1, offset: 0.31 },
        { opacity: 1 },
      ],
      { duration: 1000, fill: "both" },
    ),
  ];
  anims.forEach((a) => a.pause());
  let engaged = false;
  return {
    setPlaying(on) {
      if (!on && !engaged) return;
      engaged = true;
      const want = on ? 1 : -1;
      for (const a of anims) {
        // reverse() resumes from the current position, so rapid enter/leave never jumps
        if (a.playbackRate !== want) a.reverse();
        else a.play();
      }
    },
    destroy() {
      anims.forEach((a) => a.cancel());
      top.remove();
      bottom.remove();
    },
  };
}

function buildFx(card: Card): FxCtl | null {
  if (card.fx === "tiles") return buildTiles(card);
  if (card.fx === "letterbox") return buildBars(card);
  return null; // shutter is pure CSS (@property mask transition)
}

/* ------------------------------------------------------------------ */
/* Director                                                             */
/* ------------------------------------------------------------------ */
const isActive = (card: Card) =>
  card.wants.focus ||
  (touchMode ? card.wants.dot === 2 : card.wants.hover);

const priority = (card: Card) =>
  isActive(card)
    ? 100
    : card.wants.near
      ? 60
      : card.wants.dot === 2
        ? 50
        : card.wants.dot === 1
          ? 40 + card.dotBias
          : 0;

function destroyPlayer(card: Card) {
  clearTimeout(card.destroyTimer);
  card.destroyTimer = undefined;
  if (card.mode !== "idle") {
    card.mode = "idle";
    card.cell.dataset.trailer = "idle";
    card.fxCtl?.setPlaying(false);
  }
  card.player?.destroy();
  card.player = null;
  card.fxCtl?.destroy();
  card.fxCtl = null;
  card.cell.dataset.warm = "off";
}

function createPlayer(card: Card) {
  if (brokenVideos.has(card.videoId)) return;
  card.fxCtl = buildFx(card);
  card.player = new Player(card.vid, card.videoId, card.start, schedule);
  card.cell.dataset.warm = "loading";
}

function evaluate() {
  scheduled = false;
  const live = [...cards.values()];
  if (!allowed()) {
    live.forEach((card) => card.player && destroyPlayer(card));
    return;
  }
  const prewarm = canPrewarm();
  const ranked = live
    .map((card) => ({ card, score: priority(card) }))
    .filter(({ card, score }) =>
      score > 0 && (prewarm || isActive(card)) && !brokenVideos.has(card.videoId),
    )
    .sort((a, b) => b.score - a.score || b.card.lastWanted - a.card.lastWanted)
    .slice(0, MAX_PLAYERS);
  const desired = new Set(ranked.map((r) => r.card));
  for (const card of live) {
    if (desired.has(card)) {
      clearTimeout(card.destroyTimer);
      card.destroyTimer = undefined;
      continue;
    }
    if (card.player && !card.destroyTimer)
      card.destroyTimer = setTimeout(() => {
        card.destroyTimer = undefined;
        destroyPlayer(card);
      }, GRACE_MS);
  }
  // hard cap: evict undesired players immediately before creating new ones
  let count = live.filter((c) => c.player).length;
  for (const { card } of ranked) {
    if (card.player) continue;
    if (count >= MAX_PLAYERS) {
      const victim = live.find((c) => c.player && !desired.has(c));
      if (!victim) continue;
      destroyPlayer(victim);
      count--;
    }
    createPlayer(card);
    count++;
  }
  for (const card of live) {
    const p = card.player;
    if (p?.failed) destroyPlayer(card);
    const mode: Mode =
      !card.player || !isActive(card) ? "idle" : card.player.settled ? "playing" : "loading";
    if (mode !== card.mode) {
      card.mode = mode;
      card.cell.dataset.trailer = mode;
      card.fxCtl?.setPlaying(mode === "playing");
    }
    if (card.player)
      card.cell.dataset.warm = card.player.settled ? "ready" : "loading";
  }
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(evaluate);
}

function setDot(pos: number | null) {
  if (pos === dotPos) return;
  if (pos !== null && dotPos !== null) dotDir = pos > dotPos ? 1 : -1;
  dotPos = pos;
  for (const card of cards.values()) {
    const d = pos === null || card.pos === null ? 99 : Math.abs(card.pos - pos);
    card.wants.dot = d === 0 ? 2 : d === 1 ? 1 : 0;
    card.dotBias = card.pos !== null && pos !== null && card.pos - pos === dotDir ? 1 : 0;
    if (card.wants.dot) card.lastWanted = performance.now();
  }
  scanNear();
  schedule();
}

let nearFrame = 0;
function scanNear() {
  if (touchMode || nearFrame) return;
  nearFrame = requestAnimationFrame(() => {
    nearFrame = 0;
    if (!pointer) return;
    let changed = false;
    for (const card of cards.values()) {
      let near = false;
      if (card.inView) {
        const r = card.cell.getBoundingClientRect();
        const dx = Math.max(r.left - pointer.x, 0, pointer.x - r.right);
        const dy = Math.max(r.top - pointer.y, 0, pointer.y - r.bottom);
        near = dx * dx + dy * dy <= NEAR_PX * NEAR_PX;
      }
      if (near !== card.wants.near) {
        card.wants.near = near;
        if (near) card.lastWanted = performance.now();
        changed = true;
      }
    }
    if (changed) schedule();
  });
}

function ensureGlobals() {
  if (globalsReady) return;
  globalsReady = true;
  const params = new URLSearchParams(location.search);
  touchMode =
    params.get("touch") === "1" || matchMedia("(hover: none)").matches;
  window.addEventListener("message", (event) => {
    if (event.origin !== ORIGIN || !event.source) return;
    byWindow.get(event.source as Window)?.handle(event.data);
  });
  if (!touchMode)
    document.addEventListener(
      "pointermove",
      (event) => {
        if (event.pointerType === "touch") return;
        pointer = { x: event.clientX, y: event.clientY };
        scanNear();
      },
      { passive: true },
    );
  document.addEventListener("vo:dot", (event) =>
    setDot((event as CustomEvent<number | null>).detail),
  );
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      for (const card of cards.values()) {
        card.wants.hover = false;
        if (card.player) destroyPlayer(card);
      }
    } else schedule();
  });
  matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", schedule);
  viewObserver = new IntersectionObserver((records) => {
    for (const record of records) {
      const card = [...cards.values()].find((c) => c.cell === record.target);
      if (card) card.inView = record.isIntersecting;
    }
    scanNear();
  });
  const initial = Number(document.documentElement.dataset.voDot);
  if (initial) setDot(initial);
}

export function attach(options: {
  cell: HTMLElement;
  id: string;
  /** Timeline position (enables dot-driven warming/playing); null for lab cards. */
  pos: number | null;
  videoId: string;
  start: number;
  fx: FxId;
}): () => void {
  ensureGlobals();
  const { cell } = options;
  const vid = cell.querySelector<HTMLElement>(".b-vid");
  const banner = cell.querySelector<HTMLElement>(".b-banner");
  if (!vid || !banner || !allowed()) {
    cell.dataset.warm = "off";
    // still honour later changes (e.g. reduced motion toggled off) only on next attach
    return () => {};
  }
  const card: Card = {
    key: options.id,
    cell,
    vid,
    banner,
    hit: cell.querySelector<HTMLElement>(".b-hit"),
    pos: options.pos,
    videoId: options.videoId,
    start: options.start,
    fx: options.fx,
    wants: { dot: 0, near: false, hover: false, focus: false },
    dotBias: 0,
    inView: false,
    player: null,
    fxCtl: null,
    mode: "idle",
    destroyTimer: undefined,
    hoverTimer: undefined,
    lastWanted: 0,
  };
  cards.set(card.key, card);
  cell.dataset.warm = "off";
  viewObserver?.observe(cell);

  const enter = (event: PointerEvent) => {
    if (touchMode || event.pointerType === "touch") return;
    clearTimeout(card.hoverTimer);
    const warm = card.player?.settled;
    card.hoverTimer = setTimeout(
      () => {
        card.wants.hover = true;
        card.lastWanted = performance.now();
        schedule();
      },
      warm ? HOVER_INTENT_WARM_MS : HOVER_INTENT_COLD_MS,
    );
    // start warming immediately; reveal waits for hover intent
    card.wants.near = true;
    schedule();
  };
  const leave = () => {
    clearTimeout(card.hoverTimer);
    if (card.wants.hover) {
      card.wants.hover = false;
      schedule();
    }
  };
  const focusIn = () => {
    card.wants.focus = true;
    card.lastWanted = performance.now();
    schedule();
  };
  const focusOut = () => {
    card.wants.focus = false;
    schedule();
  };
  cell.addEventListener("pointerenter", enter);
  cell.addEventListener("pointerleave", leave);
  card.hit?.addEventListener("focus", focusIn);
  card.hit?.addEventListener("blur", focusOut);
  // the engine loads lazily: the pointer / focus may already be on the card when it attaches
  if (!touchMode && cell.matches(":hover")) enter(new PointerEvent("pointerenter"));
  if (card.hit && document.activeElement === card.hit) focusIn();
  if (card.pos !== null && dotPos !== null) {
    const d = Math.abs(card.pos - dotPos);
    card.wants.dot = d === 0 ? 2 : d === 1 ? 1 : 0;
  }
  schedule();
  return () => {
    clearTimeout(card.hoverTimer);
    cell.removeEventListener("pointerenter", enter);
    cell.removeEventListener("pointerleave", leave);
    card.hit?.removeEventListener("focus", focusIn);
    card.hit?.removeEventListener("blur", focusOut);
    viewObserver?.unobserve(cell);
    destroyPlayer(card);
    cards.delete(card.key);
    cell.dataset.trailer = "idle";
  };
}

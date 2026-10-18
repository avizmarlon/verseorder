"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownRight, ArrowRight, Check, CheckCircle2, ChevronDown, Clapperboard, Compass, ExternalLink, Menu, Play, Search, Sparkles, X } from "lucide-react";
import collection from "@/data/watch-order.json";

type Concept = "archive" | "timeline" | "multiverse";
type Filter = "all" | "mcu" | "external" | "optional";
type Entry = {
  id: string; position: number; title: string; kind: string; era: string;
  universe: string; optional: boolean; external: boolean; alternateUniverse: boolean;
  note: string; whyHere: string | null;
  releaseStatus?: "released" | "releasing";
  releaseProgress?: { episodesAvailable: number; episodesTotal: number; asOf: string };
  trailerYouTubeId: string | null; posterPath: string | null;
};
const entries = collection.entries as Entry[];

const COPY = {
  eyebrow: "THE ULTIMATE MARVEL MULTIVERSE WATCH ORDER",
  archive: "Discover", timeline: "Watch order", multiverse: "Universes",
  liveLab: "STORIES ACROSS THE MULTIVERSE", journey: "YOUR JOURNEY, REIMAGINED",
  exploreOrder: "Explore the watch order", browse: "Browse the collection",
  subtitle: "One carefully crafted order. Countless unforgettable worlds.",
  blurb: "Not just when the stories happen. The order that makes every connection, revelation, and reunion hit harder.",
  baseline: "October 2026 update · earlier entries under editorial review",
  titles: "CURATED CHAPTERS", worlds: "INTERCONNECTED WORLDS", progress: "YOUR JOURNEY",
  completed: "watched", watch: "Mark as watched", unwatch: "Mark as unwatched",
  details: "Explore chapter", next: "UP NEXT", why: "WHY THIS CHAPTER HERE",
  spoilerSafe: "SPOILER-CONSCIOUS",
  video: "Watch official trailer", searchTrailer: "Find an official trailer",
  trailerUnavailable: "Direct trailer verification is pending for this title.",
  all: "All entries", mcu: "MCU", external: "Legacy", optional: "Optional",
  search: "Find a title, universe, or chapter...", nothing: "No titles match your filters.",
  loadMore: "Reveal more chapters", showTimeline: "Explore timeline",
  archiveLead: "Every story.\nIn its perfect place.",
  archiveAside: "ENTER THE STORY / 001 —", discover: "DISCOVER YOUR NEXT CHAPTER",
  timelineLead: "Every moment\nleads somewhere.",
  timelineDesc: "A single thread through many eras. Follow the path, discover the context, and make this journey yours.",
  selected: "SELECTED CHAPTER", of: "OF", origins: "CHAPTERS ACROSS TIME",
  multiverseLead: "There is more than\none way through.",
  multiverseDesc: "Different worlds. Shared echoes. A watch order designed around connections, not arbitrary dates.",
  diveIn: "Choose a reality", universeMcu: "MAIN TIMELINE", universeLegacy: "LEGACY WORLDS",
  universeSpider: "SPIDER-VERSE", universeAlt: "ALTERNATE MCU",
  curated: "A deliberate selection", order: "WATCH ORDER",
  close: "Close", preview: "TRAILER PREVIEW", open: "Open on YouTube",
  previewHover: "HOVER TO REVEAL", more: "View the sequence",
  foot: "An independent fan-curated viewing guide. Not affiliated with Marvel, Disney or Sony.",
  footerNote: "Watch-order decisions reflect narrative preference, not an official universal chronology.",
  status: "Selection under editorial review",
} as const;

const TRAILERS: Record<string, string> = {
  "avengers-endgame": "TcMBFSGVi1c",
  "spider-man-no-way-home": "JfVOs4VSpmA",
};
const SHADES = [
  ["#304b8a", "#80b2ff"], ["#75325d", "#fb9e91"], ["#3d5b49", "#b9d2a3"],
  ["#79563b", "#f6cf88"], ["#5d337a", "#dc9eff"], ["#294b60", "#81d9dd"],
  ["#712d46", "#fd899e"], ["#3e3d7d", "#b2b2ff"],
];
const universeOptions = [
  { id: "MCU", key: "universeMcu", accent: "#fa584b", number: "616", top: "23%", left: "50%" },
  { id: "Legacy / Sony / Fox", key: "universeLegacy", accent: "#79a5ff", number: "001", top: "67%", left: "18%" },
  { id: "Spider-Verse", key: "universeSpider", accent: "#c896ff", number: "042", top: "69%", left: "80%" },
  { id: "Alternate MCU", key: "universeAlt", accent: "#ffcf88", number: "828", top: "44%", left: "79%" },
] as const;

const num = (n: number) => String(n).padStart(3, "0");
const getColors = (n: number) => SHADES[(n * 3 + Math.floor(n / 7)) % SHADES.length];

function Emblem({ small = false }: { small?: boolean }) {
  return <span className={small ? "brand-emblem brand-emblem-small" : "brand-emblem"} aria-hidden="true"><span>✦</span></span>;
}

function Art({ entry, variant = "" }: { entry: Entry; variant?: string }) {
  const [base, light] = getColors(entry.position);
  return (
    <div className={`cover-art ${variant}`} style={{ "--art-base": base, "--art-light": light } as React.CSSProperties} aria-hidden="true">
      <div className="art-veil" />
      <div className="art-halo art-halo-one" /><div className="art-halo art-halo-two" />
      <div className="art-ray art-ray-one" /><div className="art-ray art-ray-two" />
      <div className="art-glyph">{entry.position % 3 === 0 ? "✧" : entry.position % 3 === 1 ? "◈" : "✦"}</div>
      <div className="art-number">{num(entry.position)}</div>
    </div>
  );
}

function ProgressRing({ progress }: { progress: number }) {
  return <div className="progress-ring" style={{ "--p": `${progress}%` } as React.CSSProperties}><span>{Math.round(progress)}<small>%</small></span></div>;
}

function TitleCard({
  entry, watched, onSelect, onToggle, index, layout = "standard",
}: {
  entry: Entry; watched: boolean; onSelect: (entry: Entry) => void;
  onToggle: (id: string) => void; index: number; layout?: "standard" | "wide";
}) {
  const text = COPY;
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.16 }}
      transition={{ delay: Math.min(index * .038, .34), duration: .52 }}
      className={`title-card ${layout === "wide" ? "title-card-wide" : ""}`}
    >
      <button className="card-hit" onClick={() => onSelect(entry)} aria-label={`${text.details}: ${entry.title}`}>
        <Art entry={entry} />
        <span className="card-caption"><span className="card-no">{num(entry.position)} / {entries.length}</span>
          <span className="card-meta">{entry.releaseStatus === "releasing" ? "AIRING" : entry.optional ? "OPTIONAL" : entry.external ? "LEGACY" : "MAIN PATH"}</span></span>
        <span className="card-title">{entry.title}</span>
        <span className="card-reveal">
          <span>{text.details}</span><ArrowUpRightIcon />
        </span>
      </button>
      <button
        aria-label={watched ? text.unwatch : text.watch}
        className={`card-check ${watched ? "card-checked" : ""}`}
        onClick={() => onToggle(entry.id)}
        title={watched ? text.unwatch : text.watch}
      ><Check size={15} strokeWidth={2.5} /></button>
    </motion.article>
  );
}

function ArrowUpRightIcon() { return <ArrowDownRight size={17} style={{ transform: "rotate(-90deg)" }} />; }

export default function VerseOrderExperience() {
  const [concept, setConcept] = useState<Concept>("archive");
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(24);
  const [watched, setWatched] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState<Entry | null>(null);
  const [trailer, setTrailer] = useState<Entry | null>(null);
  const [universe, setUniverse] = useState("MCU");
  const [menuOpen, setMenuOpen] = useState(false);
  const visualRef = useRef<HTMLDivElement | null>(null);
  const reduceMotion = useReducedMotion();
  const text = COPY;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const saved = JSON.parse(window.localStorage.getItem("verseorder:watched:v1") || "[]");
        if (Array.isArray(saved)) setWatched(new Set(saved.filter((id): id is string => typeof id === "string")));
      } catch { /* no storage available */ }
      setReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem("verseorder:watched:v1", JSON.stringify([...watched]));
    } catch { /* storage is optional */ }
  }, [watched, ready]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setSelected(null); setTrailer(null); setMenuOpen(false); }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    document.body.style.overflow = selected || trailer ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [selected, trailer]);

  const toggle = (id: string) => setWatched(prev => {
    const updated = new Set(prev);
    if (updated.has(id)) updated.delete(id); else updated.add(id);
    return updated;
  });
  const visible = useMemo(() => entries.filter(item => {
    const matchesFilter = filter === "all" || (filter === "mcu" && !item.external) ||
      (filter === "external" && item.external) || (filter === "optional" && item.optional);
    const phrase = `${item.title} ${item.era} ${item.universe}`.toLowerCase();
    return matchesFilter && phrase.includes(search.trim().toLowerCase());
  }), [filter, search]);
  const percentage = (watched.size / entries.length) * 100;
  const trailerEntry = entries.find(item => item.title === "Avengers: Endgame") || entries[43];

  function pointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (reduceMotion || !visualRef.current) return;
    const bounds = visualRef.current.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - .5;
    const y = (event.clientY - bounds.top) / bounds.height - .5;
    visualRef.current.style.setProperty("--pointer-x", String(x));
    visualRef.current.style.setProperty("--pointer-y", String(y));
  }

  function switchConcept(target: Concept) {
    setConcept(target);
    setMenuOpen(false);
    setFilter("all");
    setSearch("");
    window.scrollTo({ top: 0, behavior: reduceMotion ? "instant" : "smooth" });
  }
  function openTrailer(entry: Entry) {
    setSelected(null);
    setTrailer(entry);
  }

  return (
    <div className={`site-shell scene-${concept}`} lang="en">
      <div className="ambient-background" aria-hidden="true"><span className="ambient-starfield" /><span className="ambient-noise" /><span className="ambient-radiance" /></div>
      <header className="site-header">
        <button className="brand" onClick={() => switchConcept("archive")} aria-label="VerseOrder — home">
          <Emblem /><span className="brand-word">VERSE<span>ORDER</span></span>
        </button>
        <nav className={`concept-nav ${menuOpen ? "nav-open" : ""}`} aria-label={"Explore the stories"}>
          {(["archive", "timeline", "multiverse"] as Concept[]).map((target) => (
            <button key={target} onClick={() => switchConcept(target)} className={concept === target ? "nav-active" : ""}>
              {text[target]}
              {concept === target && <motion.span layoutId="concept-indicator" className="nav-marker" />}
            </button>
          ))}
        </nav>
        <div className="header-actions">
          <div className="header-progress" title={`${watched.size} / ${entries.length} ${text.completed}`}><span className="header-progress-bar" style={{ width: `${percentage}%` }} /><span>{watched.size}<i> / </i>{entries.length}</span></div>
          <button className="mobile-menu" onClick={() => setMenuOpen(v => !v)} aria-label="Toggle navigation"><Menu size={23} /></button>
        </div>
      </header>

      <div className="concept-topline">
        <span className="eyebrow-dot" /> {text.liveLab} <span className="topline-rule" /> <span>{entries.length} {"STORIES"}</span>
      </div>

      <AnimatePresence mode="wait">
        {concept === "archive" && (
          <motion.main key="archive" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: .42 }}>
            <section className="archive-hero" onPointerMove={pointerMove} ref={visualRef}>
              <div className="archive-hero-art" aria-hidden="true"><div className="hero-planet" /><div className="hero-corona" /><div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" /><div className="hero-flare" /><div className="hero-asterisk">✦</div></div>
              <div className="hero-copy">
                <div className="eyebrow crimson"><span className="eyebrow-line" /> {text.journey}</div>
                <h1 className="archive-heading">{text.archiveLead.split("\n").map((line, i) => <span key={line} className={i === 1 ? "heading-accent" : ""}>{line}</span>)}</h1>
                <p className="hero-description">{text.blurb}</p>
                <div className="hero-buttons">
                  <button className="primary-button" onClick={() => document.querySelector("#watch-order")?.scrollIntoView({ behavior: "smooth" })}>{text.exploreOrder}<ArrowRight size={17}/></button>
                  <button className="round-ghost-button" onClick={() => openTrailer(trailerEntry)} aria-label={text.video}><Play size={19} fill="currentColor"/></button>
                  <span className="round-ghost-label">{text.video}</span>
                </div>
              </div>
              <div className="hero-side-note"><span>EARTH — 616</span><span>{text.archiveAside} {entries.length}</span></div>
              <div className="hero-bottom"><span><Sparkles size={15}/> {entries.length} STORIES IN ONE JOURNEY</span><ArrowDownRight size={19}/></div>
            </section>
            <section className="marquee-strip" aria-hidden="true"><div>THE INFINITY SAGA <span>✦</span> THE MULTIVERSE SAGA <span>✦</span> BEYOND THE SACRED TIMELINE <span>✦</span> EVERY STORY MATTERS <span>✦</span> THE INFINITY SAGA <span>✦</span></div></section>
            <section className="content-section" id="watch-order">
              <div className="section-header">
                <div><span className="eyebrow subdued">01 / THE COLLECTION</span><h2>{text.discover}</h2><p>{text.subtitle}</p></div>
                <div className="progress-summary"><ProgressRing progress={percentage}/><span><strong>{watched.size} / {entries.length}</strong><small>{text.completed}</small></span></div>
              </div>
              <WatchOrderControls filter={filter} setFilter={setFilter} search={search} setSearch={setSearch} text={text}/>
              <div className="cards-grid">{visible.slice(0, limit).map((item, index) => <TitleCard key={item.id} entry={item} index={index} watched={watched.has(item.id)} onSelect={setSelected} onToggle={toggle}/>)}</div>
              <ListEnd visible={visible.length} count={limit} onMore={() => setLimit(c => c + 24)} text={text}/>
            </section>
          </motion.main>
        )}
        {concept === "timeline" && (
          <motion.main key="timeline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .42 }}>
            <section className="timeline-hero">
              <span className="timeline-sun" aria-hidden="true" /><span className="timeline-arc" aria-hidden="true" />
              <div className="eyebrow azure">A JOURNEY THROUGH TIME / 001 — {entries.length}</div>
              <h1>{text.timelineLead.split("\n").map((line) => <span key={line}>{line}</span>)}</h1>
              <p>{text.timelineDesc}</p>
              <div className="timeline-stats"><div><strong>{entries.length}</strong><span>{text.titles}</span></div><div><strong>15</strong><span>STORY ERAS</span></div><div><strong>{watched.size}</strong><span>{text.completed.toUpperCase()}</span></div></div>
              <button className="scroll-invite" onClick={() => document.querySelector("#timeline-track")?.scrollIntoView({ behavior: "smooth" })}><span>{text.showTimeline}</span><ChevronDown size={18}/></button>
            </section>
            <section id="timeline-track" className="timeline-section">
              <div className="timeline-tools"><div className="eyebrow azure"><span className="eyebrow-dot"/> {text.origins}</div><WatchOrderControls filter={filter} setFilter={setFilter} search={search} setSearch={setSearch} text={text}/></div>
              <div className="timeline-track">
                {visible.slice(0, limit).map((item, index) => {
                  const newEra = index === 0 || item.era !== visible[index - 1]?.era;
                  return <div key={item.id} className={`timeline-node ${index % 2 === 0 ? "node-left" : "node-right"}`}>
                    <div className="timeline-core" aria-hidden="true"><span/></div>
                    {newEra && <span className="timeline-era-label">{item.era}</span>}
                    <button className={`timeline-entry ${watched.has(item.id) ? "timeline-done" : ""}`} onClick={() => setSelected(item)}>
                      <div className="timeline-entry-art"><Art entry={item} /></div>
                      <div className="timeline-entry-info"><span className="entry-index">{num(item.position)} / {text.of} {entries.length}</span><h3>{item.title}</h3><div className="entry-tags"><span>{item.kind}</span><span>{item.universe}</span>{item.optional && <span>OPTIONAL</span>}{item.releaseStatus === "releasing" && <span>AIRING</span>}</div></div>
                      <span className="timeline-entry-arrow"><ArrowUpRightIcon/></span>
                    </button>
                    <button title={watched.has(item.id) ? text.unwatch : text.watch} className={`timeline-mark ${watched.has(item.id) ? "timeline-mark-active" : ""}`} onClick={() => toggle(item.id)} aria-label={watched.has(item.id) ? text.unwatch : text.watch}><Check size={15}/></button>
                  </div>;
                })}
              </div>
              <ListEnd visible={visible.length} count={limit} onMore={() => setLimit(c => c + 24)} text={text}/>
            </section>
          </motion.main>
        )}
        {concept === "multiverse" && (
          <motion.main key="multiverse" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .42 }}>
            <section className="multiverse-hero">
              <div className="multiverse-intro"><span className="eyebrow violet"><span className="eyebrow-line"/> THE MULTIVERSE IS CALLING</span><h1>{text.multiverseLead.split("\n").map(line => <span key={line}>{line}</span>)}</h1><p>{text.multiverseDesc}</p><div className="multiverse-status"><span className="status-pulse"/>{text.curated}<span className="status-separator"/> {entries.length} CHAPTERS</div></div>
              <div className="universe-stage">
                <div className="stage-outer-ring" /><div className="stage-inner-ring" /><div className="stage-center-glow" />
                <svg viewBox="0 0 600 570" preserveAspectRatio="none" className="universe-connections" aria-hidden="true"><path d="M300 270 Q120 100 105 390 M300 270 Q485 112 483 257 M300 270 Q390 480 485 401" fill="none" stroke="url(#thread)" strokeWidth="1.2" strokeDasharray="4 8"/><defs><linearGradient id="thread" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#8dbaff"/><stop offset="1" stopColor="#b49aff"/></linearGradient></defs></svg>
                {universeOptions.map((u,i) => <button key={u.id} onClick={() => setUniverse(u.id)} aria-label={COPY[u.key]} className={`universe-orb universe-orb-${i} ${universe === u.id ? "orb-selected" : ""}`} style={{ "--orb-accent": u.accent, "--orb-top": u.top, "--orb-left": u.left } as React.CSSProperties}><span className="universe-orb-inside"><span>{u.number}</span><b>{COPY[u.key]}</b></span></button>)}
                <span className="orbit-cross cross-one">✦</span><span className="orbit-cross cross-two">✧</span>
              </div>
              <span className="universe-caption">SELECT A REALITY TO REVEAL ITS STORIES <Compass size={15}/></span>
            </section>
            <section className="multiverse-library" id="multiverse-library">
              <div className="universe-library-head"><div><span className="eyebrow violet">02 / {text.diveIn}</span><h2>{universeOptions.find(item => item.id === universe)?.key ? COPY[universeOptions.find(item => item.id === universe)!.key] : universe}</h2><p>{entries.filter(e => e.universe === universe).length} {text.titles.toLowerCase()}</p></div><div className="universe-tabs">{universeOptions.map(opt => <button key={opt.id} className={universe === opt.id ? "tab-active" : ""} onClick={() => setUniverse(opt.id)}>{COPY[opt.key]}</button>)}</div></div>
              <div className="universe-cards">{entries.filter(e => e.universe === universe).slice(0, limit).map((item, index) => <TitleCard key={item.id} entry={item} index={index} watched={watched.has(item.id)} onSelect={setSelected} onToggle={toggle} layout="wide"/>)}</div>
              <ListEnd visible={entries.filter(e => e.universe === universe).length} count={limit} onMore={() => setLimit(c => c + 24)} text={text}/>
            </section>
          </motion.main>
        )}
      </AnimatePresence>
      <footer className="site-footer"><div><Emblem small/><span>VERSEORDER</span></div><p>{text.foot}<br/>{text.footerNote}</p><span>{text.baseline}</span></footer>

      <AnimatePresence>
        {selected && <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={event => { if (event.target === event.currentTarget) setSelected(null); }}>
          <motion.section role="dialog" aria-modal="true" aria-labelledby="detail-name" className="detail-dialog" initial={{ opacity: 0, y: 30, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 18, scale: .98 }} transition={{ type: "spring", damping: 24, stiffness: 260 }}>
            <button className="modal-close" onClick={() => setSelected(null)} aria-label={text.close}><X size={21}/></button>
            <div className="detail-art"><Art entry={selected} variant="detail-art-cover" /><div className="detail-big-no">{num(selected.position)}</div></div>
            <div className="detail-content"><span className="eyebrow crimson">{text.selected} / {num(selected.position)} {text.of} {entries.length}</span><h2 id="detail-name">{selected.title}</h2>
              <div className="detail-tags"><span>{selected.kind.toUpperCase()}</span><span>{selected.universe.toUpperCase()}</span>{selected.optional && <span>OPTIONAL</span>}{selected.releaseStatus === "releasing" && <span>{selected.releaseProgress?.episodesAvailable} / {selected.releaseProgress?.episodesTotal} EPISODES RELEASED</span>}</div>
              <p className="editorial-tag"><CheckCircle2 size={16}/> {text.spoilerSafe}</p>
              <h3>{text.why}</h3><p>{selected.whyHere || "Part of the curated narrative sequence. The detailed editorial explanation is being researched."}</p>
              <div className="detail-actions"><button className="primary-button" onClick={() => toggle(selected.id)}>{watched.has(selected.id) ? <Check size={16}/> : <CheckCircle2 size={16}/>} {watched.has(selected.id) ? text.unwatch : text.watch}</button><button className="secondary-button" onClick={() => openTrailer(selected)}><Play size={16}/> {text.video}</button></div>
              <small className="editorial-disclaimer">{text.status}</small>
            </div>
          </motion.section>
        </motion.div>}
        {trailer && <motion.div className="modal-backdrop video-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={event => { if (event.target === event.currentTarget) setTrailer(null); }}>
          <motion.section className="video-dialog" role="dialog" aria-modal="true" aria-label={text.video} initial={{ scale: .95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: .96, opacity: 0 }}>
            <div className="video-dialog-top"><span>{text.preview} / {trailer.title}</span><button className="modal-close video-close" onClick={() => setTrailer(null)} aria-label={text.close}><X size={21}/></button></div>
            {(TRAILERS[trailer.id] || trailer.trailerYouTubeId) ? <iframe className="video-frame" title={`Official trailer: ${trailer.title}`} src={`https://www.youtube-nocookie.com/embed/${TRAILERS[trailer.id] || trailer.trailerYouTubeId}?autoplay=1&rel=0`} allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/> :
              <div className="video-fallback"><Clapperboard size={48}/><p>{text.trailerUnavailable}</p><a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(trailer.title + " official trailer")}`} target="_blank" rel="noopener noreferrer">{text.searchTrailer}<ExternalLink size={17}/></a></div>}
          </motion.section>
        </motion.div>}
      </AnimatePresence>
    </div>
  );
}

function WatchOrderControls({ filter, setFilter, search, setSearch, text }: {
  filter: Filter; setFilter: (f: Filter) => void; search: string; setSearch: (s: string) => void; text: typeof COPY;
}) {
  return <div className="watch-controls"><div className="filter-tabs">{(["all", "mcu", "external", "optional"] as Filter[]).map(f => <button key={f} className={filter === f ? "filter-active" : ""} onClick={() => setFilter(f)}>{text[f]}</button>)}</div><label className="search-box"><Search size={17}/><input type="search" value={search} placeholder={text.search} onChange={e => setSearch(e.target.value)} /></label></div>;
}
function ListEnd({ visible, count, onMore, text }: { visible: number; count: number; onMore: () => void; text: typeof COPY }) {
  if (!visible) return <div className="list-end"><p>{text.nothing}</p></div>;
  return <div className="list-end">{visible > count ? <button className="secondary-button" onClick={onMore}>{text.loadMore}<ArrowDownRight size={16}/></button> : <span>✦ &nbsp; {Math.min(visible, count)} / {visible} &nbsp; ✦</span>}</div>;
}

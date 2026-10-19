"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Search, Play, X, Check } from "lucide-react";
import {
  art,
  chapterOf,
  chapters,
  colorOf,
  entries,
  kindLabel,
  softOf,
  trailerIds,
  typeOf,
  type Entry,
} from "./timeline-data";
import Poster from "./Poster";
import TimelineCell from "./TimelineCell";
import FxPanel, { useFx } from "./FxPanel";
import { useWatchProgress } from "./watch-progress";

const repo = "https://github.com/avizmarlon/verseorder";
const assetBase = process.env.NEXT_PUBLIC_BASE_PATH || "";
const filters = [
  { id: "all", label: "All" },
  { id: "film", label: "Films" },
  { id: "series", label: "Series" },
  { id: "special", label: "Specials" },
  { id: "optional", label: "Optional" },
  { id: "legacy", label: "Legacy" },
];
type Selection = { entry: Entry; mode: "details" | "trailer" };

function TitleDialog({
  selection,
  watched,
  toggle,
  select: onSelect,
  close,
}: {
  selection: Selection;
  watched: Set<string>;
  toggle: (id: string) => void;
  select: (value: Selection) => void;
  close: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [embed, setEmbed] = useState(false);
  const select = (value: Selection) => {
    setEmbed(false);
    onSelect(value);
  };
  const { entry, mode } = selection;
  const chapter = chapterOf(entry);
  const video = entry.trailerYouTubeId || trailerIds[entry.id];
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  const previous = entries[entry.position - 2],
    next = entries[entry.position];
  return (
    <dialog
      ref={dialog}
      className={`b-dialog ${mode === "details" ? "b-drawer" : "b-tr"}`}
      aria-labelledby="detail-name"
      onCancel={close}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const r = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < r.left ||
            event.clientX > r.right ||
            event.clientY < r.top ||
            event.clientY > r.bottom
          )
            close();
        }
      }}
    >
      <button className="b-x" onClick={close} aria-label="Close">
        <X size={16} />
      </button>
      {mode === "details" ? (
        <>
          {entry.posterPath ? (
            <Poster
              key={entry.id}
              entry={entry}
              className="b-cover"
              eager
            />
          ) : (
            <div
              className="b-medal"
              aria-hidden="true"
              style={{ "--mg": softOf(entry) } as CSSProperties}
            >
              <i style={{ borderColor: colorOf(entry) }} />
              <i style={{ borderColor: colorOf(entry) }} />
              <div className="core" style={{ background: art(entry) }} />
            </div>
          )}
          <div className="b-chips">
            <span className="b-chip">{kindLabel(entry)}</span>
            <span className="b-chip">
              {entry.optional ? "Optional" : "Main journey"}
            </span>
            <span className="b-chip">{chapter.name}</span>
            <span className="b-chip">{entry.universe}</span>
          </div>
          <h2 id="detail-name">{entry.title}</h2>
          <div>
            <div className="b-sub">
              Order slot {String(entry.position).padStart(2, "0")} /{" "}
              {entries.length}
            </div>
            <p>
              {entry.era} ·{" "}
              {entry.optional
                ? "An optional detour in the curated journey."
                : "Part of the curated viewing journey."}
            </p>
          </div>
          <p className="b-editorial">
            This is a narrative viewing order, not an official chronology.
            Detailed placement notes are under editorial review.
          </p>
          {(entry.note || entry.whyHere) && (
            <details className="b-notes">
              <summary>Show editorial notes · may contain spoilers</summary>
              <p>{entry.whyHere || entry.note}</p>
            </details>
          )}
          <div className="b-chips">
            <button
              className="b-btn b-btnP"
              onClick={() => select({ entry, mode: "trailer" })}
            >
              <Play size={12} />
              Trailer
            </button>
            <button
              className={`b-btn ${watched.has(entry.id) ? "on" : ""}`}
              onClick={() => toggle(entry.id)}
            >
              {watched.has(entry.id) ? "Mark as unwatched" : "Mark as watched"}
            </button>
          </div>
          <nav className="b-nav" aria-label="Adjacent titles">
            {[
              { value: previous, label: "Previous in order" },
              { value: next, label: "Next in order" },
            ].map(
              ({ value, label }) =>
                value && (
                  <button
                    key={label}
                    onClick={() => select({ entry: value, mode: "details" })}
                  >
                    <Poster entry={value} className="b-thumb" decorative />
                    <span>
                      <small>{label}</small>
                      {value.title}
                    </span>
                  </button>
                ),
            )}
          </nav>
        </>
      ) : (
        <>
          <h2 id="detail-name" className="b-serif">
            {entry.title}
          </h2>
          {embed && video ? (
            <div className="b-video">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${video}?rel=0`}
                title={`${entry.title} official trailer`}
                allow="encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
              />
            </div>
          ) : (
            <div
              className="b-pl"
              style={{
                background: `conic-gradient(${colorOf(entry)},transparent)`,
              }}
            >
              <div className="in">
                <div
                  className="sc"
                  style={{
                    background: entry.posterPath
                      ? `url("${entry.posterPath}") center / cover no-repeat, ${art(entry)}`
                      : art(entry),
                  }}
                />
                <div className="vg" />
              </div>
              {video ? (
                <button
                  className="b-pb"
                  aria-label="Load official trailer"
                  onClick={() => setEmbed(true)}
                >
                  <Play />
                </button>
              ) : (
                <a
                  className="b-trailer-link"
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(entry.title + " official trailer")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Find an official trailer ↗
                </a>
              )}
            </div>
          )}
          <p className="b-trailer-note">
            {video
              ? "YouTube loads only when you choose to load the trailer. Playback uses YouTube’s controls."
              : "A verified trailer embed is not available for this title. Search YouTube to find one."}
          </p>
          <button
            className="b-btn"
            onClick={() => select({ entry, mode: "details" })}
          >
            Back to details
          </button>
        </>
      )}
    </dialog>
  );
}

export default function LivingTimeline() {
  const root = useRef<HTMLDivElement>(null);
  const {
    watched,
    unavailable: storageUnavailable,
    toggle,
  } = useWatchProgress();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [active, setActive] = useState(0);
  const [selection, setSelection] = useState<Selection | null>(null);
  const resumeTarget = useRef<string | null>(null);
  const { fx, setFx, showPanel } = useFx();
  const visible = entries.filter(
    (entry) =>
      (filter === "all" ||
        (filter === "optional"
          ? entry.optional
          : filter === "legacy"
            ? entry.external
            : typeOf(entry) === filter)) &&
      `${entry.title} ${entry.universe} ${entry.era}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const visibleIds = new Set(visible.map((entry) => entry.id));
  const next = entries.find((entry) => !watched.has(entry.id));
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    let frame = 0;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const measure = () => {
      frame = 0;
      const top = element.getBoundingClientRect().top,
        height = element.clientHeight;
      element.style.setProperty(
        "--travel",
        media.matches ? "0" : String(element.scrollTop),
      );
      let current = 0;
      element.querySelectorAll<HTMLElement>(".b-ch").forEach((section) => {
        if (section.getBoundingClientRect().top - top < height * 0.5)
          current = Number(section.dataset.chapter);
        const rows = section.querySelector<HTMLElement>(".b-rows");
        if (!rows) return;
        const fill = Math.max(
          0,
          Math.min(
            rows.offsetHeight,
            height * 0.55 - (rows.getBoundingClientRect().top - top),
          ),
        );
        rows.style.setProperty("--fill", `${fill}px`);
        rows.style.setProperty(
          "--comet",
          fill > 6 && fill < rows.offsetHeight - 6 ? "1" : "0",
        );
      });
      setActive(current);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const observer = new IntersectionObserver(
      (records) =>
        records.forEach((record) => {
          if (record.isIntersecting) {
            record.target.classList.add("seen");
            observer.unobserve(record.target);
          }
        }),
      { root: element, rootMargin: "0px 0px -8% 0px" },
    );
    element.querySelectorAll(".b-row").forEach((row) => observer.observe(row));
    const resize = new ResizeObserver(schedule);
    resize.observe(element);
    element.addEventListener("scroll", schedule, { passive: true });
    media.addEventListener("change", schedule);
    measure();
    document.fonts.ready.then(schedule);
    if (resumeTarget.current) {
      document
        .getElementById(`node-${resumeTarget.current}`)
        ?.scrollIntoView({
          block: "center",
          behavior: media.matches ? "instant" : "smooth",
        });
      resumeTarget.current = null;
    }
    return () => {
      observer.disconnect();
      resize.disconnect();
      cancelAnimationFrame(frame);
      element.removeEventListener("scroll", schedule);
      media.removeEventListener("change", schedule);
    };
  }, [query, filter]);
  const resume = () => {
    if (!next) return;
    if (query || filter !== "all") {
      resumeTarget.current = next.id;
      setQuery("");
      setFilter("all");
    } else
      document
        .getElementById(`node-${next.id}`)
        ?.scrollIntoView({
          block: "center",
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "instant"
            : "smooth",
        });
  };
  const progress = (watched.size / entries.length) * 360;
  return (
    <div className="b-root" ref={root}>
      <a className="b-skip" href="#ch1">
        Skip to watch order
      </a>
      <div className="b-bgs" aria-hidden="true">
        <div
          className="b-bg"
          style={{
            background:
              "radial-gradient(70% 60% at 50% 40%,rgba(80,40,10,.55),transparent 70%),linear-gradient(180deg,#07091a,#05070f)",
            opacity: active === 0 ? 1 : 0,
          }}
        />
        {chapters.map((chapter) => (
          <div
            key={chapter.id}
            className="b-bg"
            style={
              {
                background: `radial-gradient(80% 60% at 50% 0%,hsl(${chapter.hue} 80% 42% / .45),transparent 70%),linear-gradient(180deg,hsl(${chapter.hue} 50% 8%),hsl(${chapter.hue} 45% 3%))`,
                opacity: active === chapter.id ? 1 : 0,
                "--glow": `hsl(${chapter.hue} 90% 55% / .28)`,
              } as CSSProperties
            }
          />
        ))}
        <div className="b-motes">
          {Array.from({ length: 18 }, (_, i) => (
            <i
              key={i}
              className="b-mote"
              style={{
                left: `${(i * 61 + 13) % 100}%`,
                width: 2 + (i % 4),
                height: 2 + (i % 4),
                animationDuration: `${14 + (i % 16)}s`,
                animationDelay: `${-i * 1.3}s`,
              }}
            />
          ))}
        </div>
      </div>
      <header className="b-hud">
        <div className="b-hudin">
          <a className="b-brand" href="#top">
            <i />
            VerseOrder
          </a>
          <nav className="b-pips" aria-label="Chapters">
            {chapters.map((chapter) => (
              <a
                key={chapter.id}
                className={`b-pip ${active === chapter.id ? "on" : ""}`}
                href={`#ch${chapter.id}`}
                aria-label={chapter.name}
                aria-current={active === chapter.id ? "location" : undefined}
              >
                <i
                  style={{
                    background: `hsl(${chapter.hue} 90% 62%)`,
                    boxShadow: `0 0 12px hsl(${chapter.hue} 90% 62%)`,
                  }}
                />
                <span>{chapter.name}</span>
              </a>
            ))}
          </nav>
          <div className="b-sp" />
          <div className="b-seg" role="group" aria-label="Filter titles">
            {filters.map((item) => (
              <button
                key={item.id}
                className={filter === item.id ? "on" : ""}
                aria-pressed={filter === item.id}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <label className="b-find">
            <Search size={15} />
            <input
              type="search"
              placeholder="Search titles…"
              aria-label="Search titles"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <button
            className="b-ring"
            style={{
              background: `conic-gradient(#ffc56b ${progress}deg,rgba(255,255,255,.14) 0)`,
            }}
            onClick={resume}
            aria-label={`${watched.size} of ${entries.length} watched. Resume at next unwatched`}
          >
            <span>{watched.size}</span>
          </button>
        </div>
      </header>
      <main className="b-main">
        <section className="b-hero" id="top">
          <div className="b-disc" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <div className="b-thread0" aria-hidden="true" />
          <div className="b-hc">
            <div className="b-kick">One journey · {entries.length} titles</div>
            <h1 className="b-title" aria-label="VerseOrder">
              <span>Verse</span>
              <span>Order</span>
            </h1>
            <p className="b-tag">The Ultimate Marvel Multiverse Watch Order</p>
            <div className="b-cta">
              <a className="b-btn b-btnP" href="#ch1">
                Begin the journey
              </a>
              <button className="b-btn" onClick={resume}>
                {watched.size ? "Resume your journey" : "Find your next story"}
              </button>
            </div>
          </div>
          <div className="b-scroll" aria-hidden="true">
            <span>Scroll to travel</span>
            <i />
          </div>
        </section>
        <div className="b-results" role="status" aria-live="polite">
          {query || filter !== "all" ? (
            <>
              {visible.length} matching titles{" "}
              <button
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                }}
              >
                Clear filters
              </button>
            </>
          ) : (
            <>
              {watched.size} of {entries.length} watched · Progress stays in
              this browser
            </>
          )}
          {storageUnavailable && (
            <span>
              Browser storage is unavailable; progress lasts for this visit.
            </span>
          )}
        </div>
        {chapters.map((chapter, ci) => {
          const all = entries.filter(
            (entry) => chapterOf(entry).id === chapter.id,
          );
          const items = all.filter((entry) => visibleIds.has(entry.id));
          const count = all.filter((entry) => watched.has(entry.id)).length;
          const color = `hsl(${chapter.hue} 90% 64%)`;
          return (
            <section
              key={chapter.id}
              className="b-ch"
              id={`ch${chapter.id}`}
              data-chapter={chapter.id}
              aria-labelledby={`chapter-${chapter.id}`}
              style={{ "--chapter-color": color } as CSSProperties}
            >
              <div className="b-intro">
                <div
                  className="b-sigil"
                  aria-hidden="true"
                  style={{
                    color,
                    borderColor: color,
                    boxShadow: `0 0 60px hsl(${chapter.hue} 90% 60% / .28)`,
                  }}
                >
                  {chapter.id}
                </div>
                <div className="b-cl" style={{ color }}>
                  Chapter {chapter.id}
                </div>
                <h2 className="b-cname" id={`chapter-${chapter.id}`}>
                  {chapter.name}
                </h2>
                <p className="b-cden">{chapter.description}</p>
                <div className="b-cprog">
                  <span>
                    <i
                      style={{
                        width: `${(count / all.length) * 100}%`,
                        background: color,
                      }}
                    />
                  </span>
                  {count} of {all.length} lit
                </div>
              </div>
              <div className="b-rows">
                <div className="b-line" aria-hidden="true" />
                <div className="b-fill" aria-hidden="true" />
                <div className="b-comet" aria-hidden="true" />
                {items.map((entry) => (
                  <article
                    className={`b-row ${(entry.position - (ci ? chapters[ci - 1].end : 0)) % 2 ? "b-l" : "b-r"}`}
                    key={entry.id}
                    id={`node-${entry.id}`}
                    data-position={entry.position}
                  >
                    <TimelineCell
                      entry={entry}
                      fx={fx}
                      onDetails={() => setSelection({ entry, mode: "details" })}
                      onTrailer={() => setSelection({ entry, mode: "trailer" })}
                    />
                    <button
                      className={`b-orb ${watched.has(entry.id) ? "lit" : ""}`}
                      aria-label={`${watched.has(entry.id) ? "Mark as unwatched" : "Mark as watched"}: ${entry.title}`}
                      aria-pressed={watched.has(entry.id)}
                      onClick={() => toggle(entry.id)}
                      style={{
                        borderColor: colorOf(entry),
                        color: watched.has(entry.id) ? "#1a0e04" : "#ccd0e4",
                        ...(watched.has(entry.id)
                          ? {
                              background: `radial-gradient(circle at 35% 30%,#fff,${colorOf(entry)} 45%,hsl(${chapter.hue} 70% 22%))`,
                              boxShadow: `0 0 34px 8px ${softOf(entry)}`,
                            }
                          : {}),
                      }}
                    >
                      {watched.has(entry.id) ? (
                        <Check size={18} />
                      ) : (
                        String(entry.position).padStart(2, "0")
                      )}
                    </button>
                  </article>
                ))}
                {!items.length && (
                  <p className="b-empty">No titles match in this chapter.</p>
                )}
              </div>
            </section>
          );
        })}
        <footer className="b-end">
          <h2 className="b-serif">
            {next ? (
              <>
                Continue at
                <br />
                {next.title}
              </>
            ) : (
              "Every chapter lit"
            )}
          </h2>
          <button
            className="b-btn b-btnP"
            onClick={
              next
                ? resume
                : () => document.getElementById("top")?.scrollIntoView()
            }
          >
            {next ? "Continue the journey" : "Back to the beginning"}
          </button>
          <div className="b-footer-links">
            <a href={`${assetBase}/verseorder-watch-order.pdf`}>
              Printable watch order
            </a>
            <a
              href={`${repo}/issues/new`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Suggest a correction
            </a>
            <a href={repo} target="_blank" rel="noopener noreferrer">
              Source code
            </a>
          </div>
          <p>
            112 curated entries · Updated October 17, 2026.
            <br />
            Earlier entries are under editorial review. Not an official Marvel
            chronology.
          </p>
          <p>
            An independent fan project. Not affiliated with Marvel, Disney, or
            Sony. All titles, characters, cover art, and trademarks belong to
            their respective owners. Cover art is shown for identification
            only, sourced from{" "}
            <a
              href="https://en.wikipedia.org/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Wikipedia
            </a>{" "}
            and{" "}
            <a
              href="https://www.tvmaze.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              TVMaze
            </a>
            .
          </p>
          <p>
            Banner images come from{" "}
            <a
              href="https://www.themoviedb.org/"
              target="_blank"
              rel="noopener noreferrer"
            >
              TMDB
            </a>
            . This product uses the TMDB API but is not endorsed or certified
            by TMDB. Trailers are embedded from YouTube.
          </p>
          <p>
            © 2026 <a href="https://github.com/avizmarlon">Marlon Aviz</a> ·{" "}
            <a href={`${repo}/blob/main/LICENSE`}>MIT License</a> (source code
            only)
            <br />
            You may use, copy, and modify the code. Keep the copyright and
            license notice.
          </p>
        </footer>
      </main>
      {showPanel && <FxPanel fx={fx} setFx={setFx} />}
      {selection && (
        <TitleDialog
          selection={selection}
          watched={watched}
          toggle={toggle}
          select={setSelection}
          close={() => setSelection(null)}
        />
      )}
    </div>
  );
}

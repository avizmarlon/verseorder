#!/usr/bin/env node
// One-off / maintenance script: resolves a cover image URL for each watch-order entry
// and writes it to `posterPath` in src/data/watch-order.json.
// Keyless sources only:
//   - Wikipedia (infobox poster, via the MediaWiki API) for films, shorts and specials
//   - TVMaze (https://www.tvmaze.com, CC BY-SA 4.0) for series, with per-season art when available
// Images are hotlinked (not stored in this repo). Run: node scripts/resolve-posters.mjs
import { readFile, writeFile } from "node:fs/promises";

const DATA = new URL("../src/data/watch-order.json", import.meta.url);
const UA = { "User-Agent": "VerseOrder/1.0 (+https://github.com/avizmarlon/verseorder; fan project)" };

// id -> Wikipedia article title (poster = infobox image) or { file } for a specific File: page
const WIKI = {
  "captain-america-the-first-avenger": "Captain America: The First Avenger",
  "marvel-one-shot-agent-carter": "Agent Carter (film)",
  "captain-marvel": "Captain Marvel (film)",
  "iron-man": "Iron Man (2008 film)",
  "iron-man-2": "Iron Man 2",
  "the-incredible-hulk": "The Incredible Hulk (film)",
  thor: "Thor (film)",
  "the-avengers": "The Avengers (2012 film)",
  "marvel-one-shot-item-47": "Item 47",
  "marvel-one-shot-all-hail-the-king": { file: "All Hail the King poster.jpg" },
  "thor-the-dark-world": "Thor: The Dark World",
  "iron-man-3": "Iron Man 3",
  "captain-america-the-winter-soldier": "Captain America: The Winter Soldier",
  "guardians-of-the-galaxy": "Guardians of the Galaxy (film)",
  "guardians-of-the-galaxy-vol-2": "Guardians of the Galaxy Vol. 2",
  "avengers-age-of-ultron": "Avengers: Age of Ultron",
  "ant-man": "Ant-Man (film)",
  "captain-america-civil-war": "Captain America: Civil War",
  "black-widow": "Black Widow (2021 film)",
  "black-panther": "Black Panther (film)",
  "spider-man-homecoming": "Spider-Man: Homecoming",
  "doctor-strange": "Doctor Strange (2016 film)",
  "thor-ragnarok": "Thor: Ragnarok",
  "ant-man-and-the-wasp": "Ant-Man and the Wasp",
  "avengers-infinity-war": "Avengers: Infinity War",
  "avengers-endgame": "Avengers: Endgame",
  "shang-chi-and-the-legend-of-the-ten-rings": "Shang-Chi and the Legend of the Ten Rings",
  "spider-man-far-from-home": "Spider-Man: Far From Home",
  eternals: "Eternals (film)",
  "spider-man-2002-sam-raimi": "Spider-Man (2002 film)",
  "spider-man-2-2004": "Spider-Man 2",
  "spider-man-3-2007": "Spider-Man 3",
  "the-amazing-spider-man-2012": "The Amazing Spider-Man (film)",
  "the-amazing-spider-man-2-2014": "The Amazing Spider-Man 2",
  "venom-2018": "Venom (2018 film)",
  "venom-let-there-be-carnage-2021": "Venom: Let There Be Carnage",
  "spider-man-no-way-home": "Spider-Man: No Way Home",
  "venom-the-last-dance-2024": "Venom: The Last Dance",
  "spider-man-into-the-spider-verse": "Spider-Man: Into the Spider-Verse",
  "spider-man-across-the-spider-verse": "Spider-Man: Across the Spider-Verse",
  "doctor-strange-in-the-multiverse-of-madness": "Doctor Strange in the Multiverse of Madness",
  "black-panther-wakanda-forever": "Black Panther: Wakanda Forever",
  "thor-love-and-thunder": "Thor: Love and Thunder",
  "werewolf-by-night": { file: "Werewolf by Night (TV special) poster.jpg" },
  "the-guardians-of-the-galaxy-holiday-special": "The Guardians of the Galaxy Holiday Special",
  "ant-man-and-the-wasp-quantumania": "Ant-Man and the Wasp: Quantumania",
  "guardians-of-the-galaxy-vol-3": "Guardians of the Galaxy Vol. 3",
  "the-marvels": "The Marvels",
  "blade-1998": "Blade (1998 film)",
  "blade-ii-2002": "Blade II",
  "daredevil-2003-ben-affleck": "Daredevil (film)",
  "blade-trinity-2004": "Blade: Trinity",
  "elektra-2005": { file: "Elektra teaser.jpg" },
  "fantastic-four-2005-chris-evans-como-johnny-storm": "Fantastic Four (2005 film)",
  "fantastic-four-rise-of-the-silver-surfer-2007": "Fantastic Four: Rise of the Silver Surfer",
  "x-men-first-class": "X-Men: First Class",
  "x-men-origins-wolverine": "X-Men Origins: Wolverine",
  "x-men-2000": "X-Men (film)",
  "x2-x-men-united": "X2 (film)",
  "x-men-the-last-stand": "X-Men: The Last Stand",
  "the-wolverine": "The Wolverine (film)",
  "x-men-days-of-future-past": "X-Men: Days of Future Past",
  "x-men-apocalypse": "X-Men: Apocalypse",
  "dark-phoenix": "Dark Phoenix (film)",
  deadpool: "Deadpool (film)",
  "deadpool-2": "Deadpool 2",
  "the-new-mutants": "The New Mutants (film)",
  logan: "Logan (film)",
  "deadpool-wolverine": "Deadpool & Wolverine",
  "captain-america-brave-new-world": "Captain America: Brave New World",
  thunderbolts: "Thunderbolts* (film)",
  "the-fantastic-four-first-steps": "The Fantastic Four: First Steps",
  "the-punisher-one-last-kill": "The Punisher: One Last Kill",
  "spider-man-brand-new-day": "Spider-Man: Brand New Day",
};

// id -> [TVMaze show id, season number | null (= show poster)]
const TV = {
  "eyes-of-wakanda": [73415, null],
  "i-am-groot-t1": [52351, 1], "i-am-groot-t2": [52351, 2],
  "daredevil-netflix-t1": [1369, 1], "daredevil-t2": [1369, 2], "daredevil-t3": [1369, 3],
  "jessica-jones-t1": [1370, 1], "jessica-jones-t2": [1370, 2], "jessica-jones-t3": [1370, 3],
  "luke-cage-t1": [2174, 1], "luke-cage-t2": [2174, 2],
  "iron-fist-t1": [2175, 1], "iron-fist-t2": [2175, 2],
  "the-defenders": [2176, null],
  "the-punisher-t1": [16544, 1], "the-punisher-t2": [16544, 2],
  "loki-t1": [41007, 1], "loki-t2": [41007, 2],
  "what-if-t1": [41750, 1], "what-if-t2": [41750, 2], "what-if-t3": [41750, 3],
  "marvel-zombies": [58949, null],
  wandavision: [41748, null],
  "the-falcon-and-the-winter-soldier": [41749, null],
  hawkeye: [43102, null],
  "moon-knight": [43518, null],
  echo: [58950, null],
  "she-hulk-attorney-at-law": [43517, null],
  "ms-marvel": [43519, null],
  ironheart: [47859, null],
  "secret-invasion": [52352, null],
  "agatha-all-along": [58948, null],
  "daredevil-born-again-t1": [63234, 1], "daredevil-born-again-t2": [63234, 2],
  "wonder-man": [62569, null],
  "visionquest-t1": [64950, null],
};

const json = async (url) => {
  for (let i = 0; i < 4; i++) {
    const res = await fetch(url, { headers: UA });
    if (res.ok) return res.json();
    await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
  }
  throw new Error(`Request failed: ${url}`);
};
const wikiApi = (params) =>
  json(`https://en.wikipedia.org/w/api.php?${new URLSearchParams({ format: "json", formatversion: "2", ...params })}`);
const clean = (u) => u.split("?")[0];

async function wikiPosters() {
  const out = {};
  const articles = Object.entries(WIKI).filter(([, v]) => typeof v === "string");
  for (let i = 0; i < articles.length; i += 40) {
    const chunk = articles.slice(i, i + 40);
    const r = await wikiApi({ action: "query", redirects: "1", prop: "pageimages|description", piprop: "original", pilicense: "any", titles: chunk.map(([, t]) => t).join("|") });
    const alias = new Map();
    for (const n of r.query.normalized ?? []) alias.set(n.from, n.to);
    for (const n of r.query.redirects ?? []) alias.set(n.from, n.to);
    const resolve = (t) => { let c = t; for (let k = 0; k < 3 && alias.has(c); k++) c = alias.get(c); return c; };
    const pages = new Map(r.query.pages.map((p) => [p.title, p]));
    for (const [id, title] of chunk) {
      const p = pages.get(resolve(title));
      if (p?.original) out[id] = { url: clean(p.original.source), w: p.original.width, h: p.original.height, from: `${p.title} — ${p.description ?? ""}` };
    }
  }
  const files = Object.entries(WIKI).filter(([, v]) => typeof v === "object");
  const r = await wikiApi({ action: "query", prop: "imageinfo", iiprop: "url|size", titles: files.map(([, v]) => `File:${v.file}`).join("|") });
  const pages = new Map(r.query.pages.map((p) => [p.title, p]));
  for (const [id, v] of files) {
    const info = pages.get(`File:${v.file}`)?.imageinfo?.[0];
    if (info) out[id] = { url: clean(info.url), w: info.width, h: info.height, from: `File:${v.file}` };
  }
  return out;
}

async function tvPosters() {
  const out = {};
  const shows = [...new Set(Object.values(TV).map(([s]) => s))];
  const cache = {};
  for (const s of shows) {
    cache[s] = { show: await json(`https://api.tvmaze.com/shows/${s}`), seasons: await json(`https://api.tvmaze.com/shows/${s}/seasons`) };
    await new Promise((r) => setTimeout(r, 300));
  }
  for (const [id, [s, n]] of Object.entries(TV)) {
    const { show, seasons } = cache[s];
    const season = n && seasons.find((x) => x.number === n)?.image;
    const img = season || show.image;
    if (img?.medium) out[id] = { url: img.medium, from: `TVMaze ${show.name}${season ? ` season ${n}` : ""}` };
  }
  return out;
}

const data = JSON.parse(await readFile(DATA, "utf8"));
const found = { ...(await wikiPosters()), ...(await tvPosters()) };
const missing = [];
for (const entry of data.entries) {
  const hit = found[entry.id];
  if (hit && (!hit.w || hit.h > hit.w)) entry.posterPath = hit.url;
  else { entry.posterPath = null; missing.push(entry.id); }
  console.log(String(entry.position).padStart(3), entry.title.padEnd(62), "->", hit ? hit.from : "NO MATCH");
}
await writeFile(DATA, `${JSON.stringify(data, null, 2)}\n`);
console.log(`\n${data.entries.length - missing.length}/${data.entries.length} resolved. Unresolved: ${missing.join(", ") || "none"}`);

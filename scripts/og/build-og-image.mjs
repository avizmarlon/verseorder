// Renders the site-wide social preview (og:image / twitter:image) to public/og/verseorder.png.
// Runs before every build (npm "prebuild"), so the image always comes from this source: satori
// lays out the scene with the site's own fonts (Fraunces wordmark, Space Grotesk), sharp
// rasterises it. Fully original art: the VerseOrder text wordmark over the hero's gold disc.
// Everything that matters stays inside the centre 630x630 square, for apps that crop.
//
//   node scripts/og/build-og-image.mjs [--out path.png]
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import satori from "satori";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const outArg = process.argv.indexOf("--out");
const out = outArg > 0 ? process.argv[outArg + 1] : join(root, "public/og/verseorder.png");
export const width = 1200;
export const height = 630;

const font = (pkg, file) => readFile(join(root, "node_modules/@fontsource", pkg, "files", file));
const fonts = [
  { name: "Fraunces", weight: 300, style: "italic", data: await font("fraunces", "fraunces-latin-300-italic.woff") },
  { name: "Fraunces", weight: 700, style: "normal", data: await font("fraunces", "fraunces-latin-700-normal.woff") },
  { name: "Space Grotesk", weight: 400, style: "normal", data: await font("space-grotesk", "space-grotesk-latin-400-normal.woff") },
  { name: "Space Grotesk", weight: 500, style: "normal", data: await font("space-grotesk", "space-grotesk-latin-500-normal.woff") },
];
const { entries } = JSON.parse(await readFile(join(root, "src/data/watch-order.json"), "utf8"));

const h = (type, style, ...children) => ({ type, props: { style: { display: "flex", ...style }, children } });
const abs = (style, ...children) => h("div", { position: "absolute", ...style }, ...children);
const cx = width / 2;
const cy = height / 2;

const ring = (r, border) => abs({ left: cx - r, top: cy - r, width: r * 2, height: r * 2, borderRadius: r * 2, border });
const spark = (x, y, size, glow) =>
  abs({ left: x - size / 2, top: y - size / 2, width: size, height: size, borderRadius: size, background: "#ffe9c4", boxShadow: `0 0 ${glow}px ${glow / 4}px rgba(255, 200, 120, 0.9)` });

// Deterministic star field (same image on every build).
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const motes = Array.from({ length: 46 }, () => {
  const size = 1.5 + rand() * 2.5;
  return abs({ left: rand() * width, top: rand() * height, width: size, height: size, borderRadius: size, background: `rgba(255, 220, 170, ${0.25 + rand() * 0.5})` });
});

const scene = h(
  "div",
  { position: "relative", width, height, background: "#05070f", fontFamily: "Space Grotesk", overflow: "hidden" },
  // chapter colours, very faint, in the corners
  abs({ inset: 0, backgroundImage: "radial-gradient(circle at 6% 10%, rgba(79, 140, 255, 0.16), transparent 34%), radial-gradient(circle at 96% 88%, rgba(168, 85, 247, 0.16), transparent 36%), radial-gradient(circle at 92% 6%, rgba(45, 212, 191, 0.10), transparent 30%), radial-gradient(circle at 4% 94%, rgba(255, 140, 70, 0.14), transparent 34%)" }),
  // gold disc and its rings
  abs({ left: cx - 420, top: cy - 420, width: 840, height: 840, borderRadius: 840, backgroundImage: "radial-gradient(circle, rgba(255, 197, 107, 0.30) 0%, rgba(255, 150, 70, 0.12) 38%, rgba(5, 7, 15, 0) 66%)" }),
  ...motes,
  ring(296, "1px dashed rgba(255, 214, 150, 0.35)"),
  ring(222, "1px solid rgba(255, 214, 150, 0.45)"),
  ring(146, "2px solid rgba(255, 214, 150, 0.16)"),
  spark(cx + 296 * Math.cos(-2.2), cy + 296 * Math.sin(-2.2), 7, 18),
  spark(cx + 222 * Math.cos(-0.5), cy + 222 * Math.sin(-0.5), 6, 16),
  spark(cx + 146 * Math.cos(2.4), cy + 146 * Math.sin(2.4), 5, 14),
  // the thread of light dropping into the disc
  abs({ left: cx - 1, top: 0, width: 2, height: 150, backgroundImage: "linear-gradient(180deg, rgba(255, 197, 107, 0), #ffc56b 75%, #ffffff)", boxShadow: "0 0 24px 2px rgba(255, 180, 80, 0.8)" }),
  abs(
    { inset: 0, flexDirection: "column", alignItems: "center", justifyContent: "center" },
    h("div", { fontSize: 17, letterSpacing: 6.5, color: "#ffc56b", fontWeight: 500, marginBottom: 14 }, `${entries.length} FILMS, SERIES & SPECIALS`),
    h("div", { fontFamily: "Fraunces", fontStyle: "italic", fontWeight: 300, fontSize: 138, lineHeight: 0.9, letterSpacing: -4, color: "#eef0ff", textShadow: "0 0 60px rgba(255, 190, 110, 0.45)" }, "Verse"),
    h("div", { fontFamily: "Fraunces", fontWeight: 700, fontSize: 158, lineHeight: 1, letterSpacing: -4, marginTop: -22, paddingBottom: 10, backgroundImage: "linear-gradient(180deg, #ffffff, #ffcf8a 70%, #ff9a52)", backgroundClip: "text", color: "transparent" }, "Order"),
    h("div", { fontSize: 25, color: "#d6d9ee", marginTop: 6 }, "A Marvel Multiverse Watch Order"),
  ),
  abs({ left: 0, right: 0, bottom: 26, justifyContent: "center", fontSize: 16, letterSpacing: 2.5, color: "#7f86a8" }, "VERSEORDER.WATCH · INDEPENDENT FAN PROJECT"),
);

const svg = await satori(scene, { width, height, fonts });
const png = await sharp(Buffer.from(svg)).removeAlpha().png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
await mkdir(dirname(out), { recursive: true });
await writeFile(out, png);
console.log(`OG image: ${out} (${width}x${height}, ${Math.round(png.length / 1024)} KB)`);

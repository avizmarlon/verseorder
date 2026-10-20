// Gets out/ ready for Cloudflare Pages: removes files that are served from elsewhere (the PDF via
// public/_redirects, the card trailer clips from R2 at media.verseorder.watch) and checks the
// Pages limits (25 MiB per file, 20,000 files). The site is fully static: no Pages Functions.
//
//   npm run build && node scripts/prepare-cloudflare.mjs
import { existsSync } from "node:fs";
import { readdir, rm, stat } from "node:fs/promises";
import { join, relative } from "node:path";

const root = "out";
const maxBytes = 25 * 1024 * 1024;
const maxFiles = 20_000;

// The printable PDF is too big for Cloudflare Pages; _redirects sends it to GitHub instead.
const offloaded = ["verseorder-watch-order.pdf"];
for (const file of offloaded) await rm(join(root, file), { force: true });
// `next build` copies a local public/clips into out/; the live clips come from R2
// (scripts/media/upload_clips.mjs), so they never go to Pages.
await rm(join(root, "clips"), { recursive: true, force: true });
// A functions/ directory would turn requests into billed Worker invocations; keep the site static.
if (existsSync("functions")) {
  console.error("functions/ exists: VerseOrder deploys as a static site with no Pages Functions.");
  process.exit(1);
}

const files = [];
const walk = async (dir) => {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path);
    else files.push({ path, size: (await stat(path)).size });
  }
};
await walk(root);

const big = files.filter((file) => file.size > maxBytes);
for (const file of big) console.error(`Too big for Cloudflare Pages (over 25 MiB): ${relative(root, file.path)}`);
if (files.length > maxFiles) console.error(`Too many files for Cloudflare Pages: ${files.length}`);
if (big.length || files.length > maxFiles) process.exit(1);
console.log(`out/ is ready for Cloudflare Pages: ${files.length} files.`);

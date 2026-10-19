// Gets out/ ready for Cloudflare Pages: removes files that are served from elsewhere (see
// public/_redirects) and checks the Pages limits (25 MiB per file, 20,000 files).
//
//   npm run build && node scripts/prepare-cloudflare.mjs
import { readdir, rm, stat } from "node:fs/promises";
import { join, relative } from "node:path";

const root = "out";
const maxBytes = 25 * 1024 * 1024;
const maxFiles = 20_000;

// The printable PDF is too big for Cloudflare Pages; _redirects sends it to GitHub instead.
const offloaded = ["verseorder-watch-order.pdf"];
for (const file of offloaded) await rm(join(root, file), { force: true });

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

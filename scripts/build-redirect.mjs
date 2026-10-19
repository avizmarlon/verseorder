// Builds the GitHub Pages redirect site: one tiny HTML stub for every page of the real export
// plus 404.html (which GitHub Pages serves for any other path, e.g. the PDF or old asset URLs).
// Each stub sends visitors to the same path on the new domain, keeping query string and hash.
//
//   npm run build && node scripts/build-redirect.mjs [--from out] [--to out-redirect]
//
// Env: SITE_URL (default from site.config.json), REDIRECT_BASE_PATH (default /verseorder).
import { readFile, readdir, mkdir, rm, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";

const site = JSON.parse(await readFile(new URL("../site.config.json", import.meta.url), "utf8"));
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const from = arg("from", "out");
const to = arg("to", "out-redirect");
const target = new URL(process.env.SITE_URL || site.url).href.replace(/\/?$/, "/");
const base = (process.env.REDIRECT_BASE_PATH ?? site.githubPagesBasePath).replace(/\/$/, "");

const escapeHtml = (value) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

async function htmlFiles(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip build assets and Next.js's own error-route folders (404.html covers those paths).
      if (!["_next", "404", "_not-found"].includes(entry.name)) found.push(...(await htmlFiles(path)));
    } else if (entry.name.endsWith(".html")) found.push(path);
  }
  return found;
}

// file "lab/index.html" -> "lab/", "index.html" -> "", "404.html" -> ""
const pagePath = (file) => {
  const rel = relative(from, file).split(sep).join("/");
  if (rel === "404.html") return "";
  return rel.replace(/(^|\/)index\.html$/, "$1");
};

const stub = (path) => {
  const fallback = new URL(path, target).href;
  const script =
    `(function(){var b=${JSON.stringify(base)},p=location.pathname;` +
    `if(b&&(p===b||p.indexOf(b+"/")===0))p=p.slice(b.length);` +
    `p=p.replace(/^\\/+/,"");` +
    `location.replace(${JSON.stringify(target)}+p+location.search+location.hash)})();`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>VerseOrder has moved to ${escapeHtml(new URL(target).host)}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="canonical" href="${escapeHtml(fallback)}">
<script>${script}</script>
<meta http-equiv="refresh" content="0; url=${escapeHtml(fallback)}">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#05060d;color:#e8e6f0;font:16px/1.5 system-ui,sans-serif}a{color:#f0c35a}</style>
</head>
<body>
<p>VerseOrder now lives at <a href="${escapeHtml(fallback)}">${escapeHtml(fallback)}</a>.</p>
</body>
</html>
`;
};

const pages = await htmlFiles(from);
if (!pages.length) throw new Error(`No HTML pages found in ${from}/. Run "npm run build" first.`);
await rm(to, { recursive: true, force: true });
await mkdir(to, { recursive: true });
for (const file of pages) {
  const out = join(to, relative(from, file));
  await mkdir(join(out, ".."), { recursive: true });
  await writeFile(out, stub(pagePath(file)));
}
await writeFile(join(to, ".nojekyll"), "");
console.log(`Wrote ${pages.length} redirect stubs to ${to}/ -> ${target} (base ${base || "/"})`);

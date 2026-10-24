// Uploads the card trailer clips (public/clips/*.mp4, *.webm) to the R2 bucket behind
// https://media.verseorder.watch. Only new or changed files are sent (compared by MD5 against the
// bucket listing), so re-running it is cheap. The clips are never committed or deployed to Pages.
//
//   set -a; . /path/to/cloudflare.env; set +a   # CLOUDFLARE_API_TOKEN (R2 edit), CLOUDFLARE_ACCOUNT_ID
//   node scripts/media/upload_clips.mjs [--dry-run] [--overwrite]
//
// Objects get a one-year immutable Cache-Control, so a re-encoded clip needs a new file name
// (the `clip` field in scripts/media/manifest.json and src/data/watch-order.json). If a local file
// differs from the object under the same key, the script uploads nothing and exits 1, also with
// --dry-run. --overwrite replaces those objects anyway and then purges their URLs from the
// Cloudflare cache; browsers that already cached a clip keep the old file for up to a year.
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { planUploads } from "./upload_plan.mjs";

const run = promisify(execFile);
const bucket = process.env.VERSEORDER_MEDIA_BUCKET || "verseorder-media";
const prefix = "clips/";
const dir = process.env.VERSEORDER_CLIPS_DIR || "public/clips";
const cacheControl = "public, max-age=31536000, immutable";
const types = { mp4: "video/mp4", webm: "video/webm" };
const dryRun = process.argv.includes("--dry-run");
const overwrite = process.argv.includes("--overwrite");
const { mediaBase } = JSON.parse(await readFile("site.config.json", "utf8"));
const { CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: account } = process.env;
if (!token || !account) {
  console.error("Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID first.");
  process.exit(1);
}

async function listBucket() {
  const objects = new Map();
  let cursor = "";
  do {
    const url = new URL(
      `https://api.cloudflare.com/client/v4/accounts/${account}/r2/buckets/${bucket}/objects`,
    );
    url.searchParams.set("prefix", prefix);
    url.searchParams.set("per_page", "1000");
    if (cursor) url.searchParams.set("cursor", cursor);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const body = await res.json();
    if (!body.success) throw new Error(`listing ${bucket} failed: ${JSON.stringify(body.errors)}`);
    for (const o of body.result) objects.set(o.key, o);
    cursor = body.result_info?.is_truncated ? body.result_info.cursor : "";
  } while (cursor);
  return objects;
}

// Single-file purge on the zone that serves mediaBase (token needs Zone > Cache Purge).
async function purge(urls) {
  const api = "https://api.cloudflare.com/client/v4";
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const host = new URL(mediaBase).hostname;
  const zones = await (await fetch(`${api}/zones?name=${host.split(".").slice(-2).join(".")}`, { headers })).json();
  const zone = zones.result?.[0]?.id;
  if (!zone) throw new Error(`zone for ${host} not found: ${JSON.stringify(zones.errors)}`);
  for (let i = 0; i < urls.length; i += 30) {
    const res = await fetch(`${api}/zones/${zone}/purge_cache`, {
      method: "POST",
      headers,
      body: JSON.stringify({ files: urls.slice(i, i + 30) }),
    });
    const body = await res.json();
    if (!body.success) throw new Error(`purge failed: ${JSON.stringify(body.errors)}`);
  }
  return true;
}

const remote = await listBucket();
const files = (await readdir(dir)).filter((f) => /\.(mp4|webm)$/.test(f)).sort();
const local = [];
for (const name of files) {
  local.push({ name, md5: createHash("md5").update(await readFile(join(dir, name))).digest("hex") });
}
const { upload, conflicts } = planUploads(local, remote, { prefix, cacheControl });
const todo = overwrite ? [...upload, ...conflicts.map((c) => c.name)].sort() : upload;
console.log(
  `${files.length} local clips, ${remote.size} in r2://${bucket}/${prefix}, ` +
    `${upload.length} to upload, ${conflicts.length} changed under an existing key.`,
);
if (conflicts.length) {
  const lines = conflicts.map((c) => `  ${c.name}  (local md5 ${c.md5}, r2 etag ${c.etag})`).join("\n");
  if (!overwrite) {
    console.error(
      `\nRefusing to overwrite (objects are cached for a year, immutable):\n${lines}\n\n` +
        "Give the re-encoded clip a new name (e.g. <clip>-v2.mp4 / .webm), set that `clip` in\n" +
        "scripts/media/manifest.json and src/data/watch-order.json, deploy the site, then re-run.\n" +
        "--overwrite replaces them and purges the edge cache, but browsers keep the old file.",
    );
    process.exit(1);
  }
  console.warn(`\n--overwrite: replacing these objects:\n${lines}`);
}
if (dryRun) {
  for (const name of todo) console.log(`  would upload ${name}`);
  process.exit(0);
}

let done = 0;
const worker = async () => {
  for (let name; (name = todo.shift()); ) {
    await run(
      "npx",
      [
        "--yes", "wrangler@4", "r2", "object", "put", `${bucket}/${prefix}${name}`,
        "--file", join(dir, name),
        "--content-type", types[name.split(".").pop()],
        "--cache-control", cacheControl,
        "--remote",
      ],
      { maxBuffer: 1 << 24 },
    );
    console.log(`  [${++done}] ${name}`);
  }
};
await Promise.all(Array.from({ length: 4 }, worker));
const localKeys = new Set(files.map((f) => prefix + f));
const extra = [...remote.keys()].filter((k) => !localKeys.has(k));
if (extra.length) console.log(`In the bucket but not in ${dir} (left alone): ${extra.join(", ")}`);
if (overwrite && conflicts.length) {
  const urls = conflicts.map((c) => `${mediaBase}/${c.name}`);
  const purged = await purge(urls).catch((e) => (console.warn(`  ${e.message}`), false));
  console.warn(
    purged
      ? `Purged ${urls.length} overwritten URLs from the Cloudflare cache. Browsers that already have them keep the old file.`
      : `Overwritten, but not purged. Purge these from the Cloudflare cache by hand:\n${urls.join("\n")}`,
  );
}
console.log("Done.");

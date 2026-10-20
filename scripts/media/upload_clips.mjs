// Uploads the card trailer clips (public/clips/*.mp4, *.webm) to the R2 bucket behind
// https://media.verseorder.watch. Only new or changed files are sent (compared by MD5 against the
// bucket listing), so re-running it is cheap. The clips are never committed or deployed to Pages.
//
//   set -a; . /path/to/cloudflare.env; set +a   # CLOUDFLARE_API_TOKEN (R2 edit), CLOUDFLARE_ACCOUNT_ID
//   node scripts/media/upload_clips.mjs [--dry-run]
//
// Objects get a one-year immutable Cache-Control, so a re-encoded clip needs a new file name
// (the `clip` field in src/data/watch-order.json), never an overwrite.
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const bucket = process.env.VERSEORDER_MEDIA_BUCKET || "verseorder-media";
const prefix = "clips/";
const dir = "public/clips";
const cacheControl = "public, max-age=31536000, immutable";
const types = { mp4: "video/mp4", webm: "video/webm" };
const dryRun = process.argv.includes("--dry-run");
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

const remote = await listBucket();
const files = (await readdir(dir)).filter((f) => /\.(mp4|webm)$/.test(f)).sort();
const todo = [];
for (const name of files) {
  const md5 = createHash("md5").update(await readFile(join(dir, name))).digest("hex");
  const have = remote.get(prefix + name);
  if (!have || have.etag !== md5 || have.http_metadata?.cacheControl !== cacheControl) todo.push(name);
}
console.log(`${files.length} local clips, ${remote.size} in r2://${bucket}/${prefix}, ${todo.length} to upload.`);
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
const local = new Set(files.map((f) => prefix + f));
const extra = [...remote.keys()].filter((k) => !local.has(k));
if (extra.length) console.log(`In the bucket but not in ${dir} (left alone): ${extra.join(", ")}`);
console.log("Done.");

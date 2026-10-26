// Production deploy to Cloudflare Pages (https://verseorder.watch), run by `npm run deploy:cloudflare`.
//
// Always builds out/ fresh from the current checkout first, so a stale out/ (left over from
// another branch or an older commit) can never be uploaded. Then runs prepare-cloudflare.mjs (the
// PDF/clips/functions guards and the Pages limits) and `wrangler pages deploy` with the commit
// hash attached. Warns when the branch isn't main or the working tree has uncommitted changes,
// and stops if HEAD moves while building.
//
// Needs CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID in the environment.
import { spawnSync } from "node:child_process";

const git = (...args) => {
  const result = spawnSync("git", args, { encoding: "utf8" });
  if (result.status !== 0) {
    console.error(`git ${args.join(" ")} failed: ${result.stderr.trim()}`);
    process.exit(1);
  }
  return result.stdout.trim();
};
const run = (command, args) => {
  console.log(`\n> ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
};

const head = git("rev-parse", "HEAD");
const branch = git("rev-parse", "--abbrev-ref", "HEAD");
const dirty = git("status", "--porcelain") !== "";
const subject = git("log", "-1", "--format=%s");

console.log(
  `Deploying ${head.slice(0, 7)} (${branch}) "${subject}" to production.`,
);
if (branch !== "main") {
  console.warn(
    `WARNING: on branch "${branch}", not main. This still deploys to production.`,
  );
}
if (dirty) {
  console.warn(
    "WARNING: the working tree has uncommitted changes; they will be in the deploy.",
  );
}

run("npm", ["run", "build"]);

if (git("rev-parse", "HEAD") !== head) {
  console.error(
    "HEAD changed during the build; out/ may not match any commit. Nothing deployed.",
  );
  process.exit(1);
}

run("node", ["scripts/prepare-cloudflare.mjs"]);
run("npx", [
  "--yes",
  "wrangler@4",
  "pages",
  "deploy",
  "out",
  "--project-name=verseorder",
  "--branch=main",
  `--commit-hash=${head}`,
  `--commit-message=${subject}`,
  `--commit-dirty=${dirty}`,
]);

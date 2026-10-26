import { execFileSync } from "node:child_process";
import type { NextConfig } from "next";
import site from "./site.config.json";

// Default build: served from the domain root (Cloudflare Pages, https://verseorder.watch).
// GITHUB_PAGES=true keeps the legacy project-page build under /verseorder for local checks;
// the GitHub Pages deploy itself ships redirect stubs instead (scripts/build-redirect.mjs).
const isGithubPages = process.env.GITHUB_PAGES === "true";
const basePath = isGithubPages ? site.githubPagesBasePath : "";
// Card trailer clips live in the R2 bucket behind media.verseorder.watch (no Pages Function, no
// Worker CPU). Set NEXT_PUBLIC_MEDIA_BASE=/clips to serve a local public/clips instead.
const mediaBase = process.env.NEXT_PUBLIC_MEDIA_BASE ?? site.mediaBase;
// "Updated <date>" in the footer: the last commit that changed the watch order itself (the data
// files and the chapter list), not the build date, so a rebuild or a code-only change doesn't
// move it. Falls back to today when git history isn't available (e.g. a shallow CI checkout).
const contentPaths = ["src/data", "src/components/timeline-data.ts"];
const contentUpdated = (() => {
  try {
    const date = execFileSync(
      "git",
      ["log", "-1", "--format=%cs", "--", ...contentPaths],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    ).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  } catch {}
  return new Date().toISOString().slice(0, 10);
})();
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: basePath || undefined,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_PUBLIC_MEDIA_BASE: mediaBase,
    NEXT_PUBLIC_CONTENT_UPDATED: contentUpdated,
  },
};

export default nextConfig;

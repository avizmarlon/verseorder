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
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: basePath || undefined,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath, NEXT_PUBLIC_MEDIA_BASE: mediaBase },
};

export default nextConfig;

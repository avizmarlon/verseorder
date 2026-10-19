import type { NextConfig } from "next";
import site from "./site.config.json";

// Default build: served from the domain root (Cloudflare Pages, https://verseorder.watch).
// GITHUB_PAGES=true keeps the legacy project-page build under /verseorder for local checks;
// the GitHub Pages deploy itself ships redirect stubs instead (scripts/build-redirect.mjs).
const isGithubPages = process.env.GITHUB_PAGES === "true";
const basePath = isGithubPages ? site.githubPagesBasePath : "";
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: basePath || undefined,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;

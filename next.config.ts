import type { NextConfig } from "next";

const isGithubPages = process.env.GITHUB_PAGES === "true";
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: isGithubPages ? "/verseorder" : undefined,
  assetPrefix: isGithubPages ? "/verseorder/" : undefined,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: isGithubPages ? "/verseorder" : "" },
};

export default nextConfig;

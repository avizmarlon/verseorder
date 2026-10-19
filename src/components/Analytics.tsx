"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import site from "../../site.config.json";

const host = new URL(site.url).hostname;
const token = site.cloudflareAnalyticsToken;

/**
 * Cloudflare Web Analytics: anonymous, cookie-free visit stats. Loads only in production builds
 * and only on the real domain (not pages.dev previews, localhost or the GitHub Pages redirects),
 * after the page is idle so it never competes with the timeline.
 */
export default function Analytics() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    // Reading the hostname needs the browser, so this can only be decided after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (process.env.NODE_ENV === "production" && token && location.hostname === host) setEnabled(true);
  }, []);
  if (!enabled) return null;
  return (
    <Script
      src="https://static.cloudflareinsights.com/beacon.min.js"
      data-cf-beacon={JSON.stringify({ token })}
      strategy="lazyOnload"
    />
  );
}

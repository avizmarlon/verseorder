import config from "../site.config.json";

/**
 * Public origin of the site, always with a trailing slash. Single source of truth for canonical,
 * sitemap, robots, OpenGraph and JSON-LD URLs. Override at build time with SITE_URL (for example
 * to point a preview build at its own origin).
 */
export const siteUrl = new URL(process.env.SITE_URL || config.url).href.replace(/\/?$/, "/");

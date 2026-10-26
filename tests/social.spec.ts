import { expect, test } from "@playwright/test";
import site from "../site.config.json";

const meta = (html: string, key: string) =>
  html.match(new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)"`))?.[1];

test("social preview tags point at a 1200x630 PNG", async ({ request }) => {
  const html = await (await request.get("./")).text();
  const image = new URL("og/verseorder.png", site.url).href;
  expect(meta(html, "og:image")).toBe(image);
  expect(meta(html, "og:image:width")).toBe("1200");
  expect(meta(html, "og:image:height")).toBe("630");
  expect(meta(html, "og:image:alt")).toBeTruthy();
  expect(meta(html, "og:url")).toBe(site.url);
  expect(meta(html, "og:type")).toBe("website");
  expect(meta(html, "og:site_name")).toBe("VerseOrder");
  expect(meta(html, "twitter:card")).toBe("summary_large_image");
  expect(meta(html, "twitter:image")).toBe(image);

  // one description everywhere, and it does not repeat the title
  const description = meta(html, "description");
  expect(description).toBeTruthy();
  expect(meta(html, "og:description")).toBe(description);
  expect(meta(html, "twitter:description")).toBe(description);
  expect(description).not.toContain("Multiverse Watch Order");
  const jsonLd = JSON.parse(
    html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)![1],
  );
  expect(jsonLd.description).toBe(description);

  const response = await request.get("og/verseorder.png");
  expect(response.status()).toBe(200);
  const png = await response.body();
  expect(png.subarray(1, 4).toString()).toBe("PNG");
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
  expect(png.length).toBeLessThan(300 * 1024);
});

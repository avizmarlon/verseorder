import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { createServer, type Server } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import site from "../site.config.json";

// The GitHub Pages deploy ships only redirect stubs. Build them from the current export and serve
// them the way GitHub Pages does (project path, 404.html for anything unknown).
const target = site.url;
const base = site.githubPagesBasePath;
let server: Server;
let origin = "";
let dir = "";

test.beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "verseorder-redirect-"));
  execFileSync(process.execPath, ["scripts/build-redirect.mjs", "--to", dir], {
    env: { ...process.env, SITE_URL: "", REDIRECT_BASE_PATH: base },
  });
  server = createServer(async (request, response) => {
    const url = new URL(request.url || "/", "http://localhost");
    let path = url.pathname.startsWith(`${base}/`) ? url.pathname.slice(base.length) : "/404.html";
    if (path.endsWith("/")) path += "index.html";
    const file = resolve(dir, `.${path}`);
    const found = file.startsWith(dir) && (await stat(file).catch(() => null))?.isFile();
    response
      .writeHead(found ? 200 : 404, { "Content-Type": "text/html" })
      .end(await readFile(found ? file : join(dir, "404.html")));
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const address = server.address();
  origin = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
});

test.afterAll(() => new Promise<void>((done) => (server ? server.close(() => done()) : done())));

const landing = async (page: import("@playwright/test").Page, path: string) => {
  const reached: string[] = [];
  await page.route(`${target}**`, (route) => {
    reached.push(route.request().url());
    return route.fulfill({ contentType: "text/html", body: "<title>new home</title>" });
  });
  await page.goto(`${origin}${path}`);
  await expect.poll(() => reached.length).toBeGreaterThan(0);
  return reached[0];
};

for (const [from, to] of [
  [`${base}/`, ""],
  [`${base}/?ref=readme#node-loki`, "?ref=readme#node-loki"],
  [`${base}/verseorder-watch-order.pdf`, "verseorder-watch-order.pdf"],
  [`${base}/some/deep/path/?q=1`, "some/deep/path/?q=1"],
]) {
  test(`redirects ${from} to the same path on the new domain`, async ({ page }) => {
    const url = await landing(page, from);
    // The request URL never carries the hash; check it on the page instead.
    const [path, hash] = to.split("#");
    expect(url).toBe(`${target}${path}`);
    if (hash) await expect.poll(() => page.evaluate(() => location.hash)).toBe(`#${hash}`);
  });
}

test("stubs carry a canonical link and a no-JS fallback", async () => {
  const html = await readFile(join(dir, "index.html"), "utf8");
  expect(html).toContain(`<link rel="canonical" href="${target}">`);
  expect(html).toContain(`<meta http-equiv="refresh" content="0; url=${target}">`);
  const notFound = await readFile(join(dir, "404.html"), "utf8");
  expect(notFound).toContain(`location.replace(${JSON.stringify(target)}`);
});

test("redirect works without JavaScript via meta refresh", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  const url = await landing(page, `${base}/`);
  expect(url).toBe(target);
  await context.close();
});

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import collection from "../src/data/watch-order.json";

const home = async (page: import("@playwright/test").Page) => {
  await page.goto("./");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
};

test("canonical order, English, desktop design, scroll and accessibility", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() =>
    localStorage.setItem("verseorder:locale:v1", "pt-BR"),
  );
  await home(page);
  await expect(page.locator("article.b-row")).toHaveCount(112);
  expect(
    await page
      .locator("article.b-row")
      .evaluateAll((nodes) => nodes.map((node) => node.id)),
  ).toEqual(collection.entries.map((entry) => `node-${entry.id}`));
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    page.getByRole("heading", { name: "Genesis", exact: true }),
  ).toHaveCount(1);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2400);
  await page.screenshot({ path: "docs/previews/living-desktop.png" });
  await page
    .getByRole("link", { name: "Begin the journey", exact: true })
    .click();
  await page.locator("#node-captain-marvel").scrollIntoViewIfNeeded();
  await expect(page.locator(".b-pip.on")).toHaveAccessibleName("Genesis");
  await expect
    .poll(() =>
      page
        .locator("#ch1 .b-fill")
        .evaluate((el) => el.getBoundingClientRect().height),
    )
    .toBeGreaterThan(0);
  await page.waitForTimeout(1100);
  await page.screenshot({ path: "docs/previews/living-timeline-desktop.png" });
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  expect(errors).toEqual([]);
});

test("filters hide entries, keep order slots, search and resume clear filters", async ({
  page,
}) => {
  await home(page);
  await page.getByRole("button", { name: "Films", exact: true }).click();
  await expect(page.locator("article.b-row")).toHaveCount(
    collection.entries.filter((entry) => entry.kind === "movie").length,
  );
  await page.getByRole("button", { name: "Legacy", exact: true }).click();
  await expect(page.locator("article.b-row")).toHaveCount(
    collection.entries.filter((entry) => entry.external).length,
  );
  await page.getByRole("button", { name: "All", exact: true }).click();
  await page.getByRole("searchbox").fill("Spider-Man: No Way Home");
  await expect(page.locator("article.b-row")).toHaveCount(1);
  await expect(page.locator("article.b-row")).toHaveAttribute(
    "data-position",
    String(
      collection.entries.find((entry) => entry.id === "spider-man-no-way-home")!
        .position,
    ),
  );
  await page
    .getByRole("button", { name: /watched. Resume at next unwatched/ })
    .click();
  await expect(page.getByRole("searchbox")).toHaveValue("");
  await expect(page.locator("article.b-row")).toHaveCount(112);
  await page.getByRole("searchbox").fill("no such title xyz");
  await expect(page.locator("article.b-row")).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText("0 matching titles");
});

test("details, keyboard focus, adjacent titles and progress survive reload", async ({
  page,
}) => {
  await home(page);
  await page
    .getByRole("button", { name: "Details: Eyes of Wakanda", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("dialog")
    .evaluate((el) =>
      Promise.all(el.getAnimations().map((animation) => animation.finished)),
    );
  await expect(
    page
      .getByRole("dialog")
      .getByRole("heading", { name: "Eyes of Wakanda", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Mark as watched", exact: true })
    .click();
  await page.getByRole("button", { name: /Next in order/ }).click();
  await expect(page.locator("#detail-name")).toHaveText(
    "Captain America: The First Avenger",
  );
  for (let i = 0; i < 12; i++) await page.keyboard.press("Tab");
  expect(
    await page
      .getByRole("dialog")
      .evaluate((el) => el.contains(document.activeElement)),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".b-ring span")).toHaveText("1");
  await expect(page.locator("#node-eyes-of-wakanda .b-orb")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

// Count only trailer iframes: Cloudflare can inject its own hidden challenge iframe.
const youtubeFrames = 'iframe[src*="youtube-nocookie.com"]';

test("trailer is opt-in and unverified titles offer search", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("youtube-nocookie"))
      requests.push(request.url());
  });
  await page.route("https://www.youtube-nocookie.com/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<title>Trailer lifecycle fixture</title>",
    }),
  );
  await home(page);
  expect(requests).toHaveLength(0);
  await page.getByRole("searchbox").fill("No Way Home");
  await page.locator(".b-hit").click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Trailer", exact: true })
    .click();
  await expect(page.locator(youtubeFrames)).toHaveCount(0);
  await page.getByRole("button", { name: "Load official trailer" }).click();
  await expect(page.locator(youtubeFrames)).toHaveCount(1);
  await expect.poll(() => requests.length).toBe(1);
  await page.keyboard.press("Escape");
  await expect(page.locator(youtubeFrames)).toHaveCount(0);
  await page.getByRole("searchbox").fill("Item 47");
  await page.locator(".b-hit").click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Trailer", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: /Find an official trailer/ }),
  ).toBeVisible();
  await expect(page.locator(youtubeFrames)).toHaveCount(0);
});

test("mobile composition, touch controls, overflow and accessibility", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await home(page);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2400);
  await page.screenshot({ path: "docs/previews/living-mobile.png" });
  expect(
    await page
      .locator(".b-root")
      .evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  await page
    .getByRole("link", { name: "Begin the journey", exact: true })
    .click();
  await page.locator("#node-captain-marvel").scrollIntoViewIfNeeded();
  await page.waitForTimeout(1100);
  await page.screenshot({ path: "docs/previews/living-timeline-mobile.png" });
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.getByRole("searchbox").fill("Captain America: The First Avenger");
  await page.locator(".b-hit").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("dialog")
    .evaluate((el) =>
      Promise.all(el.getAnimations().map((animation) => animation.finished)),
    );
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.getByRole("button", { name: "Close", exact: true }).click();
});

test("reduced motion and blocked browser storage still allow progress", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    Object.defineProperty(Storage.prototype, "getItem", {
      value: () => {
        throw new Error("Unavailable");
      },
    });
    Object.defineProperty(Storage.prototype, "setItem", {
      value: () => {
        throw new Error("Unavailable");
      },
    });
  });
  await home(page);
  await expect(page.getByRole("status")).toContainText(
    "storage is unavailable",
  );
  await page
    .getByRole("button", {
      name: "Mark as watched: Eyes of Wakanda",
      exact: true,
    })
    .click();
  await expect(page.locator(".b-ring span")).toHaveText("1");
  expect(
    await page
      .locator(".b-disc i")
      .first()
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
});

test("malformed progress is ignored and stale IDs cannot inflate progress", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("verseorder:watched:v1"))
      localStorage.setItem(
        "verseorder:watched:v1",
        JSON.stringify([
          "eyes-of-wakanda",
          "unknown-id",
          "eyes-of-wakanda",
          42,
        ]),
      );
  });
  await home(page);
  await expect(page.locator(".b-ring span")).toHaveText("1");
  await page.evaluate(() => localStorage.setItem("verseorder:watched:v1", "{"));
  await page.reload();
  await expect(page.locator(".b-ring span")).toHaveText("0");
});

const coverHosts = /^https:\/\/(upload\.wikimedia\.org|static\.tvmaze\.com|image\.tmdb\.org)\//;
const pixel = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

test("cover data is complete, https, and only from approved hosts", () => {
  const withCover = collection.entries.filter((entry) => entry.posterPath);
  expect(withCover.length).toBeGreaterThanOrEqual(110);
  for (const entry of withCover) expect(entry.posterPath).toMatch(coverHosts);
});

test("covers render lazily with alt text, in details, and a11y holds", async ({
  page,
}) => {
  await page.route(coverHosts, (route) =>
    route.fulfill({ contentType: "image/png", body: pixel }),
  );
  await home(page);
  const first = collection.entries[1];
  const row = page.locator(`#node-${first.id}`);
  await row.scrollIntoViewIfNeeded();
  const cover = row.locator(".b-med img");
  await expect(cover).toHaveAttribute("src", first.posterPath!);
  await expect(cover).toHaveAttribute("loading", "lazy");
  await row.getByRole("button", { name: `Details: ${first.title}` }).click();
  const drawerCover = page.locator("dialog img[alt$='cover art']").first();
  await expect(drawerCover).toHaveAttribute("alt", `${first.title} cover art`);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});

test("a cover that fails to load falls back to the medallion art", async ({
  page,
}) => {
  await page.route(coverHosts, (route) => route.abort());
  await home(page);
  const first = collection.entries[1];
  const row = page.locator(`#node-${first.id}`);
  await row.scrollIntoViewIfNeeded();
  await expect(row.locator(".b-med")).toBeVisible();
  await expect(row.locator(".b-med img")).toHaveCount(0);
  await row.getByRole("button", { name: `Details: ${first.title}` }).click();
  await expect(page.locator("#detail-name")).toHaveText(first.title);
});

test("visit stats load only on the real domain", async ({ page }) => {
  const beacons: string[] = [];
  page.on("request", (request) => {
    if (request.url().startsWith("https://static.cloudflareinsights.com/")) beacons.push(request.url());
  });
  await home(page);
  await page.waitForLoadState("load");
  const onRealDomain = await page.evaluate(() => location.hostname === "verseorder.watch");
  if (onRealDomain) await expect.poll(() => beacons.length).toBe(1);
  else {
    await page.waitForTimeout(1500);
    expect(beacons).toEqual([]);
  }
});

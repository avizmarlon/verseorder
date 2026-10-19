import { existsSync } from "node:fs";
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import collection from "../src/data/watch-order.json";

const hero = collection.entries.find(
  (entry) => entry.id === "captain-america-the-first-avenger",
)!;
const clipFile = (ext: string) => `public/clips/${hero.clip}.${ext}`;
/** The trailer files are not committed (large binaries for a separate media host). */
const hasClip = existsSync(clipFile("webm")) && existsSync(clipFile("mp4"));
const imageHosts =
  /^https:\/\/(upload\.wikimedia\.org|static\.tvmaze\.com|image\.tmdb\.org)\//;
const pixel = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

async function stubImages(page: Page) {
  await page.route(imageHosts, (route) =>
    route.fulfill({ contentType: "image/png", body: pixel }),
  );
}
/** Records every request for the card trailer files (and fails the test on any YouTube use). */
function watchMedia(page: Page) {
  const clips: string[] = [];
  const youtube: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/clips/")) clips.push(request.url());
    if (/youtube/.test(request.url())) youtube.push(request.url());
  });
  return { clips, youtube };
}
const card = (page: Page) =>
  page.locator(`#node-${hero.id} .b-cell`).first();
async function centre(page: Page) {
  await card(page).evaluate((el) => {
    const root = document.querySelector(".b-root")!;
    const r = el.getBoundingClientRect();
    root.scrollBy({ top: r.top + r.height / 2 - root.clientHeight * 0.4, behavior: "instant" });
  });
}
const axe = (page: Page) =>
  new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();

test("data: only the hero has a banner + self-hosted clip; drawer trailer is the subtitle-free upload", () => {
  expect(hero.bannerUrl).toMatch(/^https:\/\/image\.tmdb\.org\//);
  expect(hero.clip).toBe(hero.id);
  expect(hero.trailerYouTubeId).toBe("JerVrbLldXw");
  const withClip = collection.entries.filter(
    (entry) => (entry as { clip?: string }).clip,
  );
  expect(withClip.map((entry) => entry.id)).toEqual([hero.id]);
});

test("no transition-variant machinery is left: no fx attribute, no fx panel, ?fx is ignored", async ({
  page,
}) => {
  await stubImages(page);
  await page.goto("./?lab=1&fx=shutter");
  await expect(card(page)).toHaveCount(1);
  await expect(page.locator("[data-fx]")).toHaveCount(0);
  await expect(page.getByText(/card banner fx/i)).toHaveCount(0);
  await expect(page.locator("select")).toHaveCount(0);
});

test("banner card is one accessible button: click / Enter / Space open details", async ({
  page,
}) => {
  await stubImages(page);
  await page.goto("./");
  const cell = card(page);
  await cell.scrollIntoViewIfNeeded();
  await expect(cell.getByRole("button")).toHaveCount(1);
  await expect(cell.getByRole("button")).toHaveAccessibleName(`Details: ${hero.title}`);
  await cell.getByRole("button").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#detail-name")).toHaveText(hero.title);
  await page.keyboard.press("Escape");
  await cell.getByRole("button").focus();
  await page.keyboard.press("Space");
  await expect(page.locator("#detail-name")).toHaveText(hero.title);
  await page.keyboard.press("Escape");
  await expect(
    page.locator("#node-eyes-of-wakanda").getByRole("button", { name: "Trailer" }),
  ).toHaveCount(1);
});

test("nothing is fetched for the clip while the card is off-screen, and the card never uses YouTube", async ({
  page,
}) => {
  await stubImages(page);
  const media = watchMedia(page);
  await page.goto("./");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.waitForTimeout(2500); // idle: the preview code may load, the video must not
  expect(media.clips).toEqual([]);
  await expect(page.locator("video")).toHaveCount(0);
  await centre(page);
  await card(page).hover();
  await page.waitForTimeout(600);
  expect(media.youtube).toEqual([]);
  await expect(page.locator(".b-cell iframe")).toHaveCount(0);
});

test("the drawer trailer (opt-in) is the only YouTube use and asks for captions off", async ({
  page,
}) => {
  await stubImages(page);
  await page.route("https://www.youtube-nocookie.com/**", (route) =>
    route.fulfill({ contentType: "text/html", body: "<title>fixture</title>" }),
  );
  await page.goto("./");
  await card(page).scrollIntoViewIfNeeded();
  await card(page).getByRole("button").click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Trailer", exact: true })
    .click();
  await page.getByRole("button", { name: "Load official trailer" }).click();
  const frame = page.locator('iframe[src*="youtube-nocookie.com/embed/JerVrbLldXw"]');
  await expect(frame).toHaveCount(1);
  expect(new URL((await frame.getAttribute("src"))!).searchParams.get("cc_load_policy")).toBe("0");
});

test("a missing clip falls back to the static banner and poster", async ({ page }) => {
  await stubImages(page);
  await page.route(/\/clips\//, (route) => route.fulfill({ status: 404, body: "" }));
  await page.goto("./");
  await centre(page);
  const cell = card(page);
  await cell.hover();
  await expect(cell).toHaveAttribute("data-clip", "error");
  await expect(cell).toHaveAttribute("data-trailer", "idle");
  await expect(cell.locator(".b-bimg")).toBeVisible();
  await expect(cell.locator(".b-med")).toHaveCSS("opacity", "1");
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("static banner only: no video element, no clip bytes", async ({ page }) => {
    await stubImages(page);
    const media = watchMedia(page);
    await page.goto("./");
    await centre(page);
    await card(page).hover();
    await page.waitForTimeout(900);
    await expect(page.locator("video")).toHaveCount(0);
    expect(media.clips).toEqual([]);
    await expect(card(page).locator(".b-med")).toHaveCSS("opacity", "1");
  });
});

test("lab: scrolls, one card with a debug readout, phone frame without yanking the page", async ({
  page,
}) => {
  await stubImages(page);
  await page.goto("lab/");
  await expect(page.getByText(/PROTOTYPE/).first()).toBeVisible();
  await expect(page.locator(".lab-item .b-cell")).toHaveCount(1);
  await expect(page.locator(".lab-debug")).toBeVisible();
  const scroller = page.locator(".lab-root");
  await scroller.evaluate((el) => el.scrollBy(0, el.scrollHeight));
  await expect(page.getByRole("heading", { name: /Phone preview/ })).toBeInViewport();
  await scroller.evaluate((el) => el.scrollTo({ top: 0, behavior: "instant" }));
  await page.mouse.move(600, 400);
  await page.mouse.wheel(0, 600);
  await expect.poll(() => scroller.evaluate((el) => el.scrollTop)).toBeGreaterThan(50);
  await page.getByRole("button", { name: "Load phone frame" }).click();
  const phone = page.locator('iframe[title^="Phone-sized"]');
  await expect(phone).toHaveAttribute("src", /touch=1/);
  const box = (await phone.boundingBox())!;
  expect([Math.round(box.width), Math.round(box.height)]).toEqual([390, 844]);
  await scroller.evaluate((el) => el.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(800);
  expect(await scroller.evaluate((el) => el.scrollTop)).toBe(0);
  expect((await axe(page)).violations).toEqual([]);
});

test.describe("with the trailer file", () => {
  test.skip(!hasClip, `put ${clipFile("webm")} / .mp4 in place to run the playback tests`);

  test("approaching card preloads only its start; first hover plays muted, no captions, poster vanishes", async ({
    page,
  }) => {
    await stubImages(page);
    const media = watchMedia(page);
    await page.goto("./");
    await centre(page);
    const cell = card(page);
    await expect(cell).toHaveAttribute("data-clip", "ready", { timeout: 10000 });
    const video = cell.locator("video");
    await expect(video).toHaveCount(1);
    expect(
      await video.evaluate((v: HTMLVideoElement) => ({
        muted: v.muted,
        loop: v.loop,
        inline: v.playsInline,
        paused: v.paused,
        textTracks: v.textTracks.length,
        preload: v.preload,
        src: v.currentSrc.split("/").pop(),
      })),
    ).toEqual({
      muted: true,
      loop: true,
      inline: true,
      paused: true,
      textTracks: 0,
      preload: "metadata",
      src: `${hero.clip}.webm`,
    });
    expect(media.clips.length).toBeGreaterThan(0);
    const t0 = Date.now();
    await cell.hover();
    await expect(cell).toHaveAttribute("data-trailer", "playing");
    expect(Date.now() - t0).toBeLessThan(1000);
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0.3);
    await expect(cell.locator(".b-med")).toHaveCSS("opacity", "0", { timeout: 3000 });
    await expect(cell.locator(".b-cap")).toHaveCSS("opacity", "1", { timeout: 3000 });
    await expect(cell.locator(".b-bscrim")).toHaveCSS("opacity", "0", { timeout: 3000 });
    await expect(cell.locator(".b-tile").last()).toHaveCSS("transform", /matrix3d/, { timeout: 3000 });
    await expect(page.locator("track")).toHaveCount(0);
    expect(media.youtube).toEqual([]);
    expect((await axe(page)).violations).toEqual([]);
    await cell.click();
    await expect(page.locator("#detail-name")).toHaveText(hero.title);
  });

  test("leaving flips the tiles back, restores poster and text, then pauses", async ({ page }) => {
    await stubImages(page);
    await page.goto("./");
    await centre(page);
    const cell = card(page);
    await cell.hover();
    await expect(cell).toHaveAttribute("data-trailer", "playing");
    await page.waitForTimeout(1200);
    await page.mouse.move(2, 2);
    await expect(cell).toHaveAttribute("data-trailer", "idle");
    // reverse runs right-to-left: the first tile (top-left) is still turned shortly after leaving
    await page.waitForTimeout(150);
    expect(
      await cell.locator(".b-tile").first().evaluate((el) => getComputedStyle(el).transform),
    ).not.toBe("none");
    await expect(cell.locator(".b-med")).toHaveCSS("opacity", "1", { timeout: 3000 });
    await expect(cell.locator(".b-ct")).toHaveCSS("opacity", "1", { timeout: 3000 });
    await expect(cell.locator(".b-tile").first()).toHaveCSS("transform", "none", { timeout: 3000 });
    await expect
      .poll(() => cell.locator("video").evaluate((v: HTMLVideoElement) => v.paused))
      .toBe(true);
  });

  test("rapid enter/leave never leaves a stuck state", async ({ page }) => {
    await stubImages(page);
    await page.goto("./");
    await centre(page);
    const cell = card(page);
    const box = (await cell.boundingBox())!;
    const inside = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    for (let i = 0; i < 8; i++) {
      await page.mouse.move(inside.x, inside.y);
      await page.waitForTimeout(60);
      await page.mouse.move(2, 2);
      await page.waitForTimeout(80);
    }
    await page.mouse.move(inside.x, inside.y);
    await expect(cell).toHaveAttribute("data-trailer", "playing");
    await page.mouse.move(2, 2);
    await expect(cell).toHaveAttribute("data-trailer", "idle");
    await expect(cell.locator(".b-med")).toHaveCSS("opacity", "1", { timeout: 3000 });
  });

  test("cold first hover right after the card scrolls into view starts fast", async ({ page }) => {
    await stubImages(page);
    await page.goto("./");
    await page.waitForTimeout(1500);
    await centre(page);
    const cell = card(page);
    const box = (await cell.boundingBox())!;
    await page.evaluate(() => {
      const w = window as unknown as { __enter: number };
      document.addEventListener("pointerenter", () => (w.__enter ||= performance.now()), true);
    });
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await expect(cell).toHaveAttribute("data-trailer", "playing");
    const ms = await page.evaluate(() => {
      const w = window as unknown as { __enter: number };
      return performance.now() - w.__enter;
    });
    expect(ms).toBeLessThan(1500);
  });

  test("keyboard focus previews the trailer too", async ({ page }) => {
    await stubImages(page);
    await page.goto("./");
    await centre(page);
    const cell = card(page);
    await cell.getByRole("button").focus();
    await expect(cell).toHaveAttribute("data-trailer", "playing");
    await cell.getByRole("button").blur();
    await expect(cell).toHaveAttribute("data-trailer", "idle");
  });

  test("Save-Data: nothing is preloaded; the clip loads and plays on hover", async ({ page }) => {
    await stubImages(page);
    await page.addInitScript(() =>
      Object.defineProperty(navigator, "connection", {
        value: { saveData: true, effectiveType: "4g" },
      }),
    );
    const media = watchMedia(page);
    await page.goto("./");
    await centre(page);
    await page.waitForTimeout(1500);
    expect(media.clips).toEqual([]);
    await card(page).hover();
    await expect(card(page)).toHaveAttribute("data-trailer", "playing");
    expect(media.clips.length).toBeGreaterThan(0);
  });

  test("?touch=1: hover does nothing, the timeline dot on the node plays it", async ({ page }) => {
    await stubImages(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("./?touch=1&embed=1");
    const cell = card(page);
    await cell.evaluate((el) => el.scrollIntoView({ block: "start", behavior: "instant" }));
    await page.waitForTimeout(300);
    await cell.hover();
    await page.waitForTimeout(500);
    await expect(cell).toHaveAttribute("data-trailer", "idle");
    await cell.evaluate((el) => {
      const root = document.querySelector(".b-root")!;
      const r = el.getBoundingClientRect();
      root.scrollBy(0, r.top + r.height / 2 - root.clientHeight * 0.55);
    });
    await expect(cell).toHaveAttribute("data-trailer", "playing", { timeout: 8000 });
    expect(await page.evaluate(() => document.documentElement.dataset.voDot)).toBe(
      String(hero.position),
    );
    await page.locator(".b-root").evaluate((el) => el.scrollBy(0, 900));
    await expect(cell).toHaveAttribute("data-trailer", "idle", { timeout: 5000 });
  });

  test.describe("touch device (no hover)", () => {
    test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
    test("dot-driven playback, layout and a11y hold", async ({ page }) => {
      await stubImages(page);
      await page.goto("./");
      const cell = card(page);
      await cell.evaluate((el) => {
        const root = document.querySelector(".b-root")!;
        const r = el.getBoundingClientRect();
        root.scrollBy(0, r.top + r.height / 2 - root.clientHeight * 0.55);
      });
      await expect(cell).toHaveAttribute("data-trailer", "playing", { timeout: 8000 });
      expect((await axe(page)).violations).toEqual([]);
      await page.locator(".b-root").evaluate((el) => el.scrollTo({ top: 0, behavior: "instant" }));
      await expect(cell).toHaveAttribute("data-trailer", "idle", { timeout: 5000 });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  });
});

test("axe passes on the home page with the banner card", async ({ page }) => {
  await stubImages(page);
  await page.goto("./");
  await card(page).scrollIntoViewIfNeeded();
  expect((await axe(page)).violations).toEqual([]);
});

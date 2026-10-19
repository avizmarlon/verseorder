import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import collection from "../src/data/watch-order.json";
import { fxVariants } from "../src/components/timeline-data";

const hero = collection.entries.find(
  (entry) => entry.id === "captain-america-the-first-avenger",
)!;
const bannerHosts = /^https:\/\/image\.tmdb\.org\//;
const imageHosts =
  /^https:\/\/(upload\.wikimedia\.org|static\.tvmaze\.com|image\.tmdb\.org)\//;
const pixel = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);
/** Stands in for the YouTube player: says "playing" with enough video time to count as settled. */
const player = (messages: object[]) =>
  `<title>player fixture</title><script>${messages
    .map((m) => `parent.postMessage(JSON.stringify(${JSON.stringify(m)}),"*");`)
    .join("")}</script>`;
const playing = [
  { event: "infoDelivery", info: { playerState: 1, currentTime: 5, duration: 150 } },
  { event: "infoDelivery", info: { playerState: 1, currentTime: 9, duration: 150 } },
];

async function stubNetwork(page: Page, messages: object[] = playing) {
  await page.route(imageHosts, (route) =>
    route.fulfill({ contentType: "image/png", body: pixel }),
  );
  await page.route("https://www.youtube-nocookie.com/**", (route) =>
    route.fulfill({ contentType: "text/html", body: player(messages) }),
  );
}
const card = (page: Page, root = "#node-" + hero.id) =>
  page.locator(`${root} .b-cell`).first();

test("banner data model: hero title has a trailer id, a TMDB backdrop and nothing else leaks", () => {
  expect(hero.trailerYouTubeId).toMatch(/^[\w-]{11}$/);
  expect(hero.bannerUrl).toMatch(bannerHosts);
  const withBanner = collection.entries.filter(
    (entry) => (entry as { bannerUrl?: string }).bannerUrl,
  );
  expect(withBanner.map((entry) => entry.id)).toEqual([hero.id]);
});

test("only the three kept variants exist and tiles is the default", async ({
  page,
}) => {
  expect(fxVariants.map((variant) => variant.id)).toEqual([
    "tiles",
    "shutter",
    "letterbox",
  ]);
  await stubNetwork(page);
  await page.goto("./");
  await expect(card(page)).toHaveAttribute("data-fx", "tiles");
});

test("banner card is one accessible button: no Details/Trailer/Preview buttons, click and keyboard open details", async ({
  page,
}) => {
  await stubNetwork(page);
  await page.goto("./");
  const cell = card(page);
  await cell.scrollIntoViewIfNeeded();
  await expect(cell.getByRole("button")).toHaveCount(1);
  await expect(cell.getByRole("button")).toHaveAccessibleName(
    `Details: ${hero.title}`,
  );
  await expect(cell.getByText("Preview fx")).toHaveCount(0);
  await cell.getByRole("button").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#detail-name")).toHaveText(hero.title);
  await page.keyboard.press("Escape");
  await cell.getByRole("button").focus();
  await page.keyboard.press("Space");
  await expect(page.locator("#detail-name")).toHaveText(hero.title);
  await page.keyboard.press("Escape");
  // other titles keep their buttons
  await expect(
    page.locator("#node-eyes-of-wakanda").getByRole("button", { name: "Trailer" }),
  ).toHaveCount(1);
});

test("nothing from YouTube loads until the card is near; the trailer plays muted, control-less and click-through on hover", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("youtube")) requests.push(request.url());
  });
  await stubNetwork(page);
  await page.goto("./");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.waitForTimeout(500);
  expect(requests).toHaveLength(0);
  await expect(page.locator("iframe")).toHaveCount(0);

  const cell = card(page);
  await cell.scrollIntoViewIfNeeded();
  await expect(cell.locator(".b-bimg")).toHaveAttribute("src", hero.bannerUrl!);
  await cell.hover();
  await expect(cell).toHaveAttribute("data-trailer", "playing");
  const frame = page.locator("iframe");
  await expect(frame).toHaveCount(1);
  const src = new URL((await frame.getAttribute("src"))!);
  expect(src.origin).toBe("https://www.youtube-nocookie.com");
  expect(src.pathname).toBe(`/embed/${hero.trailerYouTubeId}`);
  for (const [key, value] of Object.entries({
    autoplay: "1",
    mute: "1",
    controls: "0",
    loop: "1",
    playlist: hero.trailerYouTubeId!,
    playsinline: "1",
    modestbranding: "1",
    rel: "0",
    disablekb: "1",
    iv_load_policy: "3",
    start: String(hero.trailerStart),
  }))
    expect(src.searchParams.get(key), key).toBe(value);
  await expect(frame).toHaveCSS("pointer-events", "none");
  const box = await cell.boundingBox();
  const video = await frame.boundingBox();
  expect(video!.width).toBeGreaterThanOrEqual(box!.width);
  expect(video!.height).toBeGreaterThanOrEqual(box!.height);
  expect(video!.width / video!.height).toBeCloseTo(16 / 9, 1);
  // poster is gone, caption is shown, the big title block is faded
  await expect(cell.locator(".b-med")).toHaveCSS("opacity", "0", { timeout: 3000 });
  await expect(cell.locator(".b-cap")).toHaveCSS("opacity", "1", { timeout: 3000 });
  await expect(cell.locator(".b-ct")).toHaveCSS("opacity", "0", { timeout: 3000 });
  await expect(cell.locator(".b-bscrim")).toHaveCSS("opacity", "0", { timeout: 3000 });
  // clicking the card (through the video) opens details
  await cell.click();
  await expect(page.locator("#detail-name")).toHaveText(hero.title);
  await page.keyboard.press("Escape");
});

test("leaving plays the transition in reverse: poster and text return, state is idle, player is torn down after the grace period", async ({
  page,
}) => {
  await stubNetwork(page);
  await page.goto("./");
  const cell = card(page);
  await cell.scrollIntoViewIfNeeded();
  await cell.hover();
  await expect(cell).toHaveAttribute("data-trailer", "playing");
  await page.mouse.move(2, 2);
  await expect(cell).toHaveAttribute("data-trailer", "idle");
  await expect(cell.locator(".b-med")).toHaveCSS("opacity", "1", { timeout: 3000 });
  await expect(cell.locator(".b-ct")).toHaveCSS("opacity", "1", { timeout: 3000 });
  await expect(cell.locator(".b-bscrim")).toHaveCSS("opacity", "1", { timeout: 3000 });
  // still near the pointer/centre band: the warm player is kept; once the card is far away it is released
  await page
    .locator(".b-root")
    .evaluate((el) => el.scrollTo({ top: el.scrollHeight, behavior: "instant" }));
  await expect(page.locator("iframe")).toHaveCount(0, { timeout: 8000 });
});

test("rapid enter/leave never leaves a stuck state", async ({ page }) => {
  await stubNetwork(page);
  await page.goto("./");
  const cell = card(page);
  await cell.scrollIntoViewIfNeeded();
  const box = (await cell.boundingBox())!;
  const inside = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(inside.x, inside.y);
  await expect(cell).toHaveAttribute("data-trailer", "playing");
  for (let i = 0; i < 6; i++) {
    await page.mouse.move(2, 2);
    await page.waitForTimeout(90);
    await page.mouse.move(inside.x, inside.y);
    await page.waitForTimeout(70);
  }
  await expect(cell).toHaveAttribute("data-trailer", "playing");
  await page.mouse.move(2, 2);
  await expect(cell).toHaveAttribute("data-trailer", "idle");
  await expect(cell.locator(".b-med")).toHaveCSS("opacity", "1", { timeout: 3000 });
});

test("the player is warmed before hover (pointer approaches / dot), so reveal needs no load", async ({
  page,
}) => {
  await stubNetwork(page);
  await page.goto("./");
  const cell = card(page);
  await cell.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
  await expect(cell).toHaveAttribute("data-warm", "ready", { timeout: 6000 });
  await expect(page.locator("iframe")).toHaveCount(1);
  await expect(cell).toHaveAttribute("data-trailer", "idle");
  const box = (await cell.boundingBox())!;
  const t0 = Date.now();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await expect(cell).toHaveAttribute("data-trailer", "playing");
  expect(Date.now() - t0).toBeLessThan(800);
});

test("a brief hover pass does not reveal (hover intent)", async ({ page }) => {
  await stubNetwork(page);
  await page.goto("./");
  const cell = card(page);
  await cell.scrollIntoViewIfNeeded();
  await cell.hover();
  await page.mouse.move(2, 2);
  await page.waitForTimeout(500);
  await expect(cell).toHaveAttribute("data-trailer", "idle");
});

test("keyboard focus previews the trailer too", async ({ page }) => {
  await stubNetwork(page);
  await page.goto("./");
  const cell = card(page);
  await cell.scrollIntoViewIfNeeded();
  await cell.getByRole("button").focus();
  await expect(cell).toHaveAttribute("data-trailer", "playing");
  await page.locator("body").focus();
  await cell.getByRole("button").blur();
  await expect(cell).toHaveAttribute("data-trailer", "idle");
});

test("lab scrolls to the end, renders the three variants and the phone frame; one trailer at a time", async ({
  page,
}) => {
  await stubNetwork(page);
  await page.goto("lab/");
  await expect(page.getByText(/PROTOTYPE/).first()).toBeVisible();
  await expect(page.locator("[data-fx-id]")).toHaveCount(3);
  for (const variant of fxVariants)
    await expect(
      page.locator(`[data-fx-id="${variant.id}"] .b-cell`),
    ).toHaveAttribute("data-fx", variant.id);
  // regression: the lab must be scrollable down to the phone section
  const scroller = page.locator(".lab-root");
  const phoneTitle = page.getByRole("heading", { name: /Phone preview/ });
  await scroller.evaluate((el) => el.scrollBy(0, el.scrollHeight));
  await expect(phoneTitle).toBeInViewport();
  expect(
    await scroller.evaluate((el) => el.scrollTop > 200 && el.scrollHeight > el.clientHeight),
  ).toBe(true);
  // mouse wheel works too
  await scroller.evaluate((el) => el.scrollTo(0, 0));
  await page.mouse.move(600, 400);
  await page.mouse.wheel(0, 600);
  await expect.poll(() => scroller.evaluate((el) => el.scrollTop)).toBeGreaterThan(200);

  await page.getByRole("button", { name: "Load phone frame" }).click();
  const phone = page.locator('iframe[title^="Phone-sized"]');
  await expect(phone).toHaveAttribute("src", /touch=1/);
  const box = (await phone.boundingBox())!;
  expect([Math.round(box.width), Math.round(box.height)]).toEqual([390, 844]);

  await scroller.evaluate((el) => el.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(600); // let the wheel's smooth-scroll animation finish
  await expect.poll(() => scroller.evaluate((el) => el.scrollTop)).toBe(0);
  const first = page.locator('[data-fx-id="tiles"] .b-cell');
  const second = page.locator('[data-fx-id="shutter"] .b-cell');
  await first.scrollIntoViewIfNeeded();
  await first.hover();
  await expect(first).toHaveAttribute("data-trailer", "playing");
  await second.hover();
  await expect(second).toHaveAttribute("data-trailer", "playing");
  await expect(first).not.toHaveAttribute("data-trailer", "playing");
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});

test("?touch=1 forces dot-driven behaviour on desktop: hover does nothing, the dot over the node plays it", async ({
  page,
}) => {
  await stubNetwork(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./?touch=1&embed=1&fx=letterbox");
  const cell = card(page);
  await expect(cell).toHaveAttribute("data-fx", "letterbox");
  await cell.evaluate((el) => el.scrollIntoView({ block: "start", behavior: "instant" }));
  await page.waitForTimeout(300);
  await cell.hover();
  await page.waitForTimeout(500);
  await expect(page.locator("iframe")).toHaveCount(0);
  await expect(cell).toHaveAttribute("data-trailer", "idle");
  // bring the card to the dot line (55% of the viewport height)
  await cell.evaluate((el) => {
    const root = document.querySelector(".b-root")!;
    const r = el.getBoundingClientRect();
    root.scrollBy(0, r.top + r.height / 2 - root.clientHeight * 0.55);
  });
  await expect(cell).toHaveAttribute("data-trailer", "playing", { timeout: 8000 });
  expect(await page.evaluate(() => document.documentElement.dataset.voDot)).toBe(
    String(hero.position),
  );
  // dot moves on: reverse transition, back to idle
  await page.locator(".b-root").evaluate((el) => el.scrollBy(0, 900));
  await expect(cell).toHaveAttribute("data-trailer", "idle", { timeout: 5000 });
  await expect(page.locator("iframe")).toHaveCount(0, { timeout: 8000 });
});

test("a failing embed falls back to the static banner and poster", async ({ page }) => {
  await stubNetwork(page, [{ event: "onError", info: 153 }]);
  await page.goto("./");
  const cell = card(page);
  await cell.scrollIntoViewIfNeeded();
  await cell.hover();
  await expect(page.locator("iframe")).toHaveCount(0, { timeout: 5000 });
  await expect(cell).toHaveAttribute("data-trailer", "idle");
  await expect(cell.locator(".b-bimg")).toBeVisible();
  await expect(cell.locator(".b-med")).toHaveCSS("opacity", "1");
});

test("a banner image that fails keeps the card usable", async ({ page }) => {
  await page.route(bannerHosts, (route) => route.abort());
  await page.route(/upload\.wikimedia\.org|static\.tvmaze\.com/, (route) =>
    route.fulfill({ contentType: "image/png", body: pixel }),
  );
  await page.goto("./");
  const cell = card(page);
  await cell.scrollIntoViewIfNeeded();
  await expect(cell.locator(".b-bimg")).toHaveCount(0);
  await expect(cell.locator(".b-banner")).toHaveCount(1);
  await cell.getByRole("button", { name: `Details: ${hero.title}` }).click();
  await expect(page.locator("#detail-name")).toHaveText(hero.title);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("static banner only, no video, no warm-up", async ({ page }) => {
    await stubNetwork(page);
    const requests: string[] = [];
    page.on("request", (r) => r.url().includes("youtube") && requests.push(r.url()));
    await page.goto("./");
    const cell = card(page);
    await cell.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
    await cell.hover();
    await page.waitForTimeout(900);
    await expect(page.locator("iframe")).toHaveCount(0);
    expect(requests).toHaveLength(0);
    await expect(cell.locator(".b-bimg")).toBeVisible();
    await expect(cell.locator(".b-med")).toHaveCSS("opacity", "1");
  });
});

test.describe("save-data", () => {
  test("no video requests when the browser asks for data saving", async ({ page }) => {
    await stubNetwork(page);
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "connection", {
        value: { saveData: true, effectiveType: "4g" },
      });
    });
    const requests: string[] = [];
    page.on("request", (r) => r.url().includes("youtube") && requests.push(r.url()));
    await page.goto("./");
    const cell = card(page);
    await cell.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
    await cell.hover();
    await page.waitForTimeout(700);
    expect(requests).toHaveLength(0);
  });
});

test.describe("touch device (no hover)", () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });
  test("plays when the timeline dot reaches the node, stops when it moves on; layout and a11y hold", async ({
    page,
  }) => {
    await stubNetwork(page);
    await page.goto("./");
    const cell = card(page);
    await expect(
      page.evaluate(() => matchMedia("(hover: none)").matches),
    ).resolves.toBe(true);
    await page.waitForTimeout(400);
    await expect(page.locator("iframe")).toHaveCount(0);
    await cell.evaluate((el) => {
      const root = document.querySelector(".b-root")!;
      const r = el.getBoundingClientRect();
      root.scrollBy(0, r.top + r.height / 2 - root.clientHeight * 0.55);
    });
    await expect(cell).toHaveAttribute("data-trailer", "playing", { timeout: 8000 });
    await page.locator(".b-root").evaluate((el) => el.scrollTo({ top: 0, behavior: "instant" }));
    await expect(cell).toHaveAttribute("data-trailer", "idle", { timeout: 5000 });
    await expect(page.locator("iframe")).toHaveCount(0, { timeout: 8000 });
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test("axe passes on the home page with the banner card (static and playing)", async ({
  page,
}) => {
  await stubNetwork(page);
  await page.goto("./");
  const cell = card(page);
  await cell.scrollIntoViewIfNeeded();
  const axe = () =>
    new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect((await axe()).violations).toEqual([]);
  await cell.hover();
  await expect(cell).toHaveAttribute("data-trailer", "playing");
  await page.waitForTimeout(900);
  expect((await axe()).violations).toEqual([]);
});

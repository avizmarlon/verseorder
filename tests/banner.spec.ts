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
/** Stands in for the YouTube player: reports "playing" (or an error) to its parent page. */
const player = (message: object) =>
  `<title>player fixture</title><script>parent.postMessage(JSON.stringify(${JSON.stringify(message)}),"*")</script>`;

async function stubNetwork(
  page: Page,
  message: object = {
    event: "infoDelivery",
    info: { playerState: 1, currentTime: 60 },
  },
) {
  await page.route(imageHosts, (route) =>
    route.fulfill({ contentType: "image/png", body: pixel }),
  );
  await page.route("https://www.youtube-nocookie.com/**", (route) =>
    route.fulfill({ contentType: "text/html", body: player(message) }),
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

test("nothing from YouTube loads until a card is hovered; hover plays a muted, control-less, click-through trailer", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("youtube")) requests.push(request.url());
  });
  await stubNetwork(page);
  await page.goto("./");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const cell = card(page);
  await cell.scrollIntoViewIfNeeded();
  await expect(cell).toHaveAttribute("data-trailer", "idle");
  await expect(cell.locator(".b-bimg")).toHaveAttribute("src", hero.bannerUrl!);
  await page.waitForTimeout(500);
  expect(requests).toHaveLength(0);
  await expect(page.locator("iframe")).toHaveCount(0);

  await cell.hover();
  await expect(page.locator("iframe")).toHaveCount(1);
  await expect(cell).toHaveAttribute("data-trailer", "playing");
  const frame = page.locator("iframe");
  const src = new URL((await frame.getAttribute("src"))!);
  expect(src.origin).toBe("https://www.youtube-nocookie.com");
  expect(src.pathname).toBe(`/embed/${hero.trailerYouTubeId}`);
  const q = src.searchParams;
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
  }))
    expect(q.get(key), key).toBe(value);
  await expect(frame).toHaveCSS("pointer-events", "none");
  await expect(frame).toHaveAttribute("tabindex", "-1");

  // The oversized 16:9 player covers (and crops to) the whole card.
  const box = await cell.boundingBox();
  const video = await frame.boundingBox();
  expect(video!.width).toBeGreaterThanOrEqual(box!.width);
  expect(video!.height).toBeGreaterThanOrEqual(box!.height);
  expect(video!.width / video!.height).toBeCloseTo(16 / 9, 1);

  // Card stays clickable through the video.
  await cell.getByRole("button", { name: `Details: ${hero.title}` }).click();
  await expect(page.locator("#detail-name")).toHaveText(hero.title);
  await page.keyboard.press("Escape");

  // Leaving tears the player down.
  await page.mouse.move(2, 2);
  await expect(page.locator("iframe")).toHaveCount(0, { timeout: 4000 });
  await expect(cell).toHaveAttribute("data-trailer", "idle");
});

test("a brief hover pass does not create a player (hover intent)", async ({
  page,
}) => {
  await stubNetwork(page);
  await page.goto("./");
  const cell = card(page);
  await cell.scrollIntoViewIfNeeded();
  await cell.hover();
  await page.mouse.move(2, 2);
  await page.waitForTimeout(600);
  await expect(page.locator("iframe")).toHaveCount(0);
});

test("lab renders every variant, only one trailer plays at a time", async ({
  page,
}) => {
  await stubNetwork(page);
  await page.goto("lab/");
  await expect(page.getByText(/PROTOTYPE/).first()).toBeVisible();
  await expect(page.locator("[data-fx-id]")).toHaveCount(fxVariants.length);
  expect(fxVariants.length).toBeGreaterThanOrEqual(6);
  for (const variant of fxVariants)
    await expect(
      page.locator(`[data-fx-id="${variant.id}"] .b-cell`),
    ).toHaveAttribute("data-fx", variant.id);
  const first = page.locator(`[data-fx-id="${fxVariants[0].id}"] .b-cell`);
  const second = page.locator(`[data-fx-id="${fxVariants[3].id}"] .b-cell`);
  await first.scrollIntoViewIfNeeded();
  await first.hover();
  await expect(first).toHaveAttribute("data-trailer", "playing");
  await second.scrollIntoViewIfNeeded();
  await second.hover();
  await expect(second).toHaveAttribute("data-trailer", "playing");
  await expect(first).not.toHaveAttribute("data-trailer", "playing");
  await expect(page.locator("iframe")).toHaveCount(1, { timeout: 4000 });
  // Flip tiles variant renders its panel grid; shutter/iris etc. their own layers.
  await expect(second.locator(".b-tile")).toHaveCount(18);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});

test("?fx= selects the variant on the real timeline and shows the prototype selector", async ({
  page,
}) => {
  await stubNetwork(page);
  await page.goto("./?fx=iris");
  await expect(card(page)).toHaveAttribute("data-fx", "iris");
  const select = page.getByRole("combobox", { name: "Transition" });
  await expect(select).toHaveValue("iris");
  await select.selectOption("shutter");
  await expect(card(page)).toHaveAttribute("data-fx", "shutter");
  expect(new URL(page.url()).searchParams.get("fx")).toBe("shutter");
  // default page has no dev UI
  await page.goto("./");
  await expect(page.getByRole("combobox", { name: "Transition" })).toHaveCount(0);
  await expect(card(page)).toHaveAttribute("data-fx", "crossfade");
});

test("a failing embed falls back to the static banner and poster", async ({
  page,
}) => {
  await stubNetwork(page, { event: "onError", info: 153 });
  await page.goto("./");
  const cell = card(page);
  await cell.scrollIntoViewIfNeeded();
  await cell.hover();
  await expect(page.locator("iframe")).toHaveCount(0, { timeout: 5000 });
  await expect(cell).toHaveAttribute("data-trailer", "idle");
  await expect(cell.locator(".b-bimg")).toBeVisible();
  await expect(cell.locator(".b-med")).toBeVisible();
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
  test("static banner only, no autoplay video", async ({ page }) => {
    await stubNetwork(page);
    await page.goto("./");
    const cell = card(page);
    await cell.scrollIntoViewIfNeeded();
    await cell.hover();
    await page.waitForTimeout(900);
    await expect(page.locator("iframe")).toHaveCount(0);
    await expect(cell.locator(".b-bimg")).toBeVisible();
    await expect(cell.locator(".b-med")).toHaveCSS("opacity", "1");
  });
});

test.describe("touch (no hover)", () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });
  test("plays when the card is mid-screen and stops when it leaves", async ({
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
    await cell.evaluate((el) =>
      el.scrollIntoView({ block: "center", behavior: "instant" }),
    );
    await expect(page.locator("iframe")).toHaveCount(1);
    await expect(cell).toHaveAttribute("data-trailer", "playing");
    // scroll the card out of the centre band (back to top)
    await page.locator(".b-root").evaluate((el) =>
      el.scrollTo({ top: 0, behavior: "instant" }),
    );
    await expect(page.locator("iframe")).toHaveCount(0, { timeout: 4000 });
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

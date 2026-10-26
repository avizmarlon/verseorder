import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import collection from "../src/data/watch-order.json";
import placementNotes from "../src/data/placement-notes.json";

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
  await expect(
    page.getByRole("heading", { name: "Why this order?" }),
  ).toBeVisible();
  await expect(page.getByText(/not an official Marvel chronology/)).toHaveCount(
    1,
  );
  expect(
    await page
      .locator("article.b-row")
      .evaluateAll((nodes) => nodes.map((node) => node.id)),
  ).toEqual(collection.entries.map((entry) => `node-${entry.id}`));
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    page.getByRole("heading", { name: "Before the Avengers", exact: true }),
  ).toHaveCount(1);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2400);
  await page.screenshot({ path: "docs/previews/living-desktop.png" });
  await page
    .getByRole("link", { name: "Explore the watch order", exact: true })
    .click();
  await page.locator("#node-captain-marvel").scrollIntoViewIfNeeded();
  await expect(page.locator(".b-pip.on")).toHaveAccessibleName(
    "Before the Avengers",
  );
  await expect
    .poll(() =>
      page
        .locator("#before-the-avengers .b-fill")
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

test("nine chapters split the order where the content changes; old hashes still land", async ({
  page,
}) => {
  const expected = [
    [
      "Before the Avengers",
      1,
      "Eyes of Wakanda",
      "Marvel One-Shot: The Consultant",
    ],
    ["The Avengers Era", 11, "The Avengers", "Ant-Man"],
    ["The Road to Endgame", 25, "Daredevil S2", "Avengers: Endgame"],
    ["After Endgame", 45, "Loki S1", "Eternals"],
    [
      "The Spider-Man Multiverse",
      53,
      "Spider-Man (2002, Sam Raimi)",
      "Spider-Man: Across the Spider-Verse",
    ],
    [
      "Beyond the Avengers",
      64,
      "Doctor Strange in the Multiverse of Madness",
      "What If...? S2",
    ],
    [
      "Marvel Before the MCU",
      81,
      "Blade (1998)",
      "Fantastic Four: Rise of the Silver Surfer (2007)",
    ],
    ["X-Men, Wolverine & Deadpool", 88, "X-Men: First Class", "Deadpool 2"],
    [
      "Back to the MCU",
      101,
      "Deadpool & Wolverine",
      "Spider-Man: Brand New Day",
    ],
  ] as const;
  await home(page);
  const sections = page.locator("section.b-ch");
  await expect(sections).toHaveCount(9);
  const titleAt = (position: number) =>
    collection.entries.find((entry) => entry.position === position)!.title;
  for (const [index, [name, start, first, last]] of expected.entries()) {
    const section = sections.nth(index);
    await expect(section.locator("h2")).toHaveText(name);
    const end = index < 8 ? expected[index + 1][1] - 1 : 112;
    expect([titleAt(start), titleAt(end)]).toEqual([first, last]);
    await expect(section.locator("article.b-row")).toHaveCount(end - start + 1);
  }
  await page.goto("about:blank");
  await page.goto("./#ch4");
  await expect
    .poll(() =>
      page
        .locator("#marvel-before-the-mcu")
        .evaluate((el) => Math.abs(el.getBoundingClientRect().top) < 300),
    )
    .toBe(true);
  expect(new URL(page.url()).hash).toBe("#marvel-before-the-mcu");
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
  await page.getByRole("button", { name: /watched. Progress menu/ }).click();
  await page.getByRole("button", { name: /^Up next: / }).click();
  await expect(page.getByRole("searchbox")).toHaveValue("");
  await expect(page.locator("article.b-row")).toHaveCount(112);
  await page.getByRole("searchbox").fill("no such title xyz");
  await expect(page.locator("article.b-row")).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText(
    "Nothing matches “no such title xyz”.",
  );
  await expect(page.locator("section.b-ch")).toHaveCount(0);
});

for (const [name, viewport] of [
  ["desktop", { width: 1440, height: 900 }],
  ["mobile", { width: 390, height: 844 }],
] as const)
  test(`${name}: search and filters show results right under the controls, clearing restores the page`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize(viewport);
    await home(page);
    const scroller = page.locator(".b-root");
    await scroller.evaluate((el) =>
      el.scrollTo({ top: 6000, behavior: "instant" }),
    );
    const firstResult = () =>
      page.evaluate(() => {
        const hud = document.querySelector(".b-hudin")!.getBoundingClientRect();
        const row = document
          .querySelector("article.b-row")!
          .getBoundingClientRect();
        return { gap: row.top - hud.bottom, bottom: row.bottom };
      });
    const cases: (() => Promise<void>)[] = [
      () => page.getByRole("searchbox").fill("No Way Home"),
      () => page.getByRole("searchbox").fill("loki"),
      async () => {
        await page.getByRole("searchbox").fill("");
        await page.getByRole("button", { name: "Legacy", exact: true }).click();
      },
    ];
    for (const act of cases) {
      await act();
      await expect(page.locator(".b-hero")).toBeHidden();
      // no empty chapters: every rendered chapter holds a match
      for (const section of await page.locator("section.b-ch").all())
        await expect(section.locator("article.b-row").first()).toBeAttached();
      // the mobile bar may still be expanding (it collapsed during the scroll to 6000)
      await expect
        .poll(async () => (await firstResult()).gap)
        .toBeLessThan(120);
      const { gap, bottom } = await firstResult();
      expect(gap).toBeGreaterThanOrEqual(0);
      expect(bottom).toBeLessThan(viewport.height);
    }
    await page.getByRole("searchbox").fill("spider");
    await expect(page.getByRole("searchbox")).toBeFocused();
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(page.locator("article.b-row")).toHaveCount(112);
    await expect(page.locator(".b-hero")).toBeVisible();
    // Scroll anchoring may nudge it by a few px while late layout settles.
    expect(
      Math.abs((await scroller.evaluate((el) => el.scrollTop)) - 6000),
    ).toBeLessThan(40);
    expect(errors).toEqual([]);
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
  await expect(page.getByRole("dialog")).not.toContainText(
    "not an official chronology",
  );
  await expect(page.getByRole("dialog").locator(".b-place p")).toHaveText(
    placementNotes["eyes-of-wakanda"],
  );
  await expect(page.getByRole("dialog")).not.toContainText(
    /curated|editorial|journey/i,
  );
  await page
    .getByRole("button", { name: "Mark as watched", exact: true })
    .click();
  await page.getByRole("button", { name: /Next in order/ }).click();
  await expect(page.locator("#detail-name")).toHaveText(
    "Captain America: The First Avenger",
  );
  // obvious spots carry no note, and then no empty "Why this spot?" heading
  await expect(page.getByRole("dialog").locator(".b-place")).toHaveCount(0);
  await expect(page.getByRole("dialog")).not.toContainText("Why this spot?");
  for (let i = 0; i < 12; i++) await page.keyboard.press("Tab");
  expect(
    await page
      .getByRole("dialog")
      .evaluate((el) => el.contains(document.activeElement)),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".b-plab")).toHaveText("1/112 watched");
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
  await page.getByRole("searchbox").fill("A Funny Thing Happened");
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
    .getByRole("link", { name: "Explore the watch order", exact: true })
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
  // The bar folds search away while scrolling down; scrolling up brings it back.
  await expect(page.getByRole("searchbox")).toBeHidden();
  await page.locator(".b-root").evaluate((el) => el.scrollBy(0, -200));
  await expect(page.getByRole("searchbox")).toBeVisible();
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

test("mobile bar collapses while scrolling down and chapter chips jump", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await home(page);
  const root = page.locator(".b-root");
  const hud = page.locator(".b-hudin");
  const height = () => hud.evaluate((el) => el.getBoundingClientRect().height);
  const chips = page.getByRole("navigation", { name: "Chapters" });
  await expect(chips).toBeVisible();
  expect(await height()).toBeGreaterThan(150);
  await root.evaluate((el) => el.scrollBy({ top: 2000, behavior: "instant" }));
  await expect.poll(height).toBeLessThanOrEqual(72);
  await expect(page.getByRole("searchbox")).toBeHidden();
  await expect(
    chips.getByRole("link", { name: "Before the Avengers" }),
  ).toHaveAttribute("aria-current", "location");
  await root.evaluate((el) => el.scrollBy({ top: -300, behavior: "instant" }));
  await expect.poll(height).toBeGreaterThan(150);
  await chips.getByRole("link", { name: "Marvel Before the MCU" }).click();
  await expect
    .poll(() =>
      page
        .locator("#marvel-before-the-mcu")
        .evaluate((el) => Math.round(el.getBoundingClientRect().top)),
    )
    .toBeLessThan(140);
  await expect(
    chips.getByRole("link", { name: "Marvel Before the MCU" }),
  ).toHaveAttribute("aria-current", "location");
  await expect.poll(height).toBeLessThanOrEqual(72);
  expect(await root.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );
  await root.evaluate((el) => el.scrollTo({ top: 0, behavior: "instant" }));
  await expect.poll(height).toBeGreaterThan(150);
  expect(errors).toEqual([]);
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
  await expect(page.locator(".b-plab")).toHaveText("1/112 watched");
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
  await expect(page.locator(".b-plab")).toHaveText("1/112 watched");
  await page.evaluate(() => localStorage.setItem("verseorder:watched:v1", "{"));
  await page.reload();
  await expect(page.locator(".b-plab")).toHaveText("0/112 watched");
});

test("progress: first-visit hint, marking, export, import and a bad file", async ({
  page,
}, testInfo) => {
  await home(page);
  const hint = page.locator(".b-hint");
  await expect(hint).toContainText("mark it as watched");
  await hint.getByRole("button", { name: "Got it" }).click();
  await expect(hint).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".b-plab")).toHaveText("0/112 watched");
  await expect(hint).toHaveCount(0);

  const orb = page.locator("#node-eyes-of-wakanda .b-orb");
  await expect(orb).toHaveAttribute("title", "Mark as watched");
  await orb.click();
  await expect(orb).toHaveAttribute("aria-pressed", "true");
  await expect(orb).toHaveAttribute("title", /^Watched/);
  await page.locator("#node-captain-america-the-first-avenger .b-orb").click();
  await expect(page.locator(".b-plab")).toHaveText("2/112 watched");
  await expect(page.locator(".b-cprog").first()).toContainText(
    "2 of 10 watched",
  );

  await page.getByRole("button", { name: /watched. Progress menu/ }).click();
  const menu = page.getByRole("group", { name: "Progress" });
  await expect(menu).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    menu.getByRole("button", { name: "Export progress" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("verseorder-progress.json");
  const file = testInfo.outputPath("progress.json");
  await download.saveAs(file);
  const exported = JSON.parse(readFileSync(file, "utf8"));
  expect(exported).toMatchObject({
    app: "verseorder",
    version: 1,
    watched: ["eyes-of-wakanda", "captain-america-the-first-avenger"],
  });

  // a fresh browser imports it; unknown IDs are skipped
  await page.evaluate(() => localStorage.removeItem("verseorder:watched:v1"));
  await page.reload();
  await expect(page.locator(".b-plab")).toHaveText("0/112 watched");
  await page.getByRole("button", { name: /watched. Progress menu/ }).click();
  await menu.getByLabel("Progress file").setInputFiles({
    name: "progress.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        ...exported,
        watched: [...exported.watched, "not-a-real-title"],
      }),
    ),
  });
  await expect(menu.getByRole("status")).toHaveText(
    "Imported 2 watched titles (2 new), skipped 1 unknown.",
  );
  await expect(page.locator(".b-plab")).toHaveText("2/112 watched");

  await menu.getByLabel("Progress file").setInputFiles({
    name: "notes.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"watched": "everything"}'),
  });
  await expect(menu.getByRole("status")).toContainText("Nothing changed.");
  await expect(page.locator(".b-plab")).toHaveText("2/112 watched");
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await page.reload();
  await expect(orb).toHaveAttribute("aria-pressed", "true");
});

const coverHosts =
  /^https:\/\/(upload\.wikimedia\.org|static\.tvmaze\.com|image\.tmdb\.org)\//;
const pixel = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

test("cover data is complete, https, and only from approved hosts", () => {
  const withCover = collection.entries.filter((entry) => entry.posterPath);
  expect(withCover.length).toBeGreaterThanOrEqual(110);
  for (const entry of withCover) expect(entry.posterPath).toMatch(coverHosts);
});

test("covers load ahead of the viewport (lazy when far) with alt text, in details, and a11y holds", async ({
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
  // a card near the visible area loads its cover eagerly (ahead of scrolling in) ...
  await expect(cover).toHaveAttribute("loading", "eager");
  // ... a far one stays lazy
  const far = collection.entries[80];
  await expect(page.locator(`#node-${far.id} .b-med img`)).toHaveAttribute(
    "loading",
    "lazy",
  );
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
    if (request.url().startsWith("https://static.cloudflareinsights.com/"))
      beacons.push(request.url());
  });
  await home(page);
  await page.waitForLoadState("load");
  const onRealDomain = await page.evaluate(
    () => location.hostname === "verseorder.watch",
  );
  if (onRealDomain) await expect.poll(() => beacons.length).toBe(1);
  else {
    await page.waitForTimeout(1500);
    expect(beacons).toEqual([]);
  }
});

test("footer leads with who made it; legal and technical lines below", async ({
  page,
}) => {
  await home(page);
  const footer = page.locator("footer.b-end");
  await footer.scrollIntoViewIfNeeded();
  await expect(footer.locator(".b-made")).toHaveText("Made by Marlon");
  await expect(footer.locator(".b-legal")).toContainText(
    "This product uses the TMDB API but is not endorsed or certified by TMDB.",
  );
  await expect(
    footer.getByRole("link", {
      name: "Think I got something wrong?",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    footer.getByRole("link", { name: "Source code", exact: true }),
  ).toBeVisible();
  await expect(
    footer.getByRole("link", { name: "Printable watch order" }),
  ).toHaveCount(0);
  // the date comes from the last commit touching the watch order (next.config.ts); a shallow
  // checkout without that commit falls back to the build date, so only the format is checked
  const updated = footer.getByText(/^Updated /);
  await expect(updated).toHaveText(
    /^Updated (January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}$/,
  );
  const commitDate = execFileSync(
    "git",
    [
      "log",
      "-1",
      "--format=%cs",
      "--",
      "src/data",
      "src/components/timeline-data.ts",
    ],
    { encoding: "utf8" },
  ).trim();
  if (commitDate) {
    const [y, m, d] = commitDate.split("-").map(Number);
    const month = new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-US", {
      month: "long",
      timeZone: "UTC",
    });
    await expect(updated).toHaveText(`Updated ${month} ${d}, ${y}`);
  }
  await expect(footer.getByText(/^Not affiliated/)).toHaveText(
    "Not affiliated with Marvel, Disney or Sony. All titles, characters, cover art and trademarks belong to their respective owners.",
  );
  // the site copy stays plain: no "curated", "editorial", "journey" or "lit"
  expect(await page.locator("body").innerText()).not.toMatch(
    /curat|editorial|journey|\blit\b|ultimate/i,
  );
  await expect(
    footer.getByRole("link", { name: "Marlon", exact: true }),
  ).toHaveAttribute("href", "https://github.com/avizmarlon");
  await expect(
    footer.getByRole("link", { name: "MIT License", exact: true }),
  ).toBeVisible();
  await expect(footer.getByText(/112 curated entries/)).toHaveCount(0);
  await expect(footer.getByText(/editorial review/)).toHaveCount(0);
  await expect(footer.getByText(/cookie-free/i)).toHaveCount(0);
  await expect(footer.getByText(/You may use, copy/)).toHaveCount(0);
  await expect(footer.getByText(/© 2026/)).toHaveCount(0);
  await expect(footer.getByText(/Wikipedia|TVMaze/)).toHaveCount(0);
  // TMDB terms: attribution wherever TMDB data / images are used
  await expect(
    footer.getByText(/API but is not endorsed or certified by TMDB/),
  ).toBeVisible();
});

test("cards show kind, universe and title, not the sub-era label", async ({
  page,
}) => {
  await home(page);
  const avengers = collection.entries.find(
    (entry) => entry.id === "the-avengers",
  )!;
  const card = page.locator(`#node-${avengers.id} .b-cell`);
  await expect(card).toContainText(avengers.title);
  await expect(card).not.toContainText(avengers.era);
  await expect(page.locator(".b-cell .b-ct p")).toHaveCount(0);
});

test("credits scenes that spoil a later title say when to watch them", async ({
  page,
}) => {
  await home(page);
  const card = page.locator("#node-captain-marvel");
  await expect(card.locator(".b-hold")).toContainText(
    "Mid-credits scene: watch after #43",
  );
  await expect(page.locator("#node-black-widow .b-hold")).toContainText(
    "Post-credits scene: watch after #44",
  );
  await expect(page.locator(".b-hold")).toHaveCount(3);
  await card.getByRole("button", { name: "Details: Captain Marvel" }).click();
  await expect(page.getByTestId("credits-hold")).toHaveText(
    "Save the mid-credits scene for after Avengers: Infinity War (#43).",
  );
});

test("Logan comes before Deadpool 2, which leads straight into Deadpool & Wolverine", () => {
  const at = (id: string) =>
    collection.entries.find((entry) => entry.id === id)!.position;
  expect(at("the-new-mutants")).toBeLessThan(at("logan"));
  expect(at("logan")).toBeLessThan(at("deadpool-2"));
  expect(at("deadpool-wolverine")).toBe(at("deadpool-2") + 1);
});

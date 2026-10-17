import { test, expect } from "@playwright/test";

test("the three directions render and can be compared", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors: string[] = [];
  page.on("pageerror", err => errors.push(err.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.waitForTimeout(700);
  await page.waitForTimeout(850);
  await page.screenshot({ path: "docs/previews/archive-desktop.png", fullPage: false });

  await page.getByRole("button", { name: /02 Sacred timeline/i }).click();
  await expect(page.locator(".scene-timeline")).toBeVisible();
  await page.waitForTimeout(850);
  await page.screenshot({ path: "docs/previews/timeline-desktop.png", fullPage: false });

  await page.getByRole("button", { name: /03 Multiverse explorer/i }).click();
  await expect(page.locator(".scene-multiverse")).toBeVisible();
  await page.waitForTimeout(850);
  await page.screenshot({ path: "docs/previews/multiverse-desktop.png", fullPage: false });

  await page.getByRole("button", { name: /LEGACY WORLDS/i }).first().click();
  await expect(page.locator(".universe-cards .title-card").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("search, progress persistence, details, locale and trailer modal", async ({ page }) => {
  await page.goto("/");
  await page.locator(".search-box input").fill("Spider-Man: No Way Home");
  await expect(page.locator(".cards-grid .title-card")).toHaveCount(1);
  await page.locator(".cards-grid .card-hit").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator("#detail-name")).toContainText("No Way Home");
  await page.getByRole("button", { name: "Mark as watched" }).last().click();
  await page.getByRole("button", { name: "Watch official trailer" }).last().click();
  await expect(page.locator(".video-frame")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".header-progress")).toContainText("1");
  await page.getByRole("button", { name: "Toggle site language" }).click();
  await expect(page.locator("html .site-shell")).toHaveAttribute("lang", "pt-BR");
  await expect(page.getByText("Toda história.")).toBeVisible();
});

test("mobile navigation and layout are usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.waitForTimeout(700);
  await page.waitForTimeout(850);
  await page.screenshot({ path: "docs/previews/archive-mobile.png", fullPage: false });
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await page.getByRole("button", { name: /Sacred timeline/i }).click();
  await expect(page.locator(".scene-timeline")).toBeVisible();
  await page.waitForTimeout(850);
  await page.screenshot({ path: "docs/previews/timeline-mobile.png", fullPage: false });
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await page.getByRole("button", { name: /Multiverse explorer/i }).click();
  await expect(page.locator(".scene-multiverse")).toBeVisible();
  await page.waitForTimeout(850);
  await page.screenshot({ path: "docs/previews/multiverse-mobile.png", fullPage: false });
});

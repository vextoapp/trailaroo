import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

const seriousViolations = async (page: Page) =>
  (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );

test("Explore lists real trails, filters by name and opens a trail page", async ({ page }) => {
  await page.goto("/");
  const heading = page.locator("#count");
  await expect(heading).toBeVisible();
  const total = Number((await heading.textContent())?.match(/\d+/)?.[0]);
  expect(total).toBeGreaterThan(20);
  await expect(page.getByText(/OpenStreetMap/).first()).toBeVisible();
  expect(await seriousViolations(page)).toEqual([]);

  const firstLink = page.locator(".trail-card .title a").first();
  const name = (await firstLink.textContent()) ?? "";
  await page.getByRole("searchbox", { name: "Search" }).fill(name.slice(0, 6));
  await expect(heading).not.toHaveText(`${total} trails`);
  await expect(page).toHaveURL(/\?q=/);

  await page.locator(".trail-card .title a").first().click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "View or fix on OpenStreetMap" })).toHaveAttribute("href", /openstreetmap\.org\/relation\/\d+/);
  await expect(page.getByText("Length", { exact: true })).toBeVisible();
  expect(await seriousViolations(page)).toEqual([]);
});

test("The map loads the trail overlay from our own server only", async ({ page, isMobile }) => {
  const external: string[] = [];
  page.on("request", (r) => {
    const url = new URL(r.url());
    if (url.protocol.startsWith("http") && url.hostname !== "localhost") external.push(r.url());
  });
  await page.goto("/");
  const overlay = page.waitForResponse((r) => r.url().endsWith("/trails.geojson"));
  if (isMobile) await page.getByRole("button", { name: "Map" }).click();
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await overlay;
  expect(external).toEqual([]);
});

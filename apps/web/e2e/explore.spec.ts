import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

const seriousViolations = async (page: Page) =>
  (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );

test("Explore lists real trails, filters by name and opens a trail page", async ({ page }) => {
  await page.goto("/explore");
  const heading = page.locator("#count");
  await expect(heading).toBeVisible();
  const total = Number((await heading.textContent())?.match(/\d+/)?.[0]);
  expect(total).toBeGreaterThan(20);
  await expect(page.getByText(/OpenStreetMap/).first()).toBeVisible();
  expect(await seriousViolations(page)).toEqual([]);

  const firstLink = page.locator(".pcard .title-link").first();
  const name = (await firstLink.textContent()) ?? "";
  await page.getByRole("searchbox", { name: "Trails across the ACT and NSW" }).fill(name.slice(0, 6));
  await expect(heading).not.toHaveText(`${total} trails`);
  await expect(page).toHaveURL(/\?q=/);

  await page.locator(".pcard .title-link").first().click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "View or fix on OpenStreetMap" })).toHaveAttribute("href", /openstreetmap\.org\/relation\/\d+/);
  await expect(page.locator(".gh-head .pill-tag")).toHaveText(/\d.*(km|m)$/);
  expect(await seriousViolations(page)).toEqual([]);
});

test("The map loads the trail overlay from our own server only", async ({ page, isMobile }) => {
  const external: string[] = [];
  page.on("request", (r) => {
    const url = new URL(r.url());
    if (url.protocol.startsWith("http") && url.hostname !== "localhost") external.push(r.url());
  });
  await page.goto("/explore");
  const overlay = page.waitForResponse((r) => r.url().endsWith("/trails.geojson"));
  if (isMobile) await page.getByRole("button", { name: "Map" }).click();
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await overlay;
  expect(external).toEqual([]);
});

test("Home explains the app and leads to Explore", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText(/Photo:/).first()).toBeVisible();
  expect(await seriousViolations(page)).toEqual([]);
  await page.getByLabel("Where do you want to walk?").fill("Black");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL(/\/explore\?q=Black/);
  await expect(page.locator(".pcard").first()).toContainText("Black");
});

test("Length chips filter trails; someone browsing Explore isn't shown the intro strip", async ({ page }) => {
  await page.goto("/explore?len=long");
  const heading = page.locator("#count");
  await expect(heading).toHaveText(/^\d+ trails?$/);
  const long = Number((await heading.textContent())?.match(/\d+/)?.[0]);
  await page.getByRole("button", { name: "Any length" }).click();
  await expect(heading).not.toHaveText(`${long} trails`);
  await page.locator(".pcard .title-link").first().click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "See what it does" })).toHaveCount(0);
});

test("Someone opening a shared trail link directly gets the intro strip, and the trail first", async ({ page }) => {
  const geo = await (await page.request.get("/trails.geojson")).json();
  await page.goto(`/trails/${geo.features[0].properties.slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "See what it does" })).toBeVisible();
});

test("Bike trails filter to mountain-bike routes and the list grows with Show more", async ({ page }) => {
  await page.goto("/explore");
  const cards = page.locator(".pcard");
  await expect(cards).toHaveCount(24);
  await page.getByRole("button", { name: /^Show \d+ more$/ }).click();
  await expect(cards).toHaveCount(48);
  await page.getByRole("button", { name: "Bike trails" }).click();
  await expect(page).toHaveURL(/fam=bike/);
  await expect(cards.first()).toContainText("Bike trail");
  await expect(cards).toHaveCount(24); // a new filter starts from the first page again
});

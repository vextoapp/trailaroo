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

test("The map loads only from our own servers (the app and tiles.trailaroo.com)", async ({ page, isMobile }) => {
  const external: string[] = [];
  page.on("request", (r) => {
    const url = new URL(r.url());
    const ours = url.hostname === "localhost" || url.hostname === "tiles.trailaroo.com";
    if (url.protocol.startsWith("http") && !ours) external.push(r.url());
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

test("Climb chips filter trails and are kept in a shareable link", async ({ page }) => {
  await page.goto("/explore");
  const heading = page.locator("#count");
  await expect(heading).toHaveText(/^\d+ trails?$/);
  const all = Number((await heading.textContent())?.match(/\d+/)?.[0]);
  await page.getByRole("button", { name: "Over 300 m" }).click();
  await expect(page).toHaveURL(/climb=high/);
  const steepText = (await heading.textContent()) ?? "";
  const steep = Number(steepText.match(/\d+/)?.[0]);
  expect(steep).toBeGreaterThan(0);
  expect(steep).toBeLessThan(all);
  await page.reload();
  await expect(page.getByRole("button", { name: "Over 300 m" })).toHaveAttribute("aria-pressed", "true");
  await expect(heading).toHaveText(steepText); // "1 trail" or "N trails"
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

test("Difficulty chips filter trails and the sort order is shareable", async ({ page }) => {
  await page.goto("/explore");
  const heading = page.locator("#count");
  const total = Number((await heading.textContent())?.match(/\d+/)?.[0]);
  await page.getByRole("group", { name: "Difficulty" }).getByRole("button", { name: "Easy" }).click();
  await expect(page).toHaveURL(/diff=easy/);
  await expect(heading).not.toHaveText(`${total} trails`);
  await expect(page.locator(".pcard .difficulty").first()).toHaveAttribute("data-level", "easy");

  await page.getByRole("combobox", { name: "Sort" }).selectOption("steepest");
  await expect(page).toHaveURL(/sort=steepest/);
  const climbs = await page.locator(".pcard .facts > span:last-child").evaluateAll((els) =>
    els.slice(0, 5).map((el) => Number(el.textContent?.match(/([\d,]+) m up/)?.[1]?.replace(",", "") ?? -1)),
  );
  expect(climbs).toEqual([...climbs].sort((a, b) => b - a));
  expect(await seriousViolations(page)).toEqual([]);
});

test("The elevation profile scrubs by keyboard and has a text version", async ({ page }) => {
  const geo = await (await page.request.get("/trails.geojson")).json();
  await page.goto(`/trails/${geo.features[0].properties.slug}`);
  const slider = page.getByRole("slider").first();
  await slider.focus();
  const before = await slider.getAttribute("aria-valuetext");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(slider).not.toHaveAttribute("aria-valuetext", before ?? "");
  await expect(page.locator(".elevation table tr")).not.toHaveCount(0);
  expect(await seriousViolations(page)).toEqual([]);
});

test("A trail inside a park names the park, with the CAPAD credit", async ({ page }) => {
  await page.goto("/trails/black-mountain-summit-walk-11325858");
  await expect(page.locator(".gh-head .sub")).toContainText("Black Mountain Nature Reserve");
  await expect(page.getByRole("link", { name: "CAPAD 2024" })).toBeVisible();
  await page.goto("/explore?q=Black%20Mountain%20Summit");
  await expect(page.locator(".pcard .meta").first()).toContainText("Black Mountain Nature Reserve");
});

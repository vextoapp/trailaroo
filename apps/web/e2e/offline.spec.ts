import { expect, test } from "@playwright/test";

test("A visited trail page reopens in flight mode; an unvisited one shows the offline page", async ({ page, context }) => {
  await page.goto("/explore");
  await page.evaluate(() => navigator.serviceWorker.ready);
  // Only test offline once the service worker actually controls the page.
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  const links = page.locator(".pcard .title-link");
  const visited = await links.nth(0).getAttribute("href");
  // Far down the list, so Next.js has not prefetched it while it was on screen.
  const unvisited = await links.last().getAttribute("href");

  await page.goto(visited ?? "/");
  const name = await page.getByRole("heading", { level: 1 }).textContent();

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name ?? "");
  await expect(page.getByText("The map needs a connection.")).toBeVisible();

  // Navigate like a person following a link; Playwright's goto is sometimes cancelled while offline.
  await page.evaluate((href) => location.assign(href), unvisited ?? "/");
  // An offline navigation can report as aborted, so poll for the result rather than wait for the navigation.
  await expect(page).toHaveURL(new RegExp(`${unvisited}$`));
  await expect(page.getByRole("heading", { name: "You're offline" })).toBeVisible();
});

// Chrome can fire "online" while still offline (navigator.onLine stays false), and a reload then cancels
// the link the person just tapped. A page they are reading or recording on must never reload by itself.
test("Coming back online never reloads a page in use", async ({ page }) => {
  await page.goto("/explore");
  await page.evaluate(() => navigator.serviceWorker.ready);
  const navigated = page.waitForEvent("framenavigated", { timeout: 1500 }).then(() => true, () => false);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  expect(await navigated).toBe(false);
});

test("The offline page reloads into the real page once the connection is back", async ({ page, context }) => {
  await page.goto("/explore");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  const unvisited = await page.locator(".pcard .title-link").last().getAttribute("href");
  await context.setOffline(true);
  await page.evaluate((href) => location.assign(href), unvisited ?? "/");
  await expect(page.getByRole("heading", { name: "You're offline" })).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByRole("heading", { level: 1 })).not.toHaveText("You're offline");
});

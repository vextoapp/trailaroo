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
  await page.waitForURL(new RegExp(`${unvisited}$`));
  await expect(page.getByRole("heading", { name: "You're offline" })).toBeVisible();
});

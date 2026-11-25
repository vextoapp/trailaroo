import { expect, test } from "@playwright/test";

test("A visited trail page reopens in flight mode; an unvisited one shows the offline page", async ({ page, context }) => {
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  const links = page.locator(".trail-card .title a");
  const visited = await links.nth(0).getAttribute("href");
  const unvisited = await links.nth(1).getAttribute("href");

  await page.goto(visited ?? "/");
  const name = await page.getByRole("heading", { level: 1 }).textContent();

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name ?? "");
  await expect(page.getByText("The map needs a connection.")).toBeVisible();

  await page.goto(unvisited ?? "/");
  await expect(page.getByRole("heading", { name: "You're offline" })).toBeVisible();
});

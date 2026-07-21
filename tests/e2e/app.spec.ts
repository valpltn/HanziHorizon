import { expect, test } from "@playwright/test";

test("discovery mode exposes the complete interactive journey", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name:"Aujourd’hui" })).toBeVisible();
  await expect(page.getByRole("button", { name:"Révéler" })).toBeVisible();
  await page.screenshot({ path:`test-results/${testInfo.project.name}-dashboard.png`, fullPage:true });
  await page.getByRole("button", { name:"Révéler" }).click();
  await expect(page.locator(".meaning.shown")).toBeVisible();
  if (testInfo.project.name === "mobile") { await page.getByRole("button", { name:"Ouvrir le menu" }).click(); }
  await page.getByRole("button", { name:"Réviser" }).click();
  await page.getByRole("button", { name:/Commencer la session/ }).click();
  await page.getByRole("button", { name:"Bien" }).click();
  await expect(page.getByText("Prochaine révision programmée.")).toBeVisible();
  await page.screenshot({ path:`test-results/${testInfo.project.name}-learning.png`, fullPage:true });
});

test("layout has no horizontal overflow", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});

import { expect, test } from "@playwright/test";

test("discovery mode exposes the complete interactive journey", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name:"Mon jardin de chinois" })).toBeVisible();
  await expect(page.getByText("Les leçons nourrissent ton prochain jalon.")).toBeVisible();
  await expect(page.getByText("L’arbre reste stable entre deux grandes étapes.")).toBeVisible();
  await page.screenshot({ path:`test-results/${testInfo.project.name}-dashboard.png`, fullPage:true });
  await page.getByRole("button", { name:/Continuer ma leçon/ }).click();
  await expect(page.getByRole("button", { name:/Commencer la leçon|Reprendre la leçon/ })).toBeVisible();
  await page.screenshot({ path:`test-results/${testInfo.project.name}-learning.png`, fullPage:true });
});

test("layout has no horizontal overflow", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});

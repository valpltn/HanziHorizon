import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const mobileProjects = new Set(["iphone-15-pro", "iphone-small", "iphone-landscape"]);

async function ready(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("region", { name: "Mon jardin de chinois" })).toBeVisible();
}

async function openSecondary(page: Page, name: string) {
  await page.getByRole("navigation", { name: "Navigation mobile" }).getByRole("button", { name: "Plus" }).click();
  await expect(page.getByRole("dialog", { name: "Plus" })).toBeVisible();
  await page.getByRole("navigation", { name: "Navigation secondaire" }).getByRole("button", { name }).click();
}

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(!mobileProjects.has(testInfo.project.name), "Mobile-only coverage");
  await ready(page);
});

test("mobile garden fits the iPhone 15 Pro viewport and keeps one clear next action", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "iphone-15-pro", "Canonical iPhone viewport");
  const garden = page.getByRole("region", { name: "Mon jardin de chinois" });
  await expect(garden.getByLabel("Progression du jour")).toBeVisible();
  await expect(garden.getByRole("button", { name: /Continuer la leçon 1, découverte du rameau 1/ })).toBeVisible();
  await expect(page.getByText("PRÊT À CONTINUER ?")).toBeHidden();
  await expect(page.getByRole("heading", { name: "Mon jardin de chinois" })).toBeHidden();

  const assertFirstViewport = async (height: number) => {
    const layout = await page.evaluate(() => {
      const rect = (selector: string) => document.querySelector(selector)?.getBoundingClientRect().toJSON();
      return { innerHeight, scrollHeight:document.documentElement.scrollHeight, stats:rect(".mobile-garden-stats"), tree:rect(".tree-scene"), badge:rect(".mobile-lesson-badge"), nav:rect(".mobile-tabbar") };
    });
    expect(layout.scrollHeight, `${height}px viewport must not scroll`).toBeLessThanOrEqual(layout.innerHeight + 1);
    expect(layout.stats?.top).toBeGreaterThanOrEqual(0);
    expect(layout.tree?.bottom).toBeLessThanOrEqual((layout.nav?.top ?? height) + 1);
    expect(layout.badge?.bottom).toBeLessThanOrEqual(layout.tree?.bottom ?? height);
    expect(layout.badge?.width).toBeGreaterThanOrEqual(44);
    expect(layout.badge?.height).toBeGreaterThanOrEqual(44);
  };
  await assertFirstViewport(659);
  await page.screenshot({ path:"test-results/iphone-15-pro-first-viewport.png", fullPage:false });
  await page.setViewportSize({ width:393, height:852 });
  await assertFirstViewport(852);
  await page.setViewportSize({ width:393, height:659 });

  const levelTrigger = garden.getByRole("button", { name:/Niveau HSK 1/ });
  await levelTrigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name:"Choisir un arbre" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name:/HSK 2 Verrouillé/ })).toBeDisabled();
  await expect(dialog.getByRole("button", { name:"Fermer" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(levelTrigger).toBeFocused();

  await garden.getByRole("button", { name:/Continuer la leçon 1, découverte du rameau 1/ }).click();
  await expect(page.getByRole("button", { name:"Commencer la leçon" })).toBeVisible();
});

test("mobile navigation reaches every product surface without overflow", async ({ page }, testInfo) => {
  if (testInfo.project.name === "iphone-15-pro") await page.screenshot({ path: "test-results/iphone-15-pro-first-viewport.png", fullPage: false });
  const primary = [
    ["Réviser", "Révisions intelligentes"],
    ["Leçons", "Leçons"],
    ["Mots", "Bibliothèque"],
    ["Aujourd’hui", "Aujourd’hui"],
  ] as const;
  for (const [button, title] of primary) {
    await page.getByRole("navigation", { name: "Navigation mobile" }).getByRole("button", { name: button }).click();
    if (button === "Aujourd’hui") await expect(page.getByRole("region", { name:"Mon jardin de chinois" })).toBeVisible();
    else await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  }

  const secondary = [
    ["Favoris", "Favoris"], ["Quiz", "Quiz"], ["Mode examen", "Mode examen"],
    ["Écriture", "Écriture"], ["Statistiques", "Statistiques"], ["Paramètres", "Paramètres"],
  ] as const;
  for (const [button, title] of secondary) {
    await openSecondary(page, button);
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow, `${title} must not overflow horizontally`).toBe(false);
  }

  if (testInfo.project.name === "iphone-15-pro") {
    await page.screenshot({ path: "test-results/iphone-15-pro-settings.png", fullPage: false });
    await page.getByRole("navigation", { name: "Navigation mobile" }).getByRole("button", { name: "Plus" }).click();
    await page.screenshot({ path: "test-results/iphone-15-pro-more-menu.png", fullPage: false });
  }
});

test("core learning interactions remain clear and actionable", async ({ page }, testInfo) => {
  await page.getByRole("navigation", { name: "Navigation mobile" }).getByRole("button", { name: "Réviser" }).click();
  await page.getByRole("button", { name: "Commencer la session" }).click();
  await expect(page.getByRole("button", { name: "Bien" })).toBeVisible();
  await page.getByRole("button", { name: "Bien" }).click();
  await expect(page.getByText("Prochaine révision programmée.")).toBeVisible();

  await page.getByRole("navigation", { name: "Navigation mobile" }).getByRole("button", { name: "Leçons" }).click();
  await page.getByRole("button", { name: /1 · Découvrir/ }).first().click();
  await expect(page.getByRole("button", { name: "Commencer la leçon" })).toBeVisible();
  await page.getByRole("button", { name: "Commencer la leçon" }).click();
  await expect(page.getByText(/EXERCICE 1 \/ 10/)).toBeVisible();

  await openSecondary(page, "Quiz");
  await page.locator(".quiz-exercise .answer-options button").first().click();
  await expect(page.locator(".quiz-exercise .result")).toBeVisible();

  await openSecondary(page, "Mode examen");
  await page.getByRole("button", { name: "Lancer l’examen" }).click();
  await page.getByRole("button", { name: "Abandonner l’examen" }).click();
  await expect(page.getByRole("alertdialog", { name: "Abandonner l’examen ?" })).toBeVisible();
  await page.getByRole("button", { name: "Continuer l’examen" }).click();
  await page.getByRole("button", { name: "Abandonner l’examen" }).click();
  await page.getByRole("button", { name: "Abandonner", exact: true }).click();
  await expect(page.getByText(/Examen abandonné/)).toBeVisible();

  if (testInfo.project.name === "iphone-15-pro") await page.screenshot({ path: "test-results/iphone-15-pro-learning.png", fullPage: false });
});

test("library, writing, profile and local auth validation work on touch", async ({ page }, testInfo) => {
  await page.getByRole("navigation", { name: "Navigation mobile" }).getByRole("button", { name: "Mots" }).click();
  await page.getByPlaceholder("Mot, pinyin ou français").fill("personne");
  await expect(page.locator(".word-table article").first()).toBeVisible();
  await page.getByRole("button", { name: "Filtres" }).click();
  await expect(page.getByRole("combobox", { name: "Filtrer par niveau" })).toBeVisible();
  await page.getByRole("button", { name: /Ajouter .* aux favoris/ }).first().click();

  await openSecondary(page, "Écriture");
  const canvas = page.getByRole("button", { name: /Zone de dessin/ }).or(page.locator("canvas"));
  await expect(canvas).toBeVisible();
  const box = await page.locator("canvas").boundingBox();
  expect(box?.width).toBeLessThanOrEqual(testInfo.project.use.viewport?.width ?? 430);
  if (box) {
    await page.mouse.move(box.x + 30, box.y + 30);
    await page.mouse.down();
    await page.mouse.move(box.x + Math.min(150, box.width - 20), box.y + Math.min(150, box.height - 20), { steps: 8 });
    await page.mouse.up();
  }
  await page.getByRole("button", { name: "Valider" }).click();
  await expect(page.getByRole("status")).toBeVisible();

  await page.getByRole("button", { name: "Ouvrir le profil" }).click();
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByRole("dialog", { name: "Retrouver ma progression" })).toBeVisible();
  await page.getByRole("button", { name: "Créer un compte" }).click();
  await page.getByLabel("Adresse e-mail").fill("mobile@example.test");
  await page.getByLabel("Nouveau mot de passe", { exact: true }).fill("secret1");
  await page.getByLabel("Confirmer le mot de passe").fill("secret2");
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page.getByRole("alert")).toContainText("ne correspondent pas");

  if (testInfo.project.name === "iphone-15-pro") await page.screenshot({ path: "test-results/iphone-15-pro-auth-error.png", fullPage: false });
});

test("key screens have no serious automated accessibility violations", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "iphone-15-pro", "Canonical accessibility viewport");
  const destinations: Array<["primary" | "secondary", string]> = [
    ["primary", "Aujourd’hui"], ["primary", "Réviser"], ["primary", "Leçons"], ["primary", "Mots"],
    ["secondary", "Quiz"], ["secondary", "Mode examen"], ["secondary", "Écriture"], ["secondary", "Statistiques"], ["secondary", "Paramètres"],
  ];
  for (const [kind, name] of destinations) {
    if (kind === "primary") await page.getByRole("navigation", { name: "Navigation mobile" }).getByRole("button", { name }).click();
    else await openSecondary(page, name);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "wcag2aaa"]).analyze();
    const serious = results.violations.filter((item) => item.impact === "serious" || item.impact === "critical");
    expect(serious, `${name}: ${serious.map((item) => `${item.id} (${item.nodes.length})`).join(", ")}`).toEqual([]);
  }
  await page.getByRole("navigation", { name:"Navigation mobile" }).getByRole("button", { name:"Aujourd’hui" }).click();
  await page.getByRole("button", { name:/Niveau HSK/ }).click();
  const pickerResults = await new AxeBuilder({ page }).include("#mobile-hsk-picker").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(pickerResults.violations.filter((item) => item.impact === "serious" || item.impact === "critical")).toEqual([]);
});

test("PWA manifest exposes installable iPhone assets", async ({ page }) => {
  const manifest = await page.request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBe(true);
  const data = await manifest.json();
  expect(data.display).toBe("standalone");
  expect(data.icons).toEqual(expect.arrayContaining([expect.objectContaining({ sizes: "192x192" }), expect.objectContaining({ sizes: "512x512", purpose: "maskable" })]));
  for (const path of ["/apple-touch-icon.png", "/icon-192.png", "/icon-512.png", "/sw.js"]) expect((await page.request.get(path)).ok()).toBe(true);
});

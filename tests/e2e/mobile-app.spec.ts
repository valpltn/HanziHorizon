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

async function setGuestAudioSettings(page: Page, listeningExercises: boolean, speakingExercises: boolean) {
  await page.evaluate(({ listeningExercises, speakingExercises }) => {
    const key = "chinese-learning.snapshot.v1";
    const snapshot = JSON.parse(localStorage.getItem(key) ?? "null") ?? { version:1, settings:{ dailyGoal:10, activeLevel:1, showTones:true, adminMode:false, guestImportedAt:null }, progress:{}, reviewEvents:[], quizResults:[] };
    snapshot.settings = { ...snapshot.settings, listeningExercises, speakingExercises };
    localStorage.setItem(key, JSON.stringify(snapshot));
  }, { listeningExercises, speakingExercises });
  await page.reload();
  await expect(page.getByRole("region", { name:"Mon jardin de chinois" })).toBeVisible();
}

async function startFirstLesson(page: Page) {
  await page.getByRole("region", { name:"Mon jardin de chinois" }).getByRole("button", { name:/Continuer la leçon/ }).click();
  await page.getByRole("button", { name:"Commencer la leçon" }).click();
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
  await expect(page.getByText("1 / 10", { exact:true })).toBeVisible();
  await page.getByRole("button", { name:"Quitter la leçon" }).click();
  await page.getByRole("button", { name:"Quitter", exact:true }).click();

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

test("normal mobile lesson is complete in one viewport and never shows skip", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "iphone-15-pro", "Canonical iPhone viewport");
  await startFirstLesson(page);
  await expect(page.getByRole("heading", { name:"Traduis en français" })).toBeVisible();
  await expect(page.getByRole("button", { name:/Écouter la prononciation/ })).toBeVisible();
  await expect(page.getByRole("button", { name:"Passer" })).toHaveCount(0);
  await expect(page.locator(".guided-response .answer-options button")).toHaveCount(4);
  const layout = await page.evaluate(() => ({ innerHeight, scrollHeight:document.documentElement.scrollHeight, card:document.querySelector(".guided-lesson-card")?.getBoundingClientRect().toJSON(), answers:[...document.querySelectorAll(".guided-response button")].map((item) => item.getBoundingClientRect().toJSON()) }));
  expect(layout.scrollHeight).toBeLessThanOrEqual(layout.innerHeight + 1);
  expect(layout.card?.bottom).toBeLessThanOrEqual(layout.innerHeight + 1);
  expect(layout.answers.every((rect) => rect.top >= 0 && rect.bottom <= layout.innerHeight + 1)).toBe(true);
  await page.screenshot({ path:"test-results/iphone-15-pro-lesson-normal.png", fullPage:false });
  await page.setViewportSize({ width:393, height:852 });
  const pwaLayout = await page.evaluate(() => ({ innerHeight, scrollHeight:document.documentElement.scrollHeight, cardBottom:document.querySelector(".guided-lesson-card")?.getBoundingClientRect().bottom }));
  expect(pwaLayout.scrollHeight).toBeLessThanOrEqual(pwaLayout.innerHeight + 1);
  expect(pwaLayout.cardBottom).toBeLessThanOrEqual(pwaLayout.innerHeight + 1);
  await page.setViewportSize({ width:393, height:659 });
});

test("dictation can be skipped without XP, mastery, event or combo mutation", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "iphone-15-pro", "Canonical iPhone viewport");
  await setGuestAudioSettings(page, true, false);
  await startFirstLesson(page);
  await expect(page.getByRole("heading", { name:"Écoute puis choisis" })).toBeVisible();
  await expect(page.locator(".guided-context-primary")).toBeVisible();
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem("chinese-learning.snapshot.v1") ?? "null"));
  await page.screenshot({ path:"test-results/iphone-15-pro-lesson-dictation.png", fullPage:false });
  await page.getByRole("button", { name:"Passer" }).click();
  await expect(page.getByText("2 / 10", { exact:true })).toBeVisible();
  await expect(page.getByText("0 XP", { exact:true })).toBeVisible();
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem("chinese-learning.snapshot.v1") ?? "null"));
  expect(after.progress).toEqual(before.progress);
  expect(after.reviewEvents).toEqual(before.reviewEvents);
  expect(after.quizResults).toEqual(before.quizResults);
});

test("pronunciation requests the microphone on demand and handles success", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "iphone-15-pro", "Canonical iPhone viewport");
  await page.addInitScript(() => {
    class FakeRecognition {
      lang = ""; interimResults = false; maxAlternatives = 1;
      onresult: ((event: { results:Array<{ 0:{ transcript:string } }> }) => void) | null = null;
      onerror: ((event: { error:string }) => void) | null = null;
      onend: (() => void) | null = null;
      start() { setTimeout(() => { const testWindow = globalThis as typeof globalThis & { __speechTranscript?:string }; this.onresult?.({ results:[{ 0:{ transcript:testWindow.__speechTranscript ?? "" } }] }); this.onend?.(); }, 0); }
      abort() {}
    }
    (globalThis as typeof globalThis & { webkitSpeechRecognition?:typeof FakeRecognition }).webkitSpeechRecognition = FakeRecognition;
  });
  await setGuestAudioSettings(page, false, true);
  await startFirstLesson(page);
  await expect(page.getByRole("heading", { name:"Prononce ce mot" })).toBeVisible();
  const hanzi = await page.locator(".guided-focus").innerText();
  await page.evaluate((value) => { (globalThis as typeof globalThis & { __speechTranscript?:string }).__speechTranscript = value; }, hanzi);
  await page.getByRole("button", { name:"Démarrer la reconnaissance vocale" }).click();
  await expect(page.getByText(/Juste !/)).toBeVisible();
  await expect(page.locator(".guided-pinyin.reveal")).toBeVisible();
  await page.screenshot({ path:"test-results/iphone-15-pro-lesson-pronunciation.png", fullPage:false });
});

test("microphone refusal explains the issue and keeps skip available", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "iphone-15-pro", "Canonical iPhone viewport");
  await page.addInitScript(() => {
    class DeniedRecognition {
      lang = ""; interimResults = false; maxAlternatives = 1;
      onresult: ((event: { results:Array<{ 0:{ transcript:string } }> }) => void) | null = null;
      onerror: ((event: { error:string }) => void) | null = null;
      onend: (() => void) | null = null;
      start() { setTimeout(() => this.onerror?.({ error:"not-allowed" }), 0); }
      abort() {}
    }
    (globalThis as typeof globalThis & { webkitSpeechRecognition?:typeof DeniedRecognition }).webkitSpeechRecognition = DeniedRecognition;
  });
  await setGuestAudioSettings(page, false, true);
  await startFirstLesson(page);
  await page.getByRole("button", { name:"Démarrer la reconnaissance vocale" }).click();
  await expect(page.getByText(/Accès au microphone refusé/)).toBeVisible();
  await expect(page.getByRole("button", { name:"Passer" })).toBeVisible();
});

test("an incorrect spoken transcription shows feedback without adding content below", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "iphone-15-pro", "Canonical iPhone viewport");
  await page.addInitScript(() => {
    class IncorrectRecognition {
      lang = ""; interimResults = false; maxAlternatives = 1;
      onresult: ((event: { results:Array<{ 0:{ transcript:string } }> }) => void) | null = null;
      onerror: ((event: { error:string }) => void) | null = null;
      onend: (() => void) | null = null;
      start() { setTimeout(() => { this.onresult?.({ results:[{ 0:{ transcript:"错误" } }] }); this.onend?.(); }, 0); }
      abort() {}
    }
    (globalThis as typeof globalThis & { webkitSpeechRecognition?:typeof IncorrectRecognition }).webkitSpeechRecognition = IncorrectRecognition;
  });
  await setGuestAudioSettings(page, false, true);
  await startFirstLesson(page);
  await page.getByRole("button", { name:"Démarrer la reconnaissance vocale" }).click();
  await expect(page.getByText("À retravailler")).toBeVisible();
  await expect(page.locator(".guided-context-bar")).toHaveCount(0);
  const overflow = await page.evaluate(() => document.documentElement.scrollHeight > innerHeight + 1);
  expect(overflow).toBe(false);
});

test("audio preferences persist locally and unavailable speech synthesis is explained", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "iphone-15-pro", "Canonical iPhone viewport");
  await openSecondary(page, "Paramètres");
  await page.getByLabel("Questions d’écoute").check();
  await page.getByLabel("Questions avec microphone").check();
  await page.reload();
  await expect(page.getByRole("region", { name:"Mon jardin de chinois" })).toBeVisible();
  await openSecondary(page, "Paramètres");
  await expect(page.getByLabel("Questions d’écoute")).toBeChecked();
  await expect(page.getByLabel("Questions avec microphone")).toBeChecked();
  await page.addInitScript(() => {
    Object.defineProperty(globalThis, "speechSynthesis", { configurable:true, value:undefined });
    Object.defineProperty(globalThis, "SpeechSynthesisUtterance", { configurable:true, value:undefined });
  });
  await setGuestAudioSettings(page, false, false);
  await startFirstLesson(page);
  await page.getByRole("button", { name:/Écouter la prononciation/ }).click();
  await expect(page.getByText("La lecture audio n’est pas disponible sur ce navigateur.")).toBeVisible();
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

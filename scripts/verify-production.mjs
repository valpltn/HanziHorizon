import { chromium } from "playwright";

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 393, height: 852 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();

await page.goto("http://127.0.0.1:4174", { waitUntil: "networkidle" });
await page.waitForFunction(async () => (await navigator.serviceWorker.getRegistrations()).length > 0, undefined, { timeout: 30_000 });
const registration = await page.evaluate(async () => {
  const [registered] = await navigator.serviceWorker.getRegistrations();
  await navigator.serviceWorker.ready;
  return {
    scope: registered.scope,
    active: registered.active?.state ?? null,
    installing: registered.installing?.state ?? null,
    waiting: registered.waiting?.state ?? null,
  };
});
await page.reload({ waitUntil: "networkidle" });

const result = await page.evaluate(() => ({
  controlled: Boolean(navigator.serviceWorker.controller),
  manifest: document.querySelector('link[rel="manifest"]')?.getAttribute("href") ?? null,
  appleIcon: document.querySelector('link[rel="apple-touch-icon"]')?.getAttribute("href") ?? null,
  topLeftElements: document.elementsFromPoint(8, 8).map((element) => ({
    tag: element.tagName,
    className: typeof element.className === "string" ? element.className : "",
  })),
  atmosphereImages: [...document.querySelectorAll(".app-ink-atmosphere img")].map((image) => {
    const rect = image.getBoundingClientRect();
    return { className: image.className, x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  }),
  viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
  overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
}));
await page.screenshot({ path: "test-results/iphone-15-pro-production.png", fullPage: false });

const assets = {};
for (const path of ["/manifest.webmanifest", "/sw.js", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png"]) {
  const response = await page.request.get(`http://127.0.0.1:4174${path}`);
  assets[path] = { status: response.status(), contentType: response.headers()["content-type"] };
}

console.log(JSON.stringify({ registration, result, assets }, null, 2));
await browser.close();

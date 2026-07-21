import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./test-results",
  workers: 2,
  use: { baseURL: "http://localhost:4173", trace: "retain-on-failure", screenshot: "only-on-failure" },
  webServer: { command: "npm run dev -- --port 4173", url: "http://localhost:4173", reuseExistingServer: true, timeout: 120000 },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width:1440, height:1000 } } },
    { name: "tablet", use: { ...devices["Desktop Chrome"], viewport: { width:1024, height:768 } } },
    { name: "iphone-15-pro", use: { ...devices["iPhone 15 Pro"] } },
    { name: "iphone-small", use: { ...devices["iPhone SE"] } },
    { name: "iphone-landscape", use: { ...devices["iPhone 15 Pro landscape"] } },
  ],
});

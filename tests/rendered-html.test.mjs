import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the production source contains the Chinese learning application", async () => {
  const [layout, page, app, bundle] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/LearningApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../dist/server/index.js", import.meta.url), "utf8"),
  ]);
  assert.match(layout, /title: "Apprendre le chinois"/);
  assert.match(page, /<LearningApp/); assert.match(app, /Chargement de ta progression/);
  assert.ok(bundle.length > 1000);
  assert.doesNotMatch(`${layout}${page}${app}`, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("all planned product surfaces and explicit button effects are present", async () => {
  const [app, auth, plan, pkg] = await Promise.all([
    readFile(new URL("../app/components/LearningApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/AuthDialog.tsx", import.meta.url), "utf8"),
    readFile(new URL("../docs/plan-de-test.md", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);
  for (const surface of ["Aujourd’hui", "Révisions intelligentes", "Leçons", "Bibliothèque", "Favoris", "Quiz", "Mode examen", "Écriture", "Statistiques", "Paramètres"]) assert.match(app, new RegExp(surface));
  for (const flow of ["signInWithPassword", "signUp", "resetPasswordForEmail", "updateUser"]) assert.match(auth, new RegExp(flow));
  assert.match(app, /word_progress/); assert.match(app, /review_events/); assert.match(app, /quiz_attempts/); assert.match(app, /user_settings/);
  assert.match(plan, /Isolation stricte/); assert.match(plan, /1440×1000/); assert.match(plan, /aucune commande active ne doit être inerte/i);
  assert.match(pkg, /cross-env WRANGLER_LOG_PATH/); assert.match(pkg, /playwright test/);
});

test("Supabase is the only remote user data source", async () => {
  const [pkgSource, hostingSource] = await Promise.all([
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
  ]);
  const hosting = JSON.parse(hostingSource);

  assert.equal(hosting.d1, null);
  assert.doesNotMatch(pkgSource, /drizzle/i);
  await assert.rejects(readFile(new URL("../db/schema.ts", import.meta.url), "utf8"));
  await assert.rejects(readFile(new URL("../app/api/catalog/route.ts", import.meta.url), "utf8"));
});

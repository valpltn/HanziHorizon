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
  assert.match(layout, /applicationName: "Hanzi Horizon"/);
  assert.match(layout, /siteName: "Hanzi Horizon"/);
  assert.match(app, /Hanzi<br \/>Horizon/);
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
  const [pkgSource, hostingSource, supabaseConfig] = await Promise.all([
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/supabase-config.ts", import.meta.url), "utf8"),
  ]);
  const hosting = JSON.parse(hostingSource);

  assert.equal(hosting.d1, null);
  assert.doesNotMatch(pkgSource, /drizzle/i);
  assert.match(supabaseConfig, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  assert.doesNotMatch(supabaseConfig, /service_role|service-role/i);
  await assert.rejects(readFile(new URL("../db/schema.ts", import.meta.url), "utf8"));
  await assert.rejects(readFile(new URL("../app/api/catalog/route.ts", import.meta.url), "utf8"));
});

test("the complete HSK 3.0 catalog is available with French definitions", async () => {
  const imported = JSON.parse(await readFile(new URL("../app/data/hsk-vocabulary.json", import.meta.url), "utf8"));
  assert.equal(imported.length, 11092);
  assert.equal(new Set(imported.map((word) => word.id)).size, 11092);
  assert.equal(imported.filter((word) => word.translationAvailable).length, 10721);
  assert.deepEqual(
    Object.fromEntries(Object.entries(Object.groupBy(imported, (word) => word.level)).map(([level, words]) => [level, words.length])),
    { "1": 500, "2": 772, "3": 973, "4": 1000, "5": 1071, "6": 1140, "7": 5636 },
  );
});

test("the guided HSK path contains multiple phased lessons for every theme", async () => {
  const [pathSource, vocabularySource, catalogSource] = await Promise.all([
    readFile(new URL("../app/data/lesson-path.json", import.meta.url), "utf8"),
    readFile(new URL("../app/data/hsk-vocabulary.json", import.meta.url), "utf8"),
    readFile(new URL("../app/data/catalog.ts", import.meta.url), "utf8"),
  ]);
  const path = JSON.parse(pathSource);
  const imported = JSON.parse(vocabularySource);
  const curatedIds = [...catalogSource.matchAll(/id:"([^"]+)",hanzi:/g)].map((match) => match[1]);
  const validWordIds = new Set([...imported.map((word) => word.id), ...curatedIds]);
  assert.equal(path.length, 336);
  for (const level of [1, 2, 3, 4, 5, 6, 7]) {
    const levelLessons = path.filter((lesson) => lesson.level === level);
    assert.equal(levelLessons.length, 48);
    assert.equal(new Set(levelLessons.map((lesson) => lesson.unitId)).size, 16);
  }
  for (const unitId of new Set(path.map((lesson) => lesson.unitId))) {
    const phases = path.filter((lesson) => lesson.unitId === unitId).map((lesson) => lesson.kind);
    assert.deepEqual(phases, ["discover", "practice", "checkpoint"]);
  }
  assert.ok(path.every((lesson) => lesson.words.length >= 5 && lesson.words.length <= 12));
  assert.ok(path.every((lesson) => lesson.words.every((id) => validWordIds.has(id))));
  const app = await readFile(new URL("../app/components/LearningApp.tsx", import.meta.url), "utf8");
  for (const mode of ["word-zh-fr", "word-fr-zh", "sentence-zh-fr", "sentence-fr-zh", "cloze"]) assert.match(app, new RegExp(mode));
  assert.match(app, /Lanterne de maîtrise/);
});

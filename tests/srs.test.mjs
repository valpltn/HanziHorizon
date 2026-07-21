import test from "node:test";
import assert from "node:assert/strict";

const future = (days) => { const d = new Date("2026-01-01T00:00:00.000Z"); d.setDate(d.getDate()+days); return d.toISOString(); };
test("review scheduler uses predictable intervals", async () => {
  const { scheduleReview } = await import("../app/lib/srs.ts");
  assert.equal(scheduleReview(undefined, "again", new Date("2026-01-01T00:00:00.000Z")).dueAt, future(0));
  assert.equal(scheduleReview(undefined, "good", new Date("2026-01-01T00:00:00.000Z")).intervalDays, 3);
  assert.equal(scheduleReview({ intervalDays: 3, repetitions: 1, dueAt: future(3) }, "easy", new Date("2026-01-01T00:00:00.000Z")).intervalDays, 9);
});

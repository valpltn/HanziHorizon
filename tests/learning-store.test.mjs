import test from "node:test";
import assert from "node:assert/strict";
import { answerMatches, calculateStats, mergeGuestProgress, normalizePinyin, scheduleReview } from "../app/lib/learning-store.ts";

const now = new Date("2026-01-08T00:00:00.000Z");
const base = { wordId:"l1-1", favorite:false, mastery:1, repetitions:1, intervalDays:3, dueAt:"2026-01-08T00:00:00.000Z", lastRating:"good", lastSeenAt:"2026-01-01T00:00:00.000Z" };

test("review scheduler covers all four mastery levels", () => {
  assert.equal(scheduleReview(base, "again", now).intervalDays, 0);
  assert.equal(scheduleReview(base, "hard", now).intervalDays, 4);
  assert.equal(scheduleReview(base, "good", now).intervalDays, 7);
  assert.equal(scheduleReview(base, "easy", now).intervalDays, 11);
});

test("pinyin normalization accepts tone marks, numbers and no tones", () => {
  assert.equal(normalizePinyin("nǐ hǎo"), "ni3hao3");
  assert.equal(normalizePinyin("ni3 hao3"), "ni3hao3");
  assert.equal(answerMatches("ni hao", "nǐ hǎo", "pinyin"), true);
});

test("guest/cloud merge is idempotent and keeps the nearest due date", () => {
  const cloud = { ...base, favorite:false, mastery:2, intervalDays:7, dueAt:"2026-02-10T00:00:00.000Z" };
  const guest = { ...base, favorite:true, mastery:3, intervalDays:5, dueAt:"2026-01-20T00:00:00.000Z", lastSeenAt:"2026-01-09T00:00:00.000Z" };
  const once = mergeGuestProgress(cloud, guest);
  assert.equal(once.favorite, true); assert.equal(once.mastery, 3); assert.equal(once.intervalDays, 7); assert.equal(once.dueAt, guest.dueAt);
  assert.deepEqual(mergeGuestProgress(once, guest), once);
});

test("statistics start at zero and aggregate real events", () => {
  const empty = calculateStats({}, [], [], { 1: 30 }, now);
  assert.equal(empty.masteredWords, 0); assert.equal(empty.precision, 0); assert.equal(empty.studySeconds, 0);
  const event = { id:"00000000-0000-4000-8000-000000000001", wordId:"l1-1", rating:"good", correct:true, quizType:"flashcard", durationMs:4000, createdAt:"2026-01-08T00:00:00.000Z" };
  const result = calculateStats({ "l1-1":{ ...base, mastery:3 } }, [event], [], { 1:30 }, now);
  assert.equal(result.masteredWords, 1); assert.equal(result.precision, 100); assert.equal(result.studySeconds, 4); assert.equal(result.weeklyActivity[6], 1);
});

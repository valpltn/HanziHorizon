import test from "node:test";
import assert from "node:assert/strict";
import { answerMatches, calculateStats, emptySettings, mergeGuestProgress, normalizePinyin, scheduleReview } from "../app/lib/learning-store.ts";
import { buildGardenTreeStates, findNextGardenLesson } from "../app/lib/garden.ts";
import { buildGuidedSequence, normalizeSpeechTranscript, speechMatches } from "../app/lib/guided-lesson.ts";

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

test("audio lesson settings default to opt-in", () => {
  assert.equal(emptySettings.listeningExercises, false);
  assert.equal(emptySettings.speakingExercises, false);
});

test("guided lesson sequence is stable for all audio setting combinations", () => {
  const none = buildGuidedSequence({ listening:false, microphone:false, speechRecognition:true });
  const listening = buildGuidedSequence({ listening:true, microphone:false, speechRecognition:true });
  const microphone = buildGuidedSequence({ listening:false, microphone:true, speechRecognition:true });
  const both = buildGuidedSequence({ listening:true, microphone:true, speechRecognition:true });
  assert.equal(none.length, 10); assert.equal(none[0], "word-zh-fr");
  assert.equal(listening[0], "dictation"); assert.equal(listening.includes("pronunciation"), false);
  assert.equal(microphone[0], "pronunciation"); assert.equal(microphone.includes("dictation"), false);
  assert.deepEqual(both.slice(0, 2), ["dictation", "pronunciation"]);
  assert.equal(buildGuidedSequence({ listening:false, microphone:true, speechRecognition:false }).includes("pronunciation"), false);
});

test("Chinese speech comparison ignores spaces and punctuation while keeping characters exact", () => {
  assert.equal(normalizeSpeechTranscript(" 你，好！ "), "你好");
  assert.equal(speechMatches("你，好！", "你好|您好"), true);
  assert.equal(speechMatches("你", "你好|您好"), false);
});

test("garden branches follow lessons and HSK trees unlock sequentially", () => {
  const lessons = Array.from({ length: 7 }, (_, levelIndex) => Array.from({ length: 16 }, (_, unitIndex) => ["discover", "practice", "checkpoint"].map((kind, lessonOrder) => ({
    id: `hsk-${levelIndex + 1}-u${unitIndex + 1}-l${lessonOrder + 1}`, level: levelIndex + 1, unitId: `hsk-${levelIndex + 1}-u${unitIndex + 1}`,
    unitTitle: "Test", unitDescription: "Test", unitOrder: unitIndex + 1, lessonOrder: lessonOrder + 1, kind, title: "Test", theme: "Test", goal: "Test", durationMinutes: 1, xp: 1,
    words: [`l${levelIndex + 1}-${unitIndex}-${lessonOrder}`],
  })))).flat(2);
  const progress = Object.fromEntries(lessons.filter((lesson) => lesson.level === 1).map((lesson) => [lesson.words[0], { ...base, wordId: lesson.words[0], mastery: lesson.kind === "discover" ? 1 : lesson.kind === "practice" ? 2 : 3 }]));
  const before = buildGardenTreeStates(lessons, {});
  assert.deepEqual(before[0].branches.slice(0, 2), ["branch", "locked"]);
  assert.equal(before[1].unlocked, false);
  const after = buildGardenTreeStates(lessons, progress);
  assert.equal(after[0].complete, true);
  assert.equal(after[0].branches[0], "bloom");
  assert.equal(after[1].unlocked, true);
  assert.equal(after[2].unlocked, false);
});

test("mobile garden badge follows discovery, practice, challenge and the next branch", () => {
  const makeLesson = (unitOrder, lessonOrder, kind) => ({
    id: `hsk-1-u${unitOrder}-l${lessonOrder}`, level:1, unitId:`hsk-1-u${unitOrder}`,
    unitTitle:"Test", unitDescription:"Test", unitOrder, lessonOrder, kind,
    title:"Test", theme:"Test", goal:"Test", durationMinutes:1, xp:1,
    words:[`u${unitOrder}-l${lessonOrder}`],
  });
  const lessons = [
    makeLesson(1, 1, "discover"), makeLesson(1, 2, "practice"), makeLesson(1, 3, "checkpoint"),
    makeLesson(2, 1, "discover"), makeLesson(2, 2, "practice"), makeLesson(2, 3, "checkpoint"),
  ];
  const progress = {};
  assert.equal(findNextGardenLesson(lessons, progress, 1).id, "hsk-1-u1-l1");
  progress["u1-l1"] = { ...base, wordId:"u1-l1", mastery:1 };
  assert.equal(findNextGardenLesson(lessons, progress, 1).id, "hsk-1-u1-l2");
  progress["u1-l2"] = { ...base, wordId:"u1-l2", mastery:2 };
  assert.equal(findNextGardenLesson(lessons, progress, 1).id, "hsk-1-u1-l3");
  progress["u1-l3"] = { ...base, wordId:"u1-l3", mastery:3 };
  assert.equal(findNextGardenLesson(lessons, progress, 1).id, "hsk-1-u2-l1");
  progress["u2-l1"] = { ...base, wordId:"u2-l1", mastery:1 };
  progress["u2-l2"] = { ...base, wordId:"u2-l2", mastery:2 };
  progress["u2-l3"] = { ...base, wordId:"u2-l3", mastery:3 };
  assert.equal(findNextGardenLesson(lessons, progress, 1), null);
});

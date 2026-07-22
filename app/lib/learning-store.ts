import type { LearningSettings, LearningSnapshot, LearningStats, QuizResult, ReviewEvent, ReviewRating, ReviewState } from "../types/learning";

export const GUEST_STORAGE_KEY = "chinese-learning.snapshot.v1";
export const emptySettings: LearningSettings = { dailyGoal: 10, activeLevel: 1, showTones: true, listeningExercises: false, speakingExercises: false, adminMode: false, guestImportedAt: null };
export const emptySnapshot = (): LearningSnapshot => ({ version: 1, settings: { ...emptySettings }, progress: {}, reviewEvents: [], quizResults: [] });

export function loadGuestSnapshot(): LearningSnapshot {
  if (typeof window === "undefined") return emptySnapshot();
  try {
    const parsed = JSON.parse(localStorage.getItem(GUEST_STORAGE_KEY) ?? "null") as Partial<LearningSnapshot> | null;
    if (!parsed || parsed.version !== 1) return emptySnapshot();
    return { version: 1, settings: { ...emptySettings, ...parsed.settings, guestImportedAt: null }, progress: parsed.progress ?? {}, reviewEvents: parsed.reviewEvents ?? [], quizResults: parsed.quizResults ?? [] };
  } catch { return emptySnapshot(); }
}
export function saveGuestSnapshot(snapshot: LearningSnapshot) { if (typeof window !== "undefined") localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(snapshot)); }
export function clearGuestSnapshot() { if (typeof window !== "undefined") localStorage.removeItem(GUEST_STORAGE_KEY); }

export function scheduleReview(current: ReviewState | undefined, rating: ReviewRating, now = new Date()): ReviewState {
  const base = current?.intervalDays ?? 0;
  const intervalDays = rating === "again" ? 0 : rating === "hard" ? Math.max(1, Math.round(base * 1.2) || 1) : rating === "good" ? Math.max(3, Math.round(base * 2.2) || 3) : Math.max(7, Math.round(base * 3.5) || 7);
  const dueAt = new Date(now); dueAt.setDate(dueAt.getDate() + intervalDays);
  return { wordId: current?.wordId ?? "", favorite: current?.favorite ?? false, mastery: rating === "again" ? Math.max(0, (current?.mastery ?? 0) - 1) : Math.min(5, (current?.mastery ?? 0) + (rating === "easy" ? 2 : 1)), repetitions: rating === "again" ? 0 : (current?.repetitions ?? 0) + 1, intervalDays, dueAt: dueAt.toISOString(), lastRating: rating, lastSeenAt: now.toISOString() };
}

const accented: Record<string, [string, number]> = {
  ā:["a",1], á:["a",2], ǎ:["a",3], à:["a",4], ē:["e",1], é:["e",2], ě:["e",3], è:["e",4],
  ī:["i",1], í:["i",2], ǐ:["i",3], ì:["i",4], ō:["o",1], ó:["o",2], ǒ:["o",3], ò:["o",4],
  ū:["u",1], ú:["u",2], ǔ:["u",3], ù:["u",4], ǖ:["v",1], ǘ:["v",2], ǚ:["v",3], ǜ:["v",4], ü:["v",0],
};

export function normalizePinyin(value: string) {
  return value.toLowerCase().replace(/u:/g, "v").split(/[\s'’·.-]+/).filter(Boolean).map((syllable) => {
    let tone = ""; let plain = "";
    for (const character of syllable) {
      const converted = accented[character];
      if (converted) { plain += converted[0]; if (converted[1]) tone = String(converted[1]); }
      else if (/[1-5]/.test(character)) tone = character;
      else plain += character.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }
    return plain + tone;
  }).join("");
}

export function answerMatches(value: string, answer: string, type: string) {
  if (type === "pinyin") {
    const normalizedValue = normalizePinyin(value); const normalizedAnswer = normalizePinyin(answer);
    return normalizedValue === normalizedAnswer || normalizedValue.replace(/[1-5]/g, "") === normalizedAnswer.replace(/[1-5]/g, "");
  }
  return value.trim().toLocaleLowerCase("fr") === answer.trim().toLocaleLowerCase("fr");
}

export function calculateStats(progress: Record<string, ReviewState>, events: ReviewEvent[], quizzes: QuizResult[], totalByLevel: Record<number, number>, now = new Date()): LearningStats {
  const states = Object.values(progress);
  const masteredWords = states.filter((state) => state.mastery >= 3).length;
  const dueWords = states.filter((state) => state.dueAt && new Date(state.dueAt) <= now).length;
  const correct = events.filter((event) => event.correct).length;
  const precision = events.length ? Math.round((correct / events.length) * 100) : 0;
  const weeklyActivity = Array(7).fill(0) as number[];
  const activityDates = new Set<string>(); const accuracyByType: LearningStats["accuracyByType"] = {}; const errors = new Map<string, number>();
  for (const event of events) {
    const date = new Date(event.createdAt); const age = Math.floor((now.getTime() - date.getTime()) / 86400000);
    if (age >= 0 && age < 7) weeklyActivity[6 - age] += 1;
    activityDates.add(date.toISOString().slice(0, 10));
    const bucket = accuracyByType[event.quizType] ?? { correct: 0, total: 0 }; bucket.total += 1;
    if (event.correct) bucket.correct += 1; else errors.set(event.wordId, (errors.get(event.wordId) ?? 0) + 1);
    accuracyByType[event.quizType] = bucket;
  }
  let streakDays = 0;
  for (let offset = 0; offset < 365; offset += 1) { const day = new Date(now); day.setDate(day.getDate() - offset); if (!activityDates.has(day.toISOString().slice(0, 10))) break; streakDays += 1; }
  const levelProgress: Record<number, number> = {};
  for (let level = 1; level <= 9; level += 1) { const learned = states.filter((state) => state.wordId.startsWith(`l${level}-`) && state.mastery >= 1).length; levelProgress[level] = totalByLevel[level] ? Math.min(100, Math.round((learned / totalByLevel[level]) * 100)) : 0; }
  return { masteredWords, dueWords, precision, studySeconds: quizzes.reduce((sum, quiz) => sum + quiz.durationSeconds, 0) + Math.round(events.reduce((sum, event) => sum + event.durationMs, 0) / 1000), streakDays, weeklyActivity, accuracyByType, levelProgress, frequentErrors: [...errors.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([wordId]) => wordId) };
}

export function mergeGuestProgress(cloud: ReviewState | undefined, guest: ReviewState): ReviewState {
  if (!cloud) return guest;
  const dates = [cloud.dueAt, guest.dueAt].filter(Boolean) as string[];
  const guestIsLatest = (guest.lastSeenAt ?? "") > (cloud.lastSeenAt ?? "");
  return { ...cloud, favorite: cloud.favorite || guest.favorite, mastery: Math.max(cloud.mastery, guest.mastery), repetitions: Math.max(cloud.repetitions, guest.repetitions), intervalDays: Math.max(cloud.intervalDays, guest.intervalDays), dueAt: dates.length ? dates.sort()[0] : null, lastSeenAt: [cloud.lastSeenAt, guest.lastSeenAt].filter(Boolean).sort().at(-1) ?? null, lastRating: guestIsLatest ? guest.lastRating : cloud.lastRating };
}

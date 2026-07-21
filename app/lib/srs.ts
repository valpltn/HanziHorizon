export type ReviewRating = "again" | "hard" | "good" | "easy";
export type ReviewState = { intervalDays: number; repetitions: number; dueAt: string };
const intervals: Record<ReviewRating, number> = { again: 0, hard: 1, good: 3, easy: 7 };
export function scheduleReview(current: ReviewState | undefined, rating: ReviewRating, now = new Date()): ReviewState {
  const base = current?.intervalDays ?? 0;
  const days = rating === "again" ? 0 : rating === "hard" ? Math.max(1, base || 1) : rating === "good" ? Math.max(3, base * 2 || intervals.good) : Math.max(7, base * 3 || intervals.easy);
  const due = new Date(now); due.setDate(due.getDate() + days);
  return { intervalDays: days, repetitions: rating === "again" ? 0 : (current?.repetitions ?? 0) + 1, dueAt: due.toISOString() };
}

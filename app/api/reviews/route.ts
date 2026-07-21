import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { reviewEvents, userProgress } from "../../../db/schema";

const intervals: Record<string, number> = { again: 0, hard: 1, good: 3, easy: 7 };
export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Connexion requise pour synchroniser la progression." }, { status: 401 });
  const body = await request.json() as { wordId?: string; rating?: string; correct?: boolean; quizType?: string };
  if (!body.wordId || !body.rating || !(body.rating in intervals)) return Response.json({ error: "Révision invalide." }, { status: 400 });
  const days = intervals[body.rating]; const due = new Date(); due.setDate(due.getDate() + days);
  const db = getDb();
  await db.batch([
    db.insert(reviewEvents).values({ userId: user.email, wordId: body.wordId, rating: body.rating, correct: body.correct ?? true, quizType: body.quizType ?? "flashcard" }),
    db.insert(userProgress).values({ userId: user.email, wordId: body.wordId, intervalDays: days, repetitions: body.rating === "again" ? 0 : 1, dueAt: due.toISOString(), lastRating: body.rating }).onConflictDoUpdate({ target: [userProgress.userId, userProgress.wordId], set: { intervalDays: days, dueAt: due.toISOString(), lastRating: body.rating } }),
  ]);
  return Response.json({ dueAt: due.toISOString(), intervalDays: days });
}

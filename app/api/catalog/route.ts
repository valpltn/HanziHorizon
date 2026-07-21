import { asc } from "drizzle-orm";
import { getDb } from "../../../db";
import { vocabularyWords } from "../../../db/schema";

export async function GET() {
  try {
    const words = await getDb().select().from(vocabularyWords).orderBy(asc(vocabularyWords.level), asc(vocabularyWords.hanzi)).limit(100);
    return Response.json({ words });
  } catch {
    return Response.json({ error: "Le catalogue synchronisé sera disponible après l’initialisation de la base." }, { status: 503 });
  }
}

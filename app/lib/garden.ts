import type { Lesson, ReviewState } from "../types/learning";

export type GardenBranchState = "locked" | "branch" | "leaf" | "bloom";

export type GardenTreeState = {
  level: number;
  unlocked: boolean;
  complete: boolean;
  branches: GardenBranchState[];
  completedUnits: number;
};

const targetMastery: Record<Lesson["kind"], number> = { discover: 1, practice: 2, checkpoint: 3 };

export function lessonMasteryPercent(lesson: Lesson, progress: Record<string, ReviewState>) {
  if (!lesson.words.length) return 0;
  const target = targetMastery[lesson.kind];
  const mastered = lesson.words.filter((wordId) => (progress[wordId]?.mastery ?? 0) >= target).length;
  return Math.round((mastered / lesson.words.length) * 100);
}

export function findNextGardenLesson(lessons: Lesson[], progress: Record<string, ReviewState>, level: number) {
  return lessons
    .filter((lesson) => lesson.level === level)
    .toSorted((a, b) => a.unitOrder - b.unitOrder || a.lessonOrder - b.lessonOrder)
    .find((lesson) => lessonMasteryPercent(lesson, progress) < 80) ?? null;
}

export function buildGardenTreeStates(lessons: Lesson[], progress: Record<string, ReviewState>): GardenTreeState[] {
  const complete = (lesson: Lesson) => lessonMasteryPercent(lesson, progress) >= 80;
  let priorLevelComplete = true;

  return Array.from({ length: 7 }, (_, index) => {
    const level = index + 1;
    const units = [...new Map(
      lessons.filter((lesson) => lesson.level === level).map((lesson) => [lesson.unitId, [] as Lesson[]]),
    )].map(([unitId]) => lessons.filter((lesson) => lesson.unitId === unitId).sort((a, b) => a.lessonOrder - b.lessonOrder));
    const unlocked = level === 1 || priorLevelComplete;
    const branches = units.map((unit, unitIndex) => {
      const [, practice, checkpoint] = unit;
      const discoverUnlocked = unlocked && (unitIndex === 0 || complete(units[unitIndex - 1][2]));
      if (!discoverUnlocked) return "locked" as const;
      if (complete(checkpoint)) return "bloom" as const;
      if (complete(practice)) return "leaf" as const;
      return "branch" as const;
    });
    const completedUnits = units.filter((unit) => complete(unit[2])).length;
    const levelComplete = units.length === 16 && completedUnits === units.length;
    priorLevelComplete = levelComplete;
    return { level, unlocked, complete: levelComplete, branches, completedUnits };
  });
}

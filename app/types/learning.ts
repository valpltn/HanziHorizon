export type ReviewRating = "again" | "hard" | "good" | "easy";
export type QuizType = "multiple-choice" | "reverse-choice" | "pinyin" | "matching" | "cloze" | "dictation" | "character";

export type VocabularyWord = {
  id: string;
  hanzi: string;
  pinyin: string;
  french: string;
  level: number;
  theme: string;
  example: string;
  exampleFr: string;
  translationAvailable?: boolean;
};

export type Lesson = {
  id: string;
  level: number;
  unitId: string;
  unitTitle: string;
  unitDescription: string;
  unitOrder: number;
  lessonOrder: number;
  kind: "discover" | "practice" | "checkpoint";
  title: string;
  theme: string;
  goal: string;
  durationMinutes: number;
  xp: number;
  words: string[];
};

export type ReviewState = {
  wordId: string;
  favorite: boolean;
  mastery: number;
  repetitions: number;
  intervalDays: number;
  dueAt: string | null;
  lastRating: ReviewRating | null;
  lastSeenAt: string | null;
};

export type ReviewEvent = {
  id: string;
  wordId: string;
  rating: ReviewRating;
  correct: boolean;
  quizType: QuizType | "flashcard" | "exam";
  durationMs: number;
  createdAt: string;
};

export type QuizQuestion = {
  id: string;
  type: QuizType;
  wordId: string;
  prompt: string;
  choices?: string[];
  answer: string;
};

export type QuizResult = {
  id: string;
  mode: "practice" | "exam";
  quizType: QuizType | "mixed" | "exam";
  level: number;
  score: number;
  total: number;
  durationSeconds: number;
  completedAt: string;
};

export type LearningSettings = {
  dailyGoal: number;
  activeLevel: number;
  showTones: boolean;
  adminMode: boolean;
  guestImportedAt: string | null;
};

export type LearningStats = {
  masteredWords: number;
  dueWords: number;
  precision: number;
  studySeconds: number;
  streakDays: number;
  weeklyActivity: number[];
  accuracyByType: Record<string, { correct: number; total: number }>;
  levelProgress: Record<number, number>;
  frequentErrors: string[];
};

export type LearningSnapshot = {
  version: 1;
  settings: LearningSettings;
  progress: Record<string, ReviewState>;
  reviewEvents: ReviewEvent[];
  quizResults: QuizResult[];
};

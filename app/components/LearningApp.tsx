"use client";

/* The bamboo asset is already resized and compressed; a plain img avoids the
   Vinext development image proxy while retaining explicit dimensions. */
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  BarChart3, BookOpen, BrainCircuit, CalendarDays, Check, ChevronLeft, ChevronRight,
  Clock3, Cloud, CloudOff, Flame, GraduationCap, Heart, Library, LoaderCircle,
  LockKeyhole, LogIn, LogOut, MoreHorizontal, PenLine, Play, RotateCcw, Search, Settings,
  SlidersHorizontal, Leaf, Sparkles, Sprout, UserRound, Volume2, X,
} from "lucide-react";
import { lessons, source, vocabularyPlaceholder } from "../data/lesson-catalog";
import {
  answerMatches, calculateStats, clearGuestSnapshot, emptySettings,
  loadGuestSnapshot, mergeGuestProgress, saveGuestSnapshot, scheduleReview,
} from "../lib/learning-store";
import { buildGardenTreeStates, findNextGardenLesson } from "../lib/garden";
import type { GardenTreeState } from "../lib/garden";
import { getSupabaseBrowserClient } from "../lib/supabase-client";
import type {
  LearningSnapshot, Lesson, QuizResult, QuizType, ReviewEvent, ReviewRating, ReviewState,
  VocabularyWord,
} from "../types/learning";
import { AuthDialog } from "./AuthDialog";
import { WritingBoard } from "./WritingBoard";

type Section = "today" | "review" | "lessons" | "library" | "favorites" | "quiz" | "exam" | "writing" | "stats" | "settings";
type SyncState = "local" | "syncing" | "synced" | "offline";

const nav = [
  ["today", "Aujourd’hui", CalendarDays], ["review", "Réviser", BrainCircuit],
  ["lessons", "Leçons", GraduationCap], ["library", "Bibliothèque", Library],
  ["favorites", "Favoris", Heart], ["quiz", "Quiz", Sparkles],
  ["exam", "Mode examen", Clock3], ["writing", "Écriture", PenLine],
  ["stats", "Statistiques", BarChart3], ["settings", "Paramètres", Settings],
] as const;

const titles: Record<Section, string> = {
  today: "Aujourd’hui", review: "Révisions intelligentes", lessons: "Leçons",
  library: "Bibliothèque", favorites: "Favoris", quiz: "Quiz", exam: "Mode examen",
  writing: "Écriture", stats: "Statistiques", settings: "Paramètres",
};
const ratings: [ReviewRating, string][] = [["again", "À revoir"], ["hard", "Difficile"], ["good", "Bien"], ["easy", "Facile"]];
const libraryPageSize = 120;
const levelOptions = [1, 2, 3, 4, 5, 6, 7];
const levelLabel = (level: number) => level === 7 ? "Niveaux 7–9" : `Niveau ${level}`;
const quizTypes: { id: QuizType; title: string; text: string }[] = [
  { id: "multiple-choice", title: "Choix multiple", text: "Chinois → français" },
  { id: "reverse-choice", title: "Choix inversé", text: "Français → chinois" },
  { id: "pinyin", title: "Pinyin", text: "Saisir la prononciation" },
  { id: "dictation", title: "Dictée", text: "Écouter puis reconnaître" },
  { id: "cloze", title: "Phrase à trous", text: "Compléter une phrase" },
  { id: "matching", title: "Association", text: "Relier mot et sens" },
  { id: "character", title: "Reconnaissance", text: "Identifier un caractère" },
];
const newId = () => crypto.randomUUID();
const guidedKinds = ["word-zh-fr", "word-fr-zh", "sentence-zh-fr", "sentence-fr-zh", "cloze"] as const;
type GuidedKind = typeof guidedKinds[number];
const normalizeGuidedAnswer = (value: string) => value.toLocaleLowerCase("fr").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\s.,!?;:'’\-，。！？；：]/g, "");
const initialProgress = (wordId: string): ReviewState => ({ wordId, favorite: false, mastery: 0, repetitions: 0, intervalDays: 0, dueAt: null, lastRating: null, lastSeenAt: null });
const choiceValues = (pool: VocabularyWord[], word: VocabularyWord, field: "hanzi" | "french") => [word, ...pool.filter((item) => item.id !== word.id).slice(0, 3)].map((item) => item[field]).sort((a, b) => a.localeCompare(b, "zh"));
const toProgressRow = (userId: string, state: ReviewState) => ({ user_id: userId, word_id: state.wordId, favorite: state.favorite, mastery: state.mastery, repetitions: state.repetitions, interval_days: state.intervalDays, due_at: state.dueAt, last_rating: state.lastRating, last_seen_at: state.lastSeenAt, updated_at: new Date().toISOString() });
const toEventRow = (userId: string, event: ReviewEvent) => ({ id: event.id, user_id: userId, word_id: event.wordId, rating: event.rating, correct: event.correct, quiz_type: event.quizType, duration_ms: event.durationMs, created_at: event.createdAt });
const toQuizRow = (userId: string, result: QuizResult) => ({ id: result.id, user_id: userId, mode: result.mode, quiz_type: result.quizType, level: result.level, score: result.score, total: result.total, duration_seconds: result.durationSeconds, completed_at: result.completedAt });

const focusableSelector = "button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex='-1'])";
function trapFocus(event: React.KeyboardEvent<HTMLElement>) {
  if (event.key !== "Tab") return;
  const focusable = [...event.currentTarget.querySelectorAll<HTMLElement>(focusableSelector)].filter((item) => item.offsetParent !== null);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable.at(-1)!;
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}

export function LearningApp() {
  const [section, setSection] = useState<Section>("today");
  const [snapshot, setSnapshot] = useState<LearningSnapshot>(() => loadGuestSnapshot());
  const [vocabulary, setVocabulary] = useState<VocabularyWord[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sync, setSync] = useState<SyncState>("local");
  const [notice, setNotice] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup" | "forgot" | "recovery">("signin");
  const [wordIndex, setWordIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [quickAnswer, setQuickAnswer] = useState<string | null>(null);
  const [reviewActive, setReviewActive] = useState(false);
  const [reviewRating, setReviewRating] = useState<ReviewRating | null>(null);
  const [search, setSearch] = useState("");
  const [filterLevel, setFilterLevel] = useState(0);
  const [filterTheme, setFilterTheme] = useState("Tous");
  const [filterStatus, setFilterStatus] = useState("tous");
  const [visibleWordCount, setVisibleWordCount] = useState(libraryPageSize);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [lessonLevel, setLessonLevel] = useState(1);
  const [lessonPracticeIds, setLessonPracticeIds] = useState<string[] | null>(null);
  const [lessonPracticeIndex, setLessonPracticeIndex] = useState(0);
  const [guidedResult, setGuidedResult] = useState<{ correct: boolean; expected: string } | null>(null);
  const [guidedInput, setGuidedInput] = useState("");
  const [guidedXp, setGuidedXp] = useState(0);
  const [guidedCombo, setGuidedCombo] = useState(0);
  const [quizType, setQuizType] = useState<QuizType>("multiple-choice");
  const [quizInput, setQuizInput] = useState("");
  const [quizAnswer, setQuizAnswer] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });
  const [examStarted, setExamStarted] = useState(false);
  const [examDone, setExamDone] = useState(false);
  const [examIndex, setExamIndex] = useState(0);
  const [examScore, setExamScore] = useState(0);
  const [examTime, setExamTime] = useState(900);
  const [examAnswer, setExamAnswer] = useState<string | null>(null);
  const [examLevel, setExamLevel] = useState(3);
  const [examConfirmOpen, setExamConfirmOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const actionStarted = useRef(Date.now());
  const lastQuizSubmission = useRef("");
  const moreTriggerRef = useRef<HTMLButtonElement>(null);
  const moreCloseRef = useRef<HTMLButtonElement>(null);
  const profileTriggerRef = useRef<HTMLButtonElement>(null);
  const profileCloseRef = useRef<HTMLButtonElement>(null);
  const examCancelRef = useRef<HTMLButtonElement>(null);

  const word = vocabulary[wordIndex % Math.max(1, vocabulary.length)] ?? vocabularyPlaceholder;
  const totalByLevel = useMemo(() => Object.fromEntries(Array.from({ length: 9 }, (_, i) => [i + 1, vocabulary.filter((item) => item.level === i + 1).length])), [vocabulary]);
  const stats = useMemo(() => calculateStats(snapshot.progress, snapshot.reviewEvents, snapshot.quizResults, totalByLevel), [snapshot, totalByLevel]);
  const totalXp = snapshot.reviewEvents.filter((event) => event.correct).length * 5 + stats.masteredWords * 10;
  const lanternLevel = Math.floor(totalXp / 250) + 1;
  const lanternProgress = totalXp % 250;
  const reviewPool = useMemo(() => lessonPracticeIds ? vocabulary.filter((item) => lessonPracticeIds.includes(item.id)) : vocabulary, [lessonPracticeIds, vocabulary]);
  const dueWords = useMemo(() => reviewPool.filter((item) => !snapshot.progress[item.id]?.dueAt || new Date(snapshot.progress[item.id].dueAt!) <= new Date()), [reviewPool, snapshot.progress]);
  const reviewWord = lessonPracticeIds ? (reviewPool[lessonPracticeIndex] ?? word) : (dueWords[wordIndex % Math.max(1, dueWords.length)] ?? word);
  const themes = useMemo(() => ["Tous", ...new Set(vocabulary.map((item) => item.theme))], [vocabulary]);
  const today = new Date().toISOString().slice(0, 10);
  const learnedToday = new Set(snapshot.reviewEvents.filter((event) => event.correct && event.createdAt.startsWith(today)).map((event) => event.wordId)).size;
  const filtered = useMemo(() => vocabulary.filter((item) => {
    const query = search.trim().toLocaleLowerCase("fr");
    const progress = snapshot.progress[item.id];
    return (!query || `${item.hanzi} ${item.pinyin} ${item.french}`.toLocaleLowerCase("fr").includes(query))
      && (!filterLevel || item.level === filterLevel)
      && (filterTheme === "Tous" || item.theme === filterTheme)
      && (filterStatus === "tous" || (filterStatus === "favoris" && progress?.favorite) || (filterStatus === "appris" && (progress?.mastery ?? 0) > 0) || (filterStatus === "a-revoir" && progress?.dueAt && new Date(progress.dueAt) <= new Date()));
  }), [search, filterLevel, filterTheme, filterStatus, snapshot.progress, vocabulary]);
  const libraryResults = useMemo(
    () => filtered.filter((item) => section !== "favorites" || snapshot.progress[item.id]?.favorite),
    [filtered, section, snapshot.progress],
  );
  const visibleLibraryWords = libraryResults.slice(0, visibleWordCount);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) void loadCloud(session.user);
      else { setIsAdmin(false); setSnapshot(loadGuestSnapshot()); setSync("local"); setLoading(false); }
    });
    const params = new URLSearchParams(location.search);
    if (params.get("recovery") === "1" || params.get("authError")) queueMicrotask(() => {
      if (params.get("recovery") === "1") { setAuthMode("recovery"); setAuthOpen(true); }
      if (params.get("authError")) setNotice("Le lien de confirmation est invalide ou expiré.");
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!examStarted || examDone) return;
    const timer = window.setInterval(() => setExamTime((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [examStarted, examDone]);
  // finishExam intentionally uses the current render's score and timer state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (examStarted && !examDone && examTime === 0) void finishExam(); }, [examTime, examStarted, examDone]);

  useEffect(() => {
    const target = examConfirmOpen ? examCancelRef.current : profileOpen ? profileCloseRef.current : moreOpen ? moreCloseRef.current : null;
    if (!target) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (examConfirmOpen) setExamConfirmOpen(false);
      else if (profileOpen) closeProfile();
      else if (moreOpen) closeMore();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    queueMicrotask(() => target.focus());
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", closeOnEscape); };
  }, [examConfirmOpen, moreOpen, profileOpen]);

  async function loadCloud(activeUser: User) {
    const supabase = getSupabaseBrowserClient();
    setLoading(true); setSync("syncing"); setNotice("");
    try {
      const [settings, progress, events, quizzes, role] = await Promise.all([
        supabase.from("user_settings").select("*").eq("user_id", activeUser.id).maybeSingle(),
        supabase.from("word_progress").select("*").eq("user_id", activeUser.id),
        supabase.from("review_events").select("*").eq("user_id", activeUser.id).order("created_at"),
        supabase.from("quiz_attempts").select("*").eq("user_id", activeUser.id).order("completed_at"),
        supabase.from("user_roles").select("role").eq("user_id", activeUser.id).maybeSingle(),
      ]);
      const firstError = [settings.error, progress.error, events.error, quizzes.error, role.error].find(Boolean);
      if (firstError) throw firstError;
      setIsAdmin(role.data?.role === "admin");
      const profile = await supabase.from("profiles").upsert({ user_id: activeUser.id, display_name: activeUser.email?.split("@")[0] ?? "Apprenant", updated_at: new Date().toISOString() });
      if (profile.error) throw profile.error;
      const cloudProgress: Record<string, ReviewState> = {};
      for (const row of progress.data ?? []) cloudProgress[row.word_id] = fromProgress(row);
      const guest = loadGuestSnapshot();
      const hasGuest = Object.keys(guest.progress).length > 0 || guest.reviewEvents.length > 0 || guest.quizResults.length > 0 || JSON.stringify(guest.settings) !== JSON.stringify(emptySettings);
      if (hasGuest) {
        for (const guestState of Object.values(guest.progress)) cloudProgress[guestState.wordId] = mergeGuestProgress(cloudProgress[guestState.wordId], guestState);
        if (Object.keys(cloudProgress).length) await requireOk(supabase.from("word_progress").upsert(Object.values(cloudProgress).map((state) => toProgressRow(activeUser.id, state)), { onConflict: "user_id,word_id" }));
        if (guest.reviewEvents.length) await requireOk(supabase.from("review_events").upsert(guest.reviewEvents.map((event) => toEventRow(activeUser.id, event)), { onConflict: "id", ignoreDuplicates: true }));
        if (guest.quizResults.length) await requireOk(supabase.from("quiz_attempts").upsert(guest.quizResults.map((result) => toQuizRow(activeUser.id, result)), { onConflict: "id", ignoreDuplicates: true }));
      }
      const settingsValue = settings.data
        ? { dailyGoal: settings.data.daily_goal, activeLevel: settings.data.active_level, showTones: settings.data.show_tones, adminMode: settings.data.admin_mode ?? false, guestImportedAt: settings.data.guest_imported_at }
        : hasGuest ? guest.settings : { ...emptySettings };
      await requireOk(supabase.from("user_settings").upsert({ user_id: activeUser.id, daily_goal: settingsValue.dailyGoal, active_level: settingsValue.activeLevel, show_tones: settingsValue.showTones, admin_mode: settingsValue.adminMode, guest_imported_at: hasGuest ? new Date().toISOString() : settingsValue.guestImportedAt, updated_at: new Date().toISOString() }));
      const [freshProgress, freshEvents, freshQuizzes] = await Promise.all([
        supabase.from("word_progress").select("*").eq("user_id", activeUser.id),
        supabase.from("review_events").select("*").eq("user_id", activeUser.id).order("created_at"),
        supabase.from("quiz_attempts").select("*").eq("user_id", activeUser.id).order("completed_at"),
      ]);
      const freshError = [freshProgress.error, freshEvents.error, freshQuizzes.error].find(Boolean);
      if (freshError) throw freshError;
      const nextProgress: Record<string, ReviewState> = {};
      for (const row of freshProgress.data ?? []) nextProgress[row.word_id] = fromProgress(row);
      setSnapshot({ version: 1, settings: settingsValue, progress: nextProgress, reviewEvents: (freshEvents.data ?? []).map(fromEvent), quizResults: (freshQuizzes.data ?? []).map(fromQuiz) });
      clearGuestSnapshot(); setSync("synced");
    } catch (error) {
      setSync("offline");
      setNotice(error instanceof Error ? `Cloud indisponible : ${error.message}` : "Cloud indisponible. Les données restent sur cet appareil.");
    } finally { setLoading(false); }
  }

  async function commit(next: LearningSnapshot, remote?: () => Promise<void>) {
    setSnapshot(next); saveGuestSnapshot(next);
    if (!user || !remote) { setSync("local"); return; }
    setSync("syncing");
    try { await remote(); clearGuestSnapshot(); setSync("synced"); }
    catch (error) { setSync("offline"); setNotice(error instanceof Error ? `Synchronisation différée : ${error.message}` : "Synchronisation différée."); }
  }

  function speak(text: string) {
    if (!("speechSynthesis" in window)) { setNotice("La lecture audio n’est pas disponible sur ce navigateur."); return; }
    const utterance = new SpeechSynthesisUtterance(text); utterance.lang = "zh-CN";
    window.speechSynthesis.cancel(); window.speechSynthesis.speak(utterance);
  }

  function closeMore() { setMoreOpen(false); queueMicrotask(() => moreTriggerRef.current?.focus()); }
  function closeProfile() { setProfileOpen(false); queueMicrotask(() => profileTriggerRef.current?.focus()); }
  function prepareCatalog() {
    if (vocabulary.length || catalogLoading) return;
    setCatalogLoading(true); setLoading(true);
    void import("../data/catalog").then((catalog) => setVocabulary(catalog.vocabulary)).catch(() => {
      setNotice("Le vocabulaire complet n’a pas pu être chargé. Vérifie ta connexion puis réessaie.");
      setSection("today");
    }).finally(() => { setCatalogLoading(false); setLoading(false); });
  }
  function goTo(nextSection: Section) {
    if (nextSection !== "today") prepareCatalog();
    setSection(nextSection); setMoreOpen(false); setNotice(""); setVisibleWordCount(libraryPageSize); setFiltersOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function lessonProgressValue(item: Lesson) {
    if (!item.words.length) return 0;
    const targetMastery = item.kind === "discover" ? 1 : item.kind === "practice" ? 2 : 3;
    const learned = item.words.filter((id) => (snapshot.progress[id]?.mastery ?? 0) >= targetMastery).length;
    return Math.round((learned / item.words.length) * 100);
  }
  function isLessonComplete(item: Lesson) { return lessonProgressValue(item) >= 80; }
  function isLessonUnlocked(item: Lesson) {
    if (isAdmin && snapshot.settings.adminMode) return true;
    const unitIndex = lessonUnits.findIndex((unit) => unit[0]?.unitId === item.unitId);
    if (unitIndex > 0) {
      const previousCheckpoint = lessonUnits[unitIndex - 1]?.at(-1);
      if (previousCheckpoint && !isLessonComplete(previousCheckpoint)) return false;
    }
    if (item.lessonOrder > 1) {
      const previousLesson = lessonUnits[unitIndex]?.find((candidate) => candidate.lessonOrder === item.lessonOrder - 1);
      if (previousLesson && !isLessonComplete(previousLesson)) return false;
    }
    return true;
  }
  function startLesson(item: Lesson) {
    setLessonPracticeIds(item.words);
    setLessonPracticeIndex(0);
    setReviewActive(true);
    setReviewRating(null);
    setGuidedResult(null);
    setGuidedInput("");
    setGuidedXp(0);
    setGuidedCombo(0);
    actionStarted.current = Date.now();
    goTo("review");
  }
  async function answerGuided(value: string, kind: GuidedKind, target: VocabularyWord) {
    if (guidedResult) return;
    const expected = kind === "word-zh-fr" ? target.french
      : kind === "word-fr-zh" || kind === "cloze" ? target.hanzi
      : kind === "sentence-zh-fr" ? target.exampleFr : target.example;
    const correct = normalizeGuidedAnswer(value) === normalizeGuidedAnswer(expected);
    setGuidedResult({ correct, expected });
    if (correct) {
      const bonus = 5 + Math.min(10, guidedCombo * 2);
      setGuidedXp((xp) => xp + bonus);
      setGuidedCombo((combo) => combo + 1);
    } else setGuidedCombo(0);
    await rateReview(correct ? "good" : "again", target, kind === "cloze" ? "cloze" : kind.includes("fr-zh") ? "reverse-choice" : "multiple-choice");
  }
  function nextGuided() {
    if (lessonPracticeIndex >= 9) {
      const earned = guidedXp;
      setLessonPracticeIds(null); setLessonPracticeIndex(0); setReviewActive(false); setLessonId(null);
      setGuidedResult(null); setGuidedInput("");
      goTo("lessons"); setNotice(`Leçon terminée · ${earned} XP allument ta Lanterne de maîtrise.`);
      return;
    }
    setLessonPracticeIndex((value) => value + 1);
    setGuidedResult(null); setGuidedInput(""); setReviewRating(null); actionStarted.current = Date.now();
  }
  function nextWord() {
    if (lessonPracticeIds) {
      if (lessonPracticeIndex >= reviewPool.length - 1) {
        setLessonPracticeIds(null); setLessonPracticeIndex(0); setReviewActive(false); setLessonId(null);
        goTo("lessons"); setNotice("Leçon terminée. Ton prochain parcours est prêt.");
      } else setLessonPracticeIndex((value) => value + 1);
    } else setWordIndex((value) => (value + 1) % vocabulary.length);
    setRevealed(false); setQuickAnswer(null); setReviewRating(null); setQuizAnswer(null); setQuizInput(""); lastQuizSubmission.current = ""; actionStarted.current = Date.now();
  }

  async function toggleFavorite(item: VocabularyWord) {
    const state = { ...(snapshot.progress[item.id] ?? initialProgress(item.id)), favorite: !(snapshot.progress[item.id]?.favorite ?? false) };
    const next = { ...snapshot, progress: { ...snapshot.progress, [item.id]: state } };
    await commit(next, user ? async () => requireOk(getSupabaseBrowserClient().from("word_progress").upsert(toProgressRow(user.id, state), { onConflict: "user_id,word_id" })) : undefined);
  }

  async function rateReview(rating: ReviewRating, target = reviewWord, quizType: ReviewEvent["quizType"] = "flashcard") {
    const scheduled = scheduleReview(snapshot.progress[target.id] ?? initialProgress(target.id), rating);
    scheduled.wordId = target.id;
    const event: ReviewEvent = { id: newId(), wordId: target.id, rating, correct: rating !== "again", quizType, durationMs: Date.now() - actionStarted.current, createdAt: new Date().toISOString() };
    const next = { ...snapshot, progress: { ...snapshot.progress, [target.id]: scheduled }, reviewEvents: [...snapshot.reviewEvents, event] };
    setReviewRating(rating);
    await commit(next, user ? async () => {
      const supabase = getSupabaseBrowserClient();
      const [progressResult, eventResult] = await Promise.all([
        supabase.from("word_progress").upsert(toProgressRow(user.id, scheduled), { onConflict: "user_id,word_id" }),
        supabase.from("review_events").insert(toEventRow(user.id, event)),
      ]);
      await requireOk(progressResult); await requireOk(eventResult);
    } : undefined);
  }

  function expectedAnswer(type: QuizType, target: VocabularyWord) {
    if (type === "reverse-choice" || type === "dictation" || type === "character") return target.hanzi;
    if (type === "pinyin") return target.pinyin;
    return target.french;
  }

  async function answerQuiz(value: string, selectedType: QuizType = quizType) {
    const submissionKey = `${selectedType}:${word.id}:${value}`;
    if (lastQuizSubmission.current === submissionKey) return;
    lastQuizSubmission.current = submissionKey;
    const expected = expectedAnswer(selectedType, word);
    const correct = answerMatches(value, expected, selectedType);
    setQuizAnswer(value);
    const score = { correct: quizScore.correct + (correct ? 1 : 0), total: quizScore.total + 1 };
    setQuizScore(score);
    const rating: ReviewRating = correct ? "good" : "again";
    const progress = scheduleReview(snapshot.progress[word.id] ?? initialProgress(word.id), rating); progress.wordId = word.id;
    const event: ReviewEvent = { id:newId(), wordId:word.id, rating, correct, quizType:selectedType, durationMs:Date.now() - actionStarted.current, createdAt:new Date().toISOString() };
    const result: QuizResult = { id: newId(), mode: "practice", quizType:selectedType, level: word.level, score: correct ? 1 : 0, total: 1, durationSeconds: Math.max(1, Math.round((Date.now() - actionStarted.current) / 1000)), completedAt: new Date().toISOString() };
    const next = { ...snapshot, progress:{ ...snapshot.progress, [word.id]:progress }, reviewEvents:[...snapshot.reviewEvents,event], quizResults: [...snapshot.quizResults, result] };
    await commit(next, user ? async () => {
      const supabase = getSupabaseBrowserClient();
      const responses = await Promise.all([
        supabase.from("word_progress").upsert(toProgressRow(user.id, progress), { onConflict:"user_id,word_id" }),
        supabase.from("review_events").insert(toEventRow(user.id, event)),
        supabase.from("quiz_attempts").insert(toQuizRow(user.id, result)),
      ]);
      for (const response of responses) await requireOk(response);
    } : undefined);
  }

  function beginExam() { setExamStarted(true); setExamDone(false); setExamIndex(0); setExamScore(0); setExamTime(900); setExamAnswer(null); actionStarted.current = Date.now(); }
  async function answerExam(value: string) {
    if (examAnswer) return;
    const examWord = vocabulary.filter((item) => item.level <= examLevel)[examIndex % vocabulary.filter((item) => item.level <= examLevel).length];
    setExamAnswer(value);
    if (value === examWord.hanzi) setExamScore((score) => score + 1);
  }
  function nextExamQuestion() { if (examIndex >= 19) void finishExam(); else { setExamIndex((value) => value + 1); setExamAnswer(null); } }
  async function finishExam() {
    const finalScore = examScore;
    const result: QuizResult = { id: newId(), mode: "exam", quizType: "exam", level: examLevel, score: finalScore, total: 20, durationSeconds: 900 - examTime, completedAt: new Date().toISOString() };
    const next = { ...snapshot, quizResults: [...snapshot.quizResults, result] };
    setExamDone(true); setExamStarted(false);
    await commit(next, user ? async () => requireOk(getSupabaseBrowserClient().from("quiz_attempts").insert(toQuizRow(user.id, result))) : undefined);
  }

  async function saveSettings(key: "dailyGoal" | "activeLevel" | "showTones" | "adminMode", value: number | boolean) {
    const settings = { ...snapshot.settings, [key]: value };
    const next = { ...snapshot, settings };
    await commit(next, user ? async () => requireOk(getSupabaseBrowserClient().from("user_settings").upsert({ user_id: user.id, daily_goal: settings.dailyGoal, active_level: settings.activeLevel, show_tones: settings.showTones, admin_mode: settings.adminMode, updated_at: new Date().toISOString() })) : undefined);
  }

  const syncLabel = sync === "syncing" ? "Enregistrement…" : sync === "synced" ? "Synchronisé" : sync === "offline" ? "À resynchroniser" : "Enregistré sur cet appareil";
  const lesson = lessons.find((item) => item.id === lessonId);
  const lessonWords = lesson ? vocabulary.filter((item) => lesson.words.includes(item.id)) : [];
  const lessonUnits = useMemo(() => {
    const grouped = new Map<string, Lesson[]>();
    for (const item of lessons.filter((candidate) => candidate.level === lessonLevel)) {
      grouped.set(item.unitId, [...(grouped.get(item.unitId) ?? []), item]);
    }
    return [...grouped.values()].map((unitLessons) => unitLessons.sort((a, b) => a.lessonOrder - b.lessonOrder));
  }, [lessonLevel]);
  const adminMode = isAdmin && snapshot.settings.adminMode;
  const gardenTrees = useMemo(() => buildGardenTreeStates(lessons, snapshot.progress).map((tree) => adminMode ? { ...tree, unlocked: true } : tree), [adminMode, snapshot.progress]);
  const unlockedGardenLevels = gardenTrees.filter((tree) => tree.unlocked).map((tree) => tree.level);
  const activeGardenLevel = unlockedGardenLevels.includes(snapshot.settings.activeLevel)
    ? snapshot.settings.activeLevel
    : unlockedGardenLevels.at(-1) ?? 1;
  const activeGardenTree = gardenTrees.find((tree) => tree.level === activeGardenLevel) ?? gardenTrees[0];
  const homeNextLesson = findNextGardenLesson(lessons, snapshot.progress, activeGardenLevel);
  const contentLoading = loading || catalogLoading;

  return <main className={`learning-app ${section === "today" ? "today-screen" : ""}`}>
    <div className="app-ink-atmosphere" aria-hidden="true">
      <img className="app-ink-clouds" src="/garden/ink-samples-black/ink-clouds-black.png" alt="" />
      <img className="app-ink-pine" src="/garden/ink-samples-black/ink-pine-black.png" alt="" />
      <img className="app-ink-bamboo" src="/garden/ink-samples/ink-bamboo.png" alt="" />
    </div>
    <aside className="sidebar">
      <div className="mark"><span>学</span><b>Hanzi<br />Horizon</b></div>
      <nav aria-label="Navigation principale">{nav.map(([id, label, Icon]) => <button key={id} onClick={() => goTo(id)} className={section === id ? "active" : ""}><Icon size={19} /><span>{label}</span></button>)}</nav>
      <div className="sidebar-art" />
      <div className="streak"><Flame /><div><b>{stats.streakDays} jour{stats.streakDays > 1 ? "s" : ""}</b><small>de régularité</small></div></div>
      <div className="lantern-mini"><Sparkles /><div><b>Lanterne {lanternLevel}</b><small>{lanternProgress} / 250 XP</small><i><span style={{ width: `${(lanternProgress / 250) * 100}%` }} /></i></div></div>
    </aside>
    <section className="workspace">
      <header className={`topbar ${section === "today" ? "today-topbar" : ""}`}>
        <div><h1>{titles[section]}</h1><p>{section === "today" ? "Un mot, une révision, puis un défi." : "Ton parcours personnel, à ton rythme."}</p></div>
        <button ref={profileTriggerRef} className="profile" onClick={() => setProfileOpen(true)} aria-label="Ouvrir le profil" aria-expanded={profileOpen} aria-controls="profile-panel">{user?.email?.[0].toUpperCase() ?? <UserRound />}</button>
      </header>

      {notice && <div className="notice" role="status"><span>{notice}</span>{sync === "offline" && user && <button onClick={() => void loadCloud(user)}><RotateCcw /> Réessayer</button>}<button onClick={() => setNotice("")} aria-label="Fermer"><X /></button></div>}
      {contentLoading && <div className="loading" role="status"><LoaderCircle className="spin" /> {catalogLoading ? "Préparation du vocabulaire…" : "Chargement de ta progression…"}</div>}

      {!contentLoading && section === "today" && <HomeGarden totalXp={totalXp} streakDays={stats.streakDays} nextLesson={homeNextLesson} tree={activeGardenTree} trees={gardenTrees} onSelectLevel={(level) => void saveSettings("activeLevel", level)} onContinue={(item) => { setLessonLevel(item.level); setLessonId(item.id); goTo("lessons"); }} />}
      {false && !contentLoading && section === "today" && <>
        <div className="dashboard-grid">
          <article className="study-card">
            <img src="/bamboo-study.webp" alt="Bambous peints à l’encre" width={900} height={520} />
            <div className="study-content">
              <span className="eyebrow">LE MOT DU JOUR · NIVEAU {word.level}</span>
              <button className="sound" onClick={() => speak(word.hanzi)} aria-label={`Écouter ${word.hanzi}`}><Volume2 /></button>
              <div className="hanzi">{word.hanzi}</div><div className="divider" />
              <div className="pinyin">{snapshot.settings.showTones ? word.pinyin : word.pinyin.normalize("NFD").replace(/[\u0300-\u036f]/g, "")}</div>
              <div className={`meaning ${revealed ? "shown" : ""}`} aria-live="polite"><b>{word.french}</b>{word.example && <small>{word.example}{word.exampleFr ? ` · ${word.exampleFr}` : ""}</small>}</div>
              <div className="study-actions"><button className="outline" onClick={() => speak(word.hanzi)}><Volume2 /> Écouter</button><button className="coral" onClick={() => setRevealed((value) => !value)}>{revealed ? "Masquer" : "Révéler"}</button></div>
            </div>
            <div className="pager"><button onClick={() => setWordIndex((value) => (value + vocabulary.length - 1) % vocabulary.length)} aria-label="Mot précédent"><ChevronLeft /></button><span>{wordIndex % vocabulary.length + 1} / {vocabulary.length}</span><button onClick={nextWord} aria-label="Mot suivant"><ChevronRight /></button></div>
          </article>
          <aside className="right-rail">
            <article className="goal-card"><h2>Objectif du jour</h2><div className="ring" style={{ "--progress": `${Math.min(1, learnedToday / snapshot.settings.dailyGoal) * 360}deg` } as React.CSSProperties}><b>{learnedToday}<small>/ {snapshot.settings.dailyGoal}</small></b><span>mots</span></div></article>
            <article className="recents"><h2>Récents</h2>{vocabulary.slice(0, 4).map((item, itemIndex) => <button className={`recent ${item.id === word.id ? "selected" : ""}`} key={item.id} onClick={() => setWordIndex(itemIndex)}><b>{item.hanzi}</b><span>{item.pinyin}<small>{item.french}</small></span></button>)}<button className="link" onClick={() => goTo("library")}>Voir tout <ChevronRight /></button></article>
          </aside>
        </div>
        <section className="quick-quiz"><div><span className="quiz-icon">?</span><h2>Quiz rapide</h2><p>Quel caractère correspond à « {word.french} » ?</p></div><div className="answer-options">{choiceValues(vocabulary, word, "hanzi").map((choice) => <button key={choice} disabled={quickAnswer !== null} className={quickAnswer ? (choice === word.hanzi ? "correct" : quickAnswer === choice ? "wrong" : "") : ""} onClick={() => { setQuickAnswer(choice); void answerQuiz(choice, "reverse-choice"); }}>{choice}</button>)}</div>{quickAnswer && <small>{quickAnswer === word.hanzi ? "Exact ! Résultat enregistré." : `Pas encore : la bonne réponse est ${word.hanzi}.`}</small>}</section>
      </>}

      {!contentLoading && section === "review" && <section className="review-panel">
        <div className="review-summary"><div><span className="eyebrow">{lessonPracticeIds ? "LEÇON DE TRADUCTION" : "FILE DU JOUR"}</span><h2>{lessonPracticeIds ? `${lessonPracticeIndex + 1} / 10 · ${lesson?.theme ?? "Parcours thématique"}` : `${dueWords.length} mot${dueWords.length > 1 ? "s" : ""} à réviser`}</h2><p>{lessonPracticeIds ? "Comprends, traduis, reconstruis puis produis la phrase." : "Les intervalles s’adaptent à chacune de tes réponses."}</p></div><button className="coral" onClick={() => { setReviewActive(true); setReviewRating(null); actionStarted.current = Date.now(); }}><Play /> {lessonPracticeIds ? "Continuer" : "Commencer la session"}</button></div>
        {reviewActive ? lessonPracticeIds ? <GuidedLessonExercise pool={vocabulary} word={reviewPool[lessonPracticeIndex % reviewPool.length] ?? reviewWord} kind={guidedKinds[lessonPracticeIndex % guidedKinds.length]} step={lessonPracticeIndex} total={10} input={guidedInput} result={guidedResult} xp={guidedXp} combo={guidedCombo} onInput={setGuidedInput} onSpeak={speak} onAnswer={(value, kind, target) => void answerGuided(value, kind, target)} onNext={nextGuided} /> : <article className="review-card"><span>NIVEAU {reviewWord.level} · {reviewWord.theme}</span><button className="sound" onClick={() => speak(reviewWord.hanzi)}><Volume2 /></button><div className="hanzi">{reviewWord.hanzi}</div><p className="pinyin">{reviewWord.pinyin}</p><p>{reviewWord.french}</p><div className="rating-row">{ratings.map(([value, label]) => <button className={reviewRating === value ? `rated ${value}` : ""} key={value} disabled={reviewRating !== null} onClick={() => void rateReview(value)}>{label}</button>)}</div>{reviewRating && <p className="feedback">Prochaine révision programmée. <button onClick={nextWord}>Mot suivant <ChevronRight /></button></p>}</article> : <div className="empty-state"><BrainCircuit /><h3>Ta file est prête</h3><p>Commence quand tu as cinq minutes devant toi.</p></div>}
      </section>}

      {!loading && section === "lessons" && <section className="lesson-path">{lesson ? <div className="lesson-detail"><button className="text-button" onClick={() => setLessonId(null)}>← Retour au parcours</button><span className="eyebrow">{levelLabel(lesson.level)} · {lesson.kind === "discover" ? "DÉCOUVERTE" : lesson.kind === "practice" ? "PRATIQUE" : "DÉFI"}</span><h2>{lesson.title}</h2><p>{lesson.goal}</p><div className="lesson-meta"><span><Clock3 /> {lesson.durationMinutes} min</span><span><Sparkles /> {lesson.xp} XP</span><span><Check /> {lessonProgressValue(lesson)} % acquis</span></div><div className="lesson-words">{lessonWords.map((item) => <article key={item.id}><b>{item.hanzi}</b><span>{item.pinyin}</span><p>{item.french}</p><button onClick={() => speak(item.hanzi)} aria-label={`Écouter ${item.hanzi}`}><Volume2 /></button></article>)}</div><button className="coral" onClick={() => startLesson(lesson)}><Play /> {lessonProgressValue(lesson) ? "Reprendre la leçon" : "Commencer la leçon"}</button></div> : <><div className="path-intro"><div><span className="eyebrow">PARCOURS HSK GUIDÉ</span><h2>Avance thème par thème</h2><p>Chaque unité répète le même vocabulaire en trois étapes : découverte, mise en situation et défi.</p></div><div className="level-progress"><b>{Math.round(lessons.filter((item) => item.level === lessonLevel).reduce((sum, item) => sum + lessonProgressValue(item), 0) / Math.max(1, lessons.filter((item) => item.level === lessonLevel).length))}%</b><span>du niveau</span></div></div><div className="level-tabs" role="tablist" aria-label="Choisir un niveau HSK">{levelOptions.map((value) => <button role="tab" aria-selected={lessonLevel === value} className={lessonLevel === value ? "active" : ""} key={value} onClick={() => { setLessonLevel(value); setLessonId(null); }}>{levelLabel(value)}</button>)}</div><div className="unit-list">{lessonUnits.map((unitLessons, unitIndex) => { const unit = unitLessons[0]; const unitLocked = unitIndex > 0 && !isLessonComplete(lessonUnits[unitIndex - 1].at(-1)!); const unitProgress = Math.round(unitLessons.reduce((sum, item) => sum + lessonProgressValue(item), 0) / unitLessons.length); return <article className={`lesson-unit ${unitLocked ? "locked" : ""}`} key={unit.unitId}><header><div><span>UNITÉ {unit.unitOrder}</span><h2>{unit.unitTitle}</h2><p>{unit.unitDescription}</p></div><div className="unit-progress"><b>{unitProgress}%</b><i><span style={{ width: `${unitProgress}%` }} /></i></div></header><div className="lesson-nodes">{unitLessons.map((item) => { const unlocked = isLessonUnlocked(item); const progress = lessonProgressValue(item); const complete = isLessonComplete(item); return <button key={item.id} disabled={!unlocked} className={`lesson-node ${item.kind} ${complete ? "complete" : ""}`} onClick={() => setLessonId(item.id)}><span className="node-icon">{!unlocked ? <LockKeyhole /> : complete ? <Check /> : item.kind === "checkpoint" ? <Sparkles /> : <GraduationCap />}</span><span><small>{item.kind === "discover" ? "1 · Découvrir" : item.kind === "practice" ? "2 · En situation" : "3 · Défi"}</small><b>{item.words.length} mots · {item.durationMinutes} min</b><i><span style={{ width: `${progress}%` }} /></i></span></button>; })}</div></article>; })}</div></>}</section>}

      {!contentLoading && (section === "library" || section === "favorites") && <section className="library-view">
        <div className="library-head"><div><h2>{section === "favorites" ? "Tes favoris" : "Tout le vocabulaire"}</h2><p>{source.title} · {source.version}</p><small>{libraryResults.length.toLocaleString("fr-FR")} résultat{libraryResults.length > 1 ? "s" : ""}</small></div><div className="library-tools"><label className="search"><span className="sr-only">Rechercher dans le vocabulaire</span><Search aria-hidden="true" /><input value={search} onChange={(event) => { setSearch(event.target.value); setVisibleWordCount(libraryPageSize); }} placeholder="Mot, pinyin ou français" /></label><button className="filter-toggle" onClick={() => setFiltersOpen((value) => !value)} aria-expanded={filtersOpen} aria-controls="library-filters"><SlidersHorizontal /> Filtres</button></div></div>
        <div id="library-filters" className={`filters ${filtersOpen ? "open" : ""}`}><select value={filterLevel} onChange={(event) => { setFilterLevel(Number(event.target.value)); setVisibleWordCount(libraryPageSize); }} aria-label="Filtrer par niveau"><option value={0}>Tous les niveaux</option>{levelOptions.map((value) => <option key={value} value={value}>{levelLabel(value)}</option>)}</select><select value={filterTheme} onChange={(event) => { setFilterTheme(event.target.value); setVisibleWordCount(libraryPageSize); }} aria-label="Filtrer par thème">{themes.map((item) => <option key={item}>{item}</option>)}</select><select value={section === "favorites" ? "favoris" : filterStatus} onChange={(event) => { setFilterStatus(event.target.value); setVisibleWordCount(libraryPageSize); }} disabled={section === "favorites"} aria-label="Filtrer par statut"><option value="tous">Tous les statuts</option><option value="favoris">Favoris</option><option value="appris">Déjà vus</option><option value="a-revoir">À revoir</option></select></div>
        <div className="word-table">{visibleLibraryWords.map((item) => <article key={item.id}><button className="favorite" onClick={() => void toggleFavorite(item)} aria-label={snapshot.progress[item.id]?.favorite ? `Retirer ${item.hanzi} des favoris` : `Ajouter ${item.hanzi} aux favoris`}>{snapshot.progress[item.id]?.favorite ? "★" : "☆"}</button><b>{item.hanzi}</b><span>{item.pinyin}</span><span>{item.french}</span><small>{levelLabel(item.level)} · {item.theme}</small><button className="listen" onClick={() => speak(item.hanzi)} aria-label={`Écouter ${item.hanzi}`}><Volume2 /> Écouter</button></article>)}{!libraryResults.length && <div className="empty-state"><Search /><h3>Aucun mot trouvé</h3><p>Modifie les filtres ou ajoute des favoris depuis la bibliothèque.</p></div>}</div>{visibleWordCount < libraryResults.length && <button className="coral library-more" onClick={() => setVisibleWordCount((count) => count + libraryPageSize)}>Afficher 120 mots de plus</button>}<p className="source-credit">Définitions françaises : <a href={source.dictionaryUrl} target="_blank" rel="noreferrer">CFDICT</a> · Liste HSK : <a href={source.url} target="_blank" rel="noreferrer">ivankra/hsk30</a></p>
      </section>}

      {!loading && section === "quiz" && <section className="quiz-lab"><h2>Choisis un exercice</h2><div className="quiz-cards">{quizTypes.map((item) => <button className={`quiz-choice ${quizType === item.id ? "active" : ""}`} key={item.id} onClick={() => { setQuizType(item.id); setQuizAnswer(null); setQuizInput(""); lastQuizSubmission.current = ""; actionStarted.current = Date.now(); }}><b>{item.title}</b><span>{item.text}</span><i>→</i></button>)}</div><QuizExercise pool={vocabulary} type={quizType} word={word} input={quizInput} answer={quizAnswer} onInput={setQuizInput} onSpeak={() => speak(word.hanzi)} onAnswer={(value) => void answerQuiz(value)} onNext={nextWord} /><p className="scoreline">Session : {quizScore.correct} bonne{quizScore.correct > 1 ? "s" : ""} réponse{quizScore.correct > 1 ? "s" : ""} sur {quizScore.total}</p></section>}

      {!loading && section === "exam" && <section className="exam"><span className="eyebrow">SIMULATION HSK</span><h2>20 questions · 15 minutes</h2><p>Les erreurs sont ajoutées aux statistiques et orientent tes prochaines révisions.</p>{!examStarted && !examDone && <><label>Niveau maximum <select value={examLevel} onChange={(event) => setExamLevel(Number(event.target.value))}>{[1, 2, 3].map((value) => <option key={value} value={value}>HSK {value}</option>)}</select></label><button className="coral" onClick={beginExam}><Clock3 /> Lancer l’examen</button></>}{examStarted && <ExamQuestion pool={vocabulary} level={examLevel} index={examIndex} time={examTime} answer={examAnswer} onAnswer={(value) => void answerExam(value)} onNext={nextExamQuestion} onAbandon={() => setExamConfirmOpen(true)} />}{examDone && <div className="exam-result"><Check /><h3>Examen terminé</h3><b>{examScore} / 20</b><p>Le résultat est enregistré dans tes statistiques.</p><button className="coral" onClick={beginExam}>Recommencer</button></div>}</section>}

      {!contentLoading && section === "writing" && <WritingBoard key={word.id} hanzi={word.hanzi} pinyin={word.pinyin} onSpeak={() => speak(word.hanzi)} onNext={nextWord} />}

      {!loading && section === "stats" && <section className="stats"><div className="stat"><span>Mots maîtrisés</span><b>{stats.masteredWords}</b><small>Maîtrise 3 ou plus</small></div><div className="stat"><span>Précision</span><b>{stats.precision}%</b><small>Quiz et révisions</small></div><div className="stat"><span>Temps d’étude</span><b>{formatDuration(stats.studySeconds)}</b><small>Activité enregistrée</small></div><article className="chart"><h2>Activité des 7 derniers jours</h2><div className="bars" aria-hidden="true">{stats.weeklyActivity.map((value, itemIndex) => <div key={itemIndex}><i style={{ height: `${Math.max(4, value * 12)}%` }} /><small>{["L", "M", "M", "J", "V", "S", "D"][itemIndex]}</small><span>{value}</span></div>)}</div><ul className="sr-only">{stats.weeklyActivity.map((value, itemIndex) => <li key={itemIndex}>Jour {itemIndex + 1} : {value} activité{value > 1 ? "s" : ""}</li>)}</ul></article><article className="mistakes"><h2>À retravailler</h2>{stats.frequentErrors.length ? stats.frequentErrors.map((id) => { const item = vocabulary.find((candidate) => candidate.id === id); return item ? <p key={id}><b>{item.hanzi}</b> · {item.pinyin} · {item.french}</p> : null; }) : <p>Aucune erreur enregistrée pour le moment.</p>}<button className="coral" onClick={() => goTo("review")}>Réviser ces mots</button></article></section>}

      {!loading && section === "settings" && <section className="settings"><h2>Ton rythme</h2><label htmlFor="daily-goal">Objectif quotidien <output id="daily-goal-value">{snapshot.settings.dailyGoal} mots</output><input id="daily-goal" aria-describedby="daily-goal-value" type="range" min="5" max="50" step="5" value={snapshot.settings.dailyGoal} onChange={(event) => void saveSettings("dailyGoal", Number(event.target.value))} /></label><label htmlFor="active-level">Niveau actif <select id="active-level" value={activeGardenLevel} onChange={(event) => void saveSettings("activeLevel", Number(event.target.value))}>{levelOptions.map((value) => <option key={value} value={value} disabled={!unlockedGardenLevels.includes(value)}>{levelLabel(value)}{!unlockedGardenLevels.includes(value) ? " · verrouillé" : ""}</option>)}</select></label><label className="toggle" htmlFor="show-tones"><span>Afficher les tons dans le pinyin</span><input id="show-tones" type="checkbox" checked={snapshot.settings.showTones} onChange={(event) => void saveSettings("showTones", event.target.checked)} /></label>{isAdmin && <label className="toggle" htmlFor="admin-mode"><span>Mode administrateur <small>Déverrouille tous les niveaux pour les tests.</small></span><input id="admin-mode" type="checkbox" checked={snapshot.settings.adminMode} onChange={(event) => void saveSettings("adminMode", event.target.checked)} /></label>}<article><b>Stockage et confidentialité</b><p>{user ? "Tes paramètres et statistiques sont synchronisés avec ton compte." : "En mode découverte, les données restent temporairement sur cet appareil."}</p></article></section>}
    </section>

    <MobileNavigation section={section} onNavigate={goTo} moreOpen={moreOpen} onMore={() => setMoreOpen(true)} triggerRef={moreTriggerRef} />
    {moreOpen && <><button className="panel-backdrop mobile-panel-backdrop" onClick={closeMore} aria-label="Fermer le menu Plus" /><section id="mobile-more-panel" className="mobile-more-panel" role="dialog" aria-modal="true" aria-labelledby="mobile-more-title" onKeyDown={trapFocus}><header><div><span>Navigation</span><h2 id="mobile-more-title">Plus</h2></div><button ref={moreCloseRef} className="icon-button" onClick={closeMore} aria-label="Fermer"><X /></button></header><nav aria-label="Navigation secondaire">{nav.filter(([id]) => mobileSecondarySections.includes(id)).map(([id, label, Icon]) => <button key={id} onClick={() => goTo(id)} className={section === id ? "active" : ""}><Icon /><span>{label}</span><ChevronRight /></button>)}</nav></section></>}
    {profileOpen && <><button className="panel-backdrop" onClick={closeProfile} aria-label="Fermer le profil" /><aside id="profile-panel" className="profile-panel" role="dialog" aria-modal="true" aria-labelledby="profile-title" onKeyDown={trapFocus}><button ref={profileCloseRef} className="icon-button close-button" onClick={closeProfile} aria-label="Fermer"><X /></button><div className="profile-avatar"><UserRound /></div><h2 id="profile-title">{user ? "Mon profil" : "Mode découverte"}</h2><p>{user?.email ?? "Connecte-toi pour retrouver ta progression partout."}</p><div className={`sync-state ${sync}`}><span>{sync === "offline" ? <CloudOff /> : <Cloud />}</span><div><b>{syncLabel}</b><small>{user ? "Supabase sécurisé par ton compte" : "Navigateur actuel"}</small></div></div>{user ? <><button className="panel-action" onClick={() => { closeProfile(); goTo("settings"); }}><Settings /> Réglages</button><button className="panel-action" onClick={() => { setProfileOpen(false); setAuthMode("forgot"); setAuthOpen(true); }}><LogIn /> Changer le mot de passe</button><button className="panel-action danger" onClick={() => void getSupabaseBrowserClient().auth.signOut()}><LogOut /> Se déconnecter</button></> : <button className="coral full" onClick={() => { setProfileOpen(false); setAuthMode("signin"); setAuthOpen(true); }}><LogIn /> Se connecter</button>}</aside></>}
    {examConfirmOpen && <div className="modal-backdrop"><section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="exam-confirm-title" aria-describedby="exam-confirm-copy" onKeyDown={trapFocus}><h2 id="exam-confirm-title">Abandonner l’examen ?</h2><p id="exam-confirm-copy">Ta progression sur ces questions ne sera pas enregistrée.</p><div><button ref={examCancelRef} className="outline" onClick={() => setExamConfirmOpen(false)}>Continuer l’examen</button><button className="danger-button" onClick={() => { setExamConfirmOpen(false); setExamStarted(false); setExamDone(false); setNotice("Examen abandonné : aucun résultat n’a été enregistré."); }}>Abandonner</button></div></section></div>}
    <AuthDialog key={`${authMode}-${authOpen}`} open={authOpen} initialMode={authMode} onClose={() => setAuthOpen(false)} />
  </main>;
}

function MobileNavigation({ section, onNavigate, moreOpen, onMore, triggerRef }: { section: Section; onNavigate: (section: Section) => void; moreOpen: boolean; onMore: () => void; triggerRef: React.RefObject<HTMLButtonElement | null> }) {
  const labels: Partial<Record<Section, string>> = { library: "Mots" };
  return <nav className="mobile-tabbar" aria-label="Navigation mobile">
    {nav.filter(([id]) => mobilePrimarySections.includes(id)).map(([id, label, Icon]) => <button key={id} onClick={() => onNavigate(id)} className={section === id ? "active" : ""} aria-current={section === id ? "page" : undefined}><Icon /><span>{labels[id] ?? label}</span></button>)}
    <button ref={triggerRef} onClick={onMore} className={mobileSecondarySections.includes(section) ? "active" : ""} aria-expanded={moreOpen} aria-controls="mobile-more-panel"><MoreHorizontal /><span>Plus</span></button>
  </nav>;
}

const gardenSlots = [
  [48, 64, -38], [50, 57, -18], [51, 49, 14], [52, 55, 30],
  [53, 44, 46], [49, 45, -52], [50, 36, -28], [51, 29, 4],
  [52, 32, 24], [53, 30, 42], [50, 25, -44], [51, 19, -16],
  [52, 16, 12], [53, 18, 32], [54, 22, 54], [52, 9, 0],
] as const;
const mobilePrimarySections: Section[] = ["today", "review", "lessons", "library"];
const mobileSecondarySections: Section[] = ["favorites", "quiz", "exam", "writing", "stats", "settings"];
const compactNumber = new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 });

function HomeGarden({ totalXp, streakDays, nextLesson, tree, trees, onSelectLevel, onContinue }: { totalXp: number; streakDays: number; nextLesson: Lesson | null; tree: GardenTreeState; trees: GardenTreeState[]; onSelectLevel: (level: number) => void; onContinue: (lesson: Lesson) => void }) {
  const [levelPickerOpen, setLevelPickerOpen] = useState(false);
  const levelTriggerRef = useRef<HTMLButtonElement>(null);
  const levelCloseRef = useRef<HTMLButtonElement>(null);
  const treeProgress = Math.round((tree.completedUnits / 16) * 100);
  const levelName = tree.level === 7 ? "HSK 7–9" : `HSK ${tree.level}`;
  const branchCount = tree.branches.filter((state) => state !== "locked").length;
  const nextTree = trees.find((item) => !item.unlocked);
  const activeBranchIndex = nextLesson ? Math.max(0, Math.min(15, nextLesson.unitOrder - 1)) : null;
  const lessonStage = nextLesson ? ["découverte", "pratique", "défi"][nextLesson.lessonOrder - 1] ?? "progression" : null;

  const closeLevelPicker = () => {
    setLevelPickerOpen(false);
    requestAnimationFrame(() => levelTriggerRef.current?.focus());
  };

  useEffect(() => {
    if (!levelPickerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => levelCloseRef.current?.focus());
    return () => { document.body.style.overflow = previousOverflow; };
  }, [levelPickerOpen]);

  return <section className="home-garden" aria-label="Mon jardin de chinois">
    <div className="garden-landscape" aria-hidden="true">
      <img className="garden-ink-hills" src="/garden/ink-samples/ink-hills.png" alt="" />
      <img className="garden-ink-bamboo" src="/garden/ink-samples-black/ink-bamboo-black.png" alt="" />
      <img className="garden-ink-clouds" src="/garden/ink-samples-black/ink-clouds-black.png" alt="" />
      <img className="garden-ink-moss" src="/garden/ink-samples/ink-moss-grass.png" alt="" />
      <img className="garden-ink-petals" src="/garden/ink-samples-black/ink-petals-butterflies-black.png" alt="" />
    </div>
    <header className="garden-title"><span className="eyebrow">TON PARCOURS VIVANT</span><h2>Mon jardin de chinois</h2><p>{levelName} · {tree.completedUnits} / 16 unités en floraison</p></header>
    <div className="garden-level-picker" role="tablist" aria-label="Choisir l’arbre HSK">{trees.map((item) => <button role="tab" aria-selected={item.level === tree.level} className={item.level === tree.level ? "active" : ""} disabled={!item.unlocked} onClick={() => onSelectLevel(item.level)} key={item.level}>{item.unlocked ? `HSK ${item.level}` : <><LockKeyhole /> HSK {item.level}</>}</button>)}</div>
    <div className="mobile-garden-stats" aria-label="Progression du jour">
      <button ref={levelTriggerRef} className="mobile-stat mobile-level-stat" type="button" aria-haspopup="dialog" aria-expanded={levelPickerOpen} aria-controls="mobile-hsk-picker" onClick={() => setLevelPickerOpen(true)}><GraduationCap aria-hidden="true" /><span><small>Niveau</small><b>{levelName}</b></span></button>
      <div className="mobile-stat" aria-label={`${totalXp.toLocaleString("fr-FR")} points d’expérience`}><Sparkles aria-hidden="true" /><span><small>Exp.</small><b>{compactNumber.format(totalXp)} XP</b></span></div>
      <div className="mobile-stat" aria-label={`Série de ${streakDays} jour${streakDays > 1 ? "s" : ""}`}><Flame aria-hidden="true" /><span><small>Série</small><b>{streakDays} j</b></span></div>
    </div>
    <div className="garden-layout">
      <aside className="growth-copy"><b>{totalXp.toLocaleString("fr-FR")} <small>XP</small></b><p><strong>{branchCount} rameau{branchCount > 1 ? "x" : ""} réveillé{branchCount > 1 ? "s" : ""}</strong><br />sur les 16 unités de {levelName}</p><div className="garden-progress" role="progressbar" aria-label={`Progression du ${levelName}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={treeProgress}><i style={{ width: `${treeProgress}%` }} /></div><span><Leaf /> Découverte : rameau · Pratique : feuilles · Défi : fleurs.</span></aside>
      <div className="tree-scene hsk-tree-scene">
        <img className="tree-locked" src={`/tree/hsk/hsk-${tree.level}-locked.png`} alt={`Arbre ${levelName}, ${tree.completedUnits} unités terminées`} />
        {tree.branches.map((state, index) => {
          const [left, top, angle] = gardenSlots[index];
          if (state === "locked") return null;
          return <span className={`garden-branch branch-${state}`} style={{ "--left": `${left}%`, "--top": `${top}%`, "--angle": `${angle}deg` } as React.CSSProperties} key={index}>
            <i className="branch-twig" aria-hidden="true" />{(state === "leaf" || state === "bloom") && <i className="branch-leaves" aria-hidden="true" />}{state === "bloom" && <i className="branch-flowers" aria-hidden="true" />}
          </span>;
        })}
        <div className="growth-event"><Sprout /><span><b>{tree.complete ? `${levelName} accompli` : `Unité ${tree.completedUnits + 1} en cours`}</b><small>{tree.complete ? (nextTree ? `${nextTree.level === 7 ? "HSK 7–9" : `HSK ${nextTree.level}`} est déverrouillé.` : "Tous les arbres sont en floraison.") : "La prochaine leçon réveille un nouveau rameau."}</small></span></div>
        {nextLesson && activeBranchIndex !== null ? <button className="mobile-lesson-badge" type="button" style={{ "--badge-left": `${gardenSlots[activeBranchIndex][0]}%`, "--badge-top": `${gardenSlots[activeBranchIndex][1]}%` } as React.CSSProperties} aria-label={`Continuer la leçon ${nextLesson.lessonOrder}, ${lessonStage} du rameau ${nextLesson.unitOrder}`} onClick={() => onContinue(nextLesson)}><Sprout aria-hidden="true" /><span>Leçon {nextLesson.lessonOrder}</span></button> : <div className="mobile-level-complete" role="status"><Check aria-hidden="true" /><span>{nextTree ? `${levelName} terminé` : "Parcours terminé"}</span></div>}
      </div>
      {nextLesson ? <aside className="next-garden-lesson"><BookOpen /><span>PRÊT À CONTINUER ?</span><h3>{nextLesson.theme}</h3><p>{nextLesson.title}</p><button className="coral" onClick={() => onContinue(nextLesson)}>Continuer ma leçon <ChevronRight /></button><small>{streakDays} jour{streakDays > 1 ? "s" : ""} de série</small></aside> : <aside className="next-garden-lesson garden-level-done"><Check /><span>NIVEAU TERMINÉ</span><h3>{levelName} en floraison</h3><p>{nextTree ? `Le niveau HSK ${nextTree.level} est maintenant disponible.` : "Tous les niveaux sont terminés."}</p></aside>}
    </div>
    {levelPickerOpen && <><button className="garden-level-backdrop" type="button" aria-label="Fermer le sélecteur HSK" onClick={closeLevelPicker} /><div id="mobile-hsk-picker" className="mobile-hsk-picker" role="dialog" aria-modal="true" aria-labelledby="mobile-hsk-title" aria-describedby="mobile-hsk-description" onKeyDown={(event) => { if (event.key === "Escape") closeLevelPicker(); else trapFocus(event); }}><header><div><span>TON PARCOURS</span><h2 id="mobile-hsk-title">Choisir un arbre</h2></div><button ref={levelCloseRef} type="button" aria-label="Fermer" onClick={closeLevelPicker}><X /></button></header><p id="mobile-hsk-description">Termine les 16 rameaux d’un niveau pour déverrouiller le suivant.</p><div className="mobile-hsk-options">{trees.map((item) => <button type="button" className={item.level === tree.level ? "active" : ""} disabled={!item.unlocked} onClick={() => { onSelectLevel(item.level); closeLevelPicker(); }} key={item.level}><span>{item.level === 7 ? "HSK 7–9" : `HSK ${item.level}`}</span><small>{item.level === tree.level ? "Actuel" : item.complete ? <><Check /> Terminé</> : item.unlocked ? `${item.completedUnits} / 16 rameaux` : <><LockKeyhole /> Verrouillé</>}</small></button>)}</div></div></>}
  </section>;
}

function GuidedLessonExercise({ pool, word, kind, step, total, input, result, xp, combo, onInput, onSpeak, onAnswer, onNext }: { pool: VocabularyWord[]; word: VocabularyWord; kind: GuidedKind; step: number; total: number; input: string; result: { correct: boolean; expected: string } | null; xp: number; combo: number; onInput: (value: string) => void; onSpeak: (value: string) => void; onAnswer: (value: string, kind: GuidedKind, target: VocabularyWord) => void; onNext: () => void }) {
  const prompts: Record<GuidedKind, string> = {
    "word-zh-fr": `Traduis « ${word.hanzi} » en français`,
    "word-fr-zh": `Traduis « ${word.french} » en chinois`,
    "sentence-zh-fr": `Traduis cette phrase en français : ${word.example}`,
    "sentence-fr-zh": `Traduis cette phrase en chinois : ${word.exampleFr}`,
    cloze: `Complète la phrase : ${word.example.includes(word.hanzi) ? word.example.replace(word.hanzi, "____") : `____ · ${word.pinyin}`}`,
  };
  const expected = kind === "word-zh-fr" ? word.french : kind === "word-fr-zh" || kind === "cloze" ? word.hanzi : kind === "sentence-zh-fr" ? word.exampleFr : word.example;
  const choices = kind === "word-zh-fr" ? choiceValues(pool, word, "french") : kind === "word-fr-zh" ? choiceValues(pool, word, "hanzi") : [];
  const freeInput = choices.length === 0;
  return <article className="guided-lesson-card">
    <div className="guided-head"><div><span>EXERCICE {step + 1} / {total}</span><i><b style={{ width: `${((step + 1) / total) * 100}%` }} /></i></div><div className={`xp-lantern ${combo >= 3 ? "glowing" : ""}`}><Sparkles /><span><b>{xp} XP</b><small>{combo > 1 ? `Série ×${combo}` : "Lanterne"}</small></span></div></div>
    <div className="guided-prompt"><small>{kind.includes("sentence") ? "TRADUCTION DE PHRASE" : kind === "cloze" ? "PHRASE À COMPLÉTER" : "TRADUCTION ACTIVE"}</small><h3>{prompts[kind]}</h3>{kind.includes("zh-fr") || kind === "cloze" ? <button className="outline" onClick={() => onSpeak(kind.includes("sentence") ? word.example : word.hanzi)}><Volume2 /> Écouter</button> : null}</div>
    {freeInput ? <div className="guided-input"><textarea value={input} disabled={result !== null} onChange={(event) => onInput(event.target.value)} placeholder={kind.includes("sentence") ? "Écris toute la phrase…" : "Écris ta réponse…"} /><button className="coral" disabled={!input.trim() || result !== null} onClick={() => onAnswer(input, kind, word)}>Vérifier ma traduction</button></div> : <div className="answer-options">{choices.map((choice) => <button key={choice} disabled={result !== null} className={result ? (normalizeGuidedAnswer(choice) === normalizeGuidedAnswer(expected) ? "correct" : "") : ""} onClick={() => onAnswer(choice, kind, word)}>{choice}</button>)}</div>}
    {result && <div className={`guided-feedback ${result.correct ? "correct" : "wrong"}`}><div><b>{result.correct ? `Juste ! +${5 + Math.min(10, Math.max(0, combo - 1) * 2)} XP` : "À retravailler"}</b><span>{result.correct ? "Ta série renforce la lumière de ta Lanterne." : `Réponse attendue : ${result.expected}`}</span></div><button onClick={onNext}>{step + 1 === total ? "Terminer" : "Continuer"} <ChevronRight /></button></div>}
  </article>;
}

function QuizExercise({ pool, type, word, input, answer, onInput, onSpeak, onAnswer, onNext }: { pool: VocabularyWord[]; type: QuizType; word: VocabularyWord; input: string; answer: string | null; onInput: (value: string) => void; onSpeak: () => void; onAnswer: (value: string) => void; onNext: () => void }) {
  const expected = type === "reverse-choice" || type === "dictation" || type === "character" ? word.hanzi : type === "pinyin" ? word.pinyin : word.french;
  const options = type === "reverse-choice" || type === "dictation" || type === "character" ? choiceValues(pool, word, "hanzi") : choiceValues(pool, word, "french");
  const prompt = type === "reverse-choice" ? `Quel caractère signifie « ${word.french} » ?` : type === "pinyin" ? `Écris le pinyin de ${word.hanzi}` : type === "dictation" ? "Écoute puis choisis le caractère" : type === "cloze" ? word.example.replace(word.hanzi, "____") : type === "matching" ? `Associe ${word.hanzi} à son sens` : type === "character" ? `Quel caractère correspond à « ${word.french} » ?` : `Que signifie ${word.hanzi} ?`;
  const correct = answer ? answerMatches(answer, expected, type) : false;
  return <article className="quiz-exercise"><span className="eyebrow">{type.toUpperCase()}</span><h3>{prompt}</h3>{type === "dictation" && <button className="outline" onClick={onSpeak}><Volume2 /> Écouter</button>}{type === "pinyin" || type === "cloze" ? <div className="inline-answer"><input value={input} onChange={(event) => onInput(event.target.value)} disabled={answer !== null} placeholder="Ta réponse" /><button className="coral" disabled={!input.trim() || answer !== null} onClick={() => onAnswer(input)}>Vérifier</button></div> : <div className="answer-options">{options.map((option) => <button key={option} disabled={answer !== null} className={answer ? (option === expected ? "correct" : answer === option ? "wrong" : "") : ""} onClick={() => onAnswer(option)}>{option}</button>)}</div>}{answer && <div className={`result ${correct ? "correct" : "wrong"}`}>{correct ? "Bonne réponse !" : `Réponse attendue : ${expected}`}<button onClick={onNext}>Question suivante <ChevronRight /></button></div>}</article>;
}

function ExamQuestion({ pool, level, index, time, answer, onAnswer, onNext, onAbandon }: { pool: VocabularyWord[]; level: number; index: number; time: number; answer: string | null; onAnswer: (value: string) => void; onNext: () => void; onAbandon: () => void }) {
  const words = pool.filter((item) => item.level <= level);
  const word = words[index % words.length];
  return <div className="exam-live"><div className="exam-head"><b>{Math.floor(time / 60).toString().padStart(2, "0")}:{(time % 60).toString().padStart(2, "0")}</b><span>Question {index + 1} / 20</span></div><div className="exam-progress"><i style={{ width: `${((index + 1) / 20) * 100}%` }} /></div><p>Quel caractère signifie « {word.french} » ?</p><div className="answer-options">{choiceValues(pool, word, "hanzi").map((choice) => <button key={choice} disabled={answer !== null} className={answer ? (choice === word.hanzi ? "correct" : answer === choice ? "wrong" : "") : ""} onClick={() => onAnswer(choice)}>{choice}</button>)}</div>{answer && <button className="coral" onClick={onNext}>{index === 19 ? "Terminer" : "Question suivante"}</button>}<button className="text-button danger" onClick={onAbandon}>Abandonner l’examen</button></div>;
}

// Supabase rows are runtime-validated by the database constraints and RLS schema.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromProgress(row: Record<string, any>): ReviewState { return { wordId: row.word_id, favorite: row.favorite, mastery: row.mastery, repetitions: row.repetitions, intervalDays: row.interval_days, dueAt: row.due_at, lastRating: row.last_rating, lastSeenAt: row.last_seen_at }; }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromEvent(row: Record<string, any>): ReviewEvent { return { id: row.id, wordId: row.word_id, rating: row.rating, correct: row.correct, quizType: row.quiz_type, durationMs: row.duration_ms, createdAt: row.created_at }; }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromQuiz(row: Record<string, any>): QuizResult { return { id: row.id, mode: row.mode, quizType: row.quiz_type, level: row.level, score: row.score, total: row.total, durationSeconds: row.duration_seconds, completedAt: row.completed_at }; }
async function requireOk(result: PromiseLike<{ error: { message: string } | null }> | { error: { message: string } | null }) { const resolved = await result; if (resolved.error) throw new Error(resolved.error.message); }
function formatDuration(seconds: number) { if (seconds < 60) return `${seconds} s`; const hours = Math.floor(seconds / 3600); const minutes = Math.floor((seconds % 3600) / 60); return hours ? `${hours} h ${minutes}` : `${minutes} min`; }

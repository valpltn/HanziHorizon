"use client";

/* The bamboo asset is already resized and compressed; a plain img avoids the
   Vinext development image proxy while retaining explicit dimensions. */
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  BarChart3, BrainCircuit, CalendarDays, Check, ChevronLeft, ChevronRight,
  Clock3, Cloud, CloudOff, Flame, GraduationCap, Heart, Library, LoaderCircle,
  LockKeyhole, LogIn, LogOut, Menu, PenLine, Play, RotateCcw, Search, Settings,
  Sparkles, UserRound, Volume2, X,
} from "lucide-react";
import { lessons, source, vocabulary } from "../data/catalog";
import {
  answerMatches, calculateStats, clearGuestSnapshot, emptySettings,
  loadGuestSnapshot, mergeGuestProgress, saveGuestSnapshot, scheduleReview,
} from "../lib/learning-store";
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
const totalByLevel = Object.fromEntries(Array.from({ length: 9 }, (_, i) => [i + 1, vocabulary.filter((word) => word.level === i + 1).length]));
const newId = () => crypto.randomUUID();
const initialProgress = (wordId: string): ReviewState => ({ wordId, favorite: false, mastery: 0, repetitions: 0, intervalDays: 0, dueAt: null, lastRating: null, lastSeenAt: null });
const choiceValues = (word: VocabularyWord, field: "hanzi" | "french") => [word, ...vocabulary.filter((item) => item.id !== word.id).slice(0, 3)].map((item) => item[field]).sort((a, b) => a.localeCompare(b, "zh"));
const toProgressRow = (userId: string, state: ReviewState) => ({ user_id: userId, word_id: state.wordId, favorite: state.favorite, mastery: state.mastery, repetitions: state.repetitions, interval_days: state.intervalDays, due_at: state.dueAt, last_rating: state.lastRating, last_seen_at: state.lastSeenAt, updated_at: new Date().toISOString() });
const toEventRow = (userId: string, event: ReviewEvent) => ({ id: event.id, user_id: userId, word_id: event.wordId, rating: event.rating, correct: event.correct, quiz_type: event.quizType, duration_ms: event.durationMs, created_at: event.createdAt });
const toQuizRow = (userId: string, result: QuizResult) => ({ id: result.id, user_id: userId, mode: result.mode, quiz_type: result.quizType, level: result.level, score: result.score, total: result.total, duration_seconds: result.durationSeconds, completed_at: result.completedAt });

export function LearningApp() {
  const [section, setSection] = useState<Section>("today");
  const [snapshot, setSnapshot] = useState<LearningSnapshot>(() => loadGuestSnapshot());
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sync, setSync] = useState<SyncState>("local");
  const [notice, setNotice] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
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
  const actionStarted = useRef(Date.now());
  const lastQuizSubmission = useRef("");

  const word = vocabulary[wordIndex % vocabulary.length];
  const stats = useMemo(() => calculateStats(snapshot.progress, snapshot.reviewEvents, snapshot.quizResults, totalByLevel), [snapshot]);
  const reviewPool = useMemo(() => lessonPracticeIds ? vocabulary.filter((item) => lessonPracticeIds.includes(item.id)) : vocabulary, [lessonPracticeIds]);
  const dueWords = useMemo(() => reviewPool.filter((item) => !snapshot.progress[item.id]?.dueAt || new Date(snapshot.progress[item.id].dueAt!) <= new Date()), [reviewPool, snapshot.progress]);
  const reviewWord = lessonPracticeIds ? (reviewPool[lessonPracticeIndex] ?? word) : (dueWords[wordIndex % Math.max(1, dueWords.length)] ?? word);
  const themes = useMemo(() => ["Tous", ...new Set(vocabulary.map((item) => item.theme))], []);
  const today = new Date().toISOString().slice(0, 10);
  const learnedToday = new Set(snapshot.reviewEvents.filter((event) => event.correct && event.createdAt.startsWith(today)).map((event) => event.wordId)).size;
  const filtered = useMemo(() => vocabulary.filter((item) => {
    const query = search.trim().toLocaleLowerCase("fr");
    const progress = snapshot.progress[item.id];
    return (!query || `${item.hanzi} ${item.pinyin} ${item.french}`.toLocaleLowerCase("fr").includes(query))
      && (!filterLevel || item.level === filterLevel)
      && (filterTheme === "Tous" || item.theme === filterTheme)
      && (filterStatus === "tous" || (filterStatus === "favoris" && progress?.favorite) || (filterStatus === "appris" && (progress?.mastery ?? 0) > 0) || (filterStatus === "a-revoir" && progress?.dueAt && new Date(progress.dueAt) <= new Date()));
  }), [search, filterLevel, filterTheme, filterStatus, snapshot.progress]);
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
      else { setSnapshot(loadGuestSnapshot()); setSync("local"); setLoading(false); }
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

  async function loadCloud(activeUser: User) {
    const supabase = getSupabaseBrowserClient();
    setLoading(true); setSync("syncing"); setNotice("");
    try {
      const [settings, progress, events, quizzes] = await Promise.all([
        supabase.from("user_settings").select("*").eq("user_id", activeUser.id).maybeSingle(),
        supabase.from("word_progress").select("*").eq("user_id", activeUser.id),
        supabase.from("review_events").select("*").eq("user_id", activeUser.id).order("created_at"),
        supabase.from("quiz_attempts").select("*").eq("user_id", activeUser.id).order("completed_at"),
      ]);
      const firstError = [settings.error, progress.error, events.error, quizzes.error].find(Boolean);
      if (firstError) throw firstError;
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
        ? { dailyGoal: settings.data.daily_goal, activeLevel: settings.data.active_level, showTones: settings.data.show_tones, guestImportedAt: settings.data.guest_imported_at }
        : hasGuest ? guest.settings : { ...emptySettings };
      await requireOk(supabase.from("user_settings").upsert({ user_id: activeUser.id, daily_goal: settingsValue.dailyGoal, active_level: settingsValue.activeLevel, show_tones: settingsValue.showTones, guest_imported_at: hasGuest ? new Date().toISOString() : settingsValue.guestImportedAt, updated_at: new Date().toISOString() }));
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

  function goTo(nextSection: Section) { setSection(nextSection); setMenuOpen(false); setNotice(""); setVisibleWordCount(libraryPageSize); }
  function lessonProgressValue(item: Lesson) {
    if (!item.words.length) return 0;
    const targetMastery = item.kind === "discover" ? 1 : item.kind === "practice" ? 2 : 3;
    const learned = item.words.filter((id) => (snapshot.progress[id]?.mastery ?? 0) >= targetMastery).length;
    return Math.round((learned / item.words.length) * 100);
  }
  function isLessonComplete(item: Lesson) { return lessonProgressValue(item) >= 80; }
  function isLessonUnlocked(item: Lesson) {
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
    actionStarted.current = Date.now();
    goTo("review");
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

  async function saveSettings(key: "dailyGoal" | "activeLevel" | "showTones", value: number | boolean) {
    const settings = { ...snapshot.settings, [key]: value };
    const next = { ...snapshot, settings };
    await commit(next, user ? async () => requireOk(getSupabaseBrowserClient().from("user_settings").upsert({ user_id: user.id, daily_goal: settings.dailyGoal, active_level: settings.activeLevel, show_tones: settings.showTones, updated_at: new Date().toISOString() })) : undefined);
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

  return <main className="learning-app">
    <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
      <div className="mark"><span>学</span><b>Hanzi<br />Horizon</b><button className="mobile-close" onClick={() => setMenuOpen(false)} aria-label="Fermer le menu"><X /></button></div>
      <nav aria-label="Navigation principale">{nav.map(([id, label, Icon]) => <button key={id} onClick={() => goTo(id)} className={section === id ? "active" : ""}><Icon size={19} /><span>{label}</span></button>)}</nav>
      <div className="sidebar-art" />
      <div className="streak"><Flame /><div><b>{stats.streakDays} jour{stats.streakDays > 1 ? "s" : ""}</b><small>de régularité</small></div></div>
    </aside>
    {menuOpen && <button className="menu-backdrop" onClick={() => setMenuOpen(false)} aria-label="Fermer le menu" />}

    <section className="workspace">
      <header className="topbar">
        <button className="menu-button" onClick={() => setMenuOpen(true)} aria-label="Ouvrir le menu"><Menu /></button>
        <div><h1>{titles[section]}</h1><p>{section === "today" ? "Un mot, une révision, puis un défi." : "Ton parcours personnel, à ton rythme."}</p></div>
        <button className="profile" onClick={() => setProfileOpen(true)} aria-label="Ouvrir le profil">{user?.email?.[0].toUpperCase() ?? <UserRound />}</button>
      </header>

      {notice && <div className="notice" role="status"><span>{notice}</span>{sync === "offline" && user && <button onClick={() => void loadCloud(user)}><RotateCcw /> Réessayer</button>}<button onClick={() => setNotice("")} aria-label="Fermer"><X /></button></div>}
      {loading && <div className="loading" role="status"><LoaderCircle className="spin" /> Chargement de ta progression…</div>}

      {!loading && section === "today" && <>
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
        <section className="quick-quiz"><div><span className="quiz-icon">?</span><h2>Quiz rapide</h2><p>Quel caractère correspond à « {word.french} » ?</p></div><div className="answer-options">{choiceValues(word, "hanzi").map((choice) => <button key={choice} disabled={quickAnswer !== null} className={quickAnswer ? (choice === word.hanzi ? "correct" : quickAnswer === choice ? "wrong" : "") : ""} onClick={() => { setQuickAnswer(choice); void answerQuiz(choice, "reverse-choice"); }}>{choice}</button>)}</div>{quickAnswer && <small>{quickAnswer === word.hanzi ? "Exact ! Résultat enregistré." : `Pas encore : la bonne réponse est ${word.hanzi}.`}</small>}</section>
      </>}

      {!loading && section === "review" && <section className="review-panel">
        <div className="review-summary"><div><span className="eyebrow">{lessonPracticeIds ? "LEÇON GUIDÉE" : "FILE DU JOUR"}</span><h2>{lessonPracticeIds ? `${lessonPracticeIndex + 1} / ${reviewPool.length} · ${lesson?.theme ?? "Parcours thématique"}` : `${dueWords.length} mot${dueWords.length > 1 ? "s" : ""} à réviser`}</h2><p>{lessonPracticeIds ? "Découvre, rappelle puis consolide chaque mot de la leçon." : "Les intervalles s’adaptent à chacune de tes réponses."}</p></div><button className="coral" onClick={() => { setReviewActive(true); setReviewRating(null); actionStarted.current = Date.now(); }}><Play /> {lessonPracticeIds ? "Continuer" : "Commencer la session"}</button></div>
        {reviewActive ? <article className="review-card"><span>NIVEAU {reviewWord.level} · {reviewWord.theme}</span><button className="sound" onClick={() => speak(reviewWord.hanzi)}><Volume2 /></button><div className="hanzi">{reviewWord.hanzi}</div><p className="pinyin">{reviewWord.pinyin}</p><p>{reviewWord.french}</p><div className="rating-row">{ratings.map(([value, label]) => <button className={reviewRating === value ? `rated ${value}` : ""} key={value} disabled={reviewRating !== null} onClick={() => void rateReview(value)}>{label}</button>)}</div>{reviewRating && <p className="feedback">Prochaine révision programmée. <button onClick={nextWord}>Mot suivant <ChevronRight /></button></p>}</article> : <div className="empty-state"><BrainCircuit /><h3>Ta file est prête</h3><p>Commence quand tu as cinq minutes devant toi.</p></div>}
      </section>}

      {!loading && section === "lessons" && <section className="lesson-path">{lesson ? <div className="lesson-detail"><button className="text-button" onClick={() => setLessonId(null)}>← Retour au parcours</button><span className="eyebrow">{levelLabel(lesson.level)} · {lesson.kind === "discover" ? "DÉCOUVERTE" : lesson.kind === "practice" ? "PRATIQUE" : "DÉFI"}</span><h2>{lesson.title}</h2><p>{lesson.goal}</p><div className="lesson-meta"><span><Clock3 /> {lesson.durationMinutes} min</span><span><Sparkles /> {lesson.xp} XP</span><span><Check /> {lessonProgressValue(lesson)} % acquis</span></div><div className="lesson-words">{lessonWords.map((item) => <article key={item.id}><b>{item.hanzi}</b><span>{item.pinyin}</span><p>{item.french}</p><button onClick={() => speak(item.hanzi)} aria-label={`Écouter ${item.hanzi}`}><Volume2 /></button></article>)}</div><button className="coral" onClick={() => startLesson(lesson)}><Play /> {lessonProgressValue(lesson) ? "Reprendre la leçon" : "Commencer la leçon"}</button></div> : <><div className="path-intro"><div><span className="eyebrow">PARCOURS HSK GUIDÉ</span><h2>Avance thème par thème</h2><p>Chaque unité répète le même vocabulaire en trois étapes : découverte, mise en situation et défi.</p></div><div className="level-progress"><b>{Math.round(lessons.filter((item) => item.level === lessonLevel).reduce((sum, item) => sum + lessonProgressValue(item), 0) / Math.max(1, lessons.filter((item) => item.level === lessonLevel).length))}%</b><span>du niveau</span></div></div><div className="level-tabs" role="tablist" aria-label="Choisir un niveau HSK">{levelOptions.map((value) => <button role="tab" aria-selected={lessonLevel === value} className={lessonLevel === value ? "active" : ""} key={value} onClick={() => { setLessonLevel(value); setLessonId(null); }}>{levelLabel(value)}</button>)}</div><div className="unit-list">{lessonUnits.map((unitLessons, unitIndex) => { const unit = unitLessons[0]; const unitLocked = unitIndex > 0 && !isLessonComplete(lessonUnits[unitIndex - 1].at(-1)!); const unitProgress = Math.round(unitLessons.reduce((sum, item) => sum + lessonProgressValue(item), 0) / unitLessons.length); return <article className={`lesson-unit ${unitLocked ? "locked" : ""}`} key={unit.unitId}><header><div><span>UNITÉ {unit.unitOrder}</span><h2>{unit.unitTitle}</h2><p>{unit.unitDescription}</p></div><div className="unit-progress"><b>{unitProgress}%</b><i><span style={{ width: `${unitProgress}%` }} /></i></div></header><div className="lesson-nodes">{unitLessons.map((item) => { const unlocked = isLessonUnlocked(item); const progress = lessonProgressValue(item); const complete = isLessonComplete(item); return <button key={item.id} disabled={!unlocked} className={`lesson-node ${item.kind} ${complete ? "complete" : ""}`} onClick={() => setLessonId(item.id)}><span className="node-icon">{!unlocked ? <LockKeyhole /> : complete ? <Check /> : item.kind === "checkpoint" ? <Sparkles /> : <GraduationCap />}</span><span><small>{item.kind === "discover" ? "1 · Découvrir" : item.kind === "practice" ? "2 · En situation" : "3 · Défi"}</small><b>{item.words.length} mots · {item.durationMinutes} min</b><i><span style={{ width: `${progress}%` }} /></i></span></button>; })}</div></article>; })}</div></>}</section>}

      {!loading && (section === "library" || section === "favorites") && <section className="library-view"><div className="library-head"><div><h2>{section === "favorites" ? "Tes favoris" : "Tout le vocabulaire"}</h2><p>{source.title} · {source.version}</p><small>{libraryResults.length.toLocaleString("fr-FR")} résultat{libraryResults.length > 1 ? "s" : ""}</small></div><label className="search"><Search /><input value={search} onChange={(event) => { setSearch(event.target.value); setVisibleWordCount(libraryPageSize); }} placeholder="Mot, pinyin ou français" /></label></div><div className="filters"><select value={filterLevel} onChange={(event) => { setFilterLevel(Number(event.target.value)); setVisibleWordCount(libraryPageSize); }} aria-label="Filtrer par niveau"><option value={0}>Tous les niveaux</option>{levelOptions.map((value) => <option key={value} value={value}>{levelLabel(value)}</option>)}</select><select value={filterTheme} onChange={(event) => { setFilterTheme(event.target.value); setVisibleWordCount(libraryPageSize); }} aria-label="Filtrer par thème">{themes.map((item) => <option key={item}>{item}</option>)}</select><select value={section === "favorites" ? "favoris" : filterStatus} onChange={(event) => { setFilterStatus(event.target.value); setVisibleWordCount(libraryPageSize); }} disabled={section === "favorites"} aria-label="Filtrer par statut"><option value="tous">Tous les statuts</option><option value="favoris">Favoris</option><option value="appris">Déjà vus</option><option value="a-revoir">À revoir</option></select></div><div className="word-table">{visibleLibraryWords.map((item) => <article key={item.id}><button className="favorite" onClick={() => void toggleFavorite(item)} aria-label={snapshot.progress[item.id]?.favorite ? "Retirer des favoris" : "Ajouter aux favoris"}>{snapshot.progress[item.id]?.favorite ? "★" : "☆"}</button><b>{item.hanzi}</b><span>{item.pinyin}</span><span>{item.french}</span><small>{levelLabel(item.level)} · {item.theme}</small><button className="listen" onClick={() => speak(item.hanzi)}><Volume2 /> Écouter</button></article>)}{!libraryResults.length && <div className="empty-state"><Search /><h3>Aucun mot trouvé</h3><p>Modifie les filtres ou ajoute des favoris depuis la bibliothèque.</p></div>}</div>{visibleWordCount < libraryResults.length && <button className="coral library-more" onClick={() => setVisibleWordCount((count) => count + libraryPageSize)}>Afficher 120 mots de plus</button>}<p className="source-credit">Définitions françaises : <a href={source.dictionaryUrl} target="_blank" rel="noreferrer">CFDICT</a> · Liste HSK : <a href={source.url} target="_blank" rel="noreferrer">ivankra/hsk30</a></p></section>}

      {!loading && section === "quiz" && <section className="quiz-lab"><h2>Choisis un exercice</h2><div className="quiz-cards">{quizTypes.map((item) => <button className={`quiz-choice ${quizType === item.id ? "active" : ""}`} key={item.id} onClick={() => { setQuizType(item.id); setQuizAnswer(null); setQuizInput(""); lastQuizSubmission.current = ""; actionStarted.current = Date.now(); }}><b>{item.title}</b><span>{item.text}</span><i>→</i></button>)}</div><QuizExercise type={quizType} word={word} input={quizInput} answer={quizAnswer} onInput={setQuizInput} onSpeak={() => speak(word.hanzi)} onAnswer={(value) => void answerQuiz(value)} onNext={nextWord} /><p className="scoreline">Session : {quizScore.correct} bonne{quizScore.correct > 1 ? "s" : ""} réponse{quizScore.correct > 1 ? "s" : ""} sur {quizScore.total}</p></section>}

      {!loading && section === "exam" && <section className="exam"><span className="eyebrow">SIMULATION HSK</span><h2>20 questions · 15 minutes</h2><p>Les erreurs sont ajoutées aux statistiques et orientent tes prochaines révisions.</p>{!examStarted && !examDone && <><label>Niveau maximum <select value={examLevel} onChange={(event) => setExamLevel(Number(event.target.value))}>{[1, 2, 3].map((value) => <option key={value} value={value}>HSK {value}</option>)}</select></label><button className="coral" onClick={beginExam}><Clock3 /> Lancer l’examen</button></>}{examStarted && <ExamQuestion level={examLevel} index={examIndex} time={examTime} answer={examAnswer} onAnswer={(value) => void answerExam(value)} onNext={nextExamQuestion} onAbandon={() => { setExamStarted(false); setExamDone(false); setNotice("Examen abandonné : aucun résultat n’a été enregistré."); }} />}{examDone && <div className="exam-result"><Check /><h3>Examen terminé</h3><b>{examScore} / 20</b><p>Le résultat est enregistré dans tes statistiques.</p><button className="coral" onClick={beginExam}>Recommencer</button></div>}</section>}

      {!loading && section === "writing" && <WritingBoard hanzi={word.hanzi} pinyin={word.pinyin} onSpeak={() => speak(word.hanzi)} onNext={nextWord} />}

      {!loading && section === "stats" && <section className="stats"><div className="stat"><span>Mots maîtrisés</span><b>{stats.masteredWords}</b><small>Maîtrise 3 ou plus</small></div><div className="stat"><span>Précision</span><b>{stats.precision}%</b><small>Quiz et révisions</small></div><div className="stat"><span>Temps d’étude</span><b>{formatDuration(stats.studySeconds)}</b><small>Activité enregistrée</small></div><article className="chart"><h2>Activité des 7 derniers jours</h2><div className="bars">{stats.weeklyActivity.map((value, itemIndex) => <div key={itemIndex}><i style={{ height: `${Math.max(4, value * 12)}%` }} /><small>{["L", "M", "M", "J", "V", "S", "D"][itemIndex]}</small><span>{value}</span></div>)}</div></article><article className="mistakes"><h2>À retravailler</h2>{stats.frequentErrors.length ? stats.frequentErrors.map((id) => { const item = vocabulary.find((candidate) => candidate.id === id); return item ? <p key={id}><b>{item.hanzi}</b> · {item.pinyin} · {item.french}</p> : null; }) : <p>Aucune erreur enregistrée pour le moment.</p>}<button className="coral" onClick={() => goTo("review")}>Réviser ces mots</button></article></section>}

      {!loading && section === "settings" && <section className="settings"><h2>Ton rythme</h2><label>Objectif quotidien <output>{snapshot.settings.dailyGoal} mots</output><input type="range" min="5" max="50" step="5" value={snapshot.settings.dailyGoal} onChange={(event) => void saveSettings("dailyGoal", Number(event.target.value))} /></label><label>Niveau actif <select value={snapshot.settings.activeLevel} onChange={(event) => void saveSettings("activeLevel", Number(event.target.value))}>{levelOptions.map((value) => <option key={value} value={value}>{levelLabel(value)}</option>)}</select></label><label className="toggle"><span>Afficher les tons dans le pinyin</span><input type="checkbox" checked={snapshot.settings.showTones} onChange={(event) => void saveSettings("showTones", event.target.checked)} /></label><article><b>Stockage et confidentialité</b><p>{user ? "Tes paramètres et statistiques sont synchronisés avec ton compte." : "En mode découverte, les données restent temporairement sur cet appareil."}</p></article></section>}
    </section>

    {profileOpen && <><button className="panel-backdrop" onClick={() => setProfileOpen(false)} aria-label="Fermer le profil" /><aside className="profile-panel" aria-label="Profil"><button className="icon-button close-button" onClick={() => setProfileOpen(false)} aria-label="Fermer"><X /></button><div className="profile-avatar"><UserRound /></div><h2>{user ? "Mon profil" : "Mode découverte"}</h2><p>{user?.email ?? "Connecte-toi pour retrouver ta progression partout."}</p><div className={`sync-state ${sync}`}><span>{sync === "offline" ? <CloudOff /> : <Cloud />}</span><div><b>{syncLabel}</b><small>{user ? "Supabase sécurisé par ton compte" : "Navigateur actuel"}</small></div></div>{user ? <><button className="panel-action" onClick={() => { setProfileOpen(false); goTo("settings"); }}><Settings /> Réglages</button><button className="panel-action" onClick={() => { setProfileOpen(false); setAuthMode("forgot"); setAuthOpen(true); }}><LogIn /> Changer le mot de passe</button><button className="panel-action danger" onClick={() => void getSupabaseBrowserClient().auth.signOut()}><LogOut /> Se déconnecter</button></> : <button className="coral full" onClick={() => { setProfileOpen(false); setAuthMode("signin"); setAuthOpen(true); }}><LogIn /> Se connecter</button>}</aside></>}
    <AuthDialog key={`${authMode}-${authOpen}`} open={authOpen} initialMode={authMode} onClose={() => setAuthOpen(false)} />
  </main>;
}

function QuizExercise({ type, word, input, answer, onInput, onSpeak, onAnswer, onNext }: { type: QuizType; word: VocabularyWord; input: string; answer: string | null; onInput: (value: string) => void; onSpeak: () => void; onAnswer: (value: string) => void; onNext: () => void }) {
  const expected = type === "reverse-choice" || type === "dictation" || type === "character" ? word.hanzi : type === "pinyin" ? word.pinyin : word.french;
  const options = type === "reverse-choice" || type === "dictation" || type === "character" ? choiceValues(word, "hanzi") : choiceValues(word, "french");
  const prompt = type === "reverse-choice" ? `Quel caractère signifie « ${word.french} » ?` : type === "pinyin" ? `Écris le pinyin de ${word.hanzi}` : type === "dictation" ? "Écoute puis choisis le caractère" : type === "cloze" ? word.example.replace(word.hanzi, "____") : type === "matching" ? `Associe ${word.hanzi} à son sens` : type === "character" ? `Quel caractère correspond à « ${word.french} » ?` : `Que signifie ${word.hanzi} ?`;
  const correct = answer ? answerMatches(answer, expected, type) : false;
  return <article className="quiz-exercise"><span className="eyebrow">{type.toUpperCase()}</span><h3>{prompt}</h3>{type === "dictation" && <button className="outline" onClick={onSpeak}><Volume2 /> Écouter</button>}{type === "pinyin" || type === "cloze" ? <div className="inline-answer"><input value={input} onChange={(event) => onInput(event.target.value)} disabled={answer !== null} placeholder="Ta réponse" /><button className="coral" disabled={!input.trim() || answer !== null} onClick={() => onAnswer(input)}>Vérifier</button></div> : <div className="answer-options">{options.map((option) => <button key={option} disabled={answer !== null} className={answer ? (option === expected ? "correct" : answer === option ? "wrong" : "") : ""} onClick={() => onAnswer(option)}>{option}</button>)}</div>}{answer && <div className={`result ${correct ? "correct" : "wrong"}`}>{correct ? "Bonne réponse !" : `Réponse attendue : ${expected}`}<button onClick={onNext}>Question suivante <ChevronRight /></button></div>}</article>;
}

function ExamQuestion({ level, index, time, answer, onAnswer, onNext, onAbandon }: { level: number; index: number; time: number; answer: string | null; onAnswer: (value: string) => void; onNext: () => void; onAbandon: () => void }) {
  const words = vocabulary.filter((item) => item.level <= level);
  const word = words[index % words.length];
  return <div className="exam-live"><div className="exam-head"><b>{Math.floor(time / 60).toString().padStart(2, "0")}:{(time % 60).toString().padStart(2, "0")}</b><span>Question {index + 1} / 20</span></div><div className="exam-progress"><i style={{ width: `${((index + 1) / 20) * 100}%` }} /></div><p>Quel caractère signifie « {word.french} » ?</p><div className="answer-options">{choiceValues(word, "hanzi").map((choice) => <button key={choice} disabled={answer !== null} className={answer ? (choice === word.hanzi ? "correct" : answer === choice ? "wrong" : "") : ""} onClick={() => onAnswer(choice)}>{choice}</button>)}</div>{answer && <button className="coral" onClick={onNext}>{index === 19 ? "Terminer" : "Question suivante"}</button>}<button className="text-button danger" onClick={onAbandon}>Abandonner l’examen</button></div>;
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

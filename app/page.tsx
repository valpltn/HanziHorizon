"use client";

import { useEffect, useState } from "react";

const words = [
  { hanzi: "你", pinyin: "nǐ", french: "tu", sentence: "你好吗？", translation: "Comment vas-tu ?" },
  { hanzi: "好", pinyin: "hǎo", french: "bien / bon", sentence: "我很好。", translation: "Je vais très bien." },
  { hanzi: "谢谢", pinyin: "xièxie", french: "merci", sentence: "谢谢你！", translation: "Merci !" },
  { hanzi: "再见", pinyin: "zàijiàn", french: "au revoir", sentence: "明天再见。", translation: "À demain." },
];

export default function Home() {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [learned, setLearned] = useState(5);
  const [answer, setAnswer] = useState<string | null>(null);
  const word = words[index];

  useEffect(() => setRevealed(false), [index]);
  const speak = () => {
    const utterance = new SpeechSynthesisUtterance(word.hanzi);
    utterance.lang = "zh-CN";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };
  const next = () => { setIndex((index + 1) % words.length); setLearned((value) => Math.min(10, value + 1)); };

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#today"><span>汉</span> Hanzi<br />Horizon</a>
        <nav aria-label="Navigation principale">
          <a className="active" href="#today">Aujourd’hui</a>
          <a href="#flashcards">Flashcards</a>
          <a href="#quiz">Quiz</a>
          <a href="#library">Bibliothèque</a>
        </nav>
        <div className="streak"><span>火</span><div><b>3 jours</b><small>de suite</small></div></div>
        <div className="sidebar-note">Un petit pas chaque jour, un grand voyage en chinois.</div>
      </aside>

      <section className="content" id="today">
        <header><div><p className="date">LUNDI · 21 JUILLET</p><h1>Bonjour, Léa.</h1><p className="intro">Ton rituel du jour : un mot, une phrase, puis un défi.</p></div><div className="avatar" aria-label="Profil de Léa">L</div></header>

        <div className="progress-row"><div><span>Objectif du jour</span><strong>{learned} <em>/ 10 mots</em></strong></div><div className="progress-bar"><i style={{ width: `${learned * 10}%` }} /></div><b>{learned * 10}%</b></div>

        <section className="lesson-grid" id="flashcards">
          <article className="flashcard">
            <div className="card-top"><span>LE MOT DU JOUR</span><button onClick={speak} aria-label="Écouter la prononciation">◖))</button></div>
            <div className="character">{word.hanzi}</div>
            <p className="pinyin">{word.pinyin}</p>
            <div className={`definition ${revealed ? "shown" : ""}`}><b>{word.french}</b><span>{word.sentence} · {word.translation}</span></div>
            <div className="card-actions"><button className="secondary" onClick={() => setRevealed(!revealed)}>{revealed ? "Masquer" : "Révéler"}</button><button className="primary" onClick={next}>Je connais →</button></div>
          </article>
          <article className="guide-card"><p>À retenir</p><h2>Les tons changent le sens.</h2><div className="tones"><span>mā</span><span>má</span><span>mǎ</span><span>mà</span></div><small>Écoute, répète, puis prononce à voix haute.</small></article>
        </section>

        <section className="quiz" id="quiz"><div><p>MINI-QUIZ</p><h2>Que signifie 好 ?</h2></div><div className="quiz-options">{["merci", "bien / bon", "au revoir"].map((option) => <button className={answer === option ? (option === "bien / bon" ? "correct" : "wrong") : ""} onClick={() => setAnswer(option)} key={option}>{option}</button>)}</div>{answer && <small>{answer === "bien / bon" ? "Exact ! 好 (hǎo) veut dire bien ou bon." : "Presque. Réessaie : pense à l’expression 很好."}</small>}</section>

        <section className="library" id="library"><div><h2>Continue là où tu t’es arrêtée</h2><p>Des leçons courtes pour garder le rythme.</p></div><button className="text-button" onClick={() => setIndex(0)}>Voir tout</button><div className="lesson-list"><article><span className="number">01</span><div><b>Saluer et se présenter</b><small>8 mots · 5 min</small></div><span className="done">Terminé</span></article><article><span className="number">02</span><div><b>Dire merci et au revoir</b><small>10 mots · 6 min</small></div><button onClick={() => setIndex(2)}>Commencer</button></article></div></section>
      </section>
    </main>
  );
}

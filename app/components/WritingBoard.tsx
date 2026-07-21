"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Eraser, RotateCcw, Volume2 } from "lucide-react";

export function WritingBoard({ hanzi, pinyin, onSpeak, onNext }: { hanzi: string; pinyin: string; onSpeak: () => void; onNext: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [strokes, setStrokes] = useState(0);
  const [feedback, setFeedback] = useState("");

  const resize = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect(); const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * ratio); canvas.height = Math.round(rect.height * ratio);
    canvas.getContext("2d")?.scale(ratio, ratio); setStrokes(0); setFeedback("");
  };
  useEffect(() => { resize(); window.addEventListener("resize", resize); return () => window.removeEventListener("resize", resize); }, [hanzi]);
  const point = (event: React.PointerEvent<HTMLCanvasElement>) => { const rect = event.currentTarget.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top }; };
  const clear = () => { const canvas = canvasRef.current; canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height); setStrokes(0); setFeedback(""); };

  return <div className="writing-layout">
    <div className="writing-copy"><span className="eyebrow">ENTRAÎNEMENT D’ÉCRITURE</span><h2>Trace le caractère</h2><p>Observe le modèle, puis reproduis sa structure avec la souris ou le doigt.</p><button className="outline" onClick={onSpeak}><Volume2 /> Écouter {pinyin}</button></div>
    <div className="writing-board"><div className="writing-grid" /><div className="ghost-character">{hanzi}</div><canvas ref={canvasRef} aria-label={`Zone de dessin pour le caractère ${hanzi}`}
      onPointerDown={(event) => { drawing.current = true; event.currentTarget.setPointerCapture(event.pointerId); const context = event.currentTarget.getContext("2d"); const position = point(event); context?.beginPath(); context?.moveTo(position.x, position.y); setStrokes((value) => value + 1); }}
      onPointerMove={(event) => { if (!drawing.current) return; const context = event.currentTarget.getContext("2d"); const position = point(event); if (context) { context.lineWidth = 7; context.lineCap = "round"; context.lineJoin = "round"; context.strokeStyle = "#ef6258"; context.lineTo(position.x, position.y); context.stroke(); } }}
      onPointerUp={() => { drawing.current = false; }} onPointerCancel={() => { drawing.current = false; }} />
      <div className="writing-toolbar"><button onClick={clear}><Eraser /> Effacer</button><button onClick={clear}><RotateCcw /> Recommencer</button><button onClick={() => setFeedback(strokes >= Math.max(2, hanzi.length * 2) ? "Forme enregistrée : continue à travailler la proportion des traits." : "Ajoute encore quelques traits avant de valider.")}><Check /> Valider</button><button className="coral" onClick={() => { clear(); onNext(); }}>Suivant</button></div>
      {feedback && <p className="writing-feedback" role="status">{feedback}</p>}
    </div>
  </div>;
}

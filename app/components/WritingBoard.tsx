"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Eraser, RotateCcw, Volume2 } from "lucide-react";

export function WritingBoard({ hanzi, pinyin, onSpeak, onNext }: { hanzi: string; pinyin: string; onSpeak: () => void; onNext: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [strokes, setStrokes] = useState(0);
  const [feedback, setFeedback] = useState("");

  const resize = (preserve = true) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const copy = document.createElement("canvas");
    if (preserve && canvas.width && canvas.height) {
      copy.width = canvas.width; copy.height = canvas.height;
      copy.getContext("2d")?.drawImage(canvas, 0, 0);
    }
    const rect = canvas.getBoundingClientRect(); const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * ratio); canvas.height = Math.round(rect.height * ratio);
    const context = canvas.getContext("2d");
    context?.setTransform(ratio, 0, 0, ratio, 0, 0);
    if (preserve && copy.width && context) context.drawImage(copy, 0, 0, copy.width, copy.height, 0, 0, rect.width, rect.height);
  };
  useEffect(() => {
    resize(false);
    const canvas = canvasRef.current; if (!canvas) return;
    const observer = new ResizeObserver(() => resize(true));
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [hanzi]);
  const point = (event: React.PointerEvent<HTMLCanvasElement>) => { const rect = event.currentTarget.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top }; };
  const clear = () => { const canvas = canvasRef.current; const ratio = window.devicePixelRatio || 1; canvas?.getContext("2d")?.clearRect(0, 0, (canvas.width || 0) / ratio, (canvas.height || 0) / ratio); setStrokes(0); setFeedback(""); };

  return <div className="writing-layout">
    <div className="writing-copy"><span className="eyebrow">ENTRAÎNEMENT D’ÉCRITURE</span><h2>Trace le caractère</h2><p id="writing-instructions">Observe le modèle, puis reproduis sa structure avec la souris ou le doigt. Tu peux aussi passer au caractère suivant sans dessiner.</p><button type="button" className="outline" onClick={onSpeak}><Volume2 /> Écouter {pinyin}</button></div>
    <div className="writing-board"><div className="writing-grid" /><div className="ghost-character">{hanzi}</div><canvas ref={canvasRef} tabIndex={0} aria-label={`Zone de dessin tactile pour le caractère ${hanzi}`} aria-describedby="writing-instructions"
      onPointerDown={(event) => { drawing.current = true; event.currentTarget.setPointerCapture(event.pointerId); const context = event.currentTarget.getContext("2d"); const position = point(event); context?.beginPath(); context?.moveTo(position.x, position.y); setStrokes((value) => value + 1); }}
      onPointerMove={(event) => { if (!drawing.current) return; const context = event.currentTarget.getContext("2d"); const position = point(event); if (context) { context.lineWidth = 7; context.lineCap = "round"; context.lineJoin = "round"; context.strokeStyle = "#ef6258"; context.lineTo(position.x, position.y); context.stroke(); } }}
      onPointerUp={() => { drawing.current = false; }} onPointerCancel={() => { drawing.current = false; }} />
      <div className="writing-toolbar"><button type="button" onClick={clear}><Eraser /> Effacer</button><button type="button" onClick={clear}><RotateCcw /> Recommencer</button><button type="button" onClick={() => setFeedback(strokes >= Math.max(2, hanzi.length * 2) ? "Forme enregistrée : continue à travailler la proportion des traits." : "Ajoute encore quelques traits avant de valider.")}><Check /> Valider</button><button type="button" className="coral" onClick={() => { clear(); onNext(); }}>Suivant</button></div>
      {feedback && <p className="writing-feedback" role="status">{feedback}</p>}
    </div>
  </div>;
}

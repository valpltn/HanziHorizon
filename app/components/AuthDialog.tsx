"use client";

import { useEffect, useState } from "react";
import { KeyRound, LoaderCircle, Mail, UserPlus, X } from "lucide-react";
import { getSupabaseBrowserClient } from "../lib/supabase-client";

type AuthMode = "signin" | "signup" | "forgot" | "recovery";

export function AuthDialog({ open, initialMode = "signin", onClose }: { open: boolean; initialMode?: AuthMode; onClose: () => void }) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open, onClose]);
  if (!open) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setMessage(null);
    if ((mode === "signup" || mode === "recovery") && password !== confirmPassword) { setMessage({ type: "error", text: "Les deux mots de passe ne correspondent pas." }); return; }
    if ((mode === "signin" || mode === "signup" || mode === "recovery") && password.length < 6) { setMessage({ type: "error", text: "Le mot de passe doit contenir au moins 6 caractères." }); return; }
    setBusy(true);
    const supabase = getSupabaseBrowserClient();
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error; onClose();
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });
        if (error) throw error;
        setMessage({ type: "success", text: "Compte créé. Ouvre l’e-mail de confirmation pour activer la connexion." });
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=/?recovery=1` });
        if (error) throw error;
        setMessage({ type: "success", text: "Si ce compte existe, un lien de réinitialisation vient d’être envoyé." });
      } else {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setMessage({ type: "success", text: "Mot de passe mis à jour. Tu peux reprendre ton apprentissage." });
        window.history.replaceState({}, "", "/");
      }
    } catch (error) { setMessage({ type: "error", text: error instanceof Error ? error.message : "L’opération a échoué. Réessaie." }); }
    finally { setBusy(false); }
  };

  const title = mode === "signin" ? "Retrouver ma progression" : mode === "signup" ? "Créer mon compte" : mode === "forgot" ? "Mot de passe oublié" : "Nouveau mot de passe";
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <button className="icon-button close-button" onClick={onClose} aria-label="Fermer"><X /></button>
      <div className="auth-symbol">{mode === "signup" ? <UserPlus /> : <KeyRound />}</div>
      <h2 id="auth-title">{title}</h2>
      <p>{mode === "signin" ? "Tes révisions et statistiques seront chargées depuis le cloud." : mode === "signup" ? "La progression découverte sera importée automatiquement après la première connexion." : mode === "forgot" ? "Indique l’adresse utilisée pour ton compte." : "Choisis un mot de passe solide pour terminer la récupération."}</p>
      <form onSubmit={submit}>
        {mode !== "recovery" && <label><span>Adresse e-mail</span><div className="input-with-icon"><Mail /><input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></div></label>}
        {mode !== "forgot" && <label><span>{mode === "signin" ? "Mot de passe" : "Nouveau mot de passe"}</span><input type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>}
        {(mode === "signup" || mode === "recovery") && <label><span>Confirmer le mot de passe</span><input type="password" autoComplete="new-password" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>}
        {message && <p className={`form-message ${message.type}`} role="status">{message.text}</p>}
        <button type="submit" className="coral full" disabled={busy}>{busy ? <><LoaderCircle className="spin" /> Patiente…</> : title}</button>
      </form>
      {mode === "signin" && <div className="auth-links"><button onClick={() => setMode("forgot")}>Mot de passe oublié ?</button><button onClick={() => setMode("signup")}>Créer un compte</button></div>}
      {(mode === "signup" || mode === "forgot") && <button className="text-button" onClick={() => setMode("signin")}>← Retour à la connexion</button>}
    </section>
  </div>;
}

import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login, register } from "../store/authSlice";
import { useAppDispatch, useAppSelector } from "../store";

export function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { status, error } = useAppSelector((s) => s.auth);

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const action =
      mode === "login"
        ? login({ email, password })
        : register({ email, password, name });
    const result = await dispatch(action);
    if (register.fulfilled.match(result)) {
      navigate("/onboarding");
    } else if (login.fulfilled.match(result)) {
      navigate("/dashboard");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center gap-2.5">
            <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-600 shadow-glow">
              <span className="h-3 w-3 rounded-sm bg-white/90" />
            </span>
            <span className="pm-gradient-text text-2xl font-extrabold tracking-tight">
              Aperio
            </span>
          </div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate-400">
            Plateforme IA autonome
          </p>
        </div>

        <div className="pm-card pm-ticks relative p-7">
          <div
            className="mb-6 flex rounded-lg border border-blue-400/15 bg-white/[0.03] p-1 text-sm"
            role="tablist"
            aria-label="Connexion ou inscription"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              onClick={() => setMode("login")}
              className={`flex-1 rounded-lg py-2 font-medium transition ${
                mode === "login"
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Connexion
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "register"}
              onClick={() => setMode("register")}
              className={`flex-1 rounded-lg py-2 font-medium transition ${
                mode === "register"
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Inscription
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label htmlFor="auth-name" className="pm-label">Nom</label>
                <input
                  id="auth-name"
                  className="pm-input"
                  placeholder="Votre nom"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}
            <div>
              <label htmlFor="auth-email" className="pm-label">Email</label>
              <input
                id="auth-email"
                className="pm-input"
                type="email"
                placeholder="vous@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="auth-password" className="pm-label">Mot de passe</label>
              <input
                id="auth-password"
                className="pm-input"
                type="password"
                placeholder={mode === "register" ? "12 caractères min. (lettres + chiffres)" : "Votre mot de passe"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={mode === "register" ? 12 : undefined}
                required
              />
            </div>
            {error && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={status === "loading"}
              className="pm-btn-primary w-full"
            >
              {mode === "login" ? "Se connecter" : "Créer mon compte"}
            </button>
            {mode === "login" && (
              <Link
                to="/forgot-password"
                className="block text-center text-xs text-slate-400 hover:text-slate-300"
              >
                Mot de passe oublié ?
              </Link>
            )}
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Signaux en temps réel · Détection d'anomalies · 4 agents autonomes
        </p>
      </div>
    </div>
  );
}

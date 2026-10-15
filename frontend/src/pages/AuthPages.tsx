import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, RequestError } from "../api/client";
import { upgrade } from "../store/authSlice";
import { useAppDispatch, useAppSelector } from "../store";

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="pm-gradient-text text-2xl font-extrabold tracking-tight">
            Aperio
          </Link>
        </div>
        <div className="pm-card pm-ticks relative p-7">
          <h1 className="mb-5 text-lg font-semibold text-heading">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  );
}

/** Mot de passe oublié — demande de lien. */
export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/auth/forgot-password", { email });
    } catch {
      /* réponse neutre : on n'expose rien */
    }
    setSent(true);
  };

  return (
    <Shell title="Mot de passe oublié">
      {sent ? (
        <p className="text-sm text-fg">
          Si un compte existe pour <span className="font-mono">{email}</span>, un
          e-mail avec un lien de réinitialisation vient d'être envoyé. Pensez à
          vérifier vos spams.
          <br />
          <Link to="/login" className="mt-4 inline-block text-link hover:underline">
            ← Retour à la connexion
          </Link>
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <p className="text-sm text-muted">
            Entrez votre e-mail : nous vous enverrons un lien pour choisir un
            nouveau mot de passe.
          </p>
          <div>
            <label htmlFor="fp-email" className="pm-label">E-mail</label>
            <input
              id="fp-email"
              className="pm-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <button className="pm-btn-primary w-full">Envoyer le lien</button>
          <Link to="/login" className="block text-center text-sm text-muted hover:text-heading">
            Retour à la connexion
          </Link>
        </form>
      )}
    </Shell>
  );
}

/** Réinitialisation — choix d'un nouveau mot de passe via le jeton du lien. */
export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/auth/reset-password", { token, password });
      setDone(true);
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      setError(err instanceof RequestError ? err.message : "Erreur");
    }
  };

  if (!token) {
    return (
      <Shell title="Lien invalide">
        <p className="text-sm text-fg">
          Ce lien de réinitialisation est incomplet.{" "}
          <Link to="/forgot-password" className="text-link hover:underline">
            Redemander un lien
          </Link>
        </p>
      </Shell>
    );
  }

  return (
    <Shell title="Nouveau mot de passe">
      {done ? (
        <p className="text-sm text-success">
          Mot de passe mis à jour ✓ Redirection vers la connexion…
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="rp-password" className="pm-label">Nouveau mot de passe</label>
            <input
              id="rp-password"
              className="pm-input"
              type="password"
              placeholder="12 caractères min. (lettres + chiffres)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={12}
              required
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button className="pm-btn-primary w-full">Réinitialiser</button>
        </form>
      )}
    </Shell>
  );
}

/** Conversion d'un compte invité en compte réel (conserve les projets). */
export function UpgradePage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { error } = useAppSelector((s) => s.auth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const res = await dispatch(upgrade({ email, password, name }));
    if (upgrade.fulfilled.match(res)) navigate("/projects");
  };

  return (
    <Shell title="Créez votre compte">
      <p className="mb-5 text-sm text-muted">
        Vous êtes en mode invité. Créez un compte pour <b>conserver votre projet</b>
        {" "}et continuer sans limite.
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="up-name" className="pm-label">Nom</label>
          <input id="up-name" className="pm-input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="up-email" className="pm-label">E-mail</label>
          <input id="up-email" className="pm-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="up-password" className="pm-label">Mot de passe</label>
          <input
            id="up-password"
            className="pm-input"
            type="password"
            placeholder="12 caractères min. (lettres + chiffres)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={12}
            required
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button className="pm-btn-primary w-full">Créer mon compte</button>
      </form>
    </Shell>
  );
}

/** Vérification d'e-mail — consomme le jeton du lien automatiquement. */
export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    if (!token) {
      setState("error");
      return;
    }
    api
      .post("/auth/verify-email", { token })
      .then(() => setState("ok"))
      .catch(() => setState("error"));
  }, [token]);

  return (
    <Shell title="Vérification de l'e-mail">
      {state === "loading" && <p className="text-sm text-muted">Vérification en cours…</p>}
      {state === "ok" && (
        <p className="text-sm text-success">
          Votre adresse e-mail est confirmée ✓
          <br />
          <Link to="/login" className="mt-4 inline-block text-link hover:underline">
            Se connecter
          </Link>
        </p>
      )}
      {state === "error" && (
        <p className="text-sm text-danger">
          Lien invalide ou expiré.
          <br />
          <Link to="/login" className="mt-4 inline-block text-link hover:underline">
            Retour à la connexion
          </Link>
        </p>
      )}
    </Shell>
  );
}

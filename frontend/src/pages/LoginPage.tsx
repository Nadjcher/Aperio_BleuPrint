import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
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
    if (
      login.fulfilled.match(result) ||
      register.fulfilled.match(result)
    ) {
      navigate("/dashboard");
    }
  };

  return (
    <div className="mx-auto mt-24 max-w-sm px-4">
      <h1 className="mb-1 text-2xl font-bold text-brand">ProjectMaster</h1>
      <p className="mb-6 text-sm text-slate-500">
        {mode === "login" ? "Connexion" : "Créer un compte"}
      </p>
      <form onSubmit={onSubmit} className="space-y-3">
        {mode === "register" && (
          <input
            className="w-full rounded-md border px-3 py-2"
            placeholder="Nom"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        )}
        <input
          className="w-full rounded-md border px-3 py-2"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full rounded-md border px-3 py-2"
          type="password"
          placeholder="Mot de passe (10 caractères min.)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={status === "loading"}
          className="w-full rounded-md bg-brand py-2 font-medium text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {mode === "login" ? "Se connecter" : "S'inscrire"}
        </button>
      </form>
      <button
        onClick={() => setMode(mode === "login" ? "register" : "login")}
        className="mt-4 text-sm text-brand hover:underline"
      >
        {mode === "login"
          ? "Pas de compte ? S'inscrire"
          : "Déjà un compte ? Se connecter"}
      </button>
    </div>
  );
}

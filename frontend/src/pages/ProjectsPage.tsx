import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Paginated, Project } from "@projectmaster/shared";
import { api, RequestError } from "../api/client";

export function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [repo, setRepo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    api.get<Paginated<Project>>("/projects").then((r) => setProjects(r.items));

  useEffect(() => {
    void load();
  }, []);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.post<Project>("/projects", {
        name,
        repo: repo.trim() || undefined,
      });
      setName("");
      setRepo("");
      await load();
    } catch (err) {
      if (err instanceof RequestError && err.code === "guest_limit") {
        navigate("/upgrade");
        return;
      }
      setError(err instanceof RequestError ? err.message : "Erreur");
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-white">Projets</h1>
        <p className="mt-1 text-sm text-slate-400">
          Reliez un dépôt pour collecter les signaux et lancer les agents.
        </p>
      </div>

      <form
        onSubmit={onCreate}
        className="pm-card mb-8 flex flex-wrap items-end gap-4 p-5"
      >
        <label className="flex min-w-[12rem] flex-1 flex-col">
          <span className="pm-label">Nom du projet</span>
          <input
            className="pm-input"
            placeholder="Mon projet"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label className="flex min-w-[12rem] flex-1 flex-col">
          <span className="pm-label">Dépôt (owner/repo)</span>
          <input
            className="pm-input font-mono"
            placeholder="facebook/react"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
          />
        </label>
        <button className="pm-btn-primary">+ Créer</button>
        {error && <p className="w-full text-sm text-red-300">{error}</p>}
      </form>

      {projects.length === 0 ? (
        <div className="pm-card p-8">
          <div className="pm-eyebrow">01 · Premiers pas</div>
          <h2 className="mt-2 text-lg font-semibold text-white">
            Bienvenue sur Aperio 👋
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Aperio surveille vos dépôts en continu, détecte les signaux faibles
            et laisse des agents diagnostiquer, planifier et rendre compte. Trois
            étapes pour démarrer :
          </p>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              { n: "1", t: "Reliez un dépôt", d: "Renseignez owner/repo dans le formulaire ci-dessus." },
              { n: "2", t: "Lancez une synchronisation", d: "Depuis la fiche projet : Aperio collecte commits, PRs et issues." },
              { n: "3", t: "Lisez les décisions", d: "Les agents remontent anomalies, plan correctif et rapports." },
            ].map((s) => (
              <li key={s.n} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/15 font-mono text-sm text-brand">
                  {s.n}
                </div>
                <div className="mt-3 font-semibold text-slate-100">{s.t}</div>
                <p className="mt-1 text-xs text-slate-400">{s.d}</p>
              </li>
            ))}
          </ol>
          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              className="pm-btn-ghost"
              onClick={() => {
                setName("Démo — React");
                setRepo("facebook/react");
              }}
            >
              Pré-remplir un exemple (facebook/react)
            </button>
            <a
              href="https://github.com/Nadjcher/ajc_10/blob/main/docs/USER_GUIDE.md"
              target="_blank"
              rel="noreferrer"
              className="text-sm text-brand hover:underline"
            >
              Guide d'utilisation →
            </a>
          </div>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                to={`/projects/${p.id}`}
                className="pm-card group flex items-center justify-between p-5 transition hover:border-brand/40 hover:shadow-glow"
              >
                <div>
                  <div className="font-semibold text-slate-100 group-hover:text-white">
                    {p.name}
                  </div>
                  {p.repo && (
                    <div className="mt-1 font-mono text-xs text-slate-500">
                      {p.repo}
                    </div>
                  )}
                </div>
                <span className="text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-brand">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import type { Paginated, Project } from "@projectmaster/shared";
import { api, RequestError } from "../api/client";

export function ProjectsPage() {
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
        <div className="pm-card p-10 text-center text-sm text-slate-500">
          Aucun projet pour l'instant — créez le premier ci-dessus.
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

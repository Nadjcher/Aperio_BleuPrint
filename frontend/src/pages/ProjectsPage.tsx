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
      <h1 className="mb-6 text-2xl font-bold">Projets</h1>

      <form
        onSubmit={onCreate}
        className="mb-8 flex flex-wrap items-end gap-3 rounded-lg border bg-white p-4"
      >
        <label className="flex flex-col text-sm">
          <span className="mb-1 text-slate-500">Nom</span>
          <input
            className="rounded-md border px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col text-sm">
          <span className="mb-1 text-slate-500">Dépôt (owner/repo)</span>
          <input
            className="rounded-md border px-3 py-2"
            placeholder="facebook/react"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
          />
        </label>
        <button className="rounded-md bg-brand px-4 py-2 font-medium text-white hover:bg-brand-dark">
          Créer
        </button>
        {error && <p className="w-full text-sm text-red-600">{error}</p>}
      </form>

      <ul className="divide-y rounded-lg border bg-white">
        {projects.length === 0 && (
          <li className="p-4 text-sm text-slate-500">Aucun projet pour l'instant.</li>
        )}
        {projects.map((p) => (
          <li key={p.id} className="flex items-center justify-between p-4">
            <div>
              <Link
                to={`/projects/${p.id}`}
                className="font-medium text-brand hover:underline"
              >
                {p.name}
              </Link>
              {p.repo && (
                <span className="ml-2 text-sm text-slate-500">{p.repo}</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

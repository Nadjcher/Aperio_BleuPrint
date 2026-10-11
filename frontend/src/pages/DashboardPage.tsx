import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Paginated, Project } from "@projectmaster/shared";
import { api } from "../api/client";

export function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Paginated<Project>>("/projects")
      .then((r) => setProjects(r.items))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Tableau de bord</h1>
      {loading ? (
        <p className="text-slate-500">Chargement…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Projets suivis" value={projects.length} />
          <Stat
            label="Avec dépôt lié"
            value={projects.filter((p) => p.repo).length}
          />
          <Stat label="Agents actifs" value={4} />
        </div>
      )}
      <div className="mt-8">
        <Link to="/projects" className="text-brand hover:underline">
          Voir tous les projets →
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-white p-5">
      <div className="text-3xl font-bold text-brand">{value}</div>
      <div className="mt-1 text-sm text-slate-500">{label}</div>
    </div>
  );
}

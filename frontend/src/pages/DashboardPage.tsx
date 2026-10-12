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
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Tableau de bord
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Vue d'ensemble de vos projets suivis et des agents autonomes.
        </p>
      </div>

      {loading ? (
        <p className="text-slate-500">Chargement…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Projets suivis" value={projects.length} accent="brand" />
          <Stat
            label="Avec dépôt lié"
            value={projects.filter((p) => p.repo).length}
            accent="brand"
          />
          <Stat label="Agents actifs" value={4} accent="accent" />
        </div>
      )}

      <div className="mt-8">
        <Link
          to="/projects"
          className="text-sm font-medium text-brand hover:text-brand-400"
        >
          Voir tous les projets →
        </Link>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "brand" | "accent";
}) {
  const bar =
    accent === "brand"
      ? "from-brand-500 to-brand-400"
      : "from-accent-500 to-accent-600";
  return (
    <div className="pm-card relative overflow-hidden p-6">
      <div
        className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${bar} opacity-70`}
      />
      <div className="font-mono text-4xl font-semibold tracking-tight text-white">
        {value.toString().padStart(2, "0")}
      </div>
      <div className="mt-2 text-xs font-medium uppercase tracking-wider text-slate-400">
        {label}
      </div>
    </div>
  );
}

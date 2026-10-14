import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type {
  Briefing,
  BriefingItem,
  BriefingPriority,
  Paginated,
  Project,
} from "@projectmaster/shared";
import { api } from "../api/client";

const priorityStyle: Record<BriefingPriority, { chip: string; border: string; label: string }> = {
  critical: { chip: "border-red-500/40 bg-red-500/10 text-red-300", border: "border-l-red-500/70", label: "Critique" },
  important: { chip: "border-amber-500/40 bg-amber-500/10 text-amber-300", border: "border-l-amber-500/70", label: "À approuver" },
  fyi: { chip: "border-slate-500/30 bg-slate-500/10 text-slate-300", border: "border-l-slate-500/50", label: "À surveiller" },
  win: { chip: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300", border: "border-l-emerald-500/60", label: "OK" },
};

export function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Paginated<Project>>("/projects").then((r) => setProjects(r.items)),
      api.get<Briefing>("/briefing").then(setBriefing),
    ]).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-8">
        <span className="pm-eyebrow mb-3">Briefing</span>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-white">
          {briefing?.greeting ?? "Tableau de bord"}
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Voici ce qu'il faut faire — priorisé, avec les actions directes.
        </p>
      </div>

      {loading ? (
        <p className="text-slate-400">Chargement…</p>
      ) : (
        <>
          {briefing && briefing.items.length > 0 ? (
            <ul className="space-y-3">
              {briefing.items.slice(0, 8).map((item, i) => (
                <BriefingCard key={i} item={item} />
              ))}
            </ul>
          ) : (
            <div className="pm-card p-8 text-center text-sm text-slate-400">
              Rien à signaler pour le moment.{" "}
              <Link to="/projects" className="text-brand hover:underline">
                Gérer les projets
              </Link>
            </div>
          )}

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <Stat label="Projets suivis" value={projects.length} accent="brand" />
            <Stat label="Avec dépôt lié" value={projects.filter((p) => p.repo).length} accent="brand" />
            <Stat label="Agents actifs" value={4} accent="accent" />
          </div>

          <div className="mt-8">
            <Link to="/projects" className="text-sm font-medium text-brand hover:text-brand-400">
              Voir tous les projets →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function BriefingCard({ item }: { item: BriefingItem }) {
  const s = priorityStyle[item.priority];
  return (
    <li className={`pm-card border-l-2 ${s.border} p-5`}>
      <div className="flex flex-wrap items-center gap-2.5">
        <span className={`pm-chip ${s.chip}`}>{s.label}</span>
        {item.projectName && (
          <span className="font-mono text-xs text-slate-400">{item.projectName}</span>
        )}
      </div>
      <h3 className="mt-3 font-semibold text-slate-100">{item.title}</h3>
      <p className="mt-1 text-sm text-slate-400">{item.detail}</p>
      {item.actions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {item.actions.map((a, i) => (
            <Link key={i} to={a.to} className="pm-btn-ghost py-1.5">
              {a.label} →
            </Link>
          ))}
        </div>
      )}
    </li>
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
    accent === "brand" ? "from-brand-500 to-brand-400" : "from-accent-500 to-accent-600";
  return (
    <div className="pm-card pm-ticks relative overflow-hidden p-6">
      <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${bar} opacity-70`} />
      <div className="pm-gradient-text font-mono text-4xl font-bold tracking-tight">
        {value.toString().padStart(2, "0")}
      </div>
      <div className="mt-2 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
        {label}
      </div>
    </div>
  );
}

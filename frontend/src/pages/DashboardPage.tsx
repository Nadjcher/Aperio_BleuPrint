import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { Briefing, BriefingItem, BriefingPriority, RiskLevel } from "@projectmaster/shared";
import { api } from "../api/client";
import { PageHeader, Loading, InfoTip } from "../components/ui";
import { useAsync } from "../hooks/useAsync";
import { useProjects } from "../hooks/ProjectsContext";
import { useAppSelector } from "../store";

const priorityStyle: Record<BriefingPriority, { chip: string; border: string; label: string }> = {
  critical: { chip: "border-red-500/40 bg-red-500/10 text-danger", border: "border-l-red-500/70", label: "Critique" },
  important: { chip: "border-amber-500/40 bg-amber-500/10 text-warning", border: "border-l-amber-500/70", label: "À approuver" },
  fyi: { chip: "border-line bg-slate-500/10 text-fg", border: "border-l-slate-500/50", label: "À surveiller" },
  win: { chip: "border-emerald-500/30 bg-emerald-500/10 text-success", border: "border-l-emerald-500/60", label: "OK" },
};

const riskTone: Record<RiskLevel, { text: string; label: string }> = {
  faible: { text: "text-success", label: "Faible" },
  moyen: { text: "text-warning", label: "Moyen" },
  élevé: { text: "text-danger", label: "Élevé" },
};

export function DashboardPage() {
  const { projects, loading: projectsLoading } = useProjects();
  const { data: briefing, loading: briefingLoading } = useAsync(
    () => api.get<Briefing>("/briefing"),
    [],
  );
  const mode = useAppSelector((s) => s.auth.user?.uiMode ?? "simple");
  const loading = projectsLoading || briefingLoading;

  return (
    <div>
      <PageHeader
        eyebrow="Briefing"
        title={briefing?.greeting ?? "Tableau de bord"}
        subtitle="Voici ce qu'il faut faire — priorisé, avec les actions directes."
      />

      {loading || !briefing ? (
        <Loading />
      ) : mode === "simple" ? (
        <SimpleView briefing={briefing} projectCount={projects.length} />
      ) : (
        <ExpertView briefing={briefing} projects={projects} />
      )}
    </div>
  );
}

// ─── Mode simple : 3 indicateurs + « à traiter aujourd'hui » ─────────────────
function SimpleView({ briefing, projectCount }: { briefing: Briefing; projectCount: number }) {
  const risk = riskTone[briefing.health.risk];
  // On ne montre que l'actionnable (pas les « OK »), limité à 5.
  const todo = briefing.items.filter((i) => i.priority !== "win").slice(0, 5);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <HealthTile score={briefing.health.score} risk={briefing.health.risk} />
        <Tile label="Niveau de risque" value={risk.label} valueClass={risk.text} />
        <Tile
          label={<InfoTip termKey="commit">Activité (7 j)</InfoTip>}
          value={`${briefing.activity7d}`}
          hint="modifications de code"
        />
      </div>

      <h2 className="mt-10 mb-4 text-lg font-semibold text-heading">À traiter aujourd'hui</h2>
      {todo.length === 0 ? (
        <div className="pm-card p-8 text-center text-sm text-muted">
          {projectCount === 0 ? (
            <>
              Reliez un premier projet pour démarrer.{" "}
              <Link to="/onboarding" className="pm-link">
                Démarrer en 3 étapes
              </Link>
            </>
          ) : (
            "Rien d'urgent — tout est sous contrôle. 👍"
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {todo.map((item, i) => (
            <BriefingCard key={i} item={item} />
          ))}
        </ul>
      )}
    </>
  );
}

// ─── Mode expert : briefing complet + statistiques ───────────────────────────
function ExpertView({
  briefing,
  projects,
}: {
  briefing: Briefing;
  projects: { repo?: string }[];
}) {
  return (
    <>
      {briefing.items.length > 0 ? (
        <ul className="space-y-3">
          {briefing.items.slice(0, 8).map((item, i) => (
            <BriefingCard key={i} item={item} />
          ))}
        </ul>
      ) : (
        <div className="pm-card p-8 text-center text-sm text-muted">
          Rien à signaler pour le moment.{" "}
          <Link to="/projects" className="pm-link">
            Gérer les projets
          </Link>
        </div>
      )}

      <div className="mt-10 grid gap-4 sm:grid-cols-4">
        <Stat label="Santé" value={briefing.health.score} accent="brand" />
        <Stat label="Projets suivis" value={projects.length} accent="brand" />
        <Stat label="Avec dépôt lié" value={projects.filter((p) => p.repo).length} accent="brand" />
        <Stat label="Agents actifs" value={4} accent="accent" />
      </div>

      <div className="mt-8">
        <Link to="/projects" className="text-sm font-medium text-link hover:text-link">
          Voir tous les projets →
        </Link>
      </div>
    </>
  );
}

function HealthTile({ score, risk }: { score: number; risk: RiskLevel }) {
  const tone = riskTone[risk];
  return (
    <div className="pm-card p-6">
      <div className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
        <InfoTip termKey="health">Santé globale</InfoTip>
      </div>
      <div className={`mt-2 font-mono text-4xl font-bold tracking-tight ${tone.text}`}>
        {score}
        <span className="text-lg text-faint">/100</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface2">
        <div
          className={risk === "faible" ? "h-full bg-emerald-400" : risk === "moyen" ? "h-full bg-amber-400" : "h-full bg-red-500"}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function Tile({
  label,
  value,
  valueClass = "text-heading",
  hint,
}: {
  label: ReactNode;
  value: string;
  valueClass?: string;
  hint?: string;
}) {
  return (
    <div className="pm-card p-6">
      <div className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
        {label}
      </div>
      <div className={`mt-2 text-3xl font-bold tracking-tight ${valueClass}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-faint">{hint}</div>}
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
          <span className="font-mono text-xs text-muted">{item.projectName}</span>
        )}
      </div>
      <h3 className="mt-3 font-semibold text-heading">{item.title}</h3>
      <p className="mt-1 text-sm text-muted">{item.detail}</p>
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

function Stat({ label, value, accent }: { label: string; value: number; accent: "brand" | "accent" }) {
  const bar = accent === "brand" ? "from-brand-500 to-brand-400" : "from-accent-500 to-accent-600";
  return (
    <div className="pm-card relative overflow-hidden p-6">
      <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${bar} opacity-70`} />
      <div className="pm-gradient-text font-mono text-4xl font-bold tracking-tight">
        {value.toString().padStart(2, "0")}
      </div>
      <div className="mt-2 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
        {label}
      </div>
    </div>
  );
}

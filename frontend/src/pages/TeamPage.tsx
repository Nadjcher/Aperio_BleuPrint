import { useEffect, useState, type FormEvent } from "react";
import type {
  Member,
  ProjectResourcing,
  ResourceMoveAnalysis,
} from "@projectmaster/shared";
import { api, toErrorMessage } from "../api/client";
import { PageHeader, ErrorBanner } from "../components/ui";
import { useProjects } from "../hooks/ProjectsContext";

/** Jauge de gravité 0..100 (vert → ambre → rouge). */
function GravityGauge({ score }: { score: number }) {
  const color =
    score > 50 ? "bg-red-500" : score >= 25 ? "bg-amber-400" : "bg-emerald-400";
  const label =
    score > 50 ? "Critique" : score >= 25 ? "Sensible" : "Faible";
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="pm-label">Score de gravité</span>
        <span className="font-mono text-sm text-slate-200">
          {score}/100 · {label}
        </span>
      </div>
      <div
        className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-white/10"
        role="meter"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Score de gravité ${score} sur 100`}
      >
        <div className={`h-full ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

export function TeamPage() {
  const { projects } = useProjects();
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Formulaire membre
  const [name, setName] = useState("");
  const [skills, setSkills] = useState("");

  // Affectations
  const [projectId, setProjectId] = useState("");
  const [resourcing, setResourcing] = useState<ProjectResourcing | null>(null);
  const [assignMember, setAssignMember] = useState("");
  const [allocation, setAllocation] = useState(100);
  const [velocity, setVelocity] = useState(5);

  // Simulation de gravité
  const [simFrom, setSimFrom] = useState("");
  const [simMember, setSimMember] = useState("");
  const [simTo, setSimTo] = useState("");
  const [simFromRes, setSimFromRes] = useState<ProjectResourcing | null>(null);
  const [analysis, setAnalysis] = useState<ResourceMoveAnalysis | null>(null);
  const [simError, setSimError] = useState<string | null>(null);

  const loadMembers = () =>
    api.get<{ items: Member[] }>("/members").then((r) => setMembers(r.items));

  useEffect(() => {
    void loadMembers();
  }, []);

  // ─── Membres ───────────────────────────────────────────────────────────────
  const onCreateMember = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.post<Member>("/members", {
        name: name.trim(),
        skills: skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      setName("");
      setSkills("");
      await loadMembers();
    } catch (err) {
      setError(toErrorMessage(err));
    }
  };

  const onDeleteMember = async (id: string) => {
    await api.del(`/members/${id}`);
    await loadMembers();
    if (projectId) await loadResourcing(projectId);
  };

  // ─── Affectations ────────────────────────────────────────────────────────────
  const loadResourcing = (pid: string) =>
    api
      .get<ProjectResourcing>(`/projects/${pid}/resourcing`)
      .then(setResourcing);

  const onSelectProject = async (pid: string) => {
    setProjectId(pid);
    setResourcing(null);
    if (pid) await loadResourcing(pid);
  };

  const onAssign = async (e: FormEvent) => {
    e.preventDefault();
    if (!projectId || !assignMember) return;
    setError(null);
    try {
      await api.post(`/projects/${projectId}/assignments`, {
        memberId: assignMember,
        allocationPct: allocation,
        velocity,
      });
      setAssignMember("");
      await loadResourcing(projectId);
    } catch (err) {
      setError(toErrorMessage(err));
    }
  };

  const onUnassign = async (memberId: string) => {
    await api.del(`/projects/${projectId}/assignments/${memberId}`);
    await loadResourcing(projectId);
  };

  // ─── Simulation ──────────────────────────────────────────────────────────────
  const onSelectSimFrom = async (pid: string) => {
    setSimFrom(pid);
    setSimMember("");
    setAnalysis(null);
    setSimFromRes(null);
    if (pid) {
      const r = await api.get<ProjectResourcing>(`/projects/${pid}/resourcing`);
      setSimFromRes(r);
    }
  };

  const onSimulate = async (e: FormEvent) => {
    e.preventDefault();
    if (!simFrom || !simMember) return;
    setSimError(null);
    setAnalysis(null);
    try {
      const r = await api.post<ResourceMoveAnalysis>(
        `/projects/${simFrom}/simulate-resource-move`,
        { memberId: simMember, toProjectId: simTo || undefined },
      );
      setAnalysis(r);
    } catch (err) {
      setSimError(toErrorMessage(err));
    }
  };

  const impactColor: Record<ResourceMoveAnalysis["netImpact"], string> = {
    positive: "text-emerald-300",
    neutral: "text-slate-300",
    negative: "text-red-300",
  };

  return (
    <div>
      <PageHeader
        eyebrow="Équipe & ressources"
        title="Gravité des déplacements"
        subtitle="Déclarez votre équipe, affectez-la aux projets, puis simulez l'impact d'un déplacement : perte de vélocité, allongement de durée et perte d'expertise sont estimés pour éviter les décisions coûteuses."
      />

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}

      {/* Membres */}
      <section className="pm-card mb-6 p-5">
        <h2 className="text-lg font-semibold text-white">Membres</h2>
        <form onSubmit={onCreateMember} className="mt-4 flex flex-wrap items-end gap-4">
          <label className="flex min-w-[10rem] flex-1 flex-col">
            <span className="pm-label">Nom</span>
            <input
              className="pm-input"
              placeholder="Alice Martin"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label className="flex min-w-[12rem] flex-[2] flex-col">
            <span className="pm-label">Compétences (séparées par des virgules)</span>
            <input
              className="pm-input"
              placeholder="backend, sql, lead"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
            />
          </label>
          <button className="pm-btn-primary">+ Ajouter</button>
        </form>

        {members.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">
            Aucun membre pour l'instant — ajoutez votre équipe ci-dessus.
          </p>
        ) : (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {members.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3"
              >
                <div>
                  <div className="font-semibold text-slate-100">{m.name}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {m.skills.length === 0 ? (
                      <span className="text-xs text-slate-500">—</span>
                    ) : (
                      m.skills.map((s) => (
                        <span key={s} className="pm-chip text-xs">
                          {s}
                        </span>
                      ))
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onDeleteMember(m.id)}
                  className="pm-btn-ghost py-1 text-xs"
                  aria-label={`Supprimer ${m.name}`}
                >
                  Supprimer
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Affectations */}
      <section className="pm-card mb-6 p-5">
        <h2 className="text-lg font-semibold text-white">Affectations par projet</h2>
        <label className="mt-4 flex max-w-sm flex-col">
          <span className="pm-label">Projet</span>
          <select
            className="pm-input"
            value={projectId}
            onChange={(e) => void onSelectProject(e.target.value)}
          >
            <option value="">— Choisir un projet —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        {projectId && resourcing && (
          <>
            <div className="mt-4 overflow-hidden rounded-xl border border-white/5">
              <table className="w-full text-sm">
                <thead className="bg-white/[0.03] text-left text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-4 py-2">Membre</th>
                    <th className="px-4 py-2">Allocation</th>
                    <th className="px-4 py-2">Vélocité</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {resourcing.members.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-slate-400">
                        Aucun membre affecté.
                      </td>
                    </tr>
                  ) : (
                    resourcing.members.map((m) => (
                      <tr key={m.memberId} className="border-t border-white/5">
                        <td className="px-4 py-2 text-slate-100">{m.name}</td>
                        <td className="px-4 py-2 text-slate-300">{m.allocationPct}%</td>
                        <td className="px-4 py-2 text-slate-300">{m.velocity}</td>
                        <td className="px-4 py-2 text-right">
                          <button
                            onClick={() => onUnassign(m.memberId)}
                            className="pm-btn-ghost py-1 text-xs"
                          >
                            Retirer
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t border-white/10 text-slate-200">
                    <td className="px-4 py-2 font-semibold">Vélocité totale</td>
                    <td />
                    <td className="px-4 py-2 font-mono">{resourcing.totalVelocity}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>

            <form onSubmit={onAssign} className="mt-4 flex flex-wrap items-end gap-3">
              <label className="flex min-w-[10rem] flex-1 flex-col">
                <span className="pm-label">Membre</span>
                <select
                  className="pm-input"
                  value={assignMember}
                  onChange={(e) => setAssignMember(e.target.value)}
                  required
                >
                  <option value="">— Choisir —</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex w-28 flex-col">
                <span className="pm-label">Allocation %</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="pm-input"
                  value={allocation}
                  onChange={(e) => setAllocation(Number(e.target.value))}
                />
              </label>
              <label className="flex w-28 flex-col">
                <span className="pm-label">Vélocité</span>
                <input
                  type="number"
                  min={0}
                  className="pm-input"
                  value={velocity}
                  onChange={(e) => setVelocity(Number(e.target.value))}
                />
              </label>
              <button className="pm-btn-primary">Affecter</button>
            </form>
          </>
        )}
      </section>

      {/* Simulation de gravité */}
      <section className="pm-card p-5">
        <h2 className="text-lg font-semibold text-white">
          Simuler un déplacement
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Estimez l'impact de retirer un membre d'un projet (et, en option, de
          l'affecter à un autre).
        </p>

        <form onSubmit={onSimulate} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex min-w-[10rem] flex-1 flex-col">
            <span className="pm-label">Projet source</span>
            <select
              className="pm-input"
              value={simFrom}
              onChange={(e) => void onSelectSimFrom(e.target.value)}
              required
            >
              <option value="">— Choisir —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[10rem] flex-1 flex-col">
            <span className="pm-label">Membre à déplacer</span>
            <select
              className="pm-input"
              value={simMember}
              onChange={(e) => setSimMember(e.target.value)}
              required
              disabled={!simFromRes}
            >
              <option value="">— Choisir —</option>
              {simFromRes?.members.map((m) => (
                <option key={m.memberId} value={m.memberId}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[10rem] flex-1 flex-col">
            <span className="pm-label">Projet cible (optionnel)</span>
            <select
              className="pm-input"
              value={simTo}
              onChange={(e) => setSimTo(e.target.value)}
            >
              <option value="">— Aucun (retrait) —</option>
              {projects
                .filter((p) => p.id !== simFrom)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </label>
          <button className="pm-btn-primary" disabled={!simMember}>
            Simuler
          </button>
        </form>

        {simError && (
          <div className="mt-3">
            <ErrorBanner message={simError} />
          </div>
        )}

        {analysis && (
          <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <GravityGauge score={analysis.gravityScore} />

            <p className="mt-4 text-sm text-slate-200">
              <span className="font-semibold">{analysis.member}</span> —{" "}
              <span className={impactColor[analysis.netImpact]}>
                impact net {analysis.netImpact === "positive" ? "positif" : analysis.netImpact === "negative" ? "négatif" : "neutre"}
              </span>
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-white/5 p-4">
                <div className="pm-eyebrow">Projet source · {analysis.from.projectName}</div>
                <ul className="mt-2 space-y-1 text-sm text-slate-300">
                  <li>
                    Vélocité : {analysis.from.velocityBefore} →{" "}
                    <span className="text-red-300">{analysis.from.velocityAfter}</span>{" "}
                    (−{analysis.from.velocityLossPct}%)
                  </li>
                  <li>Durée estimée : +{analysis.from.durationIncreasePct}%</li>
                  {analysis.from.skillsGap.length > 0 && (
                    <li>
                      Expertise perdue :{" "}
                      {analysis.from.skillsGap.map((s) => (
                        <span key={s} className="pm-chip ml-1 text-xs">
                          {s}
                        </span>
                      ))}
                    </li>
                  )}
                </ul>
              </div>

              {analysis.to && (
                <div className="rounded-lg border border-white/5 p-4">
                  <div className="pm-eyebrow">Projet cible · {analysis.to.projectName}</div>
                  <ul className="mt-2 space-y-1 text-sm text-slate-300">
                    <li>
                      Vélocité : {analysis.to.velocityBefore} →{" "}
                      <span className="text-emerald-300">{analysis.to.velocityAfter}</span>{" "}
                      (+{analysis.to.velocityGainPct}%)
                    </li>
                    <li>Pleinement effectif après ~{analysis.to.effectiveAfterWeeks} sem.</li>
                  </ul>
                </div>
              )}
            </div>

            <div className="mt-4 rounded-lg border border-brand/20 bg-brand/5 p-4">
              <div className="pm-eyebrow">Recommandation</div>
              <p className="mt-1 text-sm text-slate-100">{analysis.recommendation}</p>
              <p className="mt-2 text-xs text-slate-500">
                Confiance : {Math.round(analysis.confidence * 100)}% ·{" "}
                {analysis.confidence < 0.5
                  ? "données de vélocité insuffisantes, estimation indicative"
                  : "basée sur les vélocités déclarées"}
              </p>
            </div>
          </div>
        )}

        {projects.length === 0 && (
          <p className="mt-4 text-sm text-slate-400">
            Créez d'abord un projet dans l'onglet « Projets », puis affectez-y des
            membres pour lancer une simulation.
          </p>
        )}
      </section>
    </div>
  );
}

import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import type { MethodologyVocab, MilestonePlan, Project, ProjectPlan, Task, TaskStatus } from "@projectmaster/shared";
import { vocabOf } from "@projectmaster/shared";
import { api, toErrorMessage } from "../api/client";
import { PageHeader, Loading, ErrorBanner } from "../components/ui";
import { useAsync } from "../hooks/useAsync";
import { useAppSelector } from "../store";

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const taskStatusLabel: Record<TaskStatus, string> = {
  todo: "À faire",
  doing: "En cours",
  done: "Terminé",
};
const nextStatus: Record<TaskStatus, TaskStatus> = { todo: "doing", doing: "done", done: "todo" };

export function PlanningPage() {
  const { id } = useParams<{ id: string }>();
  const mode = useAppSelector((s) => s.auth.user?.uiMode ?? "simple");

  const plan = useAsync<ProjectPlan>(() => api.get<ProjectPlan>(`/projects/${id}/plan`), [id]);
  const tasksState = useAsync<{ items: Task[] }>(() => api.get<{ items: Task[] }>(`/projects/${id}/tasks`), [id]);
  const project = useAsync<Project>(() => api.get<Project>(`/projects/${id}`), [id]);
  const vocab = vocabOf(project.data?.methodology ?? "kanban");

  const [error, setError] = useState<string | null>(null);
  const [msName, setMsName] = useState("");
  const [msDue, setMsDue] = useState("");

  const reload = async () => {
    await Promise.all([plan.reload(), tasksState.reload()]);
  };

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      await reload();
    } catch (err) {
      setError(toErrorMessage(err));
    }
  };

  const addMilestone = async (e: FormEvent) => {
    e.preventDefault();
    if (!msName.trim()) return;
    await run(async () => {
      await api.post(`/projects/${id}/milestones`, {
        name: msName.trim(),
        dueDate: msDue || undefined,
        orderIndex: plan.data?.milestones.length ?? 0,
      });
      setMsName("");
      setMsDue("");
    });
  };

  if (plan.loading || tasksState.loading) return <Loading />;
  if (!plan.data) return <ErrorBanner message={plan.error ?? "Plan indisponible"} />;

  const tasks = tasksState.data?.items ?? [];
  const tasksByMs = (mid: string | undefined) => tasks.filter((t) => (t.milestoneId ?? undefined) === mid);
  const d = plan.data.delivery;

  return (
    <div>
      <PageHeader
        eyebrow={`Planning · ${vocab.label}`}
        title={`${cap(vocab.milestonePlural)} & date de livraison`}
        subtitle={<Link to={`/projects/${id}`} className="text-brand hover:underline">← Retour à la fiche projet</Link>}
      />

      {error && <div className="mb-4"><ErrorBanner message={error} /></div>}

      {/* Date de livraison prévue */}
      <section className="pm-card mb-6 p-5">
        <div className="pm-eyebrow">Date de livraison prévue</div>
        {d.weeks === null ? (
          <p className="mt-2 text-sm text-slate-400">{d.note}</p>
        ) : d.weeks === 0 ? (
          <p className="mt-2 text-lg font-semibold text-emerald-300">{d.note ?? "Terminé"}</p>
        ) : (
          <>
            <div className="mt-2 flex flex-wrap items-baseline gap-3">
              <span className="text-2xl font-bold text-white">{fmtDate(d.expected)}</span>
              <span className="text-sm text-slate-400">
                (entre {fmtDate(d.optimistic)} et {fmtDate(d.pessimistic)})
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              ≈ {d.weeks} sem. · {d.remainingEffort} pts restants · rythme {d.velocity} pts/sem ·
              confiance {Math.round(d.confidence * 100)}%
              {d.confidence < 0.5 && " (estimation indicative — peu d'historique)"}
            </p>
          </>
        )}
      </section>

      {/* Ajout de jalon */}
      <form onSubmit={addMilestone} className="pm-card mb-6 flex flex-wrap items-end gap-3 p-5">
        <label className="flex min-w-[12rem] flex-1 flex-col">
          <span className="pm-label">Nouveau {vocab.milestone}</span>
          <input className="pm-input" value={msName} onChange={(e) => setMsName(e.target.value)} placeholder="ex. Livraison bêta" />
        </label>
        <label className="flex flex-col">
          <span className="pm-label">Échéance</span>
          <input type="date" className="pm-input" value={msDue} onChange={(e) => setMsDue(e.target.value)} />
        </label>
        <button className="pm-btn-primary">+ Ajouter</button>
      </form>

      {/* Jalons */}
      {plan.data.milestones.length === 0 ? (
        <div className="pm-card p-8 text-center text-sm text-slate-400">
          Aucun {vocab.milestone}. Ajoutez-en un ci-dessus, puis rattachez-y des {vocab.taskPlural}{" "}
          avec une estimation pour obtenir une date de livraison.
        </div>
      ) : (
        <ul className="space-y-4">
          {plan.data.milestones.map((m) => (
            <MilestoneCard
              key={m.id}
              m={m}
              vocab={vocab}
              tasks={tasksByMs(m.id)}
              expert={mode === "expert"}
              onAddTask={(title, effort) =>
                run(() => api.post(`/projects/${id}/tasks`, { title, effortPoints: effort, milestoneId: m.id }))
              }
              onToggleTask={(t) => run(() => api.patch(`/projects/${id}/tasks/${t.id}`, { status: nextStatus[t.status] }))}
              onDeleteTask={(t) => run(() => api.del(`/projects/${id}/tasks/${t.id}`))}
              onToggleMs={() => run(() => api.patch(`/projects/${id}/milestones/${m.id}`, { status: m.status === "done" ? "pending" : "done" }))}
              onDeleteMs={() => run(() => api.del(`/projects/${id}/milestones/${m.id}`))}
            />
          ))}
        </ul>
      )}

      {/* Tâches non rattachées */}
      {tasksByMs(undefined).length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-slate-300">{cap(vocab.taskPlural)} non rattachées</h2>
          <ul className="space-y-1.5">
            {tasksByMs(undefined).map((t) => (
              <TaskRow
                key={t.id}
                t={t}
                onToggle={() => run(() => api.patch(`/projects/${id}/tasks/${t.id}`, { status: nextStatus[t.status] }))}
                onDelete={() => run(() => api.del(`/projects/${id}/tasks/${t.id}`))}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function MilestoneCard({
  m,
  vocab,
  tasks,
  expert,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onToggleMs,
  onDeleteMs,
}: {
  m: MilestonePlan;
  vocab: MethodologyVocab;
  tasks: Task[];
  expert: boolean;
  onAddTask: (title: string, effort: number) => void;
  onToggleTask: (t: Task) => void;
  onDeleteTask: (t: Task) => void;
  onToggleMs: () => void;
  onDeleteMs: () => void;
}) {
  const [title, setTitle] = useState("");
  const [effort, setEffort] = useState(1);
  const done = m.status === "done";

  return (
    <li className={`pm-card p-5 ${m.atRisk ? "border-l-2 border-l-red-500/70" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={`font-semibold ${done ? "text-slate-500 line-through" : "text-slate-100"}`}>{m.name}</h3>
            {m.atRisk && (
              <span className="pm-chip border-red-500/40 bg-red-500/10 text-red-300">En retard probable</span>
            )}
            {expert && m.onCriticalPath && (
              <span className="pm-chip border-amber-500/40 bg-amber-500/10 text-amber-300">Chemin critique</span>
            )}
            {done && <span className="pm-chip border-emerald-500/30 bg-emerald-500/10 text-emerald-300">Terminé</span>}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-slate-500">
            <span>Échéance : {fmtDate(m.dueDate)}</span>
            {!done && m.projectedEnd && <span>Fin projetée : {fmtDate(m.projectedEnd)}</span>}
            <span>{m.remainingEffort} pts restants</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onToggleMs} className="pm-btn-ghost py-1 text-xs">
            {done ? "Rouvrir" : "Marquer terminé"}
          </button>
          <button onClick={onDeleteMs} className="pm-btn-ghost py-1 text-xs" aria-label={`Supprimer le jalon ${m.name}`}>
            Supprimer
          </button>
        </div>
      </div>

      {tasks.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {tasks.map((t) => (
            <TaskRow key={t.id} t={t} onToggle={() => onToggleTask(t)} onDelete={() => onDeleteTask(t)} />
          ))}
        </ul>
      )}

      <form
        className="mt-3 flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          onAddTask(title.trim(), effort);
          setTitle("");
          setEffort(1);
        }}
      >
        <label className="flex min-w-[10rem] flex-1 flex-col">
          <span className="sr-only">{cap(vocab.task)}</span>
          <input className="pm-input py-1.5 text-sm" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`+ Ajouter une ${vocab.task}`} />
        </label>
        <label className="flex w-20 flex-col">
          <span className="sr-only">Effort (points)</span>
          <input type="number" min={0} className="pm-input py-1.5 text-sm" value={effort} onChange={(e) => setEffort(Number(e.target.value))} aria-label="Effort en points" />
        </label>
        <button className="pm-btn-ghost py-1.5 text-sm">Ajouter</button>
      </form>
    </li>
  );
}

function TaskRow({ t, onToggle, onDelete }: { t: Task; onToggle: () => void; onDelete: () => void }) {
  const tone =
    t.status === "done"
      ? "text-slate-500 line-through"
      : t.status === "doing"
        ? "text-brand-300"
        : "text-slate-300";
  return (
    <li className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-1.5 text-sm">
      <button onClick={onToggle} className="flex items-center gap-2 text-left" aria-label={`Changer le statut : ${t.title}`}>
        <span className={`h-2 w-2 rounded-full ${t.status === "done" ? "bg-emerald-400" : t.status === "doing" ? "bg-brand" : "bg-slate-500"}`} />
        <span className={tone}>{t.title}</span>
        <span className="font-mono text-[10px] text-slate-500">{t.effortPoints} pts · {taskStatusLabel[t.status]}</span>
      </button>
      <button onClick={onDelete} className="text-xs text-slate-500 hover:text-red-300" aria-label={`Supprimer la tâche ${t.title}`}>
        ✕
      </button>
    </li>
  );
}

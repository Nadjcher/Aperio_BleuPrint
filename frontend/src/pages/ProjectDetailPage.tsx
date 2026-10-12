import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import type {
  Anomaly,
  AgentKind,
  Decision,
  Project,
  Report,
  ReportPeriod,
} from "@projectmaster/shared";
import { api, RequestError } from "../api/client";

interface SyncResult {
  ingested: number;
  anomaly: Anomaly | null;
  decisions: Decision[];
}

const severityChip: Record<Anomaly["severity"], string> = {
  info: "border-slate-500/30 bg-slate-500/10 text-slate-300",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  critical: "border-red-500/40 bg-red-500/10 text-red-300",
};

const severityDot: Record<Anomaly["severity"], string> = {
  info: "bg-slate-400",
  warning: "bg-amber-400 shadow-[0_0_10px_2px_rgba(251,191,36,0.6)]",
  critical: "bg-red-400 shadow-[0_0_10px_2px_rgba(248,113,113,0.7)]",
};

const agentChip: Record<AgentKind, string> = {
  monitor: "border-red-500/30 bg-red-500/10 text-red-300",
  analyst: "border-brand/30 bg-brand/10 text-brand-400",
  planner: "border-accent/30 bg-accent/10 text-accent-500",
  reporter: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
};

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const [p, a, d, r] = await Promise.all([
      api.get<Project>(`/projects/${id}`),
      api.get<{ items: Anomaly[] }>(`/projects/${id}/anomalies`),
      api.get<{ items: Decision[] }>(`/projects/${id}/decisions`),
      api.get<{ items: Report[] }>(`/projects/${id}/reports`),
    ]);
    setProject(p);
    setAnomalies(a.items);
    setDecisions(d.items);
    setReports(r.items);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSync = async () => {
    if (!id) return;
    setSyncing(true);
    setMessage(null);
    try {
      const res = await api.post<SyncResult>(`/projects/${id}/sync`);
      setMessage(
        `${res.ingested} signaux ingérés · ${res.decisions.length} décisions produites` +
          (res.anomaly ? " · anomalie détectée" : ""),
      );
      await load();
    } catch (err) {
      setMessage(
        err instanceof RequestError ? err.message : "Erreur de synchronisation",
      );
    } finally {
      setSyncing(false);
    }
  };

  const giveFeedback = async (decisionId: string, accepted: boolean) => {
    await api.post(`/decisions/${decisionId}/feedback`, { accepted });
    await load();
  };

  const generateReport = async (period: ReportPeriod) => {
    if (!id) return;
    setReporting(true);
    try {
      await api.post<Report>(`/projects/${id}/reports`, { period });
      await load();
    } catch (err) {
      setMessage(err instanceof RequestError ? err.message : "Erreur de rapport");
    } finally {
      setReporting(false);
    }
  };

  if (!project) return <p className="text-slate-500">Chargement…</p>;

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {project.name}
          </h1>
          {project.repo && (
            <p className="mt-1 font-mono text-sm text-slate-500">{project.repo}</p>
          )}
        </div>
        <button
          onClick={onSync}
          disabled={syncing || !project.repo}
          className="pm-btn-primary"
        >
          {syncing ? "Synchronisation…" : "⚡ Synchroniser & analyser"}
        </button>
      </div>

      {message && (
        <p className="mb-6 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-slate-300">
          {message}
        </p>
      )}

      <Section title="Anomalies ouvertes" count={anomalies.length}>
        {anomalies.length === 0 ? (
          <Empty>Aucune anomalie ouverte — le projet est nominal.</Empty>
        ) : (
          <ul className="space-y-3">
            {anomalies.map((a) => (
              <li key={a.id} className="pm-card p-5">
                <div className="flex items-center gap-2.5">
                  <span className={`h-2 w-2 rounded-full ${severityDot[a.severity]}`} />
                  <span className={`pm-chip ${severityChip[a.severity]}`}>
                    {a.severity}
                  </span>
                  <span className="font-mono text-xs text-slate-500">
                    {a.metric} · z={a.zScore.toFixed(1)}
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-300">{a.explanation}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Décisions des agents" count={decisions.length}>
        {decisions.length === 0 ? (
          <Empty>Aucune décision — lancez une synchronisation.</Empty>
        ) : (
          <ul className="space-y-3">
            {decisions.map((d) => (
              <li key={d.id} className="pm-card p-5">
                <div className="flex items-center justify-between">
                  <span className={`pm-chip ${agentChip[d.agent]}`}>{d.agent}</span>
                  <span className="font-mono text-xs text-slate-500">
                    confiance {(d.confidence * 100).toFixed(0)}% · {d.status}
                  </span>
                </div>
                <h3 className="mt-3 font-semibold text-slate-100">{d.title}</h3>
                <p className="mt-1 text-sm text-slate-400">{d.rationale}</p>
                {d.actions.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {d.actions.map((action, i) => (
                      <li
                        key={i}
                        className="flex gap-2 text-sm text-slate-300"
                      >
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand" />
                        {action}
                      </li>
                    ))}
                  </ul>
                )}
                {d.status === "proposed" && (
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => giveFeedback(d.id, true)}
                      className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-1.5 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20"
                    >
                      ✓ Valider
                    </button>
                    <button
                      onClick={() => giveFeedback(d.id, false)}
                      className="rounded-lg border border-red-500/40 bg-red-500/10 px-3.5 py-1.5 text-sm font-medium text-red-300 transition hover:bg-red-500/20"
                    >
                      ✕ Rejeter
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <SectionTitle title="Rapports de synthèse" count={reports.length} />
          <div className="flex gap-2">
            <button
              onClick={() => generateReport("weekly")}
              disabled={reporting}
              className="pm-btn-ghost"
            >
              Hebdomadaire
            </button>
            <button
              onClick={() => generateReport("monthly")}
              disabled={reporting}
              className="pm-btn-ghost"
            >
              Mensuel
            </button>
          </div>
        </div>
        {reports.length === 0 ? (
          <Empty>Aucun rapport — générez-en un ci-dessus.</Empty>
        ) : (
          <ul className="space-y-3">
            {reports.map((r) => (
              <li key={r.id} className="pm-card p-5">
                <div className="mb-3 flex items-center justify-between font-mono text-xs text-slate-500">
                  <span>
                    {r.period} · {r.periodStart.slice(0, 10)} →{" "}
                    {r.periodEnd.slice(0, 10)}
                  </span>
                  <span
                    className={`pm-chip ${
                      r.generatedBy === "llm"
                        ? "border-accent/30 bg-accent/10 text-accent-500"
                        : "border-slate-500/30 bg-slate-500/10 text-slate-400"
                    }`}
                  >
                    {r.generatedBy === "llm" ? "généré par IA" : "heuristique"}
                  </span>
                </div>
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-300">
                  {r.summary}
                </pre>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function SectionTitle({ title, count }: { title: string; count: number }) {
  return (
    <h2 className="flex items-center gap-2.5 text-lg font-semibold text-white">
      {title}
      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-xs text-slate-400">
        {count}
      </span>
    </h2>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <section className="mb-10">
      <div className="mb-4">
        <SectionTitle title={title} count={count} />
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="pm-card p-8 text-center text-sm text-slate-500">{children}</div>
  );
}

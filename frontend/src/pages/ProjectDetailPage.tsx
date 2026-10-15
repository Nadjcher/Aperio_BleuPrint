import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type {
  Anomaly,
  Decision,
  Forecast,
  Job,
  Project,
  Report,
  ReportPeriod,
} from "@projectmaster/shared";
import { METHODOLOGIES, METHODOLOGY_VOCAB } from "@projectmaster/shared";
import { api, RequestError, toErrorMessage } from "../api/client";
import { Loading } from "../components/ui";
import {
  AnomalyList,
  DecisionCard,
  type DecisionSim,
  ForecastSection,
  ReportList,
  Section,
  SectionTitle,
} from "./projectDetail/components";

interface EnqueueResult {
  jobId: string;
  status: Job["status"];
}

interface SyncJobResult {
  ingested?: number;
  decisions?: number;
  anomalyDetected?: boolean;
}

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [sims, setSims] = useState<Record<string, DecisionSim>>({});

  const load = useCallback(async () => {
    if (!id) return;
    const [p, a, d, r, f] = await Promise.all([
      api.get<Project>(`/projects/${id}`),
      api.get<{ items: Anomaly[] }>(`/projects/${id}/anomalies`),
      api.get<{ items: Decision[] }>(`/projects/${id}/decisions`),
      api.get<{ items: Report[] }>(`/projects/${id}/reports`),
      api.get<Forecast>(`/projects/${id}/forecast`),
    ]);
    setProject(p);
    setAnomalies(a.items);
    setDecisions(d.items);
    setReports(r.items);
    setForecast(f);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const pollJob = async (jobId: string): Promise<Job> => {
    for (let i = 0; i < 60; i++) {
      const job = await api.get<Job>(`/jobs/${jobId}`);
      if (job.status === "done" || job.status === "failed") return job;
      await new Promise((r) => setTimeout(r, 1500));
    }
    throw new RequestError(408, "timeout", "Délai dépassé");
  };

  const onSync = async () => {
    if (!id) return;
    setSyncing(true);
    setMessage("Synchronisation en file d'attente…");
    try {
      const { jobId } = await api.post<EnqueueResult>(`/projects/${id}/sync`);
      setMessage("Analyse en cours…");
      const job = await pollJob(jobId);
      if (job.status === "done") {
        const r = (job.result ?? {}) as SyncJobResult;
        setMessage(
          `${r.ingested ?? 0} signaux ingérés · ${r.decisions ?? 0} décisions` +
            (r.anomalyDetected ? " · anomalie détectée" : ""),
        );
      } else {
        setMessage(`Échec de la synchronisation : ${job.error ?? "erreur"}`);
      }
      await load();
    } catch (err) {
      setMessage(toErrorMessage(err, "Erreur de synchronisation"));
    } finally {
      setSyncing(false);
    }
  };

  const onFeedback = async (decisionId: string, accepted: boolean) => {
    await api.post(`/decisions/${decisionId}/feedback`, { accepted });
    await load();
  };

  const onSimulate = async (decisionId: string) => {
    try {
      const s = await api.post<DecisionSim>(`/decisions/${decisionId}/simulate`);
      setSims((prev) => ({ ...prev, [decisionId]: s }));
    } catch (err) {
      setMessage(toErrorMessage(err, "Erreur de simulation"));
    }
  };

  const onAct = async (decisionId: string, verb: "approve" | "reject" | "undo") => {
    try {
      await api.post(`/decisions/${decisionId}/${verb}`);
      setMessage(null);
    } catch (err) {
      setMessage(toErrorMessage(err, "Action impossible"));
    }
    await load();
  };

  const changeMethodology = async (methodology: Project["methodology"]) => {
    try {
      const updated = await api.patch<Project>(`/projects/${id}`, { methodology });
      setProject(updated);
    } catch (err) {
      setMessage(toErrorMessage(err, "Impossible de changer la méthodologie"));
    }
  };

  const generateReport = async (period: ReportPeriod) => {
    if (!id) return;
    setReporting(true);
    try {
      await api.post<Report>(`/projects/${id}/reports`, { period });
      await load();
    } catch (err) {
      setMessage(toErrorMessage(err, "Erreur de rapport"));
    } finally {
      setReporting(false);
    }
  };

  if (!project) return <Loading />;

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-heading">{project.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            {project.repo && <span className="font-mono text-sm text-muted">{project.repo}</span>}
            <label className="flex items-center gap-1.5 text-xs text-muted">
              Méthodologie :
              <select
                className="rounded-md border border-line bg-surface px-2 py-0.5 text-xs text-fg"
                value={project.methodology}
                onChange={(e) => void changeMethodology(e.target.value as Project["methodology"])}
                aria-label="Méthodologie du projet"
              >
                {METHODOLOGIES.map((m) => (
                  <option key={m} value={m}>
                    {METHODOLOGY_VOCAB[m].label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to={`/projects/${project.id}/planning`} className="pm-btn-ghost">
            Planning
          </Link>
          <Link to={`/projects/${project.id}/risks`} className="pm-btn-ghost">
            Risques
          </Link>
          <Link to={`/projects/${project.id}/integrations`} className="pm-btn-ghost">
            Intégrations
          </Link>
          <button onClick={onSync} disabled={syncing || !project.repo} className="pm-btn-primary">
            {syncing ? "Synchronisation…" : "⚡ Synchroniser & analyser"}
          </button>
        </div>
      </div>

      {message && (
        <p className="mb-6 rounded-xl border border-line bg-surface2 px-4 py-2.5 text-sm text-fg">
          {message}
        </p>
      )}

      {forecast && <ForecastSection forecast={forecast} />}

      <Section title="Anomalies ouvertes" count={anomalies.length}>
        <AnomalyList anomalies={anomalies} />
      </Section>

      <Section title="Décisions des agents" count={decisions.length}>
        {decisions.length === 0 ? (
          <div className="pm-card p-8 text-center text-sm text-muted">
            Aucune décision — lancez une synchronisation.
          </div>
        ) : (
          <ul className="space-y-3">
            {decisions.map((d) => (
              <DecisionCard
                key={d.id}
                d={d}
                h={{ sims, onSimulate, onAct, onFeedback }}
              />
            ))}
          </ul>
        )}
      </Section>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <SectionTitle title="Rapports de synthèse" count={reports.length} />
          <div className="flex gap-2">
            <button onClick={() => generateReport("weekly")} disabled={reporting} className="pm-btn-ghost">
              Hebdomadaire
            </button>
            <button onClick={() => generateReport("monthly")} disabled={reporting} className="pm-btn-ghost">
              Mensuel
            </button>
          </div>
        </div>
        <ReportList reports={reports} />
      </section>
    </div>
  );
}

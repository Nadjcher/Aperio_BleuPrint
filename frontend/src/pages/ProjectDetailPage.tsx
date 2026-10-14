import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type {
  Anomaly,
  Decision,
  Forecast,
  Job,
  Project,
  Report,
  ReportPeriod,
} from "@projectmaster/shared";
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
          <h1 className="text-2xl font-bold tracking-tight text-white">{project.name}</h1>
          {project.repo && (
            <p className="mt-1 font-mono text-sm text-slate-400">{project.repo}</p>
          )}
        </div>
        <button onClick={onSync} disabled={syncing || !project.repo} className="pm-btn-primary">
          {syncing ? "Synchronisation…" : "⚡ Synchroniser & analyser"}
        </button>
      </div>

      {message && (
        <p className="mb-6 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-slate-300">
          {message}
        </p>
      )}

      {forecast && <ForecastSection forecast={forecast} />}

      <Section title="Anomalies ouvertes" count={anomalies.length}>
        <AnomalyList anomalies={anomalies} />
      </Section>

      <Section title="Décisions des agents" count={decisions.length}>
        {decisions.length === 0 ? (
          <div className="pm-card p-8 text-center text-sm text-slate-400">
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

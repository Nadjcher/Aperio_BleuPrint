import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type {
  Anomaly,
  Decision,
  Project,
} from "@projectmaster/shared";
import { api, RequestError } from "../api/client";

interface SyncResult {
  ingested: number;
  anomaly: Anomaly | null;
  decisions: Decision[];
}

const severityColor: Record<Anomaly["severity"], string> = {
  info: "bg-slate-100 text-slate-700",
  warning: "bg-amber-100 text-amber-800",
  critical: "bg-red-100 text-red-800",
};

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const [p, a, d] = await Promise.all([
      api.get<Project>(`/projects/${id}`),
      api.get<{ items: Anomaly[] }>(`/projects/${id}/anomalies`),
      api.get<{ items: Decision[] }>(`/projects/${id}/decisions`),
    ]);
    setProject(p);
    setAnomalies(a.items);
    setDecisions(d.items);
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
      setMessage(err instanceof RequestError ? err.message : "Erreur de synchronisation");
    } finally {
      setSyncing(false);
    }
  };

  const giveFeedback = async (decisionId: string, accepted: boolean) => {
    await api.post(`/decisions/${decisionId}/feedback`, { accepted });
    await load();
  };

  if (!project) return <p className="text-slate-500">Chargement…</p>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          {project.repo && (
            <p className="text-sm text-slate-500">{project.repo}</p>
          )}
        </div>
        <button
          onClick={onSync}
          disabled={syncing || !project.repo}
          className="rounded-md bg-brand px-4 py-2 font-medium text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {syncing ? "Synchronisation…" : "Synchroniser & analyser"}
        </button>
      </div>
      {message && (
        <p className="mb-6 rounded-md bg-slate-100 px-3 py-2 text-sm">{message}</p>
      )}

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Anomalies ouvertes</h2>
        {anomalies.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune anomalie ouverte.</p>
        ) : (
          <ul className="space-y-2">
            {anomalies.map((a) => (
              <li key={a.id} className="rounded-lg border bg-white p-4">
                <span
                  className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${severityColor[a.severity]}`}
                >
                  {a.severity}
                </span>
                <p className="mt-2 text-sm">{a.explanation}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Décisions des agents</h2>
        {decisions.length === 0 ? (
          <p className="text-sm text-slate-500">
            Aucune décision — lancez une synchronisation.
          </p>
        ) : (
          <ul className="space-y-3">
            {decisions.map((d) => (
              <li key={d.id} className="rounded-lg border bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="rounded bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
                    {d.agent}
                  </span>
                  <span className="text-xs text-slate-400">
                    confiance {(d.confidence * 100).toFixed(0)}% · {d.status}
                  </span>
                </div>
                <h3 className="mt-2 font-medium">{d.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{d.rationale}</p>
                {d.actions.length > 0 && (
                  <ul className="mt-2 list-inside list-disc text-sm text-slate-600">
                    {d.actions.map((action, i) => (
                      <li key={i}>{action}</li>
                    ))}
                  </ul>
                )}
                {d.status === "proposed" && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => giveFeedback(d.id, true)}
                      className="rounded-md border border-green-600 px-3 py-1 text-sm text-green-700 hover:bg-green-50"
                    >
                      Valider
                    </button>
                    <button
                      onClick={() => giveFeedback(d.id, false)}
                      className="rounded-md border border-red-600 px-3 py-1 text-sm text-red-700 hover:bg-red-50"
                    >
                      Rejeter
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

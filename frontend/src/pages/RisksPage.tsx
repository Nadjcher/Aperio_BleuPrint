import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import type { Anomaly, Risk, RiskStatus } from "@projectmaster/shared";
import { api, toErrorMessage } from "../api/client";
import { PageHeader, Loading, ErrorBanner } from "../components/ui";
import { useAsync } from "../hooks/useAsync";

const sevStyle: Record<Risk["severity"], { chip: string; label: string }> = {
  low: { chip: "border-emerald-500/30 bg-emerald-500/10 text-success", label: "Faible" },
  medium: { chip: "border-amber-500/40 bg-amber-500/10 text-warning", label: "Moyen" },
  high: { chip: "border-red-500/40 bg-red-500/10 text-danger", label: "Élevé" },
};
const statusLabel: Record<RiskStatus, string> = {
  open: "Ouvert",
  mitigating: "En traitement",
  closed: "Clos",
};
const SCALE = [1, 2, 3, 4, 5];

export function RisksPage() {
  const { id } = useParams<{ id: string }>();
  const risks = useAsync<{ items: Risk[] }>(() => api.get<{ items: Risk[] }>(`/projects/${id}/risks`), [id]);
  const anomalies = useAsync<{ items: Anomaly[] }>(() => api.get<{ items: Anomaly[] }>(`/projects/${id}/anomalies`), [id]);

  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [probability, setProbability] = useState(3);
  const [impact, setImpact] = useState(3);
  const [owner, setOwner] = useState("");

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      await Promise.all([risks.reload(), anomalies.reload()]);
    } catch (err) {
      setError(toErrorMessage(err));
    }
  };

  const addRisk = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await run(async () => {
      await api.post(`/projects/${id}/risks`, {
        title: title.trim(),
        probability,
        impact,
        owner: owner.trim() || undefined,
      });
      setTitle("");
      setOwner("");
      setProbability(3);
      setImpact(3);
    });
  };

  if (risks.loading) return <Loading />;

  const items = risks.data?.items ?? [];
  const openAnomalies = (anomalies.data?.items ?? []).filter((a) => a.status === "open");

  return (
    <div>
      <PageHeader
        eyebrow="Gouvernance"
        title="Registre des risques"
        subtitle={<Link to={`/projects/${id}`} className="pm-link">← Retour à la fiche projet</Link>}
      />

      {error && <div className="mb-4"><ErrorBanner message={error} /></div>}

      {/* Ajout */}
      <form onSubmit={addRisk} className="pm-card mb-6 flex flex-wrap items-end gap-3 p-5">
        <label className="flex min-w-[14rem] flex-[2] flex-col">
          <span className="pm-label">Nouveau risque</span>
          <input className="pm-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex. Dépendance externe non livrée" />
        </label>
        <label className="flex flex-col">
          <span className="pm-label">Probabilité</span>
          <select className="pm-input" value={probability} onChange={(e) => setProbability(Number(e.target.value))} aria-label="Probabilité (1 à 5)">
            {SCALE.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label className="flex flex-col">
          <span className="pm-label">Impact</span>
          <select className="pm-input" value={impact} onChange={(e) => setImpact(Number(e.target.value))} aria-label="Impact (1 à 5)">
            {SCALE.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label className="flex min-w-[8rem] flex-1 flex-col">
          <span className="pm-label">Propriétaire</span>
          <input className="pm-input" value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="optionnel" />
        </label>
        <button className="pm-btn-primary">+ Ajouter</button>
      </form>

      {/* Depuis les anomalies */}
      {openAnomalies.length > 0 && (
        <section className="pm-card mb-6 p-5">
          <h2 className="text-sm font-semibold text-fg">Créer un risque depuis une anomalie ouverte</h2>
          <ul className="mt-3 space-y-2">
            {openAnomalies.slice(0, 6).map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-3 py-2 text-sm">
                <span className="truncate text-fg">
                  <span className="font-mono text-xs text-faint">{a.severity}</span> {a.explanation}
                </span>
                <button
                  className="pm-btn-ghost shrink-0 py-1 text-xs"
                  onClick={() => run(() => api.post(`/projects/${id}/risks/from-anomaly`, { anomalyId: a.id }))}
                >
                  + Risque
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Registre */}
      {items.length === 0 ? (
        <div className="pm-card p-8 text-center text-sm text-muted">
          Aucun risque enregistré. Ajoutez-en un ci-dessus — le score (probabilité × impact)
          et le niveau sont calculés automatiquement.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-2">Risque</th>
                <th className="px-4 py-2">P</th>
                <th className="px-4 py-2">I</th>
                <th className="px-4 py-2">Score</th>
                <th className="px-4 py-2">Niveau</th>
                <th className="px-4 py-2">Statut</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="border-t border-line">
                  <td className="px-4 py-2">
                    <div className="text-heading">{r.title}</div>
                    {r.owner && <div className="text-xs text-faint">{r.owner}</div>}
                  </td>
                  <td className="px-4 py-2">
                    <ScaleSelect value={r.probability} onChange={(v) => run(() => api.patch(`/projects/${id}/risks/${r.id}`, { probability: v }))} label="Probabilité" />
                  </td>
                  <td className="px-4 py-2">
                    <ScaleSelect value={r.impact} onChange={(v) => run(() => api.patch(`/projects/${id}/risks/${r.id}`, { impact: v }))} label="Impact" />
                  </td>
                  <td className="px-4 py-2 font-mono">{r.score}</td>
                  <td className="px-4 py-2">
                    <span className={`pm-chip ${sevStyle[r.severity].chip}`}>{sevStyle[r.severity].label}</span>
                  </td>
                  <td className="px-4 py-2">
                    <select
                      className="rounded-md border border-line bg-surface px-2 py-0.5 text-xs text-fg"
                      value={r.status}
                      onChange={(e) => run(() => api.patch(`/projects/${id}/risks/${r.id}`, { status: e.target.value }))}
                      aria-label={`Statut du risque ${r.title}`}
                    >
                      {(["open", "mitigating", "closed"] as RiskStatus[]).map((s) => (
                        <option key={s} value={s}>{statusLabel[s]}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button className="text-xs text-faint hover:text-danger" onClick={() => run(() => api.del(`/projects/${id}/risks/${r.id}`))} aria-label={`Supprimer le risque ${r.title}`}>
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ScaleSelect({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <select
      className="rounded-md border border-line bg-surface px-2 py-0.5 text-xs text-fg"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      aria-label={label}
    >
      {SCALE.map((n) => <option key={n} value={n}>{n}</option>)}
    </select>
  );
}

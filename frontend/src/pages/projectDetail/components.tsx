import type { ReactNode } from "react";
import type {
  Anomaly,
  AgentKind,
  Decision,
  Forecast,
  ForecastRisk,
  Report,
  TrendMetric,
} from "@projectmaster/shared";

// ─── Styles par statut (centralisés ici) ────────────────────────────────────
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
const riskStyle: Record<ForecastRisk, { chip: string; label: string }> = {
  ok: { chip: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300", label: "Sous contrôle" },
  watch: { chip: "border-slate-400/30 bg-slate-400/10 text-slate-200", label: "À surveiller" },
  high: { chip: "border-amber-500/40 bg-amber-500/10 text-amber-300", label: "Risque élevé" },
  critical: { chip: "border-red-500/40 bg-red-500/10 text-red-300", label: "Critique" },
};
const metricLabel: Record<string, string> = {
  commits: "Commits",
  pull_requests: "Pull requests",
  issues: "Issues",
};

/** Formate un état de snapshot (ex. {status:"open"}) pour l'affichage. */
export function fmtState(x: unknown): string {
  if (x && typeof x === "object" && "status" in x) {
    return String((x as { status: unknown }).status);
  }
  return x === null || x === undefined ? "—" : JSON.stringify(x);
}

/** Libellés lisibles des statuts de décision. */
export function statusLabel(status: Decision["status"]): string {
  const map: Record<string, string> = {
    proposed: "proposée",
    pending_approval: "à approuver",
    executed: "exécutée",
    undone: "annulée",
    rejected: "rejetée",
    expired: "expirée",
    accepted: "validée",
    applied: "appliquée",
    superseded: "remplacée",
  };
  return map[status] ?? status;
}

// ─── Blocs de mise en page ───────────────────────────────────────────────────
export function SectionTitle({ title, count }: { title: string; count: number }) {
  return (
    <h2 className="flex items-center gap-2.5 text-lg font-semibold text-white">
      <span className="h-3.5 w-px bg-brand-400/70" />
      {title}
      <span className="rounded-md border border-blue-400/20 bg-white/5 px-2 py-0.5 font-mono text-xs text-slate-400">
        {String(count).padStart(2, "0")}
      </span>
    </h2>
  );
}

export function Section({
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

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="pm-card p-8 text-center text-sm text-slate-400">{children}</div>
  );
}

// ─── Anomalies ───────────────────────────────────────────────────────────────
export function AnomalyList({ anomalies }: { anomalies: Anomaly[] }) {
  if (anomalies.length === 0) {
    return <Empty>Aucune anomalie ouverte — le projet est nominal.</Empty>;
  }
  return (
    <ul className="space-y-3">
      {anomalies.map((a) => (
        <li
          key={a.id}
          className={`pm-card p-5 ${a.severity === "critical" ? "pm-ticks relative" : ""}`}
        >
          <div className="flex items-center gap-2.5">
            <span className={`h-2 w-2 rounded-full ${severityDot[a.severity]}`} />
            <span className={`pm-chip ${severityChip[a.severity]}`}>{a.severity}</span>
            <span className="font-mono text-xs text-slate-400">
              {a.metric} · z={a.zScore.toFixed(1)}
            </span>
          </div>
          <p className="mt-3 text-sm text-slate-300">{a.explanation}</p>
        </li>
      ))}
    </ul>
  );
}

// ─── Décisions ───────────────────────────────────────────────────────────────
export interface DecisionSim {
  label: string;
  before: unknown;
  after: unknown;
}

export interface DecisionHandlers {
  sims: Record<string, DecisionSim>;
  onSimulate: (id: string) => void;
  onAct: (id: string, verb: "approve" | "reject" | "undo") => void;
  onFeedback: (id: string, accepted: boolean) => void;
}

/** Explication en clair : ce que l'approbation / le rejet déclenche. */
function DecisionExplain({ d }: { d: Decision }) {
  const hasAction = Boolean(d.actionType && d.actionType !== "none");
  let text: string;
  if (!hasAction) {
    text =
      "Recommandation sans action automatique. Votre retour (valider / rejeter) aide les agents à s'améliorer — rien n'est modifié sur le projet.";
  } else if (d.autoApproved) {
    text =
      "Action à faible risque, appliquée automatiquement. Vous pouvez l'annuler sous 24 h si besoin.";
  } else if (d.status === "pending_approval") {
    text =
      "Si vous approuvez : l'action est appliquée (réversible pendant 24 h). Si vous rejetez : rien ne se passe sur le projet.";
  } else if (d.status === "executed") {
    text = "Action appliquée. Vous pouvez encore l'annuler dans la fenêtre de 24 h.";
  } else {
    return null;
  }
  return (
    <p className="mt-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-xs text-slate-400">
      {text}
    </p>
  );
}

export function DecisionCard({ d, h }: { d: Decision; h: DecisionHandlers }) {
  return (
    <li className="pm-card p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`pm-chip ${agentChip[d.agent]}`}>{d.agent}</span>
          {d.autoApproved && (
            <span className="pm-chip border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
              Action sûre
            </span>
          )}
        </div>
        <span className="font-mono text-xs text-slate-400">
          confiance {(d.confidence * 100).toFixed(0)}% · {statusLabel(d.status)}
        </span>
      </div>
      <h3 className="mt-3 font-semibold text-slate-100">{d.title}</h3>
      <p className="mt-1 text-sm text-slate-400">{d.rationale}</p>
      <DecisionExplain d={d} />
      {d.actions.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {d.actions.map((action, i) => (
            <li key={i} className="flex gap-2 text-sm text-slate-300">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand" />
              {action}
            </li>
          ))}
        </ul>
      )}
      {/* Actions encadrées : décisions portant une action réversible */}
      {d.actionType && d.actionType !== "none" && (
        <div className="mt-4 space-y-3">
          {h.sims[d.id] && (
            <div className="rounded-lg border border-brand/20 bg-brand/5 px-3 py-2 text-sm text-slate-300">
              Simulation — {h.sims[d.id].label} :{" "}
              <span className="font-mono text-brand-300">
                {fmtState(h.sims[d.id].before)} → {fmtState(h.sims[d.id].after)}
              </span>
            </div>
          )}
          {d.status === "pending_approval" && (
            <div className="flex flex-wrap gap-2">
              <button onClick={() => h.onSimulate(d.id)} className="pm-btn-ghost py-1.5">
                Simuler
              </button>
              <button
                onClick={() => h.onAct(d.id, "approve")}
                className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-1.5 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20"
              >
                ✓ Approuver
              </button>
              <button
                onClick={() => h.onAct(d.id, "reject")}
                className="rounded-lg border border-red-500/40 bg-red-500/10 px-3.5 py-1.5 text-sm font-medium text-red-300 transition hover:bg-red-500/20"
              >
                ✕ Rejeter
              </button>
            </div>
          )}
          {d.status === "executed" && (
            <button
              onClick={() => h.onAct(d.id, "undo")}
              className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3.5 py-1.5 text-sm font-medium text-amber-300 transition hover:bg-amber-500/20"
            >
              ↩ Annuler (fenêtre 24 h)
            </button>
          )}
        </div>
      )}
      {/* Recommandations sans action : feedback d'apprentissage */}
      {d.status === "proposed" && (!d.actionType || d.actionType === "none") && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => h.onFeedback(d.id, true)}
            className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-1.5 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20"
          >
            ✓ Valider
          </button>
          <button
            onClick={() => h.onFeedback(d.id, false)}
            className="rounded-lg border border-red-500/40 bg-red-500/10 px-3.5 py-1.5 text-sm font-medium text-red-300 transition hover:bg-red-500/20"
          >
            ✕ Rejeter
          </button>
        </div>
      )}
    </li>
  );
}

// ─── Rapports ────────────────────────────────────────────────────────────────
export function ReportList({ reports }: { reports: Report[] }) {
  if (reports.length === 0) return <Empty>Aucun rapport — générez-en un ci-dessus.</Empty>;
  return (
    <ul className="space-y-3">
      {reports.map((r) => (
        <li key={r.id} className="pm-card p-5">
          <div className="mb-3 flex items-center justify-between font-mono text-xs text-slate-400">
            <span>
              {r.period} · {r.periodStart.slice(0, 10)} → {r.periodEnd.slice(0, 10)}
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
  );
}

// ─── Prévision / alerte précoce ──────────────────────────────────────────────
function TrendPill({ t }: { t: TrendMetric }) {
  const arrow = t.direction === "up" ? "↑" : t.direction === "down" ? "↓" : "→";
  // Pour les issues, une hausse est défavorable ; pour commits/PR, favorable.
  const higherIsBetter = t.metric !== "issues";
  const favorable = t.direction === "up" ? higherIsBetter : !higherIsBetter;
  const color =
    t.direction === "flat" ? "text-slate-400" : favorable ? "text-emerald-300" : "text-red-300";
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
      <div className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
        {metricLabel[t.metric] ?? t.metric}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-lg font-semibold text-slate-100">{t.current7d}</span>
        <span className={`font-mono text-xs ${color}`}>
          {arrow} {t.changePct > 0 ? "+" : ""}
          {t.changePct}%
        </span>
      </div>
      <div className="font-mono text-[10px] text-slate-500">7 j · préc. {t.previous7d}</div>
    </div>
  );
}

export function ForecastSection({ forecast: f }: { forecast: Forecast }) {
  const r = riskStyle[f.riskLevel];
  return (
    <Section title="Alerte précoce" count={f.signals.length}>
      <div className="pm-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className={`pm-chip ${r.chip}`}>{r.label}</span>
            {f.horizonWeeks && (
              <span className="font-mono text-xs text-slate-400">
                fenêtre d'intervention ≈ {f.horizonWeeks} sem.
              </span>
            )}
          </div>
          <span className="font-mono text-[11px] text-slate-500">
            confiance {(f.confidence * 100).toFixed(0)}% · {f.dataDays} j de données
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {f.trends.map((t) => (
            <TrendPill key={t.metric} t={t} />
          ))}
        </div>

        {f.signals.length > 0 && (
          <ul className="mt-4 space-y-1.5">
            {f.signals.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                <span
                  className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                    s.severity === "critical" ? "bg-red-400" : "bg-amber-400"
                  }`}
                />
                {s.label}
              </li>
            ))}
          </ul>
        )}

        {f.recommendations.length > 0 && (
          <div className="mt-4 rounded-lg border border-brand/15 bg-brand/5 p-3 text-sm text-slate-300">
            <div className="mb-1 font-mono text-[11px] uppercase tracking-wider text-brand-300">
              Recommandations
            </div>
            <ul className="space-y-1">
              {f.recommendations.map((rec, i) => (
                <li key={i}>• {rec}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Section>
  );
}

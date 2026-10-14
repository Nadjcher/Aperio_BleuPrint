import type {
  Forecast,
  ForecastRisk,
  ForecastSignal,
  SignalMetric,
  TrendDirection,
  TrendMetric,
} from "@projectmaster/shared";
import * as signalService from "./signalService.js";

const WINDOW_DAYS = 28;
const FLAT_THRESHOLD = 15; // ±15 % = stable

/** Convertit une série quotidienne (éparse) en tableau dense de `days` jours. */
export function densify(series: SignalMetric[], days: number, now: Date): number[] {
  const arr = new Array<number>(days).fill(0);
  const startOfToday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  for (const s of series) {
    const d = new Date(s.windowStart);
    const startOfDay = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    const ago = Math.floor((startOfToday - startOfDay) / 86_400_000);
    const idx = days - 1 - ago;
    if (idx >= 0 && idx < days) arr[idx] = s.value;
  }
  return arr;
}

function sum(a: number[], from: number, to: number): number {
  let s = 0;
  for (let i = from; i < to; i++) s += a[i] ?? 0;
  return s;
}

/** Tendance semaine/semaine à partir d'un tableau dense (pur, testable). */
export function trendFromDense(metric: string, dense: number[]): TrendMetric {
  const n = dense.length;
  const current7d = sum(dense, n - 7, n);
  const previous7d = sum(dense, n - 14, n - 7);
  const changePct = ((current7d - previous7d) / Math.max(previous7d, 1)) * 100;
  const direction: TrendDirection =
    changePct > FLAT_THRESHOLD ? "up" : changePct < -FLAT_THRESHOLD ? "down" : "flat";
  return { metric, current7d, previous7d, changePct: Math.round(changePct), direction };
}

/**
 * Évalue le risque à partir des tendances (pur, testable). Règles heuristiques
 * d'alerte précoce ; la confiance dépend de l'historique disponible.
 */
export function assessForecast(trends: TrendMetric[], dataDays: number): {
  signals: ForecastSignal[];
  riskLevel: ForecastRisk;
  horizonWeeks: number | null;
  recommendations: string[];
  confidence: number;
} {
  const byMetric = Object.fromEntries(trends.map((t) => [t.metric, t]));
  const commits = byMetric["commits"];
  const prs = byMetric["pull_requests"];
  const issues = byMetric["issues"];
  const signals: ForecastSignal[] = [];
  const recommendations: string[] = [];

  if (commits) {
    if (commits.changePct <= -40) {
      signals.push({ label: `Activité en chute (commits ${commits.changePct}% s/s)`, severity: "critical" });
      recommendations.push("Vérifier blocages/absences : la vélocité s'effondre.");
    } else if (commits.changePct <= -25) {
      signals.push({ label: `Activité en baisse (commits ${commits.changePct}% s/s)`, severity: "warning" });
      recommendations.push("Point d'équipe : la vélocité ralentit nettement.");
    }
  }
  if (issues && issues.changePct >= 25 && commits && commits.changePct < 0) {
    signals.push({ label: "Backlog d'issues en hausse alors que l'activité baisse", severity: "warning" });
    recommendations.push("Geler le périmètre : le backlog croît plus vite que la livraison.");
  }
  if (prs && prs.changePct <= -30) {
    signals.push({ label: `Débit de PR en baisse (${prs.changePct}% s/s)`, severity: "warning" });
    recommendations.push("Vérifier les revues de code : les PR sortent moins vite.");
  }

  const hasCritical = signals.some((s) => s.severity === "critical");
  const warnings = signals.filter((s) => s.severity === "warning").length;
  const riskLevel: ForecastRisk = hasCritical
    ? "critical"
    : warnings >= 2
      ? "high"
      : warnings === 1
        ? "watch"
        : "ok";
  const horizonWeeks =
    riskLevel === "critical" ? 2 : riskLevel === "high" ? 3 : riskLevel === "watch" ? 4 : null;

  // Confiance : fonction de l'historique réellement disponible.
  const confidence =
    dataDays >= 21 ? 0.7 : dataDays >= 14 ? 0.5 : dataDays >= 7 ? 0.35 : 0.2;
  if (dataDays < 14) {
    recommendations.push("Historique encore court : fiabilité limitée, à confirmer dans quelques jours.");
  }
  if (signals.length === 0) recommendations.push("Aucun signal d'alerte — continuez le suivi.");

  return { signals, riskLevel, horizonWeeks, recommendations, confidence };
}

/** Construit l'alerte précoce d'un projet depuis ses signaux. */
export async function computeForecast(projectId: string): Promise<Forecast> {
  const now = new Date();
  const [commitsSeries, prsSeries, issuesSeries] = await Promise.all([
    signalService.dailyCounts(projectId, "commits", "commit", WINDOW_DAYS),
    signalService.dailyCounts(projectId, "pull_requests", "pull_request", WINDOW_DAYS),
    signalService.dailyCounts(projectId, "issues", "issue", WINDOW_DAYS),
  ]);

  const trends: TrendMetric[] = [
    trendFromDense("commits", densify(commitsSeries, WINDOW_DAYS, now)),
    trendFromDense("pull_requests", densify(prsSeries, WINDOW_DAYS, now)),
    trendFromDense("issues", densify(issuesSeries, WINDOW_DAYS, now)),
  ];

  // Jours de données = étendue entre le signal le plus ancien et aujourd'hui.
  const allStarts = [...commitsSeries, ...prsSeries, ...issuesSeries].map((s) =>
    new Date(s.windowStart).getTime(),
  );
  const dataDays = allStarts.length
    ? Math.min(WINDOW_DAYS, Math.ceil((now.getTime() - Math.min(...allStarts)) / 86_400_000) + 1)
    : 0;

  const { signals, riskLevel, horizonWeeks, recommendations, confidence } = assessForecast(
    trends,
    dataDays,
  );

  return {
    projectId,
    generatedAt: now.toISOString(),
    trends,
    signals,
    riskLevel,
    horizonWeeks,
    confidence,
    recommendations,
    dataDays,
  };
}

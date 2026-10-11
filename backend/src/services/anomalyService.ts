import type {
  Anomaly as AnomalyDTO,
  AnomalySeverity,
  DetectionResult,
  SignalMetric,
} from "@projectmaster/shared";
import { AppDataSource } from "../db/data-source.js";
import { Anomaly } from "../entities/Anomaly.js";

const anomalies = () => AppDataSource.getRepository(Anomaly);

/** Seuils de z-score pour classer la sévérité. */
const WARN_Z = 2;
const CRIT_Z = 3;

function severityForZ(z: number): AnomalySeverity {
  const a = Math.abs(z);
  if (a >= CRIT_Z) return "critical";
  if (a >= WARN_Z) return "warning";
  return "info";
}

/**
 * Détection d'anomalies v1 : écart de la dernière valeur par rapport à la
 * baseline (moyenne/écart-type des valeurs précédentes). Approche z-score,
 * simple et explicable — à remplacer par un modèle appris en Phase 3.
 */
export function detect(metrics: SignalMetric[]): DetectionResult | null {
  if (metrics.length < 4) return null; // pas assez d'historique pour une baseline
  const values = metrics.map((m) => m.value);
  const observed = values[values.length - 1];
  const baseline = values.slice(0, -1);

  const mean = baseline.reduce((a, b) => a + b, 0) / baseline.length;
  const variance =
    baseline.reduce((a, b) => a + (b - mean) ** 2, 0) / baseline.length;
  const stdDev = Math.sqrt(variance);

  // Baseline parfaitement plate : pas d'écart-type pour normaliser. Tout écart
  // réel est alors traité comme critique ; une valeur identique reste normale.
  let zScore: number;
  if (stdDev === 0) {
    zScore = observed === mean ? 0 : Math.sign(observed - mean) * CRIT_Z;
  } else {
    zScore = (observed - mean) / stdDev;
  }
  const severity = severityForZ(zScore);

  return {
    metric: metrics[0].name,
    observed,
    expected: mean,
    stdDev,
    zScore,
    isAnomaly: severity !== "info",
    severity,
  };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Détection robuste (affinage Phase 3) : score z modifié basé sur la médiane
 * et le MAD (median absolute deviation). Résiste aux valeurs aberrantes dans
 * la baseline, là où la moyenne/écart-type se laissent tirer par un seul pic.
 */
export function detectRobust(metrics: SignalMetric[]): DetectionResult | null {
  if (metrics.length < 4) return null;
  const values = metrics.map((m) => m.value);
  const observed = values[values.length - 1];
  const baseline = values.slice(0, -1);

  const med = median(baseline);
  const mad = median(baseline.map((v) => Math.abs(v - med)));

  // 0.6745 ramène le MAD à l'échelle d'un écart-type pour une loi normale.
  let zScore: number;
  if (mad === 0) {
    zScore = observed === med ? 0 : Math.sign(observed - med) * CRIT_Z;
  } else {
    zScore = (0.6745 * (observed - med)) / mad;
  }
  const severity = severityForZ(zScore);

  return {
    metric: metrics[0].name,
    observed,
    expected: med,
    stdDev: mad,
    zScore,
    isAnomaly: severity !== "info",
    severity,
  };
}

function toDTO(a: Anomaly): AnomalyDTO {
  return {
    id: a.id,
    projectId: a.projectId,
    metric: a.metric,
    observed: a.observed,
    expected: a.expected,
    zScore: a.zScore,
    severity: a.severity,
    status: a.status,
    detectedAt: a.detectedAt.toISOString(),
    explanation: a.explanation,
  };
}

/** Enregistre une anomalie détectée, avec une explication lisible. */
export async function record(
  projectId: string,
  result: DetectionResult,
): Promise<AnomalyDTO> {
  const direction = result.observed > result.expected ? "au-dessus" : "en-dessous";
  const explanation =
    `La métrique « ${result.metric} » est à ${result.observed.toFixed(1)}, ` +
    `${direction} de l'attendu (${result.expected.toFixed(1)}), ` +
    `soit un écart de ${result.zScore.toFixed(1)} écart-type.`;

  const saved = await anomalies().save(
    anomalies().create({
      projectId,
      metric: result.metric,
      observed: result.observed,
      expected: result.expected,
      zScore: result.zScore,
      severity: severityForZ(result.zScore),
      status: "open",
      detectedAt: new Date(),
      explanation,
    }),
  );
  return toDTO(saved);
}

export async function listOpen(projectId: string): Promise<AnomalyDTO[]> {
  const rows = await anomalies().find({
    where: { projectId, status: "open" },
    order: { detectedAt: "DESC" },
  });
  return rows.map(toDTO);
}

export async function listForContext(projectId: string): Promise<AnomalyDTO[]> {
  const rows = await anomalies().find({
    where: { projectId },
    order: { detectedAt: "DESC" },
    take: 50,
  });
  return rows.map(toDTO);
}

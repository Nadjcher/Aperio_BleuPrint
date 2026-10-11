/** Anomalies détectées par écart par rapport à une baseline. */

export type AnomalySeverity = "info" | "warning" | "critical";

export type AnomalyStatus = "open" | "acknowledged" | "resolved" | "dismissed";

export interface Anomaly {
  id: string;
  projectId: string;
  /** Métrique concernée, ex. "commits_per_day". */
  metric: string;
  /** Valeur observée ayant déclenché l'anomalie. */
  observed: number;
  /** Valeur attendue (moyenne de la baseline). */
  expected: number;
  /** Écart normalisé (z-score) par rapport à la baseline. */
  zScore: number;
  severity: AnomalySeverity;
  status: AnomalyStatus;
  detectedAt: string;
  /** Explication lisible générée au moment de la détection. */
  explanation: string;
}

/** Résultat d'un passage de détection sur une métrique. */
export interface DetectionResult {
  metric: string;
  observed: number;
  expected: number;
  stdDev: number;
  zScore: number;
  isAnomaly: boolean;
  severity: AnomalySeverity;
}

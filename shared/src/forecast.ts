/** Alerte précoce heuristique : tendances + risque projeté. */

export type TrendDirection = "up" | "down" | "flat";
export type ForecastRisk = "ok" | "watch" | "high" | "critical";
export type ForecastSeverity = "info" | "warning" | "critical";

export interface TrendMetric {
  metric: string;
  current7d: number;
  previous7d: number;
  /** Variation semaine/semaine en %. */
  changePct: number;
  direction: TrendDirection;
}

export interface ForecastSignal {
  label: string;
  severity: ForecastSeverity;
}

export interface Forecast {
  projectId: string;
  generatedAt: string;
  trends: TrendMetric[];
  signals: ForecastSignal[];
  riskLevel: ForecastRisk;
  /** Fenêtre d'intervention estimée (semaines), null si rien à signaler. */
  horizonWeeks: number | null;
  /** Confiance heuristique (0..1), dépend de l'historique disponible. */
  confidence: number;
  recommendations: string[];
  /** Jours de données réellement disponibles (transparence). */
  dataDays: number;
}

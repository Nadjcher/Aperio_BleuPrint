/** Signaux bruts collectés auprès des connecteurs externes. */

export type SignalSource = "github" | "webhook" | "manual";

export type SignalType =
  | "commit"
  | "pull_request"
  | "issue"
  | "review"
  | "ci_run"
  | "deployment";

/** Un signal normalisé, prêt à être stocké et analysé. */
export interface Signal {
  id: string;
  projectId: string;
  source: SignalSource;
  type: SignalType;
  /** Horodatage de l'événement d'origine (ISO 8601). */
  occurredAt: string;
  /** Acteur à l'origine de l'événement (login, email tronqué, etc.). */
  actor?: string;
  /** Charge utile normalisée et minimisée (pas de données personnelles brutes). */
  payload: Record<string, unknown>;
  createdAt: string;
}

/** Métrique agrégée dérivée d'une fenêtre de signaux. */
export interface SignalMetric {
  projectId: string;
  /** Nom de la métrique, ex. "commits_per_day", "pr_cycle_time_hours". */
  name: string;
  value: number;
  /** Début de la fenêtre d'agrégation (ISO 8601). */
  windowStart: string;
  /** Fin de la fenêtre d'agrégation (ISO 8601). */
  windowEnd: string;
}

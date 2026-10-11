/** Rapports de synthèse périodiques (Phase 3). */

export type ReportPeriod = "weekly" | "monthly";

export interface Report {
  id: string;
  projectId: string;
  period: ReportPeriod;
  /** Début de la période couverte (ISO 8601). */
  periodStart: string;
  /** Fin de la période couverte (ISO 8601). */
  periodEnd: string;
  /** Synthèse rédigée (Markdown). */
  summary: string;
  /** Origine de la synthèse : LLM ou repli heuristique. */
  generatedBy: "llm" | "heuristic";
  createdAt: string;
}

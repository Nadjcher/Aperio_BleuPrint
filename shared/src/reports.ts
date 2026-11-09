/** Point d'avancement projet (rapport prêt à envoyer aux parties prenantes). */

export type ReportPeriod = "weekly" | "monthly";

/** Statut RAG (Red / Amber / Green) du projet au moment du rapport. */
export type ReportRag = "vert" | "orange" | "rouge";

export const REPORT_RAG_META: Record<ReportRag, { label: string; icon: string }> = {
  vert: { label: "Vert", icon: "🟢" },
  orange: { label: "Orange", icon: "🟠" },
  rouge: { label: "Rouge", icon: "🔴" },
};

export interface Report {
  id: string;
  projectId: string;
  period: ReportPeriod;
  /** Début de la période couverte (ISO 8601). */
  periodStart: string;
  /** Fin de la période couverte (ISO 8601). */
  periodEnd: string;
  /** Statut RAG global, calculé à partir des données (fiable, sans LLM). */
  rag: ReportRag;
  /** Phrase justifiant le statut (ex. « 2 jalons en retard probable »). */
  headline: string;
  /** Point d'avancement rédigé (Markdown), prêt à copier / envoyer. */
  summary: string;
  /** Origine de la rédaction : LLM ou repli heuristique. */
  generatedBy: "llm" | "heuristic";
  createdAt: string;
}

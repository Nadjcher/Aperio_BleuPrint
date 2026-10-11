import type { AgentContext } from "@projectmaster/shared";
import type { Agent, DraftDecision } from "./types.js";

/**
 * Reporter : synthétise l'état du projet pour les humains.
 * Produit toujours une décision de type « rapport », même sans anomalie.
 */
export const reporterAgent: Agent = {
  kind: "reporter",
  async run(ctx: AgentContext): Promise<DraftDecision[]> {
    const open = ctx.anomalies.filter((a) => a.status === "open");
    const bySeverity = {
      critical: open.filter((a) => a.severity === "critical").length,
      warning: open.filter((a) => a.severity === "warning").length,
    };

    const headline =
      open.length === 0
        ? "Projet nominal : aucune anomalie ouverte."
        : `${open.length} anomalie(s) ouverte(s) — ${bySeverity.critical} critique(s), ${bySeverity.warning} à surveiller.`;

    return [
      {
        projectId: ctx.projectId,
        agent: "reporter",
        title: "Synthèse d'état",
        rationale: headline,
        actions: [
          `Métriques suivies : ${ctx.metrics.length}`,
          open.length > 0
            ? "Voir les décisions des agents Analyst et Planner"
            : "Rien à signaler cette période",
        ],
        confidence: 0.8,
      },
    ];
  },
};

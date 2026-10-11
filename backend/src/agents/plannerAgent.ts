import type { AgentContext } from "@projectmaster/shared";
import type { Agent, DraftDecision } from "./types.js";

/**
 * Planner : propose des actions correctives concrètes face aux anomalies.
 */
export const plannerAgent: Agent = {
  kind: "planner",
  async run(ctx: AgentContext): Promise<DraftDecision[]> {
    const open = ctx.anomalies.filter((a) => a.status === "open");
    if (open.length === 0) return [];

    const highestZ = open.reduce((a, b) =>
      Math.abs(a.zScore) >= Math.abs(b.zScore) ? a : b,
    );

    return [
      {
        projectId: ctx.projectId,
        agent: "planner",
        anomalyId: highestZ.id,
        title: "Plan d'action corrective",
        rationale:
          "Priorisation de l'anomalie au plus fort écart pour un impact maximal.",
        actions: [
          "Organiser un point de 15 min avec les responsables du périmètre",
          "Replanifier les tâches à risque et réaffecter la charge si besoin",
          "Définir un seuil d'alerte et un critère de retour à la normale",
        ],
        confidence: 0.55,
      },
    ];
  },
};

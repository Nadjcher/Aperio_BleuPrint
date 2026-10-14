import type { AgentContext } from "@projectmaster/shared";
import type { Agent, DraftDecision } from "./types.js";

/**
 * Monitor : surveille les anomalies ouvertes et escalade les plus sévères.
 * Il ne corrige rien lui-même ; il attire l'attention.
 */
export const monitorAgent: Agent = {
  kind: "monitor",
  async run(ctx: AgentContext): Promise<DraftDecision[]> {
    const critical = ctx.anomalies.filter((a) => a.severity === "critical");
    if (critical.length === 0) return [];

    return [
      {
        projectId: ctx.projectId,
        agent: "monitor",
        anomalyId: critical[0].id,
        title: `${critical.length} anomalie(s) critique(s) détectée(s)`,
        rationale:
          "Des écarts majeurs par rapport à la baseline nécessitent une revue immédiate.",
        actions: critical.map(
          (a) => `Examiner « ${a.metric} » : ${a.explanation}`,
        ),
        confidence: 0.9,
        // Action à faible impact : accuser réception (auto-approuvée si
        // AGENT_AUTONOMY=auto, sinon file d'approbation). Réversible.
        actionType: "anomaly.acknowledge",
      },
    ];
  },
};

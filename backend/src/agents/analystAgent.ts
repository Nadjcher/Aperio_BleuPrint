import type { AgentContext } from "@projectmaster/shared";
import type { Agent, DraftDecision } from "./types.js";

/**
 * Analyst : diagnostique les causes probables des anomalies ouvertes.
 * Heuristiques explicables en v1 ; à enrichir par un LLM en Phase 2/3.
 */
export const analystAgent: Agent = {
  kind: "analyst",
  async run(ctx: AgentContext): Promise<DraftDecision[]> {
    const decisions: DraftDecision[] = [];

    for (const a of ctx.anomalies) {
      if (a.status !== "open") continue;
      const dropped = a.observed < a.expected;
      const cause = dropped
        ? "Baisse d'activité : ralentissement, blocage, ou congés d'équipe."
        : "Hausse d'activité : pic de charge, rush de fin de sprint, ou reprise de dette.";

      decisions.push({
        projectId: ctx.projectId,
        agent: "analyst",
        anomalyId: a.id,
        title: `Diagnostic — ${a.metric}`,
        rationale: `${a.explanation} Cause probable : ${cause}`,
        actions: [
          "Confirmer le diagnostic avec l'équipe concernée",
          dropped
            ? "Vérifier les blocages ouverts et la disponibilité des personnes"
            : "Vérifier la qualité (revues, tests) face au volume",
        ],
        confidence: 0.6,
      });
    }

    return decisions;
  },
};

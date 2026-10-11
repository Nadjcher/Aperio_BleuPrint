import type { AgentContext } from "@projectmaster/shared";
import type { Agent, DraftDecision } from "./types.js";
import { complete, extractJson, isLLMEnabled } from "../llm/claude.js";
import { plannerPrompt } from "../llm/prompts.js";

interface LlmPlan {
  title: string;
  rationale: string;
  actions: string[];
  confidence: number;
}

/**
 * Planner : propose des actions correctives concrètes face aux anomalies.
 * Utilise le LLM si disponible, sinon des heuristiques (fallback).
 */
export const plannerAgent: Agent = {
  kind: "planner",
  async run(ctx: AgentContext): Promise<DraftDecision[]> {
    const open = ctx.anomalies.filter((a) => a.status === "open");
    if (open.length === 0) return [];

    const highestZ = open.reduce((a, b) =>
      Math.abs(a.zScore) >= Math.abs(b.zScore) ? a : b,
    );

    if (isLLMEnabled()) {
      const { system, user } = plannerPrompt(open);
      const plan = extractJson<LlmPlan>(await complete({ system, user }));
      if (plan && Array.isArray(plan.actions)) {
        return [
          {
            projectId: ctx.projectId,
            agent: "planner",
            anomalyId: highestZ.id,
            title: plan.title || "Plan d'action corrective",
            rationale: plan.rationale,
            actions: plan.actions,
            confidence: Number.isFinite(plan.confidence)
              ? Math.min(1, Math.max(0, plan.confidence))
              : 0.6,
          },
        ];
      }
    }

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

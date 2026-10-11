import type { AgentContext } from "@projectmaster/shared";
import type { Agent, DraftDecision } from "./types.js";
import { complete, extractJson, isLLMEnabled } from "../llm/claude.js";
import { analystPrompt } from "../llm/prompts.js";

interface LlmDiagnosis {
  rationale: string;
  actions: string[];
  confidence: number;
}

/**
 * Analyst : diagnostique les causes probables des anomalies ouvertes.
 * Utilise le LLM si disponible, sinon des heuristiques explicables (fallback).
 */
export const analystAgent: Agent = {
  kind: "analyst",
  async run(ctx: AgentContext): Promise<DraftDecision[]> {
    const open = ctx.anomalies.filter((a) => a.status === "open");
    if (open.length === 0) return [];

    if (isLLMEnabled()) {
      const { system, user } = analystPrompt(open);
      const diag = extractJson<LlmDiagnosis>(await complete({ system, user }));
      if (diag && Array.isArray(diag.actions)) {
        return [
          {
            projectId: ctx.projectId,
            agent: "analyst",
            anomalyId: open[0].id,
            title: `Diagnostic — ${open.length} anomalie(s)`,
            rationale: diag.rationale,
            actions: diag.actions,
            confidence: clamp(diag.confidence, 0.7),
          },
        ];
      }
    }

    return open.map((a) => heuristicFor(ctx.projectId, a));
  },
};

function clamp(value: number, fallback: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;
}

function heuristicFor(
  projectId: string,
  a: AgentContext["anomalies"][number],
): DraftDecision {
  const dropped = a.observed < a.expected;
  const cause = dropped
    ? "Baisse d'activité : ralentissement, blocage, ou congés d'équipe."
    : "Hausse d'activité : pic de charge, rush de fin de sprint, ou reprise de dette.";
  return {
    projectId,
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
  };
}

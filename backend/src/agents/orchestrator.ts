import type { AgentContext, Decision } from "@projectmaster/shared";
import { AppDataSource } from "../db/data-source.js";
import { Decision as DecisionEntity } from "../entities/Decision.js";
import { DecisionFeedback } from "../entities/DecisionFeedback.js";
import * as anomalyService from "../services/anomalyService.js";
import { logger } from "../utils/logger.js";
import { monitorAgent } from "./monitorAgent.js";
import { analystAgent } from "./analystAgent.js";
import { plannerAgent } from "./plannerAgent.js";
import { reporterAgent } from "./reporterAgent.js";
import type { Agent } from "./types.js";

const AGENTS: Agent[] = [monitorAgent, analystAgent, plannerAgent, reporterAgent];

const decisions = () => AppDataSource.getRepository(DecisionEntity);
const feedback = () => AppDataSource.getRepository(DecisionFeedback);

/**
 * Pondère la confiance d'un agent par son taux d'acceptation passé.
 * C'est la brique « learning loop » v1 : plus un agent est validé par les
 * humains, plus ses futures décisions sont jugées fiables.
 */
async function trustFactor(agent: Agent["kind"]): Promise<number> {
  const rows = await feedback()
    .createQueryBuilder("f")
    .innerJoin(DecisionEntity, "d", "d.id = f.decisionId")
    .where("d.agent = :agent", { agent })
    .select("f.accepted", "accepted")
    .getRawMany<{ accepted: boolean }>();

  if (rows.length === 0) return 1;
  const accepted = rows.filter((r) => r.accepted).length;
  // Lissage de Laplace pour éviter les extrêmes sur peu de données.
  return (accepted + 1) / (rows.length + 2);
}

/** Lance les 4 agents sur un projet et persiste leurs décisions. */
export async function runAgents(projectId: string): Promise<Decision[]> {
  const anomalies = await anomalyService.listForContext(projectId);
  const ctx: AgentContext = { projectId, anomalies, metrics: [] };

  const produced: Decision[] = [];

  for (const agent of AGENTS) {
    try {
      const drafts = await agent.run(ctx);
      const factor = await trustFactor(agent.kind);

      for (const draft of drafts) {
        const saved = await decisions().save(
          decisions().create({
            ...draft,
            confidence: Math.min(1, draft.confidence * factor),
            status: "proposed",
          }),
        );
        produced.push({
          ...draft,
          id: saved.id,
          confidence: saved.confidence,
          status: saved.status,
          createdAt: saved.createdAt.toISOString(),
        });
      }
    } catch (err) {
      logger.error({ err, agent: agent.kind }, "Agent en échec");
    }
  }

  return produced;
}

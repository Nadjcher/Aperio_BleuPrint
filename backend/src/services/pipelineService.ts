import { AppDataSource } from "../db/data-source.js";
import { Project } from "../entities/Project.js";
import { githubConnector } from "../connectors/github.js";
import { getConnector } from "../connectors/index.js";
import { resolveContext } from "./connectorConfigService.js";
import * as signalService from "./signalService.js";
import * as anomalyService from "./anomalyService.js";
import { runAgents } from "../agents/orchestrator.js";
import { notifyAnomaly, notifyPendingDecisions } from "./notificationService.js";
import type { IngestSignal } from "./signalService.js";
import { AppError } from "../middleware/errorHandler.js";

export interface SyncResult {
  ingested: number;
  anomalyDetected: boolean;
  decisions: number;
}

/**
 * Pipeline de synchronisation d'un projet (exécuté par le worker) :
 * signaux GitHub → détection d'anomalies (robuste) → agents.
 */
export async function syncProject(projectId: string): Promise<SyncResult> {
  const project = await AppDataSource.getRepository(Project).findOne({
    where: { id: projectId },
  });
  if (!project) throw new AppError(404, "not_found", "Projet introuvable");

  // Dispatch : connecteur configuré pour le projet, sinon GitHub via `repo`
  // (rétro-compatibilité). Aucune source → erreur explicite.
  let signals: IngestSignal[];
  const configured = await resolveContext(project.id);
  if (configured) {
    signals = await getConnector(configured.provider).fetchSignals(configured.ctx);
  } else if (project.repo) {
    signals = await githubConnector.fetchSignals({
      projectId: project.id,
      settings: { repo: project.repo },
    });
  } else {
    throw new AppError(400, "no_source", "Aucune source de données (dépôt ou connecteur)");
  }
  const ingested = await signalService.ingest(signals);

  const metrics = await signalService.dailyCounts(
    project.id,
    "commits_per_day",
    "commit",
    30,
  );
  const detection = anomalyService.detectRobust(metrics);
  let anomalyDetected = false;
  if (detection?.isAnomaly) {
    await anomalyService.record(project.id, detection);
    anomalyDetected = true;
    // Notification e-mail au propriétaire (n'échoue jamais, respecte l'opt-in).
    await notifyAnomaly(project, detection);
  }

  const decisions = await runAgents(project.id);

  // Notifie les décisions nécessitant une approbation (Slack, best-effort).
  const pending = decisions
    .filter((d) => d.status === "pending_approval")
    .map((d) => ({ id: d.id, title: d.title }));
  await notifyPendingDecisions(project, pending);

  return { ingested, anomalyDetected, decisions: decisions.length };
}

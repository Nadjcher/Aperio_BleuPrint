import { AppDataSource } from "../db/data-source.js";
import { Project } from "../entities/Project.js";
import { fetchRepoSignals } from "../connectors/github.js";
import * as signalService from "./signalService.js";
import * as anomalyService from "./anomalyService.js";
import { runAgents } from "../agents/orchestrator.js";
import { notifyAnomaly } from "./notificationService.js";
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
  if (!project.repo) throw new AppError(400, "no_repo", "Aucun dépôt associé");

  const signals = await fetchRepoSignals(project.id, project.repo);
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

  return { ingested, anomalyDetected, decisions: decisions.length };
}

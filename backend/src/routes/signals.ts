import { Router } from "express";
import { AppDataSource } from "../db/data-source.js";
import { Project } from "../entities/Project.js";
import { Signal } from "../entities/Signal.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { AppError } from "../middleware/errorHandler.js";
import { fetchRepoSignals } from "../connectors/github.js";
import * as signalService from "../services/signalService.js";
import * as anomalyService from "../services/anomalyService.js";
import { runAgents } from "../agents/orchestrator.js";
import { audit, anonymizeIp } from "../services/auditService.js";

export const signalsRouter = Router();
const projects = () => AppDataSource.getRepository(Project);

signalsRouter.use(requireAuth);

async function ownedProject(id: string, ownerId: string): Promise<Project> {
  const p = await projects().findOne({ where: { id, ownerId } });
  if (!p) throw new AppError(404, "not_found", "Projet introuvable");
  return p;
}

/**
 * Synchronise un projet : tire les signaux GitHub, détecte les anomalies,
 * puis lance les agents. C'est le pipeline de bout en bout de la Phase 1/2.
 */
signalsRouter.post(
  "/projects/:id/sync",
  requireRole("manager"),
  async (req, res) => {
    const project = await ownedProject(req.params.id, req.user!.sub);
    if (!project.repo) {
      throw new AppError(400, "no_repo", "Aucun dépôt associé à ce projet");
    }

    const signals = await fetchRepoSignals(project.id, project.repo);
    const ingested = await signalService.ingest(signals);

    // Détection sur le volume de commits quotidien.
    const metrics = await signalService.dailyCounts(
      project.id,
      "commits_per_day",
      "commit",
      30,
    );
    // Détection robuste (médiane + MAD) : plus précise sur des historiques bruités.
    const detection = anomalyService.detectRobust(metrics);
    let anomaly = null;
    if (detection?.isAnomaly) {
      anomaly = await anomalyService.record(project.id, detection);
    }

    const decisions = await runAgents(project.id);

    await audit({
      actorId: req.user!.sub,
      action: "project.sync",
      target: `project:${project.id}`,
      ip: anonymizeIp(req.ip),
      metadata: { ingested, anomalyDetected: Boolean(anomaly) },
    });

    res.json({ ingested, anomaly, decisions });
  },
);

signalsRouter.get("/projects/:id/signals", async (req, res) => {
  await ownedProject(req.params.id, req.user!.sub);
  const rows = await AppDataSource.getRepository(Signal).find({
    where: { projectId: req.params.id },
    order: { occurredAt: "DESC" },
    take: 100,
  });
  res.json({ items: rows });
});

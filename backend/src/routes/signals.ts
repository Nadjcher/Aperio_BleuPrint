import { Router } from "express";
import { AppDataSource } from "../db/data-source.js";
import { Signal } from "../entities/Signal.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { AppError } from "../middleware/errorHandler.js";
import * as jobService from "../services/jobService.js";
import { getOwnedProject } from "../services/projectService.js";
import { audit, anonymizeIp } from "../services/auditService.js";

export const signalsRouter = Router();

signalsRouter.use(requireAuth);

/**
 * Enfile une synchronisation de projet (exécution asynchrone par le worker).
 * Répond immédiatement (202) avec un jobId ; le client suit l'avancement via
 * GET /jobs/:id. Scalable : le worker dépile avec FOR UPDATE SKIP LOCKED.
 */
signalsRouter.post(
  "/projects/:id/sync",
  requireRole("manager"),
  async (req, res) => {
    const project = await getOwnedProject(req.user!.sub, req.params.id);
    if (!project.repo) {
      throw new AppError(400, "no_repo", "Aucun dépôt associé à ce projet");
    }

    const job = await jobService.enqueue("project_sync", project.id);

    await audit({
      actorId: req.user!.sub,
      action: "project.sync.enqueue",
      target: `project:${project.id}`,
      ip: anonymizeIp(req.ip),
      metadata: { jobId: job.id },
    });

    res.status(202).json({ jobId: job.id, status: job.status });
  },
);

signalsRouter.get("/projects/:id/signals", async (req, res) => {
  await getOwnedProject(req.user!.sub, req.params.id);
  const rows = await AppDataSource.getRepository(Signal).find({
    where: { projectId: req.params.id },
    order: { occurredAt: "DESC" },
    take: 100,
  });
  res.json({ items: rows });
});

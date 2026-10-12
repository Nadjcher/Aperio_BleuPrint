import { Router } from "express";
import { AppDataSource } from "../db/data-source.js";
import { Project } from "../entities/Project.js";
import { requireAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import * as jobService from "../services/jobService.js";

export const jobsRouter = Router();

jobsRouter.use(requireAuth);

/** Statut d'un job — réservé au propriétaire du projet concerné. */
jobsRouter.get("/jobs/:id", async (req, res) => {
  const job = await jobService.get(req.params.id);
  if (!job) throw new AppError(404, "not_found", "Job introuvable");

  const owns = await AppDataSource.getRepository(Project).findOne({
    where: { id: job.projectId, ownerId: req.user!.sub },
  });
  if (!owns) throw new AppError(404, "not_found", "Job introuvable");

  res.json(job);
});

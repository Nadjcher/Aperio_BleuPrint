import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import * as jobService from "../services/jobService.js";
import { getOwnedProjectOrNull } from "../services/projectService.js";

export const jobsRouter = Router();

jobsRouter.use(requireAuth);

/** Statut d'un job — réservé au propriétaire du projet concerné. */
jobsRouter.get("/jobs/:id", async (req, res) => {
  const job = await jobService.get(req.params.id);
  if (!job) throw new AppError(404, "not_found", "Job introuvable");

  // 404 « Job introuvable » (et non « Projet introuvable ») pour ne pas
  // divulguer l'existence d'un job appartenant à un autre compte.
  const owns = await getOwnedProjectOrNull(req.user!.sub, job.projectId);
  if (!owns) throw new AppError(404, "not_found", "Job introuvable");

  res.json(job);
});

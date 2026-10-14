import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { computeForecast } from "../services/forecastService.js";
import { getOwnedProject } from "../services/projectService.js";

export const forecastRouter = Router();

/** Alerte précoce heuristique d'un projet (tendances + risque projeté). */
forecastRouter.get("/projects/:id/forecast", requireAuth, async (req, res) => {
  const project = await getOwnedProject(req.user!.sub, req.params.id);
  res.json(await computeForecast(project.id));
});

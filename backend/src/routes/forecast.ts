import { Router } from "express";
import { AppDataSource } from "../db/data-source.js";
import { Project } from "../entities/Project.js";
import { requireAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import { computeForecast } from "../services/forecastService.js";

export const forecastRouter = Router();

/** Alerte précoce heuristique d'un projet (tendances + risque projeté). */
forecastRouter.get("/projects/:id/forecast", requireAuth, async (req, res) => {
  const project = await AppDataSource.getRepository(Project).findOne({
    where: { id: req.params.id },
  });
  if (!project || project.ownerId !== req.user!.sub) {
    throw new AppError(404, "not_found", "Projet introuvable");
  }
  res.json(await computeForecast(project.id));
});

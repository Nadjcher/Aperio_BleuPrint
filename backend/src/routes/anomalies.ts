import { Router } from "express";
import { z } from "zod";
import type { AnomalyStatus } from "@projectmaster/shared";
import { AppDataSource } from "../db/data-source.js";
import { Anomaly } from "../entities/Anomaly.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validateBody } from "../middleware/validate.js";
import { AppError } from "../middleware/errorHandler.js";
import * as anomalyService from "../services/anomalyService.js";

export const anomaliesRouter = Router();
const anomalies = () => AppDataSource.getRepository(Anomaly);

anomaliesRouter.use(requireAuth);

anomaliesRouter.get("/projects/:id/anomalies", async (req, res) => {
  const items = await anomalyService.listOpen(req.params.id);
  res.json({ items });
});

const statusSchema = z.object({
  status: z.enum(["open", "acknowledged", "resolved", "dismissed"]),
});

anomaliesRouter.patch(
  "/anomalies/:id",
  requireRole("manager"),
  validateBody(statusSchema),
  async (req, res) => {
    const a = await anomalies().findOne({ where: { id: req.params.id } });
    if (!a) throw new AppError(404, "not_found", "Anomalie introuvable");
    a.status = req.body.status as AnomalyStatus;
    await anomalies().save(a);
    res.json({ id: a.id, status: a.status });
  },
);

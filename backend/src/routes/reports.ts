import { Router } from "express";
import { z } from "zod";
import { AppDataSource } from "../db/data-source.js";
import { Project } from "../entities/Project.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validateBody } from "../middleware/validate.js";
import { AppError } from "../middleware/errorHandler.js";
import * as reportService from "../services/reportService.js";
import { audit, anonymizeIp } from "../services/auditService.js";

export const reportsRouter = Router();
const projects = () => AppDataSource.getRepository(Project);

reportsRouter.use(requireAuth);

async function ownedProject(id: string, ownerId: string): Promise<Project> {
  const p = await projects().findOne({ where: { id, ownerId } });
  if (!p) throw new AppError(404, "not_found", "Projet introuvable");
  return p;
}

reportsRouter.get("/projects/:id/reports", async (req, res) => {
  await ownedProject(req.params.id, req.user!.sub);
  const items = await reportService.list(req.params.id);
  res.json({ items });
});

const generateSchema = z.object({
  period: z.enum(["weekly", "monthly"]),
});

reportsRouter.post(
  "/projects/:id/reports",
  requireRole("manager"),
  validateBody(generateSchema),
  async (req, res) => {
    const project = await ownedProject(req.params.id, req.user!.sub);
    const report = await reportService.generate(
      project.id,
      project.name,
      req.body.period,
    );
    await audit({
      actorId: req.user!.sub,
      action: "report.generate",
      target: `project:${project.id}`,
      ip: anonymizeIp(req.ip),
      metadata: { period: req.body.period, generatedBy: report.generatedBy },
    });
    res.status(201).json(report);
  },
);

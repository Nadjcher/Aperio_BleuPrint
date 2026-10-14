import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validateBody } from "../middleware/validate.js";
import * as reportService from "../services/reportService.js";
import { getOwnedProject } from "../services/projectService.js";
import { audit, anonymizeIp } from "../services/auditService.js";

export const reportsRouter = Router();

reportsRouter.use(requireAuth);

reportsRouter.get("/projects/:id/reports", async (req, res) => {
  await getOwnedProject(req.user!.sub, req.params.id);
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
    const project = await getOwnedProject(req.user!.sub, req.params.id);
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

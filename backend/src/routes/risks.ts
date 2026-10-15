import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validateBody } from "../middleware/validate.js";
import { getOwnedProject } from "../services/projectService.js";
import {
  createRisk,
  createRiskFromAnomaly,
  deleteRisk,
  listRisks,
  updateRisk,
} from "../services/riskService.js";

export const risksRouter = Router();

risksRouter.use(requireAuth);

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  probability: z.number().int().min(1).max(5).optional(),
  impact: z.number().int().min(1).max(5).optional(),
  owner: z.string().max(120).optional(),
  tolerance: z.string().max(200).optional(),
});

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  probability: z.number().int().min(1).max(5).optional(),
  impact: z.number().int().min(1).max(5).optional(),
  owner: z.string().max(120).nullable().optional(),
  tolerance: z.string().max(200).nullable().optional(),
  status: z.enum(["open", "mitigating", "closed"]).optional(),
});

const fromAnomalySchema = z.object({ anomalyId: z.string().uuid() });

risksRouter.get("/projects/:id/risks", async (req, res) => {
  await getOwnedProject(req.user!.sub, req.params.id);
  res.json({ items: await listRisks(req.params.id) });
});

risksRouter.post(
  "/projects/:id/risks",
  requireRole("manager"),
  validateBody(createSchema),
  async (req, res) => {
    await getOwnedProject(req.user!.sub, req.params.id);
    res.status(201).json(await createRisk(req.params.id, req.body));
  },
);

risksRouter.post(
  "/projects/:id/risks/from-anomaly",
  requireRole("manager"),
  validateBody(fromAnomalySchema),
  async (req, res) => {
    await getOwnedProject(req.user!.sub, req.params.id);
    res.status(201).json(await createRiskFromAnomaly(req.params.id, req.body.anomalyId));
  },
);

risksRouter.patch(
  "/projects/:id/risks/:rid",
  requireRole("manager"),
  validateBody(updateSchema),
  async (req, res) => {
    await getOwnedProject(req.user!.sub, req.params.id);
    res.json(await updateRisk(req.params.id, req.params.rid, req.body));
  },
);

risksRouter.delete(
  "/projects/:id/risks/:rid",
  requireRole("manager"),
  async (req, res) => {
    await getOwnedProject(req.user!.sub, req.params.id);
    await deleteRisk(req.params.id, req.params.rid);
    res.status(204).end();
  },
);

import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validateBody } from "../middleware/validate.js";
import {
  createBlock,
  createLink,
  deleteBlock,
  deleteLink,
  getMap,
  importFromConnector,
} from "../services/portfolioService.js";
import { audit, anonymizeIp } from "../services/auditService.js";

export const portfolioRouter = Router();

portfolioRouter.use(requireAuth);

portfolioRouter.get("/portfolio/map", async (req, res) => {
  const projectId = typeof req.query.projectId === "string" ? req.query.projectId : undefined;
  const onlyAtRisk = req.query.onlyAtRisk === "true" || req.query.onlyAtRisk === "1";
  res.json(await getMap(req.user!.sub, { projectId, onlyAtRisk }));
});

const blockSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1).max(200),
  type: z.string().min(1).max(60),
  ownerId: z.string().uuid().nullable().optional(),
  targetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format attendu : YYYY-MM-DD")
    .nullable()
    .optional(),
});

portfolioRouter.post(
  "/portfolio/blocks",
  requireRole("manager"),
  validateBody(blockSchema),
  async (req, res) => {
    res.status(201).json(await createBlock(req.user!.sub, req.body));
  },
);

portfolioRouter.delete("/portfolio/blocks/:id", requireRole("manager"), async (req, res) => {
  await deleteBlock(req.user!.sub, req.params.id);
  res.status(204).end();
});

const linkSchema = z.object({
  fromId: z.string().uuid(),
  toId: z.string().uuid(),
});

portfolioRouter.post(
  "/portfolio/links",
  requireRole("manager"),
  validateBody(linkSchema),
  async (req, res) => {
    res.status(201).json(await createLink(req.user!.sub, req.body));
  },
);

portfolioRouter.delete("/portfolio/links/:id", requireRole("manager"), async (req, res) => {
  await deleteLink(req.user!.sub, req.params.id);
  res.status(204).end();
});

portfolioRouter.post("/portfolio/import", requireRole("manager"), async (req, res) => {
  const projectId = typeof req.query.projectId === "string" ? req.query.projectId : "";
  const result = await importFromConnector(req.user!.sub, projectId);
  await audit({
    actorId: req.user!.sub,
    action: "portfolio.import",
    target: `project:${projectId}`,
    ip: anonymizeIp(req.ip),
    metadata: result,
  });
  res.status(201).json(result);
});

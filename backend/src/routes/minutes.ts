import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validateBody } from "../middleware/validate.js";
import { getOwnedProject } from "../services/projectService.js";
import {
  deleteMinutes,
  generateMinutes,
  getMinutes,
  listMinutes,
} from "../services/minutesService.js";
import { audit, anonymizeIp } from "../services/auditService.js";

export const minutesRouter = Router();

minutesRouter.use(requireAuth);

const createSchema = z.object({
  title: z.string().min(1).max(200),
  text: z.string().min(1).max(50_000),
});

minutesRouter.get("/projects/:id/minutes", async (req, res) => {
  await getOwnedProject(req.user!.sub, req.params.id);
  res.json({ items: await listMinutes(req.params.id) });
});

minutesRouter.get("/projects/:id/minutes/:mid", async (req, res) => {
  await getOwnedProject(req.user!.sub, req.params.id);
  res.json(await getMinutes(req.params.id, req.params.mid));
});

minutesRouter.post(
  "/projects/:id/minutes",
  requireRole("manager"),
  validateBody(createSchema),
  async (req, res) => {
    await getOwnedProject(req.user!.sub, req.params.id);
    const { title, text } = req.body as z.infer<typeof createSchema>;
    const minutes = await generateMinutes(req.params.id, title, text);
    await audit({
      actorId: req.user!.sub,
      action: "minutes.generate",
      target: `project:${req.params.id}`,
      ip: anonymizeIp(req.ip),
      metadata: { by: minutes.generatedBy },
    });
    res.status(201).json(minutes);
  },
);

minutesRouter.delete(
  "/projects/:id/minutes/:mid",
  requireRole("manager"),
  async (req, res) => {
    await getOwnedProject(req.user!.sub, req.params.id);
    await deleteMinutes(req.params.id, req.params.mid);
    res.status(204).end();
  },
);

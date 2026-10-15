import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validateBody } from "../middleware/validate.js";
import { audit, anonymizeIp } from "../services/auditService.js";
import {
  createProject,
  getOwnedProject,
  listProjects,
  projectToDTO,
  updateProject,
} from "../services/projectService.js";

export const projectsRouter = Router();

const createSchema = z.object({
  name: z.string().min(1).max(160),
  repo: z
    .string()
    .regex(/^[\w.-]+\/[\w.-]+$/, "Format attendu : owner/repo")
    .optional(),
});

projectsRouter.use(requireAuth);

projectsRouter.get("/projects", async (req, res) => {
  const rows = await listProjects(req.user!.sub);
  const items = rows.map(projectToDTO);
  res.json({ items, total: items.length, page: 1, pageSize: items.length });
});

projectsRouter.post(
  "/projects",
  requireRole("manager"),
  validateBody(createSchema),
  async (req, res) => {
    const saved = await createProject(req.user!.sub, req.user!.isGuest ?? false, req.body);
    await audit({
      actorId: req.user!.sub,
      action: "project.create",
      target: `project:${saved.id}`,
      ip: anonymizeIp(req.ip),
    });
    res.status(201).json(projectToDTO(saved));
  },
);

projectsRouter.get("/projects/:id", async (req, res) => {
  const p = await getOwnedProject(req.user!.sub, req.params.id);
  res.json(projectToDTO(p));
});

const updateSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  repo: z
    .string()
    .regex(/^[\w.-]+\/[\w.-]+$/, "Format attendu : owner/repo")
    .nullable()
    .optional(),
  methodology: z.enum(["kanban", "scrum", "prince2", "safe"]).optional(),
});

projectsRouter.patch(
  "/projects/:id",
  requireRole("manager"),
  validateBody(updateSchema),
  async (req, res) => {
    const saved = await updateProject(req.user!.sub, req.params.id, req.body);
    await audit({
      actorId: req.user!.sub,
      action: "project.update",
      target: `project:${saved.id}`,
      ip: anonymizeIp(req.ip),
    });
    res.json(projectToDTO(saved));
  },
);

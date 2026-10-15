import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validateBody } from "../middleware/validate.js";
import { getOwnedProject } from "../services/projectService.js";
import {
  createMilestone,
  createTask,
  deleteMilestone,
  deleteTask,
  getPlan,
  listMilestones,
  listTasks,
  updateMilestone,
  updateTask,
} from "../services/planService.js";

export const planningRouter = Router();

planningRouter.use(requireAuth);

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format attendu : AAAA-MM-JJ");

const milestoneCreateSchema = z.object({
  name: z.string().min(1).max(160),
  dueDate: dateStr.optional(),
  orderIndex: z.number().int().min(0).optional(),
  dependsOnId: z.string().uuid().optional(),
});

const milestoneUpdateSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  dueDate: dateStr.nullable().optional(),
  status: z.enum(["pending", "done"]).optional(),
  orderIndex: z.number().int().min(0).optional(),
  dependsOnId: z.string().uuid().nullable().optional(),
});

const taskCreateSchema = z.object({
  title: z.string().min(1).max(200),
  effortPoints: z.number().min(0).max(1000).optional(),
  milestoneId: z.string().uuid().optional(),
  status: z.enum(["todo", "doing", "done"]).optional(),
});

const taskUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  effortPoints: z.number().min(0).max(1000).optional(),
  milestoneId: z.string().uuid().nullable().optional(),
  status: z.enum(["todo", "doing", "done"]).optional(),
});

// ─── Plan calculé ────────────────────────────────────────────────────────────
planningRouter.get("/projects/:id/plan", async (req, res) => {
  await getOwnedProject(req.user!.sub, req.params.id);
  res.json(await getPlan(req.params.id));
});

// ─── Jalons ──────────────────────────────────────────────────────────────────
planningRouter.get("/projects/:id/milestones", async (req, res) => {
  await getOwnedProject(req.user!.sub, req.params.id);
  res.json({ items: await listMilestones(req.params.id) });
});

planningRouter.post(
  "/projects/:id/milestones",
  requireRole("manager"),
  validateBody(milestoneCreateSchema),
  async (req, res) => {
    await getOwnedProject(req.user!.sub, req.params.id);
    res.status(201).json(await createMilestone(req.params.id, req.body));
  },
);

planningRouter.patch(
  "/projects/:id/milestones/:mid",
  requireRole("manager"),
  validateBody(milestoneUpdateSchema),
  async (req, res) => {
    await getOwnedProject(req.user!.sub, req.params.id);
    res.json(await updateMilestone(req.params.id, req.params.mid, req.body));
  },
);

planningRouter.delete(
  "/projects/:id/milestones/:mid",
  requireRole("manager"),
  async (req, res) => {
    await getOwnedProject(req.user!.sub, req.params.id);
    await deleteMilestone(req.params.id, req.params.mid);
    res.status(204).end();
  },
);

// ─── Tâches ──────────────────────────────────────────────────────────────────
planningRouter.get("/projects/:id/tasks", async (req, res) => {
  await getOwnedProject(req.user!.sub, req.params.id);
  res.json({ items: await listTasks(req.params.id) });
});

planningRouter.post(
  "/projects/:id/tasks",
  requireRole("manager"),
  validateBody(taskCreateSchema),
  async (req, res) => {
    await getOwnedProject(req.user!.sub, req.params.id);
    res.status(201).json(await createTask(req.params.id, req.body));
  },
);

planningRouter.patch(
  "/projects/:id/tasks/:tid",
  requireRole("manager"),
  validateBody(taskUpdateSchema),
  async (req, res) => {
    await getOwnedProject(req.user!.sub, req.params.id);
    res.json(await updateTask(req.params.id, req.params.tid, req.body));
  },
);

planningRouter.delete(
  "/projects/:id/tasks/:tid",
  requireRole("manager"),
  async (req, res) => {
    await getOwnedProject(req.user!.sub, req.params.id);
    await deleteTask(req.params.id, req.params.tid);
    res.status(204).end();
  },
);

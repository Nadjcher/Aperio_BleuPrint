import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validateBody } from "../middleware/validate.js";
import { audit, anonymizeIp } from "../services/auditService.js";
import { getOwnedProject } from "../services/projectService.js";
import {
  createMember,
  deleteMember,
  listMembers,
  projectResourcing,
  removeAssignment,
  simulateMove,
  upsertAssignment,
} from "../services/resourceService.js";

export const resourcesRouter = Router();

resourcesRouter.use(requireAuth);

// ─── Membres d'équipe ────────────────────────────────────────────────────────

const memberSchema = z.object({
  name: z.string().min(1).max(120),
  skills: z.array(z.string().min(1).max(60)).max(30).default([]),
  weeklyCapacity: z.number().positive().max(80).optional(),
});

resourcesRouter.get("/members", async (req, res) => {
  res.json({ items: await listMembers(req.user!.sub) });
});

resourcesRouter.post(
  "/members",
  requireRole("manager"),
  validateBody(memberSchema),
  async (req, res) => {
    const saved = await createMember(req.user!.sub, req.body);
    await audit({
      actorId: req.user!.sub,
      action: "member.create",
      target: `member:${saved.id}`,
      ip: anonymizeIp(req.ip),
    });
    res.status(201).json(saved);
  },
);

resourcesRouter.delete("/members/:id", requireRole("manager"), async (req, res) => {
  await deleteMember(req.user!.sub, req.params.id);
  await audit({
    actorId: req.user!.sub,
    action: "member.delete",
    target: `member:${req.params.id}`,
    ip: anonymizeIp(req.ip),
  });
  res.status(204).end();
});

// ─── Affectations projet ↔ membre ────────────────────────────────────────────

const assignSchema = z.object({
  memberId: z.string().uuid(),
  allocationPct: z.number().min(0).max(100).default(100),
  velocity: z.number().min(0).max(1000).default(0),
});

resourcesRouter.get("/projects/:id/resourcing", async (req, res) => {
  await getOwnedProject(req.user!.sub, req.params.id);
  res.json(await projectResourcing(req.params.id));
});

resourcesRouter.post(
  "/projects/:id/assignments",
  requireRole("manager"),
  validateBody(assignSchema),
  async (req, res) => {
    await getOwnedProject(req.user!.sub, req.params.id);
    const saved = await upsertAssignment(req.user!.sub, req.params.id, req.body);
    res.status(201).json(saved);
  },
);

resourcesRouter.delete(
  "/projects/:id/assignments/:memberId",
  requireRole("manager"),
  async (req, res) => {
    await getOwnedProject(req.user!.sub, req.params.id);
    await removeAssignment(req.user!.sub, req.params.id, req.params.memberId);
    res.status(204).end();
  },
);

// ─── Simulation « gravité » d'un déplacement de ressource ────────────────────

const simulateSchema = z.object({
  memberId: z.string().uuid(),
  toProjectId: z.string().uuid().optional(),
});

resourcesRouter.post(
  "/projects/:id/simulate-resource-move",
  validateBody(simulateSchema),
  async (req, res) => {
    const { id } = req.params as { id: string };
    const from = await getOwnedProject(req.user!.sub, id);
    let toName = "projet cible";
    if (req.body.toProjectId) {
      const to = await getOwnedProject(req.user!.sub, req.body.toProjectId);
      toName = to.name;
    }
    const analysis = await simulateMove(
      req.user!.sub,
      id,
      req.body.memberId,
      req.body.toProjectId,
      from.name,
      toName,
    );
    res.json(analysis);
  },
);

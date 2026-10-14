import { Router } from "express";
import { z } from "zod";
import type { Project as ProjectDTO } from "@projectmaster/shared";
import { AppDataSource } from "../db/data-source.js";
import { Project } from "../entities/Project.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validateBody } from "../middleware/validate.js";
import { AppError } from "../middleware/errorHandler.js";
import { audit, anonymizeIp } from "../services/auditService.js";

export const projectsRouter = Router();
const projects = () => AppDataSource.getRepository(Project);

function toDTO(p: Project): ProjectDTO {
  return {
    id: p.id,
    name: p.name,
    repo: p.repo ?? undefined,
    createdAt: p.createdAt.toISOString(),
  };
}

const createSchema = z.object({
  name: z.string().min(1).max(160),
  repo: z
    .string()
    .regex(/^[\w.-]+\/[\w.-]+$/, "Format attendu : owner/repo")
    .optional(),
});

projectsRouter.use(requireAuth);

projectsRouter.get("/projects", async (req, res) => {
  const rows = await projects().find({
    where: { ownerId: req.user!.sub },
    order: { createdAt: "DESC" },
  });
  res.json({ items: rows.map(toDTO), total: rows.length, page: 1, pageSize: rows.length });
});

projectsRouter.post(
  "/projects",
  requireRole("manager"),
  validateBody(createSchema),
  async (req, res) => {
    // Mode invité : limité à 1 projet. Au-delà → inviter à créer un compte.
    if (req.user!.isGuest) {
      const count = await projects().count({ where: { ownerId: req.user!.sub } });
      if (count >= 1) {
        throw new AppError(
          403,
          "guest_limit",
          "Limite du mode invité atteinte — créez un compte pour continuer",
        );
      }
    }
    const saved = await projects().save(
      projects().create({
        name: req.body.name,
        repo: req.body.repo ?? null,
        ownerId: req.user!.sub,
      }),
    );
    await audit({
      actorId: req.user!.sub,
      action: "project.create",
      target: `project:${saved.id}`,
      ip: anonymizeIp(req.ip),
    });
    res.status(201).json(toDTO(saved));
  },
);

projectsRouter.get("/projects/:id", async (req, res) => {
  const p = await projects().findOne({
    where: { id: req.params.id, ownerId: req.user!.sub },
  });
  if (!p) throw new AppError(404, "not_found", "Projet introuvable");
  res.json(toDTO(p));
});

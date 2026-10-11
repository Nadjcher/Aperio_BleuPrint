import { Router } from "express";
import { z } from "zod";
import type { Decision as DecisionDTO } from "@projectmaster/shared";
import { AppDataSource } from "../db/data-source.js";
import { Decision } from "../entities/Decision.js";
import { DecisionFeedback } from "../entities/DecisionFeedback.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validateBody } from "../middleware/validate.js";
import { AppError } from "../middleware/errorHandler.js";
import { audit, anonymizeIp } from "../services/auditService.js";

export const decisionsRouter = Router();
const decisions = () => AppDataSource.getRepository(Decision);
const feedback = () => AppDataSource.getRepository(DecisionFeedback);

function toDTO(d: Decision): DecisionDTO {
  return {
    id: d.id,
    projectId: d.projectId,
    agent: d.agent,
    anomalyId: d.anomalyId ?? undefined,
    title: d.title,
    rationale: d.rationale,
    actions: d.actions,
    confidence: d.confidence,
    status: d.status,
    createdAt: d.createdAt.toISOString(),
  };
}

decisionsRouter.use(requireAuth);

decisionsRouter.get("/projects/:id/decisions", async (req, res) => {
  const rows = await decisions().find({
    where: { projectId: req.params.id },
    order: { createdAt: "DESC" },
    take: 100,
  });
  res.json({ items: rows.map(toDTO) });
});

/** Retour humain : alimente la boucle d'apprentissage (trustFactor). */
const feedbackSchema = z.object({
  accepted: z.boolean(),
  comment: z.string().max(1000).optional(),
});

decisionsRouter.post(
  "/decisions/:id/feedback",
  requireRole("manager"),
  validateBody(feedbackSchema),
  async (req, res) => {
    const d = await decisions().findOne({ where: { id: req.params.id } });
    if (!d) throw new AppError(404, "not_found", "Décision introuvable");

    await feedback().save(
      feedback().create({
        decisionId: d.id,
        accepted: req.body.accepted,
        comment: req.body.comment ?? null,
        authorId: req.user!.sub,
      }),
    );
    d.status = req.body.accepted ? "accepted" : "rejected";
    await decisions().save(d);

    await audit({
      actorId: req.user!.sub,
      action: "decision.feedback",
      target: `decision:${d.id}`,
      ip: anonymizeIp(req.ip),
      metadata: { accepted: req.body.accepted },
    });

    res.json({ id: d.id, status: d.status });
  },
);

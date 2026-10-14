import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validateBody } from "../middleware/validate.js";
import { audit, anonymizeIp } from "../services/auditService.js";
import {
  approveDecision,
  listDecisions,
  loadOwnedDecision,
  rejectDecision,
  simulateDecision,
  submitFeedback,
  undoDecision,
} from "../services/decisionService.js";

export const decisionsRouter = Router();

decisionsRouter.use(requireAuth);

decisionsRouter.get("/projects/:id/decisions", async (req, res) => {
  res.json({ items: await listDecisions(req.params.id) });
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
    const d = await submitFeedback(
      req.user!.sub,
      req.params.id,
      req.body.accepted,
      req.body.comment,
    );
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

/** Simule l'effet d'une action (before/after) sans l'appliquer. */
decisionsRouter.post(
  "/decisions/:id/simulate",
  requireRole("manager"),
  async (req, res) => {
    const d = await loadOwnedDecision(req.user!.sub, req.params.id);
    res.json(await simulateDecision(d));
  },
);

/** Approuve une décision en attente → exécute son action (réversible 24 h). */
decisionsRouter.post(
  "/decisions/:id/approve",
  requireRole("manager"),
  async (req, res) => {
    const d = await loadOwnedDecision(req.user!.sub, req.params.id);
    const saved = await approveDecision(d);
    await audit({
      actorId: req.user!.sub,
      action: "decision.approve",
      target: `decision:${d.id}`,
      ip: anonymizeIp(req.ip),
    });
    res.json({ id: saved.id, status: saved.status, executedAt: saved.executedAt });
  },
);

/** Rejette une décision (aucune exécution). */
decisionsRouter.post(
  "/decisions/:id/reject",
  requireRole("manager"),
  async (req, res) => {
    const d = await loadOwnedDecision(req.user!.sub, req.params.id);
    const saved = await rejectDecision(d);
    await audit({
      actorId: req.user!.sub,
      action: "decision.reject",
      target: `decision:${d.id}`,
      ip: anonymizeIp(req.ip),
    });
    res.json({ id: saved.id, status: saved.status });
  },
);

/** Annule une action exécutée (rollback dans la fenêtre de 24 h). */
decisionsRouter.post(
  "/decisions/:id/undo",
  requireRole("manager"),
  async (req, res) => {
    const d = await loadOwnedDecision(req.user!.sub, req.params.id);
    const saved = await undoDecision(d);
    await audit({
      actorId: req.user!.sub,
      action: "decision.undo",
      target: `decision:${d.id}`,
      ip: anonymizeIp(req.ip),
    });
    res.json({ id: saved.id, status: saved.status, undoneAt: saved.undoneAt });
  },
);

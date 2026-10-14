import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { sendWeeklyDigests } from "../services/notificationService.js";

export const notificationsRouter = Router();

/**
 * Déclenche l'envoi du digest hebdomadaire. Protégé (admin) : à appeler depuis
 * un cron externe (Render Cron, GitHub Actions planifié, cron-job.org…) une fois
 * par semaine, puisque le plan gratuit n'a pas de scheduler interne.
 */
notificationsRouter.post(
  "/notifications/digest",
  requireAuth,
  requireRole("admin"),
  async (_req, res) => {
    const sent = await sendWeeklyDigests();
    res.json({ sent });
  },
);

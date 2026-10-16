import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import {
  getPreference,
  upsertPreference,
  sendDigestNow,
  runDueDigests,
} from "../services/digestService.js";

export const digestRouter = Router();

const updateSchema = z.object({
  channels: z.array(z.enum(["email", "slack", "teams"])).max(3).optional(),
  frequency: z.enum(["daily", "weekly", "off"]).optional(),
  hour: z.number().int().min(0).max(23).optional(),
  weekday: z.number().int().min(0).max(6).optional(),
  email: z.string().email().max(320).nullable().optional(),
  slackWebhook: z.string().url().max(500).nullable().optional(),
  teamsWebhook: z.string().url().max(500).nullable().optional(),
});

/** Préférence de livraison du briefing de l'utilisateur courant. */
digestRouter.get("/digest", requireAuth, async (req, res) => {
  res.json(await getPreference(req.user!.sub));
});

/** Met à jour la préférence (canaux, fréquence, heure, webhooks). */
digestRouter.put("/digest", requireAuth, async (req, res) => {
  const data = updateSchema.parse(req.body);
  res.json(await upsertPreference(req.user!.sub, data));
});

/** Envoi immédiat (test « Envoyer maintenant ») sur les canaux actifs. */
digestRouter.post("/digest/send", requireAuth, async (req, res) => {
  const results = await sendDigestNow(req.user!.sub);
  res.json({ results });
});

/**
 * Déclenche l'envoi des digests « dus ». Réservé admin : filet pour un cron
 * externe si le planificateur interne du worker est désactivé.
 */
digestRouter.post("/digest/run", requireAuth, requireRole("admin"), async (_req, res) => {
  const sent = await runDueDigests();
  res.json({ sent });
});

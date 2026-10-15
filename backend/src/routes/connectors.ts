import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validateBody } from "../middleware/validate.js";
import { getOwnedProject } from "../services/projectService.js";
import {
  deleteConfig,
  getConfig,
  upsertConfig,
} from "../services/connectorConfigService.js";
import { getSettings, upsertSettings } from "../services/notificationSettingsService.js";
import { audit, anonymizeIp } from "../services/auditService.js";

export const connectorsRouter = Router();

connectorsRouter.use(requireAuth);

const upsertSchema = z.object({
  provider: z.enum(["github", "gitlab", "jira", "linear"]),
  settings: z.record(z.string().max(300)).default({}),
  // Token optionnel : s'il est absent, on conserve celui déjà enregistré.
  token: z.string().min(1).max(500).optional(),
});

connectorsRouter.get("/projects/:id/connector", async (req, res) => {
  await getOwnedProject(req.user!.sub, req.params.id);
  res.json(await getConfig(req.params.id));
});

connectorsRouter.put(
  "/projects/:id/connector",
  requireRole("manager"),
  validateBody(upsertSchema),
  async (req, res) => {
    await getOwnedProject(req.user!.sub, req.params.id);
    const saved = await upsertConfig(req.params.id, req.body);
    await audit({
      actorId: req.user!.sub,
      action: "connector.configure",
      target: `project:${req.params.id}`,
      ip: anonymizeIp(req.ip),
      metadata: { provider: saved.provider },
    });
    res.json(saved);
  },
);

connectorsRouter.delete(
  "/projects/:id/connector",
  requireRole("manager"),
  async (req, res) => {
    await getOwnedProject(req.user!.sub, req.params.id);
    await deleteConfig(req.params.id);
    res.status(204).end();
  },
);

// ─── Réglages de notification ────────────────────────────────────────────────
const notifSchema = z.object({
  slackWebhook: z.string().url().max(500).nullable().optional(),
  onAnomaly: z.boolean().optional(),
  onPendingDecision: z.boolean().optional(),
});

connectorsRouter.get("/projects/:id/notifications", async (req, res) => {
  await getOwnedProject(req.user!.sub, req.params.id);
  res.json(await getSettings(req.params.id));
});

connectorsRouter.put(
  "/projects/:id/notifications",
  requireRole("manager"),
  validateBody(notifSchema),
  async (req, res) => {
    await getOwnedProject(req.user!.sub, req.params.id);
    res.json(await upsertSettings(req.params.id, req.body));
  },
);

import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as gdprService from "../services/gdprService.js";
import * as authService from "../services/authService.js";
import { audit, anonymizeIp } from "../services/auditService.js";

export const gdprRouter = Router();

gdprRouter.use(requireAuth);

/** Droit d'accès + portabilité : télécharge toutes ses données en JSON. */
gdprRouter.get("/gdpr/export", async (req, res) => {
  const data = await gdprService.exportUserData(req.user!.sub);
  await audit({
    actorId: req.user!.sub,
    action: "gdpr.export",
    ip: anonymizeIp(req.ip),
  });
  res.setHeader("Content-Type", "application/json");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="projectmaster-export.json"',
  );
  res.send(JSON.stringify(data, null, 2));
});

/** Droit à l'effacement : supprime le compte et toutes les données liées. */
gdprRouter.delete("/gdpr/me", async (req, res) => {
  const userId = req.user!.sub;
  await authService.revokeAllForUser(userId);
  // L'audit est écrit avant l'effacement, puis anonymisé par eraseUser.
  await audit({
    actorId: userId,
    action: "gdpr.erase",
    ip: anonymizeIp(req.ip),
  });
  await gdprService.eraseUser(userId);
  res.status(204).send();
});

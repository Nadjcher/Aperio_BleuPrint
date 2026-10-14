import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { buildBriefing } from "../services/briefingService.js";

export const briefingRouter = Router();

/** Briefing proactif de l'utilisateur : priorités + actions directes. */
briefingRouter.get("/briefing", requireAuth, async (req, res) => {
  res.json(await buildBriefing(req.user!.sub));
});

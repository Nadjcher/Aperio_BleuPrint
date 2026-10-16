import { Router } from "express";
import { guestRateLimiter } from "../security/index.js";
import { seedDemo } from "../services/demoService.js";

export const demoRouter = Router();

/**
 * Crée un compte de démonstration pré-rempli et renvoie ses jetons.
 * Public (pas d'authentification), limité en débit pour éviter les abus.
 */
demoRouter.post("/demo", guestRateLimiter, async (_req, res) => {
  const { user, tokens } = await seedDemo();
  res.status(201).json({ user, tokens });
});

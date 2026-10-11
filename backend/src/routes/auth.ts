import { Router } from "express";
import { z } from "zod";
import { validateBody } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { authRateLimiter } from "../security/index.js";
import * as authService from "../services/authService.js";
import { audit, anonymizeIp } from "../services/auditService.js";

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10, "Mot de passe de 10 caractères minimum"),
  name: z.string().min(1).max(120),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

authRouter.post(
  "/auth/register",
  authRateLimiter,
  validateBody(registerSchema),
  async (req, res) => {
    const { email, password, name } = req.body;
    const result = await authService.register(email, password, name);
    await audit({
      actorId: result.user.id,
      action: "auth.register",
      ip: anonymizeIp(req.ip),
    });
    res.status(201).json(result);
  },
);

authRouter.post(
  "/auth/login",
  authRateLimiter,
  validateBody(loginSchema),
  async (req, res) => {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    await audit({
      actorId: result.user.id,
      action: "auth.login",
      ip: anonymizeIp(req.ip),
    });
    res.json(result);
  },
);

authRouter.post(
  "/auth/refresh",
  validateBody(refreshSchema),
  async (req, res) => {
    const tokens = await authService.refresh(req.body.refreshToken);
    res.json(tokens);
  },
);

authRouter.get("/auth/me", requireAuth, async (req, res) => {
  const user = await authService.getUser(req.user!.sub);
  res.json(user);
});

authRouter.post("/auth/logout", requireAuth, async (req, res) => {
  await authService.revokeAllForUser(req.user!.sub);
  await audit({
    actorId: req.user!.sub,
    action: "auth.logout",
    ip: anonymizeIp(req.ip),
  });
  res.status(204).send();
});

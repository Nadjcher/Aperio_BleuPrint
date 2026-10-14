import { Router } from "express";
import { z } from "zod";
import { validateBody } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { authRateLimiter, guestRateLimiter } from "../security/index.js";
import { passwordSchema } from "../security/password.js";
import * as authService from "../services/authService.js";
import { audit, anonymizeIp } from "../services/auditService.js";

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  name: z.string().min(1).max(120),
});

const updateMeSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  notifyByEmail: z.boolean().optional(),
});

const upgradeSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  name: z.string().min(1).max(120),
});

const forgotSchema = z.object({ email: z.string().email() });
const resetSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});
const tokenSchema = z.object({ token: z.string().min(1) });

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

/** Essai sans inscription : crée un compte invité et renvoie des tokens. */
authRouter.post("/auth/guest", guestRateLimiter, async (req, res) => {
  const result = await authService.createGuest();
  await audit({
    actorId: result.user.id,
    action: "auth.guest_created",
    ip: anonymizeIp(req.ip),
  });
  res.status(201).json(result);
});

/** Conversion d'un compte invité en compte réel (conserve ses projets). */
authRouter.post(
  "/auth/upgrade",
  requireAuth,
  validateBody(upgradeSchema),
  async (req, res) => {
    const { email, password, name } = req.body;
    const result = await authService.upgradeGuest(req.user!.sub, email, password, name);
    await audit({
      actorId: result.user.id,
      action: "auth.guest_upgraded",
      ip: anonymizeIp(req.ip),
    });
    res.status(200).json(result);
  },
);

/** Mot de passe oublié : envoie un lien (réponse neutre, anti-énumération). */
authRouter.post(
  "/auth/forgot-password",
  authRateLimiter,
  validateBody(forgotSchema),
  async (req, res) => {
    await authService.requestPasswordReset(req.body.email);
    await audit({ action: "auth.forgot_password", ip: anonymizeIp(req.ip) });
    res.status(202).json({ status: "sent_if_exists" });
  },
);

/** Réinitialisation via jeton reçu par e-mail. */
authRouter.post(
  "/auth/reset-password",
  authRateLimiter,
  validateBody(resetSchema),
  async (req, res) => {
    await authService.resetPassword(req.body.token, req.body.password);
    await audit({ action: "auth.reset_password", ip: anonymizeIp(req.ip) });
    res.status(204).send();
  },
);

/** Confirmation d'adresse e-mail via jeton. */
authRouter.post(
  "/auth/verify-email",
  validateBody(tokenSchema),
  async (req, res) => {
    await authService.verifyEmail(req.body.token);
    res.status(204).send();
  },
);

/** Renvoi de l'e-mail de vérification (utilisateur connecté). */
authRouter.post("/auth/resend-verification", requireAuth, async (req, res) => {
  await authService.resendVerification(req.user!.sub);
  res.status(202).json({ status: "sent_if_needed" });
});

authRouter.get("/auth/me", requireAuth, async (req, res) => {
  const user = await authService.getUser(req.user!.sub);
  res.json(user);
});

/** Droit de rectification RGPD : mise à jour du profil. */
authRouter.patch(
  "/auth/me",
  requireAuth,
  validateBody(updateMeSchema),
  async (req, res) => {
    const user = await authService.updateProfile(req.user!.sub, {
      name: req.body.name,
      notifyByEmail: req.body.notifyByEmail,
    });
    await audit({
      actorId: req.user!.sub,
      action: "profile.update",
      ip: anonymizeIp(req.ip),
    });
    res.json(user);
  },
);

authRouter.post("/auth/logout", requireAuth, async (req, res) => {
  await authService.revokeAllForUser(req.user!.sub);
  await audit({
    actorId: req.user!.sub,
    action: "auth.logout",
    ip: anonymizeIp(req.ip),
  });
  res.status(204).send();
});

import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import type { Express } from "express";
import { env, isProd } from "../config/env.js";

/**
 * Couche 1 (réseau) + durcissement HTTP.
 * helmet pose les en-têtes de sécurité, CORS restreint les origines,
 * rate limiting protège contre l'abus et le brute-force.
 */
export function applySecurity(app: Express): void {
  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          connectSrc: ["'self'", env.CORS_ORIGIN],
          frameAncestors: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
        },
      },
      crossOriginResourcePolicy: { policy: "same-site" },
      referrerPolicy: { policy: "no-referrer" },
      frameguard: { action: "deny" },
      // HSTS seulement en prod (ignoré/piégeant sur http://localhost).
      hsts: isProd
        ? { maxAge: 15_552_000, includeSubDomains: true, preload: true }
        : false,
    }),
  );

  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
      methods: ["GET", "POST", "PATCH", "DELETE"],
    }),
  );
}

/** Limiteur global ; appliqué à toute l'API. */
export const globalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
});

/** Limiteur strict pour l'authentification (anti brute-force). */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

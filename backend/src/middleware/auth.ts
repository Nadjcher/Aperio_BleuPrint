import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { AccessTokenPayload } from "@projectmaster/shared";
import { env } from "../config/env.js";
import { AppError } from "./errorHandler.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

/** Vérifie le JWT d'accès et attache l'utilisateur à la requête. */
export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new AppError(401, "unauthorized", "Jeton d'accès manquant");
  }
  const token = header.slice("Bearer ".length);
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    }) as AccessTokenPayload;
    req.user = payload;
    next();
  } catch {
    throw new AppError(401, "unauthorized", "Jeton d'accès invalide ou expiré");
  }
}

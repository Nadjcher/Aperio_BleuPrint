import type { NextFunction, Request, Response } from "express";
import type { AccessTokenPayload } from "@projectmaster/shared";
import { AppError } from "./errorHandler.js";
import { verifyAccess } from "../services/tokenService.js";

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
  req.user = verifyAccess(token);
  next();
}

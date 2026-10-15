import type { NextFunction, Request, Response } from "express";
import type { ApiError } from "@projectmaster/shared";
import { ZodError } from "zod";
import { logger } from "../utils/logger.js";
import { AppError } from "../errors/index.js";

// Ré-export pour compatibilité : de nombreux modules importent AppError depuis
// ce fichier. La définition vit désormais dans la couche neutre `src/errors`.
export { AppError };

export function notFound(_req: Request, res: Response): void {
  const body: ApiError = {
    error: { code: "not_found", message: "Ressource introuvable" },
  };
  res.status(404).json(body);
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    const details: Record<string, string> = {};
    for (const issue of err.issues) details[issue.path.join(".")] = issue.message;
    const body: ApiError = {
      error: { code: "validation_error", message: "Entrée invalide", details },
    };
    res.status(400).json(body);
    return;
  }

  if (err instanceof AppError) {
    const body: ApiError = {
      error: { code: err.code, message: err.message, details: err.details },
    };
    res.status(err.status).json(body);
    return;
  }

  logger.error({ err }, "Erreur non gérée");
  const body: ApiError = {
    error: { code: "internal_error", message: "Erreur interne" },
  };
  res.status(500).json(body);
}

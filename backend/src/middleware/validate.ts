import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny, infer as ZodInfer } from "zod";

/**
 * Valide le corps de la requête avec un schéma Zod et le remplace par la
 * version typée/nettoyée. Les erreurs sont captées par errorHandler.
 */
export function validateBody<S extends ZodTypeAny>(schema: S) {
  return (
    req: Request<unknown, unknown, ZodInfer<S>>,
    _res: Response,
    next: NextFunction,
  ): void => {
    req.body = schema.parse(req.body);
    next();
  };
}

import type { NextFunction, Request, Response } from "express";
import type { Role } from "@projectmaster/shared";
import { AppError } from "./errorHandler.js";

/** Hiérarchie des rôles : un rôle inclut les droits des rôles inférieurs. */
const RANK: Record<Role, number> = { viewer: 1, manager: 2, admin: 3 };

/** Exige au moins le rôle donné. À utiliser après requireAuth. */
export function requireRole(min: Role) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const role = req.user?.role;
    if (!role || RANK[role] < RANK[min]) {
      throw new AppError(403, "forbidden", "Droits insuffisants");
    }
    next();
  };
}
